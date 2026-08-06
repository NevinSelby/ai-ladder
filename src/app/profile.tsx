import { useQuery } from '@tanstack/react-query';
import * as Application from 'expo-application';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Switch, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/confirm-exit';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconLink,
  IconUser,
} from '@/components/icons';
import { Tappable } from '@/components/tappable';
import { useTutorial } from '@/components/tutorial';
import { Button, Card, Chip, Divider, Eyebrow, Row, Stack, Text } from '@/components/ui';
import { LESSONS } from '@/content/lessons';
import { SEED_ITEMS } from '@/content/seed';
import { attemptSummary } from '@/data/attempts';
import { lessonStats, recentDays } from '@/data/learning';
import { setDailyGoal, setDisplayName, setHapticsEnabled } from '@/data/profile';
import { resetAllProgress } from '@/data/reset';
import { pendingCount, restoreFromAccount, syncNow } from '@/data/sync';
import { db } from '@/db';
import { useProfile, useRefreshAppState } from '@/hooks/use-app-state';
import { useAuthSession } from '@/hooks/use-auth';
import { setHapticsFlag } from '@/lib/haptics';
import { isSupabaseConfigured, signOut } from '@/lib/supabase';
import { MAX_CONTENT_WIDTH, fonts, radius, space, useTheme } from '@/theme';
import { useMotion } from '@/theme/motion-prefs';
import {
  DAILY_GOALS,
  DAILY_GOAL_KEYS,
  levelProgress,
  type DailyGoal,
} from '@shared/progression';
import { LIVE_NODES } from '@shared/taxonomy';

