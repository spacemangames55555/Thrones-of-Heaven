/**
 * SAVE PORTABILITY — the portable "save code" format.
 *
 * A save code is the EXACT save-slot JSON, base64-encoded behind a versioned
 * prefix ('TOH1.'). Export → import must round-trip BYTE-IDENTICALLY: encode
 * never re-serializes or touches the JSON, and decode returns the original
 * string only after it parses as a real save (an object with a numeric
 * saveVersion). UTF-8 is handled explicitly (btoa alone can't carry it).
 */

const PREFIX = 'TOH1.';

/** The save-slot JSON → a portable save code (prefix + base64, exact bytes). */
export function encodeSaveCode(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  // Chunked conversion: String.fromCharCode(...bigArray) overflows the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return PREFIX + btoa(bin);
}

/** A save code → the EXACT original save JSON, or null if it isn't a valid code. */
export function decodeSaveCode(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  try {
    const bin = atob(trimmed.slice(PREFIX.length));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || typeof (parsed as { saveVersion?: unknown }).saveVersion !== 'number') return null;
    return json;
  } catch {
    return null;
  }
}
