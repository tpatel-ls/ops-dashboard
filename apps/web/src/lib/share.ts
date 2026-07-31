export interface SharePayload {
  title: string;
  text: string;
  url?: string;
}

type ShareNavigator = Navigator & {
  share?: (payload: ShareData) => Promise<void>;
  canShare?: (payload: ShareData) => boolean;
};

export async function shareOrCopy(payload: SharePayload): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator === 'undefined') return 'failed';

  const nav = navigator as ShareNavigator;
  const data: ShareData = {
    title: payload.title,
    text: payload.text,
    url: payload.url,
  };

  try {
    if (nav.share && (!nav.canShare || nav.canShare(data))) {
      await nav.share(data);
      return 'shared';
    }
  } catch (error) {
    // A cancelled share is intentional. Other native-share failures can still
    // use the clipboard fallback.
    if (error instanceof DOMException && error.name === 'AbortError') return 'failed';
  }

  try {
    await nav.clipboard?.writeText(
      [payload.title, payload.text, payload.url].filter(Boolean).join('\n'),
    );
    return nav.clipboard ? 'copied' : 'failed';
  } catch {
    return 'failed';
  }
}
