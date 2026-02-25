import { BleService } from './bleService';
import { sendFileViaBle } from '../ble/sendFileViaBle';
import { prepareSyncFiles } from './prepareSyncFiles';
import { delay } from '../../utils/delay';
import { EspStatusMessage } from '../../domain/espStatus';

type SyncContext = {
  ble: BleService;
  setProgress: (v: number) => void;
  onEspMessage: (msg: EspStatusMessage) => void;
};

/**
 * Synchronize memo.json and all required audio files with ESP.
 */
export async function syncWithEsp({
  ble,
  setProgress,
  onEspMessage,
}: SyncContext): Promise<void> {
  setProgress(0);

  const files = await prepareSyncFiles();
  const totalFiles = files.length;
  let current = 0;

  for (const file of files) {
    current++;

    await sendFileViaBle({
      ble,
      filePath: file.path,
      setProgress: p => {
        const base = ((current - 1) / totalFiles) * 100;
        const part = p / totalFiles;
        setProgress(Math.floor(base + part));
      },
      onEspMessage,
    });

    await delay(300);
  }

  setProgress(100);
}