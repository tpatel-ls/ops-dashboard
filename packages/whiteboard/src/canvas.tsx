'use client';

import { Tldraw, type TLStoreSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import { useCallback, useEffect, useRef } from 'react';
import { isPenEvent, shouldRejectAsPalm } from './pen';
import { createSnapshotSaver } from './snapshot-saver';

export interface DriftCanvasProps {
  initialDocument?: unknown;
  onSnapshot: (doc: TLStoreSnapshot) => void;
  className?: string;
}

const PALM_REJECT_WINDOW_MS = 200;
const SAVE_DELAY_MS = 600;

export function OpsCanvas({ initialDocument, onSnapshot, className }: DriftCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPenAt = useRef(0);
  const stopListening = useRef<(() => void) | null>(null);
  const onSnapshotRef = useRef(onSnapshot);
  const saver = useRef(
    createSnapshotSaver<TLStoreSnapshot>(
      (snapshot) => onSnapshotRef.current(snapshot),
      SAVE_DELAY_MS,
    ),
  );

  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
  }, [onSnapshot]);

  useEffect(() => {
    const pending = saver.current;
    // Closing or backgrounding the tab does not unmount the canvas, so an edit
    // still inside the debounce window would otherwise never be saved.
    function onHidden() {
      if (document.visibilityState === 'hidden') pending.flush();
    }
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', pending.flush);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', pending.flush);
      stopListening.current?.();
      stopListening.current = null;
      pending.flush();
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onPointer(e: PointerEvent) {
      if (isPenEvent(e)) {
        lastPenAt.current = Date.now();
      } else if (shouldRejectAsPalm(e, lastPenAt.current, PALM_REJECT_WINDOW_MS)) {
        e.stopPropagation();
        e.preventDefault();
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
      // A blank board is stored as `{}`, which is not a loadable snapshot.
      if (
        initialDocument &&
        typeof initialDocument === 'object' &&
        Object.keys(initialDocument).length > 0
      ) {
        try {
          editor.store.loadStoreSnapshot(initialDocument as TLStoreSnapshot);
        } catch {
          /* ignore corrupt snapshot */
        }
      }
      stopListening.current?.();
      stopListening.current = editor.store.listen(
        () => saver.current.schedule(editor.store.getStoreSnapshot()),
        { source: 'user', scope: 'document' },
      );
    },
    [initialDocument],
  );

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', inset: 0 }}>
      <Tldraw onMount={handleMount} />
    </div>
  );
}
