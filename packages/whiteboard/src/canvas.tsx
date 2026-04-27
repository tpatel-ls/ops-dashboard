'use client';

import { Tldraw, type TLStoreSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import { useCallback, useEffect, useRef } from 'react';

export interface DriftCanvasProps {
  initialDocument?: unknown;
  onSnapshot: (doc: TLStoreSnapshot) => void;
  className?: string;
}

const PALM_REJECT_WINDOW_MS = 200;

export function DriftCanvas({ initialDocument, onSnapshot, className }: DriftCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPenAt = useRef(0);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onPointer(e: PointerEvent) {
      if (e.pointerType === 'pen') {
        lastPenAt.current = Date.now();
      } else if (e.pointerType === 'touch') {
        if (Date.now() - lastPenAt.current < PALM_REJECT_WINDOW_MS) {
          e.stopPropagation();
          e.preventDefault();
        }
      }
    }

    el.addEventListener('pointerdown', onPointer, { capture: true });
    el.addEventListener('pointermove', onPointer, { capture: true });
    return () => {
      el.removeEventListener('pointerdown', onPointer, { capture: true } as EventListenerOptions);
      el.removeEventListener('pointermove', onPointer, { capture: true } as EventListenerOptions);
    };
  }, []);

  const handleMount = useCallback(
    (editor: import('tldraw').Editor) => {
      if (initialDocument && typeof initialDocument === 'object') {
        try {
          editor.store.loadStoreSnapshot(initialDocument as TLStoreSnapshot);
        } catch {
          /* ignore corrupt snapshot */
        }
      }
      const off = editor.store.listen(
        () => {
          if (saveTimer.current) window.clearTimeout(saveTimer.current);
          saveTimer.current = window.setTimeout(() => {
            onSnapshot(editor.store.getStoreSnapshot());
          }, 600);
        },
        { source: 'user', scope: 'document' },
      );
      return () => off();
    },
    [initialDocument, onSnapshot],
  );

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', inset: 0 }}>
      <Tldraw onMount={handleMount} />
    </div>
  );
}
