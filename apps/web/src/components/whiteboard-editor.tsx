'use client';

import dynamic from 'next/dynamic';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { getDb } from '@ops-dashboard/core';
import { availableWhiteboard, saveWhiteboard } from '@/lib/whiteboards';
import { latestSingleFlight } from '@/lib/trailing-single-flight';

const OpsCanvas = dynamic(() => import('@ops-dashboard/whiteboard').then((m) => m.OpsCanvas), {
  ssr: false,
  loading: () => (
    <div className="surface dot-grid text-muted-foreground flex h-[70vh] items-center justify-center text-sm">
      Loading canvas...
    </div>
  ),
});

export function WhiteboardEditor({ id }: { id: string }) {
  const board = useLiveQuery(
    async () => availableWhiteboard(await getDb().whiteboards.get(id)),
    [id],
  );
  const saveSnapshot = useMemo(
    () => latestSingleFlight((document: unknown) => saveWhiteboard(id, document)),
    [id],
  );
  // The catch below used to be silent. A later change does retry, but a user
  // who stops editing after a failed save (a full storage quota, say) was never
  // told the board on screen is not the one on disk.
  const [saveFailed, setSaveFailed] = useState(false);

  if (board === undefined) {
    return (
      <div className="surface text-muted-foreground flex h-[70vh] items-center justify-center text-sm">
        Loading...
      </div>
    );
  }

  if (!board) {
    return (
      <div className="surface text-muted-foreground flex h-[70vh] items-center justify-center text-sm">
        Whiteboard not found.
      </div>
    );
  }

  return (
    <>
      {/* Above the canvas, not over it, so it never covers the tldraw menus. */}
      {saveFailed ? (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive border-destructive/30 mb-2 rounded-md border px-3 py-2 text-xs"
        >
          Could not save the latest whiteboard changes. Your next edit will try again.
        </p>
      ) : null}
      <div className="surface relative h-[calc(100vh-180px)] overflow-hidden">
        <OpsCanvas
          initialDocument={board.document}
          onSnapshot={(doc) => {
            void saveSnapshot(doc).then(
              () => setSaveFailed(false),
              // A later canvas change retries with the latest full snapshot.
              () => setSaveFailed(true),
            );
          }}
        />
      </div>
    </>
  );
}
