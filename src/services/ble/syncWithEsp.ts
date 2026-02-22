import { BleService } from '../BleService';
import { sendFileViaBle } from '../ble/sendFileViaBle';
import { prepareSyncFiles } from './prepareSyncFiles';
import { delay } from '../../utils/delay';

type SyncContext = {
  ble: BleService;
  setProgress: (v: number) => void;
  setState: (v: string) => void;
};

/**
 * Synchronize memo.json and all required audio files with ESP.
 * This is the function to bind to "Synchronize with ESP" button.
 */
export async function syncWithEsp({
  ble,
  setProgress,
  setState,
}: SyncContext): Promise<void> {
  setState('PREPARING FILES');
  setProgress(0);

  const files = await prepareSyncFiles();

  const totalFiles = files.length;
  let current = 0;

  for (const file of files) {
    current++;

    setState(
      `SYNC ${file.type.toUpperCase()} (${current}/${totalFiles})`,
    );

    await sendFileViaBle({
      ble,
      filePath: file.path,
      setProgress: p => {
        // Global progress (file-based)
        const base = ((current - 1) / totalFiles) * 100;
        const part = (p / totalFiles);
        setProgress(Math.floor(base + part));
      },
      setState,
    });

    // Small guard delay between files (BLE stability)
    await delay(300);
  }

  setProgress(100);
  setState('SYNC DONE');
}