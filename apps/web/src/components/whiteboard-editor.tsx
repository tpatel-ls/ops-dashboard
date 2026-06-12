'use client';

import dynamic from 'next/dynamic';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@ops-dashboard/core';
import { saveWhiteboard } from '@/lib/whiteboards';

const OpsCanvas = dynamic(
  () => import('@ops-dashboard/whiteboard').then((m) => m.OpsCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="surface dot-grid flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
        Loading canvas...
      </div>
    ),
  },
);

export function WhiteboardEditor({ id }: { id: string }) {
  const board = useLiveQuery(async () => getDb().whiteboards.get(id), [id]);

  if (board === undefined) {
    return (
      <div className="surface flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!board) {
    return (
      <div className="surface flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
        Whiteboard not found.
      </div>
    );
  }

  return (
    <div className="surface relative h-[calc(100vh-180px)] overflow-hidden">
      <OpsCanvas
        initialDocument={board.document}
        onSnapshot={(doc) => {
          void saveWhiteboard(id, doc);
        }}
      />
    </div>
  );
}
