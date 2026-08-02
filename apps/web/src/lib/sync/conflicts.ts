import { pickWinner } from '@ops-dashboard/core';
import type { Syncable } from '@ops-dashboard/core';

export function shouldAcceptRemote(local: Syncable | undefined, remote: Syncable): boolean {
  return pickWinner(local, remote) === remote;
}
