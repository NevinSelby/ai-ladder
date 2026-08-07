import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { IconArrowRight,
  IconEye, IconCheck, IconFlame, IconGem, IconQuest, IconUser } from '@/components/icons';
import { Wordmark } from '@/components/logo';
import { Tappable } from '@/components/tappable';
import { StreakFlame } from '@/components/streak-flame';
import { Bar, Button, Card, Chip, Divider, Eyebrow, Row, Screen, Spacer, Stack, Text } from '@/components/ui';
import { ACCOUNTS_BY_ID, healthBand } from '@/content/accounts';
import { setDailyGoal } from '@/data/profile';
import { dailyPuzzle } from '@/data/puzzle';
import { Aurora, Rule, SectionLabel, Stagger } from '@/components/surface';
import { PulseDot } from '@/components/ambient';
import { Tooltip } from '@/components/tooltip';
import { refreshQuests, type QuestStatus } from '@/data/quests';
import { accounts as accountsTable } from '@/db/schema';
import { db } from '@/db';
import { useProfile, useRefreshAppState, useSessionStatus } from '@/hooks/use-app-state';
import { MAX_CONTENT_WIDTH,
  useLayout, METER_META, meterColor, radius, space, useScheme, useTheme } from '@/theme';
import { MODE_META, type Mode } from '@shared/content';
import {
  DAILY_GOALS,
  DAILY_GOAL_KEYS,
  LEVELS,
  drillMinutes,
  levelProgress,
  type DailyGoal,
} from '@shared/progression';
import { useMotion } from '@/theme/motion-prefs';

/** Modes not yet wired up. Shown locked rather than hidden, so the app is honest
 *  about where it is going instead of pretending the drill is the whole product. */
/** Modes with a runner today. Practice lists the full set with status. */

