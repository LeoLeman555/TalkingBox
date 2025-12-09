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

export async function* chunkFile(path: string, payloadSize: number) {
  const b64 = await RNFS.readFile(path, 'base64');
  const buf = Buffer.from(b64, 'base64');
  let seq = 0;

  for (let offset = 0; offset < buf.length; offset += payloadSize) {
    const slice = buf.slice(offset, offset + payloadSize);
    yield { seq, payload: slice };
    seq++;
  }
}
