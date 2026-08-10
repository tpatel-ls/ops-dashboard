export const MAX_JOURNAL_IMAGE_BYTES = 5 * 1024 * 1024;

const JOURNAL_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

export type JournalImageMediaType = (typeof JOURNAL_IMAGE_TYPES)[number];

type JournalImageValidation =
  | { ok: true; data: string; mediaType: JournalImageMediaType }
  | { ok: false; reason: 'invalid-image' | 'invalid-image-type' | 'image-too-large' };

function matchesImageSignature(data: string, mediaType: JournalImageMediaType): boolean {
  const bytes = Buffer.from(data.slice(0, 24), 'base64');
  if (mediaType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mediaType === 'image/png') {
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mediaType === 'image/gif') {
    const signature = bytes.subarray(0, 6).toString('ascii');
    return signature === 'GIF87a' || signature === 'GIF89a';
  }
  return (
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

export function validateJournalImage(
  imageBase64: string,
  mediaType: string,
  maxBytes = MAX_JOURNAL_IMAGE_BYTES,
): JournalImageValidation {
  const data = imageBase64.trim();
  if (!data || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
    return { ok: false, reason: 'invalid-image' };
  }
  if (!JOURNAL_IMAGE_TYPES.includes(mediaType as JournalImageMediaType)) {
    return { ok: false, reason: 'invalid-image-type' };
  }

  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
  const decodedBytes = (data.length / 4) * 3 - padding;
  if (decodedBytes > maxBytes) return { ok: false, reason: 'image-too-large' };
  if (!matchesImageSignature(data, mediaType as JournalImageMediaType)) {
    return { ok: false, reason: 'invalid-image' };
  }

  return { ok: true, data, mediaType: mediaType as JournalImageMediaType };
}
