import { Suspense } from 'react';
import { Notepad } from '@/components/notepad';

export default function NotepadPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex h-full w-full max-w-[1360px] flex-col gap-5 p-4 md:p-7">
          <div className="os-panel h-32 animate-pulse rounded-[22px]" />
          <div className="surface-flat h-56 animate-pulse" />
        </div>
      }
    >
      <Notepad />
    </Suspense>
  );
}
