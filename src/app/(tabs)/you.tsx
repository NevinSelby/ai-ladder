import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';

import { LadderCard } from '@/components/climb';
import {
  BranchProgress,
  CalendarHeatmap,
  MeterBars,
  Sparkline,
} from '@/components/charts';
import { IconFlame, IconTrophy } from '@/components/icons';
import { StreakFlame } from '@/components/streak-flame';
import { Tooltip } from '@/components/tooltip';
import { Button, Card, Chip, Divider, Eyebrow, Row, Screen, Spacer, Stack, Text } from '@/components/ui';
import { attemptSummary } from '@/data/attempts';
import { lessonStats, recentDays, streakSummary, type DayRecord } from '@/data/learning';
import { leeches, nodeStrengths, resumeLeech } from '@/data/session';
import { retentionForecast } from '@/data/retention';
import { fetchLeaderboard, type LeaderboardRow } from '@/data/leaderboard';
import { useAuthSession } from '@/hooks/use-auth';
import { db } from '@/db';
import { useProfile, useRefreshAppState } from '@/hooks/use-app-state';
import {
  MAX_CONTENT_WIDTH,
  useLayout,
  METER_META,
  meterColor,
  motion,
  space,
  useScheme,
  useTheme,
  radius,
} from '@/theme';
import { levelProgress, shadowLevel } from '@shared/progression';
import { CLOUD_META } from '@/data/profile';
import { SectionLabel } from '@/components/surface';
import type { MeterKey } from '@shared/taxonomy';

/**
 * Progress: the visual home of the app.
 *
 * Everywhere else is necessarily text-heavy: a question is words, a lesson is
 * words. This screen answers "how am I doing" with marks instead, so the app
 * has somewhere the eye can rest and the shape of your practice is legible at
 * a glance rather than read.
 */
