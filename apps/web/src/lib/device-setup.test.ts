import { describe, expect, it } from 'vitest';
import { APP_SHORTCUTS, DEVICE_SETUPS, getInstallReadiness } from './device-setup';

describe('device setup model', () => {
  it('covers Tanay’s target device surfaces', () => {
    expect(DEVICE_SETUPS.map((device) => device.id)).toEqual([
      's24-ultra',
      'tab-s10-ultra',
      'galaxy-watch',
      'mac',
      'windows',
    ]);
  });

  it('keeps the watch guidance honest: capture is phone-bridged, not a full PWA', () => {
    const watch = DEVICE_SETUPS.find((device) => device.id === 'galaxy-watch');

    expect(watch).toBeDefined();
    expect(watch?.primaryAction).toContain('/api/capture');
    expect(watch?.limitations.join(' ')).toMatch(/paired phone/i);
  });

  it('defines manifest shortcuts for the daily operating loop', () => {
    expect(APP_SHORTCUTS.map((shortcut) => shortcut.url)).toEqual([
      '/today',
      '/today?capture=1',
      '/tasks',
      '/inbox',
      '/ask',
    ]);
  });

  it('detects install and voice readiness from browser capability facts', () => {
    expect(
      getInstallReadiness({
        standalone: false,
        serviceWorker: true,
        mediaRecorder: true,
        speechRecognition: false,
        notification: true,
        online: true,
      }),
    ).toEqual({
      install: 'ready',
      voice: 'ready',
      notifications: 'ready',
      sync: 'ready',
    });

    expect(
      getInstallReadiness({
        standalone: true,
        serviceWorker: false,
        mediaRecorder: false,
        speechRecognition: false,
        notification: false,
        online: false,
      }),
    ).toEqual({
      install: 'installed',
      voice: 'unavailable',
      notifications: 'unavailable',
      sync: 'offline',
    });
  });
});
