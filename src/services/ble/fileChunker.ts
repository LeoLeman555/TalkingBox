import RNFS from 'react-native-fs';
import CryptoJS from 'crypto-js';
import { Buffer } from 'buffer';

export async function computeMeta(path: string, payloadSize: number) {
  const stat = await RNFS.stat(path);
  const size = Number(stat.size);

  const b64 = await RNFS.readFile(path, 'base64');
  const w = CryptoJS.enc.Base64.parse(b64);
  const sha256 = CryptoJS.SHA256(w).toString(CryptoJS.enc.Hex);

  const totalChunks = Math.ceil(size / payloadSize);

  return {
    size,
    sha256,
    totalChunks,
    filename: path.split('/').pop() || 'file.mp3',
  };
}

export async function* chunkFile(filePath: string, chunkSize: number) {
  const base64 = await RNFS.readFile(filePath, 'base64');
  const buffer = Buffer.from(base64, 'base64');

  let seq = 0;
  for (let offset = 0; offset < buffer.length; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, buffer.length);
    const payload = buffer.slice(offset, end);
    yield { seq, payload };
    seq++;
  }
}
