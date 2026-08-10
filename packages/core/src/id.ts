import { ulid } from 'ulid';

export function newId(): string {
  return ulid();
}

const DEVICE_KEY = 'ops.deviceId';
const MAX_DEVICE_ID_LENGTH = 128;
let fallbackDeviceId: string | undefined;

function storedDeviceId(value: string | null): string | undefined {
  if (
    !value ||
    value !== value.trim() ||
    value.length > MAX_DEVICE_ID_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return undefined;
  }
  return value;
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = storedDeviceId(window.localStorage.getItem(DEVICE_KEY));
    if (existing) return existing;
  } catch {
    return (fallbackDeviceId ??= ulid());
  }
  const id = (fallbackDeviceId ??= ulid());
  try {
    window.localStorage.setItem(DEVICE_KEY, id);
  } catch {
    // Storage can be unavailable in privacy modes; keep the in-memory ID.
  }
  return id;
}
