import { BleService } from '../BleService';
import { computeMeta, chunkFile } from '../../logic/FileChunker';
import { delay } from '../../utils/delay';

type SendFileContext = {
  ble: BleService;
  filePath: string;
  setProgress: (v: number) => void;
  setState: (v: string) => void;
};

export async function sendFileViaBle({
  ble,
  filePath,
  setProgress,
  setState,
}: SendFileContext): Promise<void> {
  let sub: any = null;
  let mounted = true;
  let doneOrFailed = false;

  try {
    console.log('[BLE FILE] Preparing file...');
    setProgress(0);
    setState('PREP FILE');

    const meta = await computeMeta(filePath, ble.chunkSize);
    console.log('[BLE FILE] File meta:', meta);

    if (!ble.isConnected()) {
      console.log('[BLE FILE] Not connected, scanning...');
      setState('CONNECTING...');
      await ble.scanAndConnect();
      console.log('[BLE FILE] Connected');
      setState('CONNECTED');
    }

    let startAck = false;
    let done = false;
    let failed = false;

    sub = await ble.subscribeStatus(msg => {
      if (!mounted || doneOrFailed) return;
      console.log('[STATUS MSG]', msg);

      switch (msg.event) {
        case 'start_ack':
          console.log('[STATUS] START ACK received');
          startAck = true;
          break;

        case 'ack': {
          const p = Math.floor((msg.seq / meta.totalChunks) * 100);
          console.log(`[STATUS] Chunk ack: seq=${msg.seq}, progress=${p}%`);
          setProgress(p);
          break;
        }

        case 'stored':
          console.log('[STATUS] File stored by ESP, SHA:', msg.sha256);
          done = true;
          doneOrFailed = true;
          setProgress(100);
          setState('DONE');
          sub?.remove();
          break;

        case 'timeout':
        case 'hash_mismatch':
        case 'start_error':
        case 'chunk_error':
        case 'assemble_error':
          console.error('[STATUS] ESP error:', msg);
          failed = true;
          doneOrFailed = true;
          setState('ERROR');
          sub?.remove();
          break;
      }
    });

    console.log('[BLE FILE] Sending START');
    setState('SEND START');
    await ble.writeStartBinary(meta.size, meta.sha256, meta.totalChunks);

    const t0 = Date.now();
    setState('WAIT ACK');
    while (!startAck) {
      if (failed) throw new Error('ESP rejected START');
      if (Date.now() - t0 > 3000) throw new Error('START ACK timeout');
      await delay(30);
    }

    console.log('[BLE FILE] Sending chunks...');
    setState('SEND CHUNKS');
    for await (const { seq, payload } of chunkFile(filePath, ble.chunkSize)) {
      if (failed) throw new Error('Transfer aborted');
      await ble.writeChunk(seq, payload);
    }

    console.log('[BLE FILE] Sending END...');
    await delay(200);
    setState('SEND END');
    await ble.sendEnd();

    console.log('[BLE FILE] Waiting final confirmation from ESP...');
    setState('WAIT ESP32');
    const t1 = Date.now();
    while (!done) {
      if (failed) throw new Error('ESP failed storing file');
      if (Date.now() - t1 > 10000) throw new Error('ESP store timeout');
      await delay(50);
    }
    console.log('[BLE FILE] Transfer completed successfully');
  } finally {
    mounted = false;
    try {
      sub?.remove();
    } catch {}
  }
}
