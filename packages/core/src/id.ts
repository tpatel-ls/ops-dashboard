import { ulid } from 'ulid';

export function newId(): string {
  return ulid();
}

const DEVICE_KEY = 'drift.deviceId';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = ulid();
  window.localStorage.setItem(DEVICE_KEY, id);
  return id;
}
