import '@/global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BootError, ErrorBoundary } from '@/components/boot-error';
import { LoadingTips } from '@/components/loading-tips';
import { validateSeed } from '@/content/seed';
import { readProfile } from '@/data/profile';
import { bootstrapLocalData, DatabaseProvider, db, useDatabase } from '@/db';
import { setHapticsFlag } from '@/lib/haptics';
import { currentSession, initAuthPrefs } from '@/lib/supabase';
import { syncNow } from '@/data/sync';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { useRefreshAppState } from '@/hooks/use-app-state';
import { space, useTheme } from '@/theme';
import { MotionProvider } from '@/theme/motion-prefs';
import { TutorialProvider } from '@/components/tutorial';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function Boot({ children }: { children: React.ReactNode }) {
  const refresh = useRefreshAppState();

  /**
   * Type is loaded before anything renders.
   *
   * Every heading is Space Grotesk and every figure is JetBrains Mono, so a
   * frame drawn before they arrive is a frame in the wrong typeface that then
   * visibly reflows. Waiting costs a moment; swapping costs the impression
   * that the app is held together loosely.
   */
  const [fontsReady] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });
  const theme = useTheme();
  const { ready, error } = useDatabase();
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ready || seeded) return;
    let canceled = false;
    (async () => {
      try {
        if (__DEV__) {
          const problems = validateSeed();
          if (problems.length > 0) {
            // Loud in development, harmless in production: bad seed content is a
            // content bug, not a reason to block the app from starting.
            console.warn(
              `[content] ${problems.length} seed problem(s):\n` +
                problems.map((p) => `  ${p.itemId}: ${p.problem}`).join('\n')
            );
          }
        }
        await bootstrapLocalData(db);
        // Load the stored haptics preference before the first buzz can happen.
        readProfile(db).then((p) => setHapticsFlag(p.hapticsEnabled)).catch(() => {});
        // Remember-me must be known before the auth client reads its storage,
        // or a not-remembered session would resurrect from disk.
        await initAuthPrefs();
        // Signed-in devices sync silently at launch; failures are the outbox's
        // problem, never the user's. The refresh afterward is essential: the
        // pull writes straight to SQLite, and without invalidating the query
        // cache the screens keep rendering whatever they read before the pull
        // landed, so a freshly signed-in device showed a partial picture.
        currentSession()
          .then((session) => (session ? syncNow(db) : null))
          .then((result) => {
            if (result) refresh();
          })
          .catch(() => {});
        if (!canceled) setSeeded(true);
      } catch (err) {
        if (!canceled) setSeedError(err as Error);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [ready, seeded]);

  /**
   * Failsafe.
   *
   * If migrations or the seed write never settle, a corrupt database file, a
   * driver that silently never resolves. The app would sit behind the splash
   * with a spinner forever, which the user experiences as a blank screen and
   * cannot report. After eight seconds we give up waiting and say so.
   */
  useEffect(() => {
    if (seeded || error || seedError) return;
    const timer = setTimeout(() => {
      setSeedError(
        new Error(
          'Startup did not finish within 8 seconds. The local database may be in a bad state' +
            'reinstalling the app clears it, and synced progress is restored on next sign-in.'
        )
      );
    }, 8_000);
    return () => clearTimeout(timer);
  }, [seeded, error, seedError]);

  // Hide the splash on every terminal state, including the failsafe, so the
  // splash can never be the thing the user is left staring at.
  useEffect(() => {
    if (seeded || error || seedError) SplashScreen.hideAsync().catch(() => {});
  }, [seeded, error, seedError]);

  const failure = error ?? seedError;
  if (failure) {
    return <BootError title="AI Ladder could not start" error={failure} />;
  }

  if (!seeded || !fontsReady) {
    return (
      <LoadingTips />
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const theme = useTheme();
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
          <DatabaseProvider>
            <MotionProvider>
            <TutorialProvider>
            <Boot>
              <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: theme.bg },
                }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen
                  name="auth"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="session/drill"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="session/arena"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="session/flaw"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="topic/[id]"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="submit"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="account/[id]"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="lesson/[id]"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
              </Stack>
            </Boot>
            </TutorialProvider>
            </MotionProvider>
          </DatabaseProvider>
        </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
