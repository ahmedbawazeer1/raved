/**
 * Outbox in IndexedDB (docs/OFFLINE.md): what the student does offline is kept here
 * and sent when the connection returns. Browser only.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type QueueKind = "vocab_review";

export interface QueueItem<T = unknown> {
  id: string;
  kind: QueueKind;
  payload: T;
  createdAt: string;
}

interface RavedDB extends DBSchema {
  queue: { key: string; value: QueueItem; indexes: { kind: QueueKind } };
}

let dbPromise: Promise<IDBPDatabase<RavedDB>> | null = null;

function db() {
  dbPromise ??= openDB<RavedDB>("raved", 1, {
    upgrade(database) {
      const store = database.createObjectStore("queue", { keyPath: "id" });
      store.createIndex("kind", "kind");
    },
  });
  return dbPromise;
}

export async function enqueue<T>(kind: QueueKind, payload: T, id: string = crypto.randomUUID()): Promise<QueueItem<T>> {
  const item: QueueItem<T> = { id, kind, payload, createdAt: new Date().toISOString() };
  await (await db()).put("queue", item);
  return item;
}

export async function pending<T>(kind: QueueKind): Promise<QueueItem<T>[]> {
  const items = (await (await db()).getAllFromIndex("queue", "kind", kind)) as QueueItem<T>[];
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function remove(ids: string[]): Promise<void> {
  const tx = (await db()).transaction("queue", "readwrite");
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
}

/**
 * Sends everything of one kind with `send` (which returns the ids the server accepted)
 * and removes those. Safe to call often: the server ignores repeats.
 */
export async function flush<T>(kind: QueueKind, send: (items: QueueItem<T>[]) => Promise<string[]>): Promise<number> {
  const items = await pending<T>(kind);
  if (!items.length) return 0;
  const accepted = await send(items);
  await remove(accepted);
  return items.length - accepted.length;
}
