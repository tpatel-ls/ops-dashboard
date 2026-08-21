import type { CaptureSource } from '@ops-dashboard/core';

export function journalEntrySource(source: CaptureSource): 'voice' | 'text' {
  return source === 'voice' || source === 'watch' ? 'voice' : 'text';
}
