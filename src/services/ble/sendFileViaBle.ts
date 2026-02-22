import { BleService } from '../BleService';
import { computeMeta, chunkFile } from '../../logic/FileChunker';
import { delay } from '../../utils/delay';

type SupportedFileType = 'wav' | 'json';

type SendFileContext = {
  ble: BleService;
  filePath: string;
  setProgress: (v: number) => void;
  setState: (v: string) => void;
};

/** Detect supported file type from filename. */
function detectFileType(filename: string): SupportedFileType {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'wav') return 'wav';
  if (ext === 'json') return 'json';

  throw new Error(`Unsupported file type: .${ext}`);
}

export async function sendFileViaBle({
  ble,
  filePath,
  setProgress,
  setState,
}: SendFileContext): Promise<void> {
  let mounted = true;
  let doneOrFailed = false;

  try {
    setProgress(0);
    setState('PREP FILE');
    console.log('[BLE FILE] Preparing file...');

    const filename = filePath.split('/').pop();
    if (!filename) {
      throw new Error('Invalid file path');
    }

    const fileType = detectFileType(filename);
    console.log('[BLE FILE] File type:', fileType);

    const meta = await computeMeta(filePath, ble.chunkSize);
    console.log('[BLE FILE] File meta:', meta);

    let startAck = false;
    let done = false;
    let failed = false;

    // NOTE: Do not manually cancel BLE monitors on Android.
    // react-native-ble-plx may crash when cancelTransaction is called
    // while notifications are still being dispatched.

    await ble.subscribeStatus(msg => {
      if (!mounted || doneOrFailed) return;

      console.log('[STATUS MSG]', msg);

      switch (msg.event) {
        case 'start_ack':
          console.log('[STATUS] START ACK received');
          startAck = true;
          break;

        case 'ack': {
          const progress = Math.min(
            100,
            Math.floor((msg.seq / meta.totalChunks) * 100),
          );
          setProgress(progress);
          break;
        }

        case 'stored':
          console.log('[STATUS] File stored by ESP, SHA:', msg.sha256);
          done = true;
          doneOrFailed = true;
          setProgress(100);
          setState('DONE');
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
          break;
      }
    });

    // ---------- START ----------
    setState('SEND START');
    console.log('[BLE FILE] Sending START');

    await ble.writeStartBinary(
      meta.size,
      meta.sha256,
      filename,
      meta.totalChunks,
    );

    const startTimeout = Date.now();
    setState('WAIT START ACK');

    while (!startAck) {
      if (failed) throw new Error('ESP rejected START');
      if (Date.now() - startTimeout > 3000) {
        throw new Error('START ACK timeout');
      }
      await delay(30);
    }

    // ---------- CHUNKS ----------
    setState('SEND CHUNKS');
    console.log('[BLE FILE] Sending chunks...');

    for await (const { seq, payload } of chunkFile(filePath, ble.chunkSize)) {
      if (failed) {
        throw new Error('Transfer aborted');
      }
      await ble.writeChunk(seq, payload);
    }

    // ---------- END ----------
    setState('SEND END');
    await delay(200);
    await ble.sendEnd();

    // ---------- FINAL ACK ----------
    setState('WAIT ESP32');
    const finalTimeout = Date.now();

    while (!done) {
      if (failed) throw new Error('ESP failed storing file');
      if (Date.now() - finalTimeout > 10000) {
        throw new Error('ESP store timeout');
      }
      await delay(50);
    }

    console.log('[BLE FILE] Transfer completed successfully');
  } finally {
    mounted = false;
  }
}