/**
 * Compute a deterministic audio hash from reminder message.
 *
 * Properties:
 * - Platform independent
 * - Stable across sessions
 * - Low collision risk for human-sized texts
 * - Versioned for future migrations
 */
export function computeAudioHash(message: string): string {
  const normalized = normalizeMessage(message);
  const hash = fnv1a32(normalized);

  return `tts_${hash}`;
}

/**
 * Normalize message to avoid accidental hash divergence.
 */
function normalizeMessage(message: string): string {
  return message
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * FNV-1a 32-bit hash.
 */
function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  // unsigned 32-bit, hex
  return (hash >>> 0).toString(16);
}
