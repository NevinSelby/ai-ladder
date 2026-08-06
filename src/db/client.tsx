import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import * as SQLite from 'expo-sqlite';
import { createContext, useContext, type ReactNode } from 'react';

import migrations from '../../drizzle/migrations';
import * as schema from './schema';

export const DATABASE_NAME = 'ailadder.db';

/**
 * Opening the database must never throw at import time.
 *
 * `openDatabaseSync` runs at module scope, before React mounts and before any
 * error boundary exists. A throw here produces a silent blank screen with
 * nothing in the console, because error boundaries only catch render-phase
 * errors. That is exactly the failure shape that cost a day on a previous
 * project, so the open is guarded and the failure is carried forward as state
 * for the provider to render.
 */
let openError: Error | null = null;
let expoDb: SQLite.SQLiteDatabase | null = null;

try {
  expoDb = SQLite.openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
} catch (error) {
  openError = error instanceof Error ? error : new Error(String(error));
}

/**
 * Stand-in used when the open failed, so importing modules can still reference
 * `db`. Every call throws, which surfaces as a handled query error rather than
 * a crash during module evaluation.
 */
const unavailable = new Proxy({} as SQLite.SQLiteDatabase, {
  get() {
    return () => {
      throw new Error('Local database unavailable');
    };
  },
});

export const db = drizzle(expoDb ?? unavailable, { schema });

export type Database = typeof db;

interface DatabaseContextValue {
  db: Database;
  ready: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextValue>({
  db,
  ready: false,
  error: null,
});

export function DatabaseProvider({ children }: { children: ReactNode }) {
  // Hooks run unconditionally, so the migrator is always called; when the open
  // failed it errors immediately, which is what we want surfaced.
  const { success, error } = useMigrations(db, migrations);
  return (
    <DatabaseContext.Provider
      value={{ db, ready: success && !openError, error: openError ?? error ?? null }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}

/** Escape hatch for tests and one-off maintenance. */
export function resetDatabaseSync() {
  expoDb?.closeSync();
  SQLite.deleteDatabaseSync(DATABASE_NAME);
}
