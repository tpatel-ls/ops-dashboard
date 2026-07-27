export const MAX_JOURNAL_IMAGE_BYTES = 5 * 1024 * 1024;

const JOURNAL_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

export type JournalImageMediaType = (typeof JOURNAL_IMAGE_TYPES)[number];

type JournalImageValidation =
  | { ok: true; data: string; mediaType: JournalImageMediaType }
  | { ok: false; reason: 'invalid-image' | 'invalid-image-type' | 'image-too-large' };

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

  return { ok: true, data, mediaType: mediaType as JournalImageMediaType };
}
