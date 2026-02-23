import { BleService } from './bleService';
import { computeMeta, chunkFile } from './fileChunker';
import { delay } from '../../utils/delay';
import { EspStatusMessage } from '../../domain/espStatus';

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
  const filename = filePath.split('/').pop();
  if (!filename) throw new Error('Invalid file path');

  const meta = await computeMeta(filePath, ble.chunkSize);

  let espState: string | null = null;
  let failed = false;

  await ble.subscribeStatus((msg: EspStatusMessage) => {
    switch (msg.type) {
      case 'state':
        espState = msg.state;
        setState(msg.state.toUpperCase());

        if (msg.state === 'ready') {
          setProgress(100);
        }

        if (msg.state === 'error') {
          failed = true;
        }
        break;

      case 'progress':
        if (msg.subsystem === 'storage') {
          const percent = Math.floor(
            (msg.current / msg.total) * 100,
          );
          setProgress(percent);
        }
        break;

      case 'error':
        failed = msg.fatal;
        setState(`ERROR_${msg.code}`);
        break;

      case 'telemetry':
        // Optional handling
        break;
    }
  });

  setState('SEND_START');

  await ble.writeStartBinary(
    meta.size,
    meta.sha256,
    filename,
    meta.totalChunks,
  );

  const startTimeout = Date.now();

  while (espState !== 'receiving') {
    if (failed) throw new Error('ESP error');
    if (Date.now() - startTimeout > 5000) {
      throw new Error('START timeout');
    }
    await delay(50);
  }

  setState('SEND_CHUNKS');

  for await (const { seq, payload } of chunkFile(
    filePath,
    ble.chunkSize,
  )) {
    if (failed) throw new Error('Transfer aborted');
    await ble.writeChunk(seq, payload);
  }

  setState('SEND_END');
  await ble.sendEnd();

  const finalTimeout = Date.now();

  while (espState !== 'ready') {
    if (failed) throw new Error('ESP failed');
    if (Date.now() - finalTimeout > 15000) {
      throw new Error('Finalize timeout');
    }
    await delay(100);
  }

  setState('DONE');
}