import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

/**
 * Supabase client, session handling, and account auth.
 *
 * The app stays local-first: every mode scores on-device and every result is
 * written to SQLite before anything touches the network. An account adds
 * durable, cross-phone progress on top. No feature is gated on being signed in,
 * because a study streak must never depend on a server being reachable.
 *
 * "Remember me" is implemented where it actually has to live: in the storage
 * the auth client persists sessions to. When it is on, tokens go to
 * AsyncStorage and survive restarts. When it is off, tokens go to an in-memory
 * map and the session ends when the app closes. A checkbox that does not change
 * where the token is stored is decoration.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

const REMEMBER_KEY = 'ailadder.rememberMe';

/** Defaults to true so the common case (stay signed in) needs no setup read. */
let rememberFlag = true;
const memoryStore = new Map<string, string>();

/**
 * Routes token storage by the remember-me choice.
 *
 * Writes always land in memory so the live session works either way; they only
 * reach AsyncStorage when remembering. Reads prefer memory, and fall through to
 * disk only when remembering, so a stale persisted token from an earlier
 * remembered login cannot resurrect a session the user asked not to keep.
 */
const authStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const inMemory = memoryStore.get(key);
    if (inMemory !== undefined) return inMemory;
    if (!rememberFlag) return null;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    memoryStore.set(key, value);
    if (rememberFlag) await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    memoryStore.delete(key);
    await AsyncStorage.removeItem(key);
  },
};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        // React Native has no URL bar for an OAuth callback to land in.
        detectSessionInUrl: false,
      },
    })
  : null;

/** Load the stored remember-me choice. Must run before the first auth call. */
export async function initAuthPrefs(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(REMEMBER_KEY);
    if (stored !== null) rememberFlag = stored === 'true';
  } catch {
    // Fall back to remembering; failing closed here would sign people out.
  }
}

export function getRememberMe(): boolean {
  return rememberFlag;
}

export async function setRememberMe(value: boolean): Promise<void> {
  rememberFlag = value;
  await AsyncStorage.setItem(REMEMBER_KEY, String(value));
  if (!value && url) {
    // Purge any previously persisted token so "do not remember" is true
    // retroactively, not only for the next login.
    const projectRef = new URL(url).hostname.split('.')[0];
    await AsyncStorage.removeItem(`sb-${projectRef}-auth-token`).catch(() => {});
  }
}

// ── Account auth ───────────────────────────────────────────────────────────

export interface AuthResult {
  session: Session | null;
  /** Sign-up succeeded but the project requires clicking an email link first. */
  needsConfirmation: boolean;
  error: string | null;
}

/** Server messages translated into something a person can act on. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Wrong email or password.';
  if (m.includes('email not confirmed'))
    return 'This email has not been confirmed yet. Open the confirmation link we sent you, then sign in.';
  if (m.includes('already registered'))
    return 'An account with this email already exists. Sign in instead.';
  if (m.includes('password should be')) return 'Passwords need at least 6 characters.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Could not reach the server. Check your connection and try again.';
  return message;
}

/**
 * Where a confirmation link lands.
 *
 * Must also be listed under Authentication, URL Configuration, Redirect URLs in
 * the Supabase dashboard, or the link silently falls back to the Site URL.
 */
export const CONFIRM_REDIRECT = 'https://ai-ladder.onrender.com';

export async function signUpWithPassword(
  email: string,
  password: string,
  fullName?: string
): Promise<AuthResult> {
  if (!supabase) return { session: null, needsConfirmation: false, error: 'Not configured.' };
  // The name rides in user metadata so it survives to every device the account
  // is used on, rather than living only in the local profile row.
  //
  // `emailRedirectTo` decides where the confirmation link lands. Without it the
  // link follows the project's Site URL, which is why confirmations were
  // arriving at the wrong destination. The web build is the right landing spot:
  // it works on any device that can open a link, including the phone.
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: CONFIRM_REDIRECT,
      ...(fullName?.trim() ? { data: { full_name: fullName.trim() } } : {}),
    },
  });
  if (error) return { session: null, needsConfirmation: false, error: friendly(error.message) };
  // With email confirmation on, sign-up returns a user but no session until
  // the link is clicked. Surfacing that precisely beats a generic failure.
  if (!data.session && data.user) {
    return { session: null, needsConfirmation: true, error: null };
  }
  return { session: data.session, needsConfirmation: false, error: null };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { session: null, needsConfirmation: false, error: 'Not configured.' };
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) return { session: null, needsConfirmation: false, error: friendly(error.message) };
  return { session: data.session, needsConfirmation: false, error: null };
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

