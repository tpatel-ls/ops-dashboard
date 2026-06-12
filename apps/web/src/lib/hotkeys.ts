'use client';

import { useEffect, useRef } from 'react';

export type HotkeyHandler = (e: KeyboardEvent) => void;

export interface Hotkey {
  combo: string;
  handler: HotkeyHandler;
  when?: () => boolean;
}

function isTypingTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

function matchSingle(combo: string, e: KeyboardEvent): boolean {
  const parts = combo.toLowerCase().split('+').map((p) => p.trim());
  const key = parts.pop()!;
  const wantMeta = parts.includes('mod') || parts.includes('cmd');
  const wantCtrl = parts.includes('ctrl');
  const wantShift = parts.includes('shift');
  const wantAlt = parts.includes('alt');
  if (wantMeta && !(e.metaKey || e.ctrlKey)) return false;
  if (wantCtrl && !e.ctrlKey) return false;
  if (wantShift !== e.shiftKey) return false;
  if (wantAlt !== e.altKey) return false;
  if (e.key.toLowerCase() !== key) return false;
  return true;
}

export function useHotkeys(hotkeys: Hotkey[]): void {
  const ref = useRef(hotkeys);
  useEffect(() => {
    ref.current = hotkeys;
  }, [hotkeys]);
  useEffect(() => {
    let chordKey: string | null = null;
    let chordTimer: number | null = null;

    function clearChord() {
      chordKey = null;
      if (chordTimer !== null) {
        window.clearTimeout(chordTimer);
        chordTimer = null;
      }
    }

    function onKey(e: KeyboardEvent) {
      const list = ref.current;
      const inField = isTypingTarget(e);
      for (const hk of list) {
        if (hk.when && !hk.when()) continue;
        const combo = hk.combo.toLowerCase();
        const isChord = combo.includes(' then ');
        if (isChord) {
          if (inField) continue;
          const [first, second] = combo.split(' then ').map((s) => s.trim());
          if (chordKey === first && e.key.toLowerCase() === second) {
            e.preventDefault();
            hk.handler(e);
            clearChord();
            return;
          }
          if (chordKey === null && e.key.toLowerCase() === first && !e.metaKey && !e.ctrlKey) {
            chordKey = first ?? null;
            chordTimer = window.setTimeout(clearChord, 1200);
            return;
          }
          continue;
        }
        const allowsMeta = combo.includes('mod') || combo.includes('cmd') || combo.includes('ctrl');
        if (inField && !allowsMeta) continue;
        if (matchSingle(combo, e)) {
          e.preventDefault();
          hk.handler(e);
          clearChord();
          return;
        }
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