/**
 * Profile: who you are and how the app behaves.
 *
 * Deliberately not a second progress screen. Charts, meters and the heatmap
 * live on the Progress tab; duplicating them here made both pages weaker and
 * left this one with no identity of its own. What belongs here is the stuff
 * with your name on it: the name itself, lifetime totals, preferences, backup,
 * and the way out.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const motion = useMotion();
  const insets = useSafeAreaInsets();
  const refresh = useRefreshAppState();
  const { data: profile } = useProfile();
  const { session } = useAuthSession();
  const { open: openTour } = useTutorial();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const { data: summary = { total: 0, last7Days: 0, averageScore: 0 } } = useQuery({
    queryKey: ['app-state', 'summary'],
    queryFn: () => attemptSummary(db),
    placeholderData: { total: 0, last7Days: 0, averageScore: 0 },
  });
  const { data: lessons = { total: 0, completed: 0, secondsSpent: 0, byBranch: [] } } = useQuery({
    queryKey: ['app-state', 'lesson-stats'],
    queryFn: () => lessonStats(db),
    placeholderData: { total: 0, completed: 0, secondsSpent: 0, byBranch: [] },
  });
  const { data: days = [] } = useQuery({
    queryKey: ['app-state', 'days'],
    queryFn: () => recentDays(db, 400),
    placeholderData: [],
  });
  const { data: pending = 0 } = useQuery({
    queryKey: ['app-state', 'pending'],
    queryFn: () => pendingCount(db),
    placeholderData: 0,
  });

  const progress = levelProgress(profile.meters);
  const totalXp = Object.values(profile.meters).reduce((sum, v) => sum + v, 0);
  // recentDays returns newest first, so the last row is the oldest practice day.
  const firstDay = days.length > 0 ? days[days.length - 1].day : null;
  const memberSince = firstDay
    ? new Date(`${firstDay}T00:00:00`).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : null;

  const saveName = async () => {
    await setDisplayName(db, draft);
    setEditing(false);
    refresh();
  };

  const toggleHaptics = async (value: boolean) => {
    // Flip the in-memory flag first so the very next tap already obeys it.
    setHapticsFlag(value);
    await setHapticsEnabled(db, value);
    refresh();
  };

  const changeGoal = async (goal: DailyGoal) => {
    await setDailyGoal(db, goal);
    refresh();
  };

  const runSync = async () => {
    setSyncing(true);
    setSyncNote(null);
    const result = await syncNow(db);
    setSyncNote(
      result.error
        ? result.error
        : `Synced. Sent ${result.pushed.attempts} answer${result.pushed.attempts === 1 ? '' : 's'}` +
          `${result.pulled ? ', and pulled your account history down.' : '.'}`
    );
    setSyncing(false);
    refresh();
  };

  const runRestore = async () => {
    setRestoring(true);
    setSyncNote(null);
    const result = await restoreFromAccount(db);
    setSyncNote(result.error ? result.error : 'Restored this device from your account.');
    setRestoring(false);
    refresh();
  };

  const runSignOut = async () => {
    await signOut();
    setSyncNote(null);
    refresh();
  };

  const runReset = async () => {
    setResetting(true);
    await resetAllProgress(db);
    setResetting(false);
    setConfirmReset(false);
    refresh();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top + space.sm }}>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
        <Row gap={space.md} align="center">
          <Tappable
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            height={36}
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.md,
              backgroundColor: theme.elevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <IconArrowLeft color={theme.text} size={19} />
          </Tappable>
          <Text variant="heading">Profile</Text>
        </Row>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: insets.bottom + space.xxxl,
          maxWidth: MAX_CONTENT_WIDTH,
          alignSelf: 'center',
          width: '100%',
          gap: space.md,
        }}
        showsVerticalScrollIndicator={false}>
        {/* ── Identity ── */}
        <Animated.View entering={FadeInDown.duration(motion.slow)}>
          <Card>
            <Row gap={space.lg} align="center">
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: theme.accentSoft,
                  borderWidth: 2,
                  borderColor: theme.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <IconUser color={theme.accent} size={32} />
              </View>

              <Stack gap={2} style={{ flex: 1 }}>
                {editing ? (
                  <Row gap={space.sm} align="center">
                    <TextInput
                      value={draft}
                      onChangeText={setDraft}
                      placeholder="Your name"
                      placeholderTextColor={theme.textFaint}
                      autoFocus
                      maxLength={40}
                      onSubmitEditing={saveName}
                      returnKeyType="done"
                      style={{
                        flex: 1,
                        fontSize: 18,
                        fontWeight: '600',
                        color: theme.text,
                        borderBottomWidth: 1.5,
                        borderBottomColor: theme.accent,
                        paddingVertical: 4,
                      }}
                    />
                    <Tappable onPress={saveName} accessibilityLabel="Save name" height={32}>
                      <IconCheck color={theme.accent} size={20} />
                    </Tappable>
                  </Row>
                ) : (
                  <Tappable
                    onPress={() => {
                      setDraft(profile.displayName ?? '');
                      setEditing(true);
                    }}
                    accessibilityLabel="Edit your name"
                    scaleOnPress={false}>
                    <Text variant="title">
                      {profile.displayName ?? 'Set your name'}
                    </Text>
                    {!profile.displayName ? (
                      <Text variant="caption" tone="accent">
                        Tap to add it
                      </Text>
                    ) : null}
                  </Tappable>
                )}
                <Text variant="small" tone="textMuted">
                  {progress.level.title}
                </Text>
                {memberSince ? (
                  <Text variant="caption" tone="textFaint">
                    Practicing since {memberSince}
                  </Text>
                ) : (
                  <Text variant="caption" tone="textFaint">
                    First session still ahead
                  </Text>
                )}
              </Stack>
            </Row>

            <Divider style={{ marginVertical: space.lg }} />

            {/* Lifetime numbers, not charts: the running total a person quotes
                about themselves, with the charts one tap away on Progress. */}
            <Row justify="space-between">
              <Stat value={totalXp.toLocaleString()} label="lifetime XP" />
              <Stat value={profile.points.toLocaleString()} label="points" />
              <Stat value={String(summary.total)} label="answers" />
              <Stat value={String(lessons.completed)} label="lessons" />
            </Row>
            <Text variant="caption" tone="textFaint" style={{ marginTop: space.sm }}>
              Points come from daily chests and quests. XP measures skill; points reward
              the habit. What they buy is coming.
            </Text>

            <Divider style={{ marginVertical: space.lg }} />

            <Tappable
              onPress={() => router.push('/progress')}
              accessibilityLabel="Open progress"
              scaleOnPress={false}>
              <Row justify="space-between" align="center">
                <Text variant="smallStrong" tone="accent">
                  Charts, streak and meters live on Progress
                </Text>
                <IconArrowRight color={theme.accent} size={16} />
              </Row>
            </Tappable>
          </Card>
        </Animated.View>

        {/* ── Preferences ── */}
        <Animated.View entering={FadeInDown.duration(motion.slow).delay(60 * motion.stagger)}>
          <Card>
            <Stack gap={space.lg}>
              <Eyebrow>Preferences</Eyebrow>

              <Stack gap={space.sm}>
                <Text variant="smallStrong">Daily goal</Text>
                <Row gap={space.xs}>
                  {DAILY_GOAL_KEYS.map((key) => {
                    const active = profile.dailyGoal === key;
                    return (
                      <Tappable
                        key={key}
                        onPress={() => changeGoal(key)}
                        accessibilityLabel={`${DAILY_GOALS[key].label}, ${DAILY_GOALS[key].items} questions per session`}
                        style={{
                          flex: 1,
                          paddingVertical: space.md,
                          borderRadius: radius.md,
                          borderWidth: 1.5,
                          borderColor: active ? theme.accent : theme.border,
                          backgroundColor: active ? theme.accentSoft : 'transparent',
                          alignItems: 'center',
                          gap: 2,
                        }}>
                        <Text variant="smallStrong" tone={active ? 'accent' : 'textMuted'}>
                          {DAILY_GOALS[key].label}
                        </Text>
                        <Text variant="eyebrow" tone={active ? 'accent' : 'textFaint'}>
                          {DAILY_GOALS[key].items}Q
                        </Text>
                      </Tappable>
                    );
                  })}
                </Row>
                <Text variant="caption" tone="textFaint">
                  {DAILY_GOALS[profile.dailyGoal].blurb}
                </Text>
              </Stack>

              <Divider />

              <Row justify="space-between" align="center">
                <Stack gap={2} style={{ flex: 1, paddingRight: space.lg }}>
                  <Text variant="smallStrong">Haptic feedback</Text>
                  <Text variant="caption" tone="textFaint">
                    A small buzz on answers and completions.
                  </Text>
                </Stack>
                <Switch
                  value={profile.hapticsEnabled}
                  onValueChange={toggleHaptics}
                  trackColor={{ true: theme.accent, false: theme.borderStrong }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel="Haptic feedback"
                />
              </Row>

              <Divider />

              <Stack gap={2}>
                <Text variant="smallStrong">Animations</Text>
                <Text variant="caption" tone="textFaint">
                  {motion.reduced
                    ? 'Reduced, following your system setting. Change it under Settings, Accessibility, Motion.'
                    : 'Full. The app follows your system Reduce Motion setting automatically.'}
                </Text>
              </Stack>
            </Stack>
          </Card>
        </Animated.View>

        {/* ── Account ── */}
        <Animated.View entering={FadeInDown.duration(motion.slow).delay(120 * motion.stagger)}>
          <Card accent={session ? undefined : theme.accent}>
            <Stack gap={space.sm}>
              <Row justify="space-between" align="center">
                <Eyebrow>Account</Eyebrow>
                {session ? (
                  pending > 0 ? (
                    <Chip label={`${pending} waiting`} color={theme.warning} filled />
                  ) : (
                    <Row gap={4} align="center">
                      <IconCheck color={theme.positive} size={14} />
                      <Text variant="caption" tone="positive">
                        backed up
                      </Text>
                    </Row>
                  )
                ) : (
                  <Chip label="this phone only" color={theme.warning} filled />
                )}
              </Row>

              {session ? (
                <>
                  <Text variant="smallStrong">{session.user.email}</Text>
                  <Text variant="caption" tone="textFaint">
                    Progress is saved on this device first, then merged with your account.
                    Syncing pulls anything your other devices have done and pushes anything
                    this one has.
                  </Text>
                  <Button
                    title={syncing ? 'Syncing' : 'Sync now'}
                    kind="secondary"
                    full
                    disabled={syncing}
                    onPress={runSync}
                  />
                  {syncNote ? (
                    <Text variant="caption" tone="textMuted">
                      {syncNote}
                    </Text>
                  ) : null}
                  <Button
                    title={restoring ? 'Restoring' : 'Restore from account'}
                    kind="ghost"
                    full
                    disabled={restoring || syncing}
                    onPress={runRestore}
                  />
                  <Text variant="caption" tone="textFaint">
                    Replaces what is on this device with your account's copy. Anything this
                    device has not uploaded yet is sent first, so nothing is lost.
                  </Text>
                  <Button title="Sign out" kind="ghost" full onPress={runSignOut} />
                </>
              ) : (
                <>
                  <Text variant="small" tone="textMuted">
                    {isSupabaseConfigured
                      ? 'Your XP, streak and history live only on this phone. Create a free account and they follow you instead.'
                      : 'No server is configured, so progress stays on this phone only.'}
                  </Text>
                  <Button
                    title="Sign in or create account"
                    size="lg"
                    full
                    disabled={!isSupabaseConfigured}
                    onPress={() => router.push('/auth')}
                  />
                </>
              )}
            </Stack>
          </Card>
        </Animated.View>

        {/* ── About ── */}
        <Animated.View entering={FadeIn.duration(motion.slow).delay(180 * motion.stagger)}>
          <Card>
            <Stack gap={space.sm}>
              <Eyebrow>About</Eyebrow>
              <Row justify="space-between">
                <Text variant="caption" tone="textMuted">
                  Questions in the bank
                </Text>
                <Text variant="numericSm" tone="textMuted">
                  {SEED_ITEMS.length}
                </Text>
              </Row>
              <Row justify="space-between">
                <Text variant="caption" tone="textMuted">
                  Lessons
                </Text>
                <Text variant="numericSm" tone="textMuted">
                  {LESSONS.length}
                </Text>
              </Row>
              <Row justify="space-between">
                <Text variant="caption" tone="textMuted">
                  Concepts tracked
                </Text>
                <Text variant="numericSm" tone="textMuted">
                  {LIVE_NODES.length}
                </Text>
              </Row>
              <Divider />
              <Tappable
                onPress={openTour}
                accessibilityLabel="Show the app tour again"
                scaleOnPress={false}>
                <Row justify="space-between" align="center">
                  <Text variant="smallStrong" tone="accent">
                    Show the app tour again
                  </Text>
                  <IconArrowRight color={theme.accent} size={15} />
                </Row>
              </Tappable>
              <Divider />
              <Row gap={6} align="center">
                <IconLink color={theme.textFaint} size={13} />
                <Text variant="caption" tone="textFaint">
                  AI Ladder {Application.nativeApplicationVersion ?? '1.0.0'}
                </Text>
              </Row>
            </Stack>
          </Card>
        </Animated.View>

        {/* ── Danger ── */}
        <Animated.View entering={FadeIn.duration(motion.slow).delay(240 * motion.stagger)}>
          <Card level={0} style={{ borderColor: theme.negative + '55' }}>
            <Stack gap={space.sm}>
              <Eyebrow tone="negative">Danger zone</Eyebrow>
              <Text variant="caption" tone="textFaint">
                Wipes XP, streaks, answers and lesson history on this phone. Questions and
                lessons stay. Anything already backed up stays on the server.
              </Text>
              <Button
                title="Reset all progress"
                kind="ghost"
                full
                onPress={() => setConfirmReset(true)}
              />
            </Stack>
          </Card>
        </Animated.View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmReset}
        title="Reset all progress?"
        message="Your XP, streak, answer history and lesson progress on this phone are erased. Your name and settings are kept. This cannot be undone here."
        confirmLabel={resetting ? 'Resetting' : 'Erase everything'}
        cancelLabel="Keep my progress"
        busy={resetting}
        onConfirm={runReset}
        onCancel={() => setConfirmReset(false)}
      />
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Stack gap={2} style={{ alignItems: 'center' }}>
      <Text variant="numericSm" style={{ fontSize: 19, lineHeight: 24, fontFamily: fonts.mono }}>
        {value}
      </Text>
      <Text variant="caption" tone="textFaint">
        {label}
      </Text>
    </Stack>
  );
}
