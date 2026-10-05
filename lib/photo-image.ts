/** Tjek af fotoet. Billedet gemmes ikke. */

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_BASE64_CHARS = 5_800_000;

export type DecodedPhoto = { bytes: Uint8Array; mediaType: string };

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function decodePhotoPayload(input: { mediaType?: unknown; imageBase64?: unknown }):
  | { ok: true; photo: DecodedPhoto }
  | { ok: false; error: string } {
  let mediaType = typeof input.mediaType === 'string' ? input.mediaType.toLowerCase().trim() : '';
  let raw = typeof input.imageBase64 === 'string' ? input.imageBase64.trim() : '';
  const dataUrl = raw.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i);
  if (dataUrl) {
    mediaType = mediaType || dataUrl[1].toLowerCase();
    raw = dataUrl[2];
  }
  if (!ALLOWED.has(mediaType)) return fail('Brug et foto i JPG, PNG eller WebP.');
  raw = raw.replace(/\s/g, '');
  if (!raw || raw.length > MAX_BASE64_CHARS || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
    return fail('Billedet er for stort eller kunne ikke læses.');
  }
  const bytes = Buffer.from(raw, 'base64');
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return fail('Billedet må højst fylde 4 MB.');
  return { ok: true, photo: { bytes, mediaType } };
}
