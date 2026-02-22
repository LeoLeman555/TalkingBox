import RNFS from 'react-native-fs';
import { generateMemoFile } from '../memo/memoRepository';

export type SyncFile = {
  path: string;
  type: 'json' | 'wav';
};

/**
 * Prepare the ordered list of files to sync with the ESP.
 * Order is critical:
 * 1. memo.json
 * 2. referenced audio files
 */
export async function prepareSyncFiles(): Promise<SyncFile[]> {
  const memoPath = await generateMemoFile();

  const memoRaw = await RNFS.readFile(memoPath, 'utf8');
  const memo = JSON.parse(memoRaw);

  if (!Array.isArray(memo.items)) {
    throw new Error('Invalid memo.json format');
  }

  const files: SyncFile[] = [
    { path: memoPath, type: 'json' },
  ];

  const audioDir = `${RNFS.DocumentDirectoryPath}/tts`;
  const seen = new Set<string>();

  for (const item of memo.items) {
    if (typeof item.audioFile !== 'string') {
      throw new Error(`Invalid audioFile in memo item`);
    }

    if (seen.has(item.audioFile)) {
      continue;
    }

    const audioPath = `${audioDir}/${item.audioFile}`;
    const exists = await RNFS.exists(audioPath);

    if (!exists) {
      throw new Error(`Missing audio file: ${item.audioFile}`);
    }

    seen.add(item.audioFile);
    files.push({
      path: audioPath,
      type: 'wav',
    });
  }

  return files;
}