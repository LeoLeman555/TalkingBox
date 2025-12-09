import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

const SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
const CHAR_START = '12345678-1234-5678-1234-56789abcdef1';
const CHAR_CHUNK = '12345678-1234-5678-1234-56789abcdef2';
const CHAR_STATUS = '12345678-1234-5678-1234-56789abcdef3';

export class BleService {
  private manager = new BleManager();
  private connected: Device | null = null;
  public chunkSize = 180;

  async scanAndConnect(timeoutMs = 8000): Promise<Device> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.manager.stopDeviceScan();
        reject(new Error('Scan timeout'));
      }, timeoutMs);

      this.manager.startDeviceScan(null, null, async (err, device) => {
        if (err) {
          clearTimeout(timer);
          reject(err);
          return;
        }

        if (!device?.name) return;

        if (
          device.name.includes('ESP32') ||
          device.localName === 'ESP32_MP3_RX'
        ) {
          this.manager.stopDeviceScan();
          clearTimeout(timer);

          try {
            const d = await device.connect();
            await d.discoverAllServicesAndCharacteristics();
            this.connected = d;

            try {
              const mtuValue = Number(await d.requestMTU(512));
              if (!isNaN(mtuValue)) {
                this.chunkSize = Math.max(180, mtuValue - 64);
              }
            } catch {}

            resolve(d);
          } catch (e) {
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
  }

  async subscribeStatus(cb: (obj: any) => void) {
    if (!this.connected) throw new Error('Not connected');

    return this.connected.monitorCharacteristicForService(
      SERVICE_UUID,
      CHAR_STATUS,
      (err, characteristic) => {
        if (err || !characteristic?.value) return;
        try {
          const json = Buffer.from(characteristic.value, 'base64').toString(
            'utf8',
          );
          cb(JSON.parse(json));
        } catch {}
      },
    );
  }
}
