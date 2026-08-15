'use client';

import dynamic from 'next/dynamic';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { getDb } from '@ops-dashboard/core';
import { saveWhiteboard } from '@/lib/whiteboards';
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
  const board = useLiveQuery(async () => getDb().whiteboards.get(id), [id]);
  const saveSnapshot = useMemo(
    () => latestSingleFlight((document: unknown) => saveWhiteboard(id, document)),
    [id],
  );

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
    <div className="surface relative h-[calc(100vh-180px)] overflow-hidden">
      <OpsCanvas
        initialDocument={board.document}
        onSnapshot={(doc) => {
          void saveSnapshot(doc).catch(() => {
            // A later canvas change retries with the latest full snapshot.
          });
        }}
      />
    </div>
  );
}