export default function TodayScreen() {
  const theme = useTheme();
  const scheme = useScheme();
  const refresh = useRefreshAppState();
  // Celebrate only on the transition into "done today", not on every visit to
  // an already-complete day. A badge that re-animates on each glance is noise.
  const [justFinished, setJustFinished] = useState(false);
  const wasDone = useRef<boolean | null>(null);

  const { data: profile } = useProfile();
  const { data: status } = useSessionStatus();
  const { data: board = [] } = useQuery({
    queryKey: ['app-state', 'board-brief'],
    queryFn: () => db.select().from(accountsTable),
    placeholderData: [],
  });

  // Coming back from a session must refresh the streak and meters immediately;
  // a stale "not done yet" card after finishing a drill reads as a lost session.
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useEffect(() => {
    if (wasDone.current === false && status.doneToday) {
      setJustFinished(true);
      const timer = setTimeout(() => setJustFinished(false), 1600);
      return () => clearTimeout(timer);
    }
    wasDone.current = status.doneToday;
  }, [status.doneToday]);

  const onGoalChange = useCallback(
    async (goal: DailyGoal) => {
      await setDailyGoal(db, goal);
      refresh();
    },
    [refresh]
  );

  const { width } = useWindowDimensions();
  const layout = useLayout();
  const inner = Math.min(width, layout.contentWidth) - space.lg * 2;

  const { data: puzzle } = useQuery({
    queryKey: ['app-state', 'daily-puzzle'],
    queryFn: () => dailyPuzzle(db),
    placeholderData: null,
  });

  const progress = levelProgress(profile.meters);
  const weakestRow = [...board].sort((a, b) => a.health - b.health)[0];
  const weakest = weakestRow ? ACCOUNTS_BY_ID[weakestRow.id] : undefined;

  return (
    <Screen>
      <Spacer size={space.sm} />

      <Row justify="space-between" align="flex-start" style={{ zIndex: 20 }}>
        <View style={{ gap: 4, flex: 1 }}>
          <Wordmark />
        </View>
        <Row gap={space.sm} align="center">
          <Tooltip
            title="Points"
            body="Earned from daily chests and streak milestones, never from answering questions. They measure the habit, not the skill, and will buy things in a later release."
            align="right">
            <PointsPill points={profile.points} />
          </Tooltip>
          <Tooltip
            title="Daily streak"
            body={
              status.doneToday
                ? 'Consecutive days with a finished session. Today is banked, so it is safe until midnight tomorrow.'
                : 'Consecutive days with a finished session. Finish one today to keep it: a missed day resets the count to one.'
            }
            align="right">
            <StreakFlame
              days={profile.streakDays}
              lit={status.doneToday}
              celebrate={justFinished}
            />
          </Tooltip>
          {layout.desktop ? null : <ProfileButton />}
        </Row>
      </Row>

      <Spacer size={space.lg} />

      {/* ── Masthead ──
          Set like a magazine cover: an edition line in mono above a split
          headline where the second half turns italic serif. The whole point of
          the pairing is that gap between the two faces, so it happens on the
          first thing anyone reads. */}
      <Stagger index={0}>
        <View style={{ gap: space.md }}>
          <Row gap={space.md} align="center">
            <Text variant="eyebrow" tone="accent">
              EDITION {String(profile.longestStreak + 1).padStart(2, '0')}
            </Text>
            <View style={{ flex: 1 }}>
              <Rule width={inner * 0.4} />
            </View>
            <Text variant="eyebrow" tone="textFaint">
              {progress.level.title.toUpperCase()}
            </Text>
          </Row>

          <View>
            <Text variant="hero">{greeting()}</Text>
            <Text variant="hero" tone="textMuted" style={{ marginTop: -4 }}>
              {profile.username ?? profile.displayName ?? 'welcome back'}
            </Text>
          </View>

          <Text variant="eyebrow" tone="textFaint">
            RUNG {progress.level.index + 1} OF {LEVELS.length}
          </Text>
        </View>
      </Stagger>

      <Spacer size={space.xl} />

      {status.summary.total === 0 ? (
        <>
          <WelcomeCard />
          <Spacer size={space.lg} />
        </>
      ) : null}

      {/* ── The one thing to do today ──
          Given hero treatment on purpose: a lit surface, oversized type and the
          only filled button on the screen. Everything else here is secondary,
          and it should look it. */}
      <Stagger index={1}>
        <Card accent={status.doneToday ? theme.positive : theme.accent} level={2}>
          <Aurora
            width={inner}
            height={300}
            from={status.doneToday ? theme.positive : theme.accent}
            to={theme.accentAlt}
            opacity={status.doneToday ? 0.07 : 0.12}
          />
          <Stack gap={space.md}>
            <Row justify="space-between" align="center">
              <Row gap={space.sm} align="center">
                {!status.doneToday ? <PulseDot color={theme.accent} size={7} /> : null}
                <Eyebrow tone={status.doneToday ? 'positive' : 'accent'}>
                  {status.doneToday ? 'Session complete' : 'Today’s session'}
                </Eyebrow>
              </Row>
              <Chip
                label={`${drillMinutes(profile.dailyGoal)} min`}
                color={theme.textFaint}
              />
            </Row>

            <Text variant="title">
              {status.doneToday
                ? 'Done. Come back tomorrow to keep the streak.'
                : MODE_META.drill.tagline}
            </Text>

          {status.dueNodes > 0 ? (
            <Text variant="small" tone="textMuted">
              {status.dueNodes} concept{status.dueNodes === 1 ? '' : 's'} due for review.
              {' '}The session leads with whichever you are closest to forgetting.
            </Text>
          ) : (
            <Text variant="small" tone="textMuted">
              Nothing due yet. This session will break new ground.
            </Text>
          )}

          <GoalPicker current={profile.dailyGoal} onChange={onGoalChange} />

          <Button
            title={status.doneToday ? 'Practice again' : 'Start Daily Drill'}
            kind={status.doneToday ? 'secondary' : 'primary'}
            size="lg"
            full
            onPress={() => router.push('/session/drill')}
            right={
              <IconArrowRight
                color={status.doneToday ? theme.text : theme.accentText}
                size={18}
              />
            }
            />
          </Stack>
        </Card>
      </Stagger>

      <Spacer size={space.xxl} />

      {/* ── Daily puzzle ── */}
      {puzzle ? (
        <>
          <SectionLabel label="Today's puzzle" width={inner} />
          <Spacer size={space.md} />
          <Pressable onPress={() => router.push({ pathname: '/session/flaw', params: { puzzle: '1' } })}>
            <Card accent={puzzle.solved ? theme.positive : theme.warning}>
              <Row gap={space.md} align="center">
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: puzzle.solved ? theme.positiveSoft : theme.warningSoft,
                  }}>
                  <IconEye color={puzzle.solved ? theme.positive : theme.warning} size={20} />
                </View>
                <Stack gap={2} style={{ flex: 1 }}>
                  <Eyebrow tone={puzzle.solved ? 'positive' : 'warning'}>
                    {puzzle.solved ? 'Puzzle solved' : 'Daily puzzle'}
                  </Eyebrow>
                  <Text variant="smallStrong">Spot the Flaw</Text>
                  <Text variant="caption" tone="textFaint">
                    {puzzle.solved
                      ? 'Same puzzle for everyone today. Share your result.'
                      : 'One design, one requirement, one line that breaks it.'}
                  </Text>
                </Stack>
                <IconArrowRight color={theme.accent} size={17} />
              </Row>
            </Card>
          </Pressable>
        </>
      ) : null}

      <Spacer size={space.xxl} />
      <SectionLabel label="Daily quests" width={inner} />
      <Spacer size={space.md} />

      {/* ── Daily quests ── */}
      <QuestCard />

      <Spacer size={space.lg} />

      {/* ── Account needing attention ── */}
      {weakest && weakestRow ? (
        <Pressable onPress={() => router.push('/board')}>
          <Card accent={weakest.accent}>
            <Stack gap={space.sm}>
              <Row justify="space-between" align="center">
                <Eyebrow>Needs you most</Eyebrow>
                <Chip
                  label={healthBand(weakestRow.health).label}
                  color={
                    healthBand(weakestRow.health).tone === 'good'
                      ? theme.positive
                      : healthBand(weakestRow.health).tone === 'warn'
                        ? theme.warning
                        : theme.negative
                  }
                  filled
                />
              </Row>
              <Text variant="bodyStrong">{weakest.name}</Text>
              <Text variant="small" tone="textMuted">
                {weakest.hook}
              </Text>
              <Bar value={weakestRow.health / 100} color={weakest.accent} height={5} />
            </Stack>
          </Card>
        </Pressable>
      ) : null}

      <Spacer size={space.lg} />


      <Spacer />
    </Screen>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up?';
  if (hour < 12) return 'Morning.';
  if (hour < 18) return 'Afternoon.';
  return 'Evening.';
}

