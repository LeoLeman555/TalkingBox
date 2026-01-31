import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

const SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
const CHAR_START = '12345678-1234-5678-1234-56789abcdef1';
const CHAR_CHUNK = '12345678-1234-5678-1234-56789abcdef2';
const CHAR_STATUS = '12345678-1234-5678-1234-56789abcdef3';

export interface BleDeviceInfo {
  name: string | null;
  id: string;
  mtu: number;
  rssi: number | null;
  firmwareVersion: string | null;
}

export class BleService {
  private manager = new BleManager();
  private connected: Device | null = null;

  public chunkSize = 480;

  public isConnected(): boolean {
    return this.connected !== null;
  }

  async scanAndConnect(timeoutMs = 8000): Promise<Device> {
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
          device.localName === 'TALKING BOX'
        ) {
          this.manager.stopDeviceScan();
          clearTimeout(timer);
          console.log('[BLE] Device found:', device.name);

          try {
            const d = await device.connect();
            await d.discoverAllServicesAndCharacteristics();
            this.connected = d;

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
    totalChunks?: number,
  ) {
    if (!this.connected) throw new Error('Not connected');

    // Calculate chunkSize if not passed
    if (!totalChunks) {
      totalChunks = Math.ceil(totalSize / this.chunkSize);
    } else {
      this.chunkSize = Math.ceil(totalSize / totalChunks);
    }

    const shaShortHex = sha256.substring(0, 16);
    const shaBytes = Buffer.from(shaShortHex, 'hex');

    const buf = Buffer.alloc(17);
    buf.writeUInt8(0x01, 0); // START flag
    buf.writeUInt16BE(totalChunks, 1); // total chunks
    buf.writeUInt32BE(totalSize, 3); // total size
    buf.writeUInt16BE(this.chunkSize, 7); // chunk size
    shaBytes.copy(buf, 9); // SHA short

    await this.connected.writeCharacteristicWithoutResponseForService(
      SERVICE_UUID,
      CHAR_START,
      buf.toString('base64'),
    );

    console.log('[BLE] START sent', {
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

    if (seq % 64 === 0) {
      console.log('[BLE] chunk sent', seq);
    }
  }

  /** Subscribe to STATUS notifications. */
  async subscribeStatus(cb: (obj: any) => void) {
    if (!this.connected) throw new Error('Not connected');

    console.log('[BLE] Subscribe STATUS');

    return this.connected.monitorCharacteristicForService(
      SERVICE_UUID,
      CHAR_STATUS,
      (err, char) => {
        if (err || !char?.value) return;

        try {
          const json = Buffer.from(char.value, 'base64').toString('utf8');
          cb(JSON.parse(json));
        } catch (e) {
          console.log('[BLE] STATUS parse error', e);
        }
      },
    );
  }

  /** Read firmware version from STATUS characteristic. */
  async getFirmwareVersion(): Promise<string | null> {
    if (!this.connected) return null;

    try {
      const c = await this.connected.readCharacteristicForService(
        SERVICE_UUID,
        CHAR_STATUS,
      );
      if (!c?.value) return null;

      const decoded = Buffer.from(c.value, 'base64').toString('utf8');
      const obj = JSON.parse(decoded);
      return typeof obj.firmware === 'string' ? obj.firmware : null;
    } catch {
      return null;
    }
  }

  /** Read device info including RSSI and firmware. */
  async readDeviceInfo(): Promise<BleDeviceInfo> {
    if (!this.connected) throw new Error('Not connected');

    const d = this.connected;
    console.log('[BLE] Read device info');

    let rssi: number | null = null;
    try {
      const updated = await d.readRSSI();
      rssi = updated.rssi ?? null;
      console.log('[BLE] RSSI:', rssi);
    } catch {
      console.log('[BLE] RSSI read failed');
    }

    const firmware = await this.getFirmwareVersion().catch(() => null);

    return {
      name: d.name ?? null,
      id: d.id,
      mtu: this.chunkSize + 20,
      rssi,
      firmwareVersion: firmware,
    };
  }
}
