/**
 * Room codes are read aloud over the phone and typed on a stranger's screen,
 * so the alphabet drops every ambiguous glyph: no I/L/1, no O/0, no U (to
 * avoid accidental words). 6 chars over 30 symbols ≈ 729M combinations.
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

/** Largest multiple of ALPHABET.length that fits in a byte, for rejection sampling. */
const REJECTION_LIMIT = 256 - (256 % ALPHABET.length);

/**
 * Cryptographically uniform. Rejection sampling avoids the modulo bias a plain
 * `byte % 30` would introduce — cheap here, and it keeps codes evenly spread.
 */
export function generateRoomCode(): string {
  let code = "";
  const buffer = new Uint8Array(ROOM_CODE_LENGTH * 2);

  while (code.length < ROOM_CODE_LENGTH) {
    crypto.getRandomValues(buffer);
    for (const byte of buffer) {
      if (code.length === ROOM_CODE_LENGTH) break;
      if (byte >= REJECTION_LIMIT) continue;
      code += ALPHABET[byte % ALPHABET.length];
    }
  }

  return code;
}

/** Accepts "k7m-p2q", " K7M P2Q ", "K7MP2Q" — all mean the same room. */
export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidRoomCode(input: string): boolean {
  const code = normalizeRoomCode(input);
  if (code.length !== ROOM_CODE_LENGTH) return false;
  return [...code].every((char) => ALPHABET.includes(char));
}

/** Display form: "K7MP2Q" -> "K7M-P2Q". Easier to read back to someone. */
export function formatRoomCode(code: string): string {
  const normalized = normalizeRoomCode(code);
  if (normalized.length !== ROOM_CODE_LENGTH) return normalized;
  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
}
