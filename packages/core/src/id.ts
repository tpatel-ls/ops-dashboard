import { ulid } from 'ulid';

export function newId(): string {
  return ulid();
}

const DEVICE_KEY = 'ops.deviceId';
let fallbackDeviceId: string | undefined;

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY);
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
