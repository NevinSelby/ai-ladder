import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import migrations from '../../drizzle/migrations';
import * as schema from './schema';

export const DATABASE_NAME = 'ailadder.db';

/**
 * The browser database.
 *
 * `expo-sqlite` cannot serve this: its web build reaches SQLite through a
 * worker with a synchronous bridge, and that bridge times out in the browser
 * ("Sync operation timeout" during `openDatabaseSync`) even on a
 * cross-origin-isolated page with SharedArrayBuffer available. Drizzle's expo
 * driver is synchronous throughout, so there is no async escape hatch either.
 *
 * sql.js runs SQLite as WebAssembly on the main thread, which is synchronous
 * by nature and needs no worker, no SharedArrayBuffer and no special headers.
 * The trade is that the database lives in memory, so it is snapshotted to
 * IndexedDB whenever it changes. That is why the whole file exists: the app is
 * local-first, and a web build that forgot everything on refresh would not be
 * the same app.
 */

const IDB_NAME = 'ailadder-web-db';
const IDB_STORE = 'snapshots';
const SNAPSHOT_KEY = 'main';

// ── IndexedDB, minimal ─────────────────────────────────────────────────────

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(IDB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readSnapshot(): Promise<Uint8Array | null> {
  try {
    const idb = await openIdb();
    return await new Promise((resolve) => {
      const request = idb.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(SNAPSHOT_KEY);
      request.onsuccess = () => resolve((request.result as Uint8Array) ?? null);
      request.onerror = () => resolve(null);
    });
  } catch {
    // Private browsing can refuse IndexedDB outright. The app still works, it
    // just forgets on refresh, which beats refusing to start.
    return null;
  }
}

async function writeSnapshot(bytes: Uint8Array): Promise<void> {
  try {
    const idb = await openIdb();
    await new Promise<void>((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(bytes, SNAPSHOT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* see readSnapshot */
  }
}

// ── Migrations ─────────────────────────────────────────────────────────────

/**
 * Apply the same migration bundle the native build uses.
 *
 * Drizzle's sql-js migrator reads from disk, which does not exist here, so the
 * journal is walked by hand. Applied tags are tracked in the database itself,
 * so a returning visitor only runs what is new.
 */
function applyMigrations(sqlite: SqlJsDatabase) {
  sqlite.run('create table if not exists __ailadder_migrations (tag text primary key)');

  const applied = new Set<string>();
  for (const result of sqlite.exec('select tag from __ailadder_migrations')) {
    for (const row of result.values) applied.add(String(row[0]));
  }

  const bundle = migrations as unknown as {
    journal: { entries: { idx: number; tag: string }[] };
    migrations: Record<string, string>;
  };

  for (const entry of bundle.journal.entries) {
    if (applied.has(entry.tag)) continue;
    const sql = bundle.migrations[`m${String(entry.idx).padStart(4, '0')}`];
    if (!sql) continue;
    // Drizzle separates statements with this marker; sql.js runs one at a time.
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed) sqlite.run(trimmed);
    }
    sqlite.run('insert into __ailadder_migrations (tag) values (?)', [entry.tag]);
  }
}

// ── The instance ───────────────────────────────────────────────────────────

let sqlite: SqlJsDatabase | null = null;
let real: ReturnType<typeof drizzle> | null = null;

/**
 * Module-scope `db` is imported all over the app, but sql.js loads its wasm
 * asynchronously. This proxy forwards to the real instance once it exists and
 * throws a readable error before that. Nothing calls it early in practice,
 * because the provider gates rendering on `ready`.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, property) {
    if (!real) throw new Error('Local database is still starting');
    return Reflect.get(real, property, real);
  },
});

export type Database = typeof db;

/** Snapshot whenever SQLite reports writes since the last save. */
function startPersistence() {
  let lastChanges = -1;

  const save = async () => {
    if (!sqlite) return;
    const [result] = sqlite.exec('select total_changes()');
    const changes = Number(result?.values?.[0]?.[0] ?? 0);
    if (changes === lastChanges) return;
    lastChanges = changes;
    await writeSnapshot(sqlite.export());
  };

  // Polling beats trying to intercept every drizzle write: it is one cheap
  // pragma, and it cannot miss a code path.
  const timer = setInterval(save, 2000);
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void save();
  });
  return () => clearInterval(timer);
}

interface DatabaseContextValue {
  db: Database;
  ready: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextValue>({ db, ready: false, error: null });

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(real !== null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (real) return;
    let stop: (() => void) | undefined;

    (async () => {
      try {
        const SQL = await initSqlJs({ locateFile: (file) => `/${file}` });
        const snapshot = await readSnapshot();
        sqlite = snapshot ? new SQL.Database(snapshot) : new SQL.Database();
        // Foreign keys off matches the native build; the schema does not rely
        // on cascade behavior and migrations recreate tables.
        sqlite.run('pragma foreign_keys = off');
        applyMigrations(sqlite);
        real = drizzle(sqlite, { schema });
        stop = startPersistence();
        setReady(true);
      } catch (caught) {
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      }
    })();

    return () => stop?.();
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, ready, error }}>{children}</DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}

/** Escape hatch for tests and one-off maintenance. */
export function resetDatabaseSync() {
  sqlite?.run('pragma writable_schema = 1');
  void writeSnapshot(new Uint8Array());
  indexedDB.deleteDatabase(IDB_NAME);
}