export async function currentSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ── Legacy session helper, kept for the sync path ──────────────────────────

export type AuthMode = 'anonymous' | 'email' | 'offline';

export interface AuthState {
  session: Session | null;
  mode: AuthMode;
  message: string | null;
}

export const OFFLINE: AuthState = { session: null, mode: 'offline', message: null };

/**
 * Get whatever session exists without prompting the user. Tries anonymous
 * sign-in as a fallback for projects that allow it; on this project anonymous
 * is disabled, so an account is the real path and this simply reports that.
 */
export async function ensureSession(): Promise<AuthState> {
  if (!supabase) return { ...OFFLINE, message: 'No Supabase URL or key configured.' };

  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) {
    return {
      session: existing.session,
      mode: existing.session.user.is_anonymous ? 'anonymous' : 'email',
      message: null,
    };
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    const disabled = /anonymous/i.test(error.message);
    return {
      session: null,
      mode: 'offline',
      message: disabled ? 'Sign in to back up your progress.' : friendly(error.message),
    };
  }

  return { session: data.session, mode: 'anonymous', message: null };
}

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export interface AccountIdentity {
  email: string | null;
  /** From sign-up metadata, or an OAuth provider when one is connected. */
  name: string | null;
  /** Provider-supplied picture. Password accounts have none, so the UI falls
   *  back to initials rather than shipping a stock silhouette. */
  avatarUrl: string | null;
}

/**
 * Who is signed in, as the identity provider sees them.
 *
 * Supabase stores OAuth profile fields under different keys depending on the
 * provider, so the lookups are ordered by how common they are rather than
 * assuming one shape.
 */
export function identityFrom(session: Session | null): AccountIdentity {
  const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = meta[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  };

  return {
    email: session?.user?.email ?? null,
    name: pick('full_name', 'name', 'preferred_username', 'user_name'),
    avatarUrl: pick('avatar_url', 'picture'),
  };
}

/** Two letters for the fallback avatar: initials beat a stock silhouette. */
export function initialsFor(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split('@')[0] || '';
  const words = source.split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Shape rule, mirrored from the database check constraint. */
export const USERNAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]{2,19}$/;

export function usernameProblem(value: string): string | null {
  const v = value.trim();
  if (v.length < 3) return 'At least 3 characters.';
  if (v.length > 20) return 'At most 20 characters.';
  if (/^[0-9]/.test(v)) return 'Cannot start with a number.';
  if (!USERNAME_PATTERN.test(v)) return 'Letters, numbers and underscores only.';
  return null;
}

/**
 * Is this handle free?
 *
 * Answered by a security-definer function rather than a select, because the
 * profiles table is readable only by its owner. The function returns a boolean
 * and never a row, so it cannot be used to enumerate accounts. The database
 * unique index is still the authority: two clients can both pass this check in
 * the same instant, and only the insert settles it.
 */
export async function isUsernameFree(candidate: string): Promise<boolean | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('username_available', { candidate: candidate.trim() });
  if (error) return null;
  return Boolean(data);
}

/** Claim a handle for the signed-in account. */
export async function claimUsername(username: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Not configured.' };
  const { data: auth } = await supabase.auth.getSession();
  const id = auth.session?.user.id;
  if (!id) return { error: 'Not signed in.' };

  const { error } = await supabase.from('profiles').upsert(
    { id, username: username.trim() },
    { onConflict: 'id' }
  );
  if (!error) return { error: null };

  // 23505 is a unique violation: somebody took it between the check and here.
  const taken = error.code === '23505' || /duplicate|unique/i.test(error.message);
  return { error: taken ? 'That name was just taken. Try another.' : friendly(error.message) };
}
