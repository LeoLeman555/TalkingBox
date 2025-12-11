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

  public chunkSize = 180;

  public isConnected(): boolean {
    return this.connected !== null;
  }

  /** One-line docstring: scan and connect to ESP32. */
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
          device.localName === 'TALKING BOX - ESP32'
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
                this.chunkSize = Math.max(180, mtuValue - 64);
                console.log('[BLE] MTU:', mtuValue);
              }
            } catch {
              console.log('[BLE] MTU negotiation failed');
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

  async writeStart(json: any) {
    if (!this.connected) throw new Error('Not connected');

    const payload = Buffer.from(JSON.stringify(json)).toString('base64');
    await this.connected.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHAR_START,
      payload,
    );

    console.log('[BLE] START sent');
  }

  async writeChunk(seq: number, payload: Uint8Array) {
    if (!this.connected) throw new Error('Not connected');

    const header = Buffer.alloc(4);
    header.writeUInt32BE(seq, 0);

    const full = Buffer.concat([header, Buffer.from(payload)]);

    await this.connected.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHAR_CHUNK,
      full.toString('base64'),
    );

    console.log('[BLE] Chunk', seq);
  }

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
        } catch {}
      },
    );
  }

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

  async readDeviceInfo(): Promise<BleDeviceInfo> {
    if (!this.connected) throw new Error('Not connected');

    const d = this.connected;
    console.log('[BLE] Read device info');

    // RSSI
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
      mtu: this.chunkSize + 64,
      rssi,
      firmwareVersion: firmware,
    };
  }
}
