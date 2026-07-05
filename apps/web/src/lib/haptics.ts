type HapticPattern = number | number[];

const PATTERNS = {
  tap: 8,
  success: [12, 30, 18],
  warning: [24, 40, 24],
} satisfies Record<string, HapticPattern>;

function trigger(pattern: HapticPattern): boolean {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return false;
  return navigator.vibrate(pattern);
}

export function hapticTap(): boolean {
  return trigger(PATTERNS.tap);
}

export function hapticSuccess(): boolean {
  return trigger(PATTERNS.success);
}

export function hapticWarning(): boolean {
  return trigger(PATTERNS.warning);
}
