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

    await navigator.clipboard.writeText(
      [payload.title, payload.text, payload.url].filter(Boolean).join('\n'),
    );
    return 'copied';
  } catch {
    return 'failed';
  }
}
