export interface PenPointerSample {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  twist: number;
  timestamp: number;
}

export const PEN_BUTTON_ERASER = 5;

export function isPenEvent(e: PointerEvent): boolean {
  return e.pointerType === 'pen';
}

export function shouldRejectAsPalm(
  e: PointerEvent,
  lastPenActivityMs: number,
  windowMs = 200,
): boolean {
  if (e.pointerType !== 'touch') return false;
  return Date.now() - lastPenActivityMs < windowMs;
}

export function samplePen(e: PointerEvent): PenPointerSample {
  return {
    x: e.clientX,
    y: e.clientY,
    pressure: e.pressure,
    tiltX: e.tiltX,
    tiltY: e.tiltY,
    twist: e.twist,
    timestamp: e.timeStamp,
  };
}

export { DriftCanvas, type DriftCanvasProps } from './canvas';
