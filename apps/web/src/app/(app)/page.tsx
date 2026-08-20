'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { defaultViewPath, getSettings } from '@/lib/settings';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void getSettings()
      .then((settings) => {
        if (!cancelled) router.replace(defaultViewPath(settings.defaultView));
      })
      .catch(() => {
        if (!cancelled) router.replace('/today');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <p role="status" className="text-muted-foreground p-6 text-sm">
      Opening your default view...
    </p>
  );
}