/**
 * Session-size picker.
 *
 * Sitting on the Today card rather than buried in settings is deliberate: the
 * honest use for "Casual" is a day when you nearly skipped, and it only saves
 * the streak if you can reach it in one tap on the way in.
 */
function GoalPicker({
  current,
  onChange,
}: {
  current: DailyGoal;
  onChange: (goal: DailyGoal) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Row gap={space.xs}>
        {DAILY_GOAL_KEYS.map((key) => {
          const active = key === current;
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              style={{
                flex: 1,
                paddingVertical: space.sm,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: active ? theme.accent : theme.border,
                backgroundColor: active ? theme.accent + '1A' : 'transparent',
                alignItems: 'center',
                gap: 1,
              }}>
              <Text variant="caption" tone={active ? 'accent' : 'textMuted'}>
                {DAILY_GOALS[key].label}
              </Text>
              <Text variant="eyebrow" tone={active ? 'accent' : 'textFaint'}>
                {DAILY_GOALS[key].items}Q
              </Text>
            </Pressable>
          );
        })}
      </Row>
      <Text variant="caption" tone="textFaint">
        {DAILY_GOALS[current].blurb}
      </Text>
    </View>
  );
}

/**
 * The spendable-currency balance, worn like the streak: always in view.
 * Pulses when the balance grows (a chest or quest just paid out), stays still
 * on first render and under reduce-motion.
 */
function PointsPill({ points }: { points: number }) {
  const theme = useTheme();
  const reduced = useMotion().reduced;
  const scale = useSharedValue(1);
  const previous = useRef(points);

  useEffect(() => {
    if (points > previous.current && !reduced) {
      scale.value = withSequence(
        withTiming(1.18, { duration: 110 }),
        withSpring(1, { damping: 8, stiffness: 260 })
      );
    }
    previous.current = points;
  }, [points, reduced, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
          borderRadius: radius.pill,
          backgroundColor: theme.accent + '1C',
          borderWidth: 1,
          borderColor: theme.accent + '44',
        },
        style,
      ]}>
      <IconGem color={theme.accent} size={15} />
      <Text variant="numericSm" color={theme.accent}>
        {points.toLocaleString()}
      </Text>
    </Animated.View>
  );
}

/**
 * Daily quests: three goals derived from what the app already records, paid
 * in points the moment the data says they are done. The card re-checks on
 * every focus, so finishing a session elsewhere ticks the boxes here.
 */
