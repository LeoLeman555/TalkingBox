import { BleManager, Device, Subscription, State } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import {
  parseEspStatus,
  EspStatusMessage,
} from '../../domain/espStatus'

const SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
const CHAR_START = '12345678-1234-5678-1234-56789abcdef1';
const CHAR_CHUNK = '12345678-1234-5678-1234-56789abcdef2';
const CHAR_STATUS = '12345678-1234-5678-1234-56789abcdef3';

export class BleService {
  public chunkSize = 480;
  private manager = new BleManager();
  private connected: Device | null = null;
  private bleState: State | null = null;
  public onBleReady?: () => void;

  constructor() {
    this.manager.onStateChange((state: State) => {
      this.bleState = state;
      if (state === 'PoweredOn' && !this.connected) {
        console.log('[BLE] PoweredOn → ready to scan');
        this.onBleReady?.();
      }
    }, true);
  }

  isBluetoothEnabled(): boolean {
    return this.bleState === 'PoweredOn';
  }

  getBluetoothState(): State | null {
    return this.bleState;
  }

  async isDeviceConnected(): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const connected = await this.connected.isConnected();

      if (!connected) {
        this.connected = null;
        return false;
      }

      return true;
    } catch {
      this.connected = null;
      return false;
    }
  }

  async scanAndConnect(timeoutMs = 8000): Promise<Device | null> {
    if (this.connected) {
      const stillConnected = await this.connected.isConnected().catch(() => false);

      if (stillConnected) {
        console.log('[BLE] Already connected (verified)');
        return this.connected;
      }

      console.log('[BLE] Ghost connection detected → cleanup');
      this.connected = null;
    }

    if (this.bleState !== 'PoweredOn') {
      throw new Error('Bluetooth is OFF');
    }

    console.log('[BLE] Start scan');

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.manager.stopDeviceScan();
        console.log('[BLE] Scan timeout');
        reject(new Error('Scan timeout'));
      }, timeoutMs);

      this.manager.startDeviceScan(null, null, async (err, device) => {
        if (err) {
          clearTimeout(timer);
          console.log('[BLE] Scan error:', err.message);
          reject(err);
          return;
        }

        if (!device?.name) return;

        if (
          device.name.includes('ESP32') ||
          device.name.includes('BOX') ||
          device.name.includes('MEMO') ||
          device.name.includes('TALKING')
        ) {
          this.manager.stopDeviceScan();
          clearTimeout(timer);
          console.log('[BLE] Device found:', device.name);

          try {
            const d = await device.connect();
            await d.discoverAllServicesAndCharacteristics();
            this.connected = d;

            d.onDisconnected(() => {
              console.log('[BLE] Device disconnected');
              this.connected = null;
            });

            console.log('[BLE] Connected');

            try {
              const mtuValue = Number(await d.requestMTU(512));
              if (!isNaN(mtuValue)) {
                // Reserve 20 bytes for BLE header, max payload = MTU - 20
                this.chunkSize = Math.min(160, mtuValue - 23);
                console.log(
                  '[BLE] MTU:',
                  mtuValue,
                  'chunkSize:',
                  this.chunkSize,
                );
              }
            } catch {
              console.log(
                '[BLE] MTU negotiation failed, using default chunkSize',
                this.chunkSize,
              );
            }

            resolve(d);
          } catch (e: any) {
            console.log('[BLE] Connection error:', e.message);
            reject(e);
          }
        }
      });
    });
  }

  /** Send binary START frame with metadata. */
  async writeStartBinary(
    totalSize: number,
    sha256: string,
    filename: string,
    totalChunks?: number,
  ) {
    if (!this.connected) throw new Error('Not connected');

    if (!totalChunks) {
      totalChunks = Math.ceil(totalSize / this.chunkSize);
    }

    const shaShortHex = sha256.substring(0, 16);
    const shaBytes = Buffer.from(shaShortHex, 'hex');
    const filenameBytes = Buffer.from(filename, 'utf8');

    if (filenameBytes.length > 120) {
      throw new Error('Filename too long');
    }

    const headerLength =
      1 + 2 + 4 + 2 + 1 + filenameBytes.length + 8;

    const buf = Buffer.alloc(headerLength);

    let offset = 0;

    buf.writeUInt8(0x01, offset); offset += 1;
    buf.writeUInt16BE(totalChunks, offset); offset += 2;
    buf.writeUInt32BE(totalSize, offset); offset += 4;
    buf.writeUInt16BE(this.chunkSize, offset); offset += 2;

    buf.writeUInt8(filenameBytes.length, offset); offset += 1;
    filenameBytes.copy(buf, offset); offset += filenameBytes.length;

    shaBytes.copy(buf, offset);

    await this.connected.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHAR_START,
      buf.toString('base64'),
    );

    console.log('[BLE] START sent for', filename, {
      totalChunks,
      totalSize,
      chunkSize: this.chunkSize,
      shaShortHex,
    });
  }

  /** Send END frame. */
  async sendEnd() {
    if (!this.connected) throw new Error('Not connected');
    
    const buf = Buffer.from([0x02]);
    
    await this.connected.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHAR_START,
      buf.toString('base64'),
    );

    console.log('[BLE] END sent (binary)');
  }
  
  /** Send single chunk with sequence number. */
  async writeChunk(seq: number, payload: Uint8Array) {
    if (!this.connected) throw new Error('Not connected');

    const buf = Buffer.alloc(4 + payload.length);
    buf.writeUInt32BE(seq, 0);
    Buffer.from(payload).copy(buf, 4);

    await this.connected.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHAR_CHUNK,
      buf.toString('base64'),
    );
  }

  async subscribeStatus(
    cb: (msg: EspStatusMessage) => void,
  ): Promise<Subscription> {
    if (!this.connected) throw new Error('Not connected');

    return this.connected.monitorCharacteristicForService(
      SERVICE_UUID,
      CHAR_STATUS,
      (error, characteristic) => {
        if (error || !characteristic?.value) return;

        try {
          const decoded = Buffer
          .from(characteristic.value, 'base64')
          .toString('utf8');
          
          const raw = JSON.parse(decoded);
          const parsed = parseEspStatus(raw);
          
          if (parsed) {
            cb(parsed);
          }
        } catch {
          // ignore malformed frames
        }
      },
    );
  }

  async disconnect() {
    if (this.connected) {
      await this.connected.cancelConnection();
      this.connected = null;
    }
  }
}