export default function YouScreen() {
  const theme = useTheme();
  const scheme = useScheme();
  const refresh = useRefreshAppState();
  const { width } = useWindowDimensions();
  const layout = useLayout();

  const { data: profile } = useProfile();
  const { data: streak = { current: 0, longest: 0, atRisk: false, activeToday: false, totalDays: 0, days: [] } } = useQuery({
    queryKey: ['app-state', 'streak'],
    queryFn: () => streakSummary(db),
    placeholderData: {
      current: 0,
      longest: 0,
      atRisk: false,
      activeToday: false,
      totalDays: 0,
      days: [],
    },
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedMeter, setSelectedMeter] = useState<MeterKey | null>(null);

  const { data: days = [] } = useQuery({
    queryKey: ['app-state', 'days'],
    queryFn: () => recentDays(db, 120),
    placeholderData: [],
  });
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
  const { data: forecast = { points: [], tracked: 0, atRisk: 0 } } = useQuery({
    queryKey: ['app-state', 'retention'],
    queryFn: () => retentionForecast(db),
    placeholderData: { points: [], tracked: 0, atRisk: 0 },
  });
  const { data: paused = [] } = useQuery({
    queryKey: ['app-state', 'leeches'],
    queryFn: () => leeches(db),
    placeholderData: [],
  });
  const { data: strengths = { weakest: [], strongest: [], rated: 0 } } = useQuery({
    queryKey: ['app-state', 'node-strengths'],
    queryFn: () => nodeStrengths(db),
    placeholderData: { weakest: [], strongest: [], rated: 0 },
  });

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const inner = Math.min(width, layout.contentWidth) - space.lg * 2;
  const cardInner = inner - space.lg * 2;

  const progress = levelProgress(profile.meters);
  const shadow = shadowLevel(profile.meters);
  const blockedTint = meterColor(progress.blockedBy, scheme);

  // Oldest to newest for the trend line; the store returns newest first.
  const trendDays = [...days].reverse().slice(-30);
  const xpSeries = trendDays.map((d) => d.xp);
  const xpLabels = trendDays.map((d) =>
    new Date(`${d.day}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  );
  const heatDays = days.map((d) => ({ day: d.day, xp: d.xp }));
  const studiedMinutes = Math.round(lessons.secondsSpent / 60);

  return (
    <Screen>
      <Spacer size={space.sm} />
      <Animated.View entering={FadeIn.duration(motion.slow)}>
        <Stack gap={space.xs}>
          <Eyebrow>Standing</Eyebrow>
          <Text variant="display">You</Text>
        </Stack>
      </Animated.View>

      <Spacer size={space.lg} />

      {/* The ladder is the headline: eight rungs, and you can see the ones
          above you. A percentage cannot show that shape. */}
      <Animated.View entering={FadeInDown.duration(motion.slow).delay(60)}>
        <Card>
          <LadderCard meters={profile.meters} />
        </Card>
      </Animated.View>

      <Spacer size={space.lg} />

      {/* ── Level and streak ── */}
      <Animated.View entering={FadeInDown.duration(motion.slow).delay(60)}>
        <Card>
          <Row justify="space-around" align="center">
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Tooltip
                title="Daily streak"
                body={`Consecutive days with a finished session. Your longest run so far is ${streak.longest}. A missed day resets the count to one, not to zero.`}
                align="center">
                <StreakFlame
                  days={streak.current}
                  lit={streak.activeToday}
                  size={30}
                  showCount={false}
                />
              </Tooltip>
              <Text variant="numeric">{streak.current}</Text>
              <Text variant="caption" tone="textFaint">
                day streak
              </Text>
              {streak.longest > streak.current ? (
                <Text variant="caption" tone="textFaint">
                  best {streak.longest}
                </Text>
              ) : null}
              {streak.atRisk ? <Chip label="at risk" color={theme.warning} filled /> : null}
            </View>
          </Row>
        </Card>
      </Animated.View>

      <Spacer size={space.md} />

      {/* ── Leaderboard ── */}
      <Animated.View entering={FadeInDown.duration(motion.slow).delay(90)}>
        <LeaderboardCard />
      </Animated.View>

      <Spacer size={space.md} />

      {/* ── Practice history ── */}
      <Animated.View entering={FadeInDown.duration(motion.slow).delay(120)}>
        <Card>
          <Stack gap={space.md}>
            <Row justify="space-between" align="baseline">
              <Eyebrow>Practice history</Eyebrow>
              <Text variant="caption" tone="textFaint">
                {streak.totalDays} day{streak.totalDays === 1 ? '' : 's'} practiced
              </Text>
            </Row>
            <CalendarHeatmap
              days={heatDays}
              width={cardInner}
              onSelectDay={setSelectedDay}
            />
          </Stack>
        </Card>
      </Animated.View>

      <Spacer size={space.md} />

      {/* ── XP trend ── */}
      <Animated.View entering={FadeInDown.duration(motion.slow).delay(180)}>
        <Card>
          <Stack gap={space.sm}>
            <Row justify="space-between" align="baseline">
              <Eyebrow>XP per day</Eyebrow>
              <Text variant="caption" tone="textFaint">
                last 30 days
              </Text>
            </Row>
            <Sparkline values={xpSeries} labels={xpLabels} width={cardInner} />
          </Stack>
        </Card>
      </Animated.View>

      <Spacer size={space.md} />

      {/* ── Meters: bars rank, radar shows shape ── */}
      <Animated.View entering={FadeInDown.duration(motion.slow).delay(240)}>
        <Card>
          <Stack gap={space.md}>
            <Row justify="space-between" align="baseline">
              <Eyebrow>Craft meters</Eyebrow>
              <Text variant="caption" tone="textFaint">
                gated by the lowest
              </Text>
            </Row>
            <MeterBars
              meters={profile.meters}
              width={cardInner}
              highlight={progress.blockedBy}
              selected={selectedMeter}
              onSelect={(key) => setSelectedMeter((prev) => (prev === key ? null : key))}
            />
            {selectedMeter ? (
              <View
                style={{
                  backgroundColor: theme.elevated,
                  borderRadius: radius.md,
                  padding: space.md,
                  gap: 2,
                }}>
                <Row justify="space-between" align="center">
                  <Text variant="smallStrong" color={meterColor(selectedMeter, scheme)}>
                    {METER_META[selectedMeter].label}
                  </Text>
                  <Text variant="numericSm">{profile.meters[selectedMeter].toLocaleString()} XP</Text>
                </Row>
                <Text variant="caption" tone="textMuted">
                  {METER_META[selectedMeter].blurb}
                  {progress.blockedBy === selectedMeter
                    ? ' This is currently your lowest meter, the one holding your level back.'
                    : ''}
                </Text>
              </View>
            ) : (
              <Text variant="caption" tone="textFaint">
                Tap a bar to see what feeds that meter.
              </Text>
            )}
            {shadow.index > progress.level.index ? (
              <Text variant="caption" color={blockedTint} center>
                Your strongest meter alone would be {shadow.title}. That gap is the cost of the
                thing you have been avoiding.
              </Text>
            ) : null}
          </Stack>
        </Card>
      </Animated.View>

      <Spacer size={space.md} />

      {/* ── Strongest and weakest topics ── */}
      <Animated.View entering={FadeInDown.duration(motion.slow).delay(270)}>
        <Card>
          <Stack gap={space.md}>
            <Row justify="space-between" align="baseline">
              <Eyebrow>Topics</Eyebrow>
              <Text variant="caption" tone="textFaint">
                {strengths.rated} rated
              </Text>
            </Row>
            {strengths.rated === 0 ? (
              <Text variant="caption" tone="textFaint">
                Answer a few more questions and your strongest and weakest topics show up
                here. A topic needs at least two attempts before it counts.
              </Text>
            ) : (
              <>
                <Stack gap={space.sm}>
                  <Text variant="smallStrong" tone="negative">
                    Needs work
                  </Text>
                  {strengths.weakest.map((stat) => (
                    <TopicRow
                      key={stat.nodeId}
                      label={stat.node.label}
                      accuracy={stat.accuracy}
                      attempts={stat.attempts}
                      tone="negative"
                    />
                  ))}
                </Stack>
                <Divider />
                <Stack gap={space.sm}>
                  <Text variant="smallStrong" tone="positive">
                    Strongest
                  </Text>
                  {strengths.strongest.map((stat) => (
                    <TopicRow
                      key={stat.nodeId}
                      label={stat.node.label}
                      accuracy={stat.accuracy}
                      attempts={stat.attempts}
                      tone="positive"
                    />
                  ))}
                </Stack>
                <Text variant="caption" tone="textFaint">
                  Sessions already lean toward the topics at the top of the first list, so
                  practicing normally is practicing your weaknesses.
                </Text>
              </>
            )}
          </Stack>
        </Card>
      </Animated.View>

      <Spacer size={space.md} />

      {/* ── Predicted retention ── */}
      {forecast.points.length > 0 ? (
        <Animated.View entering={FadeInDown.duration(motion.slow).delay(285)}>
          <Card>
            <Stack gap={space.md}>
              <Row justify="space-between" align="baseline">
                <Eyebrow>Predicted recall</Eyebrow>
                <Text variant="caption" tone="textFaint">
                  next 30 days
                </Text>
              </Row>
              <Sparkline
                values={forecast.points.map((point) => Math.round(point.retention * 100))}
                labels={forecast.points.map((point) =>
                  point.day === 0 ? 'today' : `in ${point.day} day${point.day === 1 ? '' : 's'}`
                )}
                width={cardInner}
                unit="%"
                color={theme.positive}
              />
              <Text variant="caption" tone="textFaint">
                Average chance you would recall a tracked concept if asked that day, with no
                further practice. {forecast.tracked} concept
                {forecast.tracked === 1 ? '' : 's'} tracked
                {forecast.atRisk > 0
                  ? `, ${forecast.atRisk} slipping below the target within a week.`
                  : '.'}
              </Text>
            </Stack>
          </Card>
        </Animated.View>
      ) : null}

      {forecast.points.length > 0 ? <Spacer size={space.md} /> : null}

      {/* ── Paused concepts ── */}
      {paused.length > 0 ? (
        <Animated.View entering={FadeInDown.duration(motion.slow).delay(290)}>
          <Card accent={theme.warning}>
            <Stack gap={space.md}>
              <Row justify="space-between" align="baseline">
                <Eyebrow tone="warning">Paused</Eyebrow>
                <Text variant="caption" tone="textFaint">
                  {paused.length} concept{paused.length === 1 ? '' : 's'}
                </Text>
              </Row>
              <Text variant="caption" tone="textFaint">
                These were missed enough times that asking again was not teaching anything.
                Read the lesson, then put one back into rotation.
              </Text>
              {paused.map((leech) => (
                <Row key={leech.nodeId} justify="space-between" align="center">
                  <Pressable
                    style={{ flex: 1, paddingRight: space.md }}
                    onPress={() =>
                      router.push({ pathname: '/topic/[id]', params: { id: leech.nodeId } })
                    }>
                    <Text variant="small" numberOfLines={1}>
                      {leech.node.label}
                    </Text>
                    <Text variant="caption" tone="textFaint">
                      missed {leech.lapses} times
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Resume ${leech.node.label}`}
                    onPress={async () => {
                      await resumeLeech(db, leech.nodeId);
                      refresh();
                    }}>
                    <Chip label="resume" color={theme.accent} filled />
                  </Pressable>
                </Row>
              ))}
            </Stack>
          </Card>
        </Animated.View>
      ) : null}

      {paused.length > 0 ? <Spacer size={space.md} /> : null}

      {/* ── Theory coverage ── */}
      <Animated.View entering={FadeInDown.duration(motion.slow).delay(300)}>
        <Card>
          <Stack gap={space.md}>
            <Row justify="space-between" align="baseline">
              <Eyebrow>Theory read</Eyebrow>
              <Text variant="caption" tone="textFaint">
                {lessons.completed}/{lessons.total} · {studiedMinutes} min
              </Text>
            </Row>
            {lessons.byBranch.length > 0 ? (
              <BranchProgress
                items={lessons.byBranch.map((b) => ({
                  label: b.label,
                  completed: b.completed,
                  total: b.total,
                }))}
                width={cardInner}
              />
            ) : null}
          </Stack>
        </Card>
      </Animated.View>

      <Spacer size={space.md} />

      {/* ── Totals ── */}
      <Animated.View entering={FadeInDown.duration(motion.slow).delay(360)}>
        <Card>
          <Row justify="space-around" align="center">
            <Stat value={summary.total} label="answered" />
            <Stat value={summary.last7Days} label="this week" />
            <Stat value={`${Math.round(summary.averageScore * 100)}%`} label="avg score" />
            <Stat value={profile.bestCombo} label="best combo" />
          </Row>
        </Card>
      </Animated.View>

      <Spacer size={space.section} />

      {/* ── Account ──
          Identity and settings live at the foot of this screen because they
          belong to the same subject as everything above: this person. The full
          settings page stays a route for the top-right avatar. */}
      <Animated.View entering={FadeInDown.duration(motion.slow).delay(440)}>
        <SectionLabel label="Account" width={cardInner} />
        <Spacer size={space.md} />
        <Card>
          <Stack gap={space.md}>
            <Row justify="space-between" align="center">
              <Stack gap={2} style={{ flex: 1 }}>
                <Text variant="bodyStrong">
                  {profile.username ?? profile.displayName ?? 'Signed in'}
                </Text>
                <Text variant="caption" tone="textFaint">
                  {CLOUD_META[profile.cloudPreference].label} questions
                </Text>
              </Stack>
              <Button
                title="Settings"
                kind="secondary"
                onPress={() => router.push('/profile')}
              />
            </Row>
          </Stack>
        </Card>
      </Animated.View>

      <Spacer />

      <DayDetail
        day={selectedDay}
        record={days.find((d) => d.day === selectedDay) ?? null}
        onClose={() => setSelectedDay(null)}
      />
    </Screen>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text variant="numeric" style={{ fontSize: 21, lineHeight: 26 }}>
        {value}
      </Text>
      <Text variant="caption" tone="textFaint">
        {label}
      </Text>
    </View>
  );
}


