type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

function badgeNavigator(): BadgeNavigator | null {
  if (typeof navigator === 'undefined') return null;
  return navigator as BadgeNavigator;
}

export function supportsAppBadge(): boolean {
  const nav = badgeNavigator();
  return Boolean(nav?.setAppBadge && nav.clearAppBadge);
}

export async function updateAppBadge(count: number): Promise<boolean> {
  const nav = badgeNavigator();
  if (!nav?.setAppBadge || !nav.clearAppBadge) return false;

  try {
    if (count > 0) await nav.setAppBadge(count);
    else await nav.clearAppBadge();
    return true;
  } catch {
    return false;
  }
}