function QuestCard() {
  const theme = useTheme();
  const refresh = useRefreshAppState();
  const [quests, setQuests] = useState<QuestStatus[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      refreshQuests(db).then(({ quests: next, justEarned }) => {
        if (!alive) return;
        setQuests(next);
        // A payout changes the points balance shown in the header.
        if (justEarned > 0) refresh();
      });
      return () => {
        alive = false;
      };
    }, [refresh])
  );

  if (quests.length === 0) return null;
  const doneCount = quests.filter((q) => q.claimed).length;

  return (
    <Card>
      <Stack gap={space.md}>
        <Row justify="space-between" align="center">
          <Row gap={space.sm} align="center">
            <IconQuest color={theme.accent} size={17} />
            <Text variant="smallStrong">
              {doneCount} of {quests.length} done
            </Text>
          </Row>
          <Text variant="caption" tone="textFaint">
            fresh tomorrow
          </Text>
        </Row>
        {quests.map((quest) => {
          const tint = quest.claimed ? theme.positive : theme.textFaint;
          return (
            <Row key={quest.id} gap={space.md} align="center">
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: quest.claimed ? theme.positive : theme.borderStrong,
                  backgroundColor: quest.claimed ? theme.positiveSoft : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {quest.claimed ? <IconCheck color={theme.positive} size={14} /> : null}
              </View>
              <Stack gap={1} style={{ flex: 1 }}>
                <Text
                  variant="smallStrong"
                  tone={quest.claimed ? 'textFaint' : undefined}
                  style={quest.claimed ? { textDecorationLine: 'line-through' } : undefined}>
                  {quest.title}
                </Text>
                <Text variant="caption" tone="textFaint">
                  {quest.claimed
                    ? quest.detail
                    : `${quest.progress}/${quest.target} · ${quest.detail}`}
                </Text>
              </Stack>
              <Row gap={4} align="center">
                <IconGem color={tint} size={13} />
                <Text variant="numericSm" color={tint}>
                  +{quest.points}
                </Text>
              </Row>
            </Row>
          );
        })}
      </Stack>
    </Card>
  );
}

function ProfileButton() {
  const theme = useTheme();
  return (
    <Tappable
      onPress={() => router.push('/profile')}
      accessibilityLabel="Profile and settings"
      height={38}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: theme.accentSoft,
        borderWidth: 1.5,
        borderColor: theme.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <IconUser color={theme.accent} size={20} />
    </Tappable>
  );
}


/**
 * The first thirty seconds.
 *
 * A new install lands on a page of zeroed meters, which reads as a dashboard
 * for somebody else. This card names the three loops once, then deletes itself
 * the moment the first session is banked. Keyed off recorded answers rather
 * than a stored flag, so reinstalls and resets behave sensibly for free.
 */
function WelcomeCard() {
  const theme = useTheme();
  return (
    <Card accent={theme.accent} level={2}>
      <Stack gap={space.md}>
        <Eyebrow tone="accent">Welcome</Eyebrow>
        <Text variant="heading">Three loops, three minutes a day</Text>
        <Stack gap={space.sm}>
          <WelcomeRow
            title="Learn"
            body="Ninety-second theory cards. One idea each, with the part people get wrong."
          />
          <WelcomeRow
            title="Drill"
            body="A short daily quiz. Spaced repetition brings back what you are about to forget."
          />
          <WelcomeRow
            title="The Board"
            body="Four pretend customers. Your judgment calls move their health, not just your score."
          />
        </Stack>
        <Button
          title="Start your first drill"
          size="lg"
          full
          onPress={() => router.push('/session/drill')}
          right={<IconArrowRight color={theme.accentText} size={18} />}
        />
        <Tappable
          onPress={() => router.push('/learn')}
          accessibilityLabel="Read a lesson first"
          scaleOnPress={false}>
          <Text variant="caption" tone="accent" center>
            Prefer to read something first? Start with a lesson.
          </Text>
        </Tappable>
      </Stack>
    </Card>
  );
}

function WelcomeRow({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <Row gap={space.md} align="flex-start">
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.accent,
          marginTop: 9,
        }}
      />
      <Text variant="small" style={{ flex: 1 }}>
        <Text variant="smallStrong">{title}. </Text>
        {body}
      </Text>
    </Row>
  );
}
