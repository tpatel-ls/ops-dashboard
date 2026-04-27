# Sync

Sync is opt-in per device. It is disabled at install. The user enables it from
Settings, which prompts a Supabase magic link login.

## Per record metadata

Every syncable row carries:

- `version` (monotonic integer, bumped on every local write)
- `deviceId` (ULID per browser profile, see `@drift/core/id`)
- `updatedAt` (ISO 8601 with timezone)
- `deletedAt` (soft delete, hard delete after 30 days)

## Local mutations

Mutations always write to Dexie first. If `settings.syncEnabled` is true, the
lib layer also appends a `SyncOp` row (`{ table, recordId, op, payload }`).
The worker drains the queue on its next tick.

## Worker loop

```
loop:
  pull changes since lastPulledAt
  apply with last write wins per field, using max(version, updatedAt)
  push pending SyncOps in order
  set lastPulledAt to server now
  wait 30 s or until a Dexie change triggers a wake
```

## Conflict resolution

- Tasks and projects: last write wins per field, keyed on `(version, updatedAt)`.
- Whiteboard documents: opaque blobs. Last write wins on the whole document.
  When a conflict is detected (concurrent edits on two devices), the older
  side is kept as `whiteboards/<id>/conflict-<timestamp>` and the user is
  notified.
- Soft deletes always win over a stale put.

## Failure modes

- Network down: ops stay queued. UI keeps working.
- Auth expired: surface a non-blocking banner, pause the worker.
- Schema mismatch: refuse to push. Force a version bump migration first.
- Clock skew: the worker writes a Lamport-style logical clock that increments
  on every push, so two writes on the same wall clock still order.
