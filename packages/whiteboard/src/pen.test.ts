import { afterEach, describe, expect, it, vi } from 'vitest';
import { PEN_BUTTON_ERASER, isPenEvent, samplePen, shouldRejectAsPalm } from './pen';

/** Only the properties these helpers read; a real PointerEvent needs a DOM. */
function pointer(overrides: Partial<PointerEvent> = {}): PointerEvent {
  return {
    pointerType: 'pen',
    clientX: 0,
    clientY: 0,
    pressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    timeStamp: 0,
    ...overrides,
  } as PointerEvent;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('isPenEvent', () => {
  it('accepts only pen pointers', () => {
    expect(isPenEvent(pointer({ pointerType: 'pen' }))).toBe(true);
    expect(isPenEvent(pointer({ pointerType: 'touch' }))).toBe(false);
    expect(isPenEvent(pointer({ pointerType: 'mouse' }))).toBe(false);
  });
});

describe('shouldRejectAsPalm', () => {
  it('rejects a touch that lands inside the window after pen activity', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    expect(shouldRejectAsPalm(pointer({ pointerType: 'touch' }), 900)).toBe(true);
  });

  it('allows a touch once the window has elapsed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    expect(shouldRejectAsPalm(pointer({ pointerType: 'touch' }), 800)).toBe(false);
  });

  it('treats the window as exclusive at its boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    expect(shouldRejectAsPalm(pointer({ pointerType: 'touch' }), 800, 200)).toBe(false);
    expect(shouldRejectAsPalm(pointer({ pointerType: 'touch' }), 801, 200)).toBe(true);
  });

  it('honors a custom window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    expect(shouldRejectAsPalm(pointer({ pointerType: 'touch' }), 500, 100)).toBe(false);
    expect(shouldRejectAsPalm(pointer({ pointerType: 'touch' }), 500, 600)).toBe(true);
  });

  it('never rejects pen or mouse pointers, however recent the pen was', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    expect(shouldRejectAsPalm(pointer({ pointerType: 'pen' }), 1_000)).toBe(false);
    expect(shouldRejectAsPalm(pointer({ pointerType: 'mouse' }), 1_000)).toBe(false);
  });

  it('allows touch when no pen activity has been recorded yet', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    expect(shouldRejectAsPalm(pointer({ pointerType: 'touch' }), 0)).toBe(false);
  });
});

describe('samplePen', () => {
  it('copies the stylus channels the canvas records', () => {
    const sample = samplePen(
      pointer({
        clientX: 12,
        clientY: 34,
        pressure: 0.5,
        tiltX: -20,
        tiltY: 15,
        twist: 90,
        timeStamp: 1234.5,
      }),
    );

    expect(sample).toEqual({
      x: 12,
      y: 34,
      pressure: 0.5,
      tiltX: -20,
      tiltY: 15,
      twist: 90,
      timestamp: 1234.5,
    });
  });
});

describe('PEN_BUTTON_ERASER', () => {
  it('matches the pointer button the stylus tail reports', () => {
    expect(PEN_BUTTON_ERASER).toBe(5);
  });
});
