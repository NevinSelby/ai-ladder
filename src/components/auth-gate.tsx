import { useRouter, useSegments } from 'expo-router';
import { useEffect, type ReactNode } from 'react';

import { LoadingTips } from '@/components/loading-tips';
import { useAuthSession } from '@/hooks/use-auth';

/**
 * Nobody reaches the app without an account.
 *
 * The app was built local-first and fully playable signed out, with an account
 * as an optional backup. That produced the worst possible failure: two devices
 * each holding half a history and a merge algorithm trying to referee. Making
 * the account mandatory means there is exactly one source of truth for a
 * person's progress, which removes the entire class of bug rather than patching
 * instances of it.
 *
 * The gate lives here rather than in each screen so there is one rule and no
 * screen can forget it. Signed-out users land on the onboarding flow; signed-in
 * users are pushed off it.
 */

/** Routes reachable without a session. Everything else requires one. */
const PUBLIC_SEGMENTS = new Set(['auth', 'welcome']);

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuthSession();
  const segments = useSegments();
  const router = useRouter();

  const top = segments[0] ?? '';
  const onPublicRoute = PUBLIC_SEGMENTS.has(top);

  useEffect(() => {
    // Wait for storage to be read before redirecting, or a remembered session
    // gets bounced to sign-in on every cold start.
    if (loading) return;

    if (!session && !onPublicRoute) {
      router.replace('/welcome');
    } else if (session && onPublicRoute) {
      router.replace('/');
    }
  }, [session, loading, onPublicRoute, router]);

  // Hold the splash rather than flashing the app for the frame before the
  // redirect lands.
  if (loading || (!session && !onPublicRoute)) return <LoadingTips />;

  return <>{children}</>;
}