/**
 * What happened on one day.
 *
 * Opened by pressing a cell in the practice history. A heatmap communicates
 * shape well and detail not at all, so the cell has to be able to answer "what
 * was that Tuesday?", otherwise the grid is decoration.
 */
function DayDetail({
  day,
  record,
  onClose,
}: {
  day: string | null;
  record: DayRecord | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  if (!day) return null;

  const date = new Date(`${day}T00:00:00`);
  const label = date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(motion.fast)}
        style={{
          flex: 1,
          backgroundColor: theme.scrim,
          justifyContent: 'flex-end',
        }}>
        <Pressable style={{ position: 'absolute', inset: 0 }} onPress={onClose} />
        <Animated.View
          entering={SlideInDown.duration(motion.base)}
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: space.xl,
            paddingBottom: space.xxxl,
            gap: space.lg,
          }}>
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.borderStrong,
            }}
          />
          <Stack gap={space.xs}>
            <Eyebrow>{record ? 'Practiced' : 'No practice'}</Eyebrow>
            <Text variant="title">{label}</Text>
          </Stack>

          {record ? (
            <Row gap={space.lg} wrap>
              <Stat label="XP" value={record.xp.toLocaleString()} />
              <Stat label="Questions" value={String(record.itemsAnswered)} />
              <Stat label="Sessions" value={String(record.sessions)} />
              <Stat label="Lessons" value={String(record.lessonsRead)} />
            </Row>
          ) : (
            <Text variant="small" tone="textMuted">
              Nothing logged on this day. A rest day does not erase your history, only a
              missed day breaks the streak.
            </Text>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/**
 * The leaderboard: everyone with an account, ranked by total XP.
 *
 * Signed-out users see a pitch instead of an error, because the board is the
 * first feature that is better with friends and the pitch is the reason to
 * make an account. The list re-fetches on focus via react-query staleness.
 */
function LeaderboardCard() {
  const theme = useTheme();
  const { session, loading } = useAuthSession();

  const { data: rows = [], isError } = useQuery({
    queryKey: ['leaderboard', session?.user.id ?? 'anon'],
    queryFn: () => fetchLeaderboard(),
    enabled: Boolean(session),
    staleTime: 60_000,
    placeholderData: [],
  });

  const top = rows.slice(0, 10);
  const me = rows.find((r) => r.isMe);
  const meOutsideTop = me && me.rank > 10;

  return (
    <Card>
      <Stack gap={space.md}>
        <Row justify="space-between" align="center">
          <Row gap={space.sm} align="center">
            <IconTrophy color={theme.accent} size={17} />
            <Eyebrow>Leaderboard</Eyebrow>
          </Row>
          <Text variant="caption" tone="textFaint">
            by total XP
          </Text>
        </Row>

        {!session && !loading ? (
          <Stack gap={space.sm}>
            <Text variant="small" tone="textMuted">
              The board ranks everyone with an account by total XP. Sign in to claim your
              place, then share the app: your friends appear here the moment they do.
            </Text>
            <Button title="Sign in to join" kind="secondary" onPress={() => router.push('/auth')} />
          </Stack>
        ) : isError ? (
          <Text variant="caption" tone="textFaint">
            Could not load the board right now. It needs a connection; pull back in later.
          </Text>
        ) : top.length === 0 ? (
          <Text variant="caption" tone="textFaint">
            Loading the standings…
          </Text>
        ) : (
          <Stack gap={space.sm}>
            {top.map((row) => (
              <LeaderboardRowView key={row.id} row={row} />
            ))}
            {meOutsideTop && me ? (
              <>
                <Text variant="caption" tone="textFaint" center>
                  ···
                </Text>
                <LeaderboardRowView row={me} />
              </>
            ) : null}
            {rows.length === 1 ? (
              <Text variant="caption" tone="textFaint">
                Just you so far. Share the app and this gets a lot more interesting: you
                currently hold first place by default.
              </Text>
            ) : null}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

function LeaderboardRowView({ row }: { row: LeaderboardRow }) {
  const theme = useTheme();
  const medal =
    row.rank === 1 ? theme.warning : row.rank === 2 ? theme.textMuted : row.rank === 3 ? '#B0764A' : null;
  return (
    <Row
      gap={space.md}
      align="center"
      style={
        row.isMe
          ? {
              backgroundColor: theme.accentSoft,
              borderRadius: radius.md,
              paddingHorizontal: space.sm,
              paddingVertical: space.xs,
              marginHorizontal: -space.sm,
            }
          : undefined
      }>
      <View style={{ width: 26, alignItems: 'center' }}>
        {medal ? (
          <IconTrophy color={medal} size={15} />
        ) : (
          <Text variant="numericSm" tone="textFaint">
            {row.rank}
          </Text>
        )}
      </View>
      <Text variant="smallStrong" style={{ flex: 1 }} numberOfLines={1}>
        {row.displayName}
        {row.isMe ? ' (you)' : ''}
      </Text>
      {row.streakDays > 0 ? (
        <Row gap={3} align="center">
          <IconFlame color={theme.warning} size={12} />
          <Text variant="caption" tone="textFaint">
            {row.streakDays}
          </Text>
        </Row>
      ) : null}
      <Text variant="numericSm" style={{ width: 72, textAlign: 'right' }}>
        {row.totalXp.toLocaleString()} XP
      </Text>
    </Row>
  );
}

function TopicRow({
  label,
  accuracy,
  attempts,
  tone,
}: {
  label: string;
  accuracy: number;
  attempts: number;
  tone: 'positive' | 'negative';
}) {
  const theme = useTheme();
  const tint = tone === 'positive' ? theme.positive : theme.negative;
  const pct = Math.round(accuracy * 100);
  return (
    <Row gap={space.md} align="center">
      <Text variant="small" style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
      <View
        style={{
          width: 72,
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.elevated,
          overflow: 'hidden',
        }}>
        <View
          style={{
            width: `${Math.max(4, pct)}%`,
            height: 6,
            borderRadius: 3,
            backgroundColor: tint,
          }}
        />
      </View>
      <Text variant="caption" tone="textFaint" style={{ width: 74, textAlign: 'right' }}>
        {pct}% · {attempts} tries
      </Text>
    </Row>
  );
}
