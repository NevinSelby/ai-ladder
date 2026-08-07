import { router } from 'expo-router';
import { goBack } from '@/lib/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DifficultyTag } from '@/components/difficulty-tag';
import { Tappable } from '@/components/tappable';
import { useConfirmExit } from '@/components/confirm-exit';
import { IconArrowLeft, IconArrowRight, IconCheck, IconCross, IconGem } from '@/components/icons';
import { Bar, Button, Card, Chip, Divider, Eyebrow, Row, Stack, Text } from '@/components/ui';
import { applyAttemptsToBoard } from '@/data/accounts';
import { syncNow } from '@/data/sync';
import { planAttempt, persistAttempts, type PlannedAttempt } from '@/data/attempts';
import { tapHaptic } from '@/lib/haptics';
import { Confetti, CountUp } from '@/components/celebrate';
import { isFirstSessionToday, recordDay } from '@/data/learning';
import { applySessionResult, awardPoints, readProfile } from '@/data/profile';
import { itemsForMode } from '@/data/session';
import { db } from '@/db';
import { useRefreshAppState } from '@/hooks/use-app-state';
import { METER_META, meterColor, motion, radius, space, useScheme, useTheme } from '@/theme';
import type { ArenaItem } from '@shared/content';
import { dailyBonusPoints } from '@shared/progression';
import type { MeterKey } from '@shared/taxonomy';

/**
 * Trade-off Arena.
 *
 * Sixty seconds per call. You are shown a constraint and two options, you
 * commit, and only then do you see the reasoning beats and the field take.
 *
 * Grading is deliberately honest about what it can and cannot check offline:
 * the *choice* is scored against the defensible answer, and the *reasoning* is
 * self-assessed against the key points. Several items are marked `either`,
 * where the option carries no signal at all and only the justification does, 
 * pretending to grade those automatically would be theatre.
 */

const ROUNDS = 5;
const SECONDS = 60;

type Stage = 'loading' | 'choosing' | 'revealed' | 'summary';

interface Result {
  item: ArenaItem;
  picked: 'A' | 'B';
  correct: boolean;
  pointsHit: number;
  meter: MeterKey;
  xp: number;
  attemptId: string;
  /** The unwritten attempt; persisted only when the run completes. */
  planned: PlannedAttempt;
}

export default function ArenaSession() {
  const theme = useTheme();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const refresh = useRefreshAppState();

  const [items, setItems] = useState<ArenaItem[]>([]);
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('loading');
  const [picked, setPicked] = useState<'A' | 'B' | null>(null);
  const [hitPoints, setHitPoints] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<Result[]>([]);
  /** Completed round being reviewed; null means the live one. The 60-second
   *  clock keeps running while you look back, so review has an honest cost. */
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  /** Points from the daily chest, when this run was the first session today. */
  const [chestPoints, setChestPoints] = useState(0);
  const [remaining, setRemaining] = useState(SECONDS);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let canceled = false;
    (async () => {
      const all = (await itemsForMode(db, 'arena')) as ArenaItem[];
      if (canceled) return;
      setItems(all.slice(0, ROUNDS));
      setStage(all.length > 0 ? 'choosing' : 'summary');
      startedAt.current = Date.now();
    })();
    return () => {
      canceled = true;
    };
  }, []);

  // The clock is pressure, not a fail state, running out reveals the answer
  // rather than scoring zero, because the point is to build the instinct to
  // commit quickly, not to punish someone who thought carefully.
  useEffect(() => {
    if (stage !== 'choosing') return;
    setRemaining(SECONDS);
    const tick = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(tick);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [stage, index]);

  const item = items[index];

  const commit = useCallback(
    async (choice: 'A' | 'B') => {
      if (!item) return;
      setPicked(choice);

      const defensible = item.payload.defensible;
      const correct = defensible === 'either' || defensible === choice;

      tapHaptic();
      setStage('revealed');
    },
    [item]
  );

  const decided = results.length;

  const { dialog: exitDialog, requestExit } = useConfirmExit({
    enabled: stage === 'choosing' || stage === 'revealed',
    title: 'Leave the arena?',
    message:
      decided > 0
        ? `All your progress will be lost. The ${decided} call${decided === 1 ? '' : 's'} you have made will not be saved, and nothing from this run will count toward your XP, streak or stats.`
        : 'No calls made yet, so nothing is lost and your streak is unchanged.',
    confirmLabel: decided > 0 ? 'Leave and discard' : 'Leave',
    cancelLabel: 'Keep going',
  });

  const advance = useCallback(async () => {
    if (!item || !picked) return;

    const defensible = item.payload.defensible;
    const correct = defensible === 'either' || defensible === picked;
    // Half the mark is the call, half is whether the reasoning covered the
    // beats. An 'either' item scores entirely on the reasoning.
    const reasoning = item.payload.keyPoints.length
      ? hitPoints.size / item.payload.keyPoints.length
      : 0;
    const score = defensible === 'either' ? reasoning : (correct ? 0.5 : 0) + reasoning * 0.5;

    const profile = await readProfile(db);
    // In memory only until the run completes; a quit discards every round.
    const planned = planAttempt({
      item,
      score,
      response: { picked, hitPoints: [...hitPoints] },
      elapsedMs: Date.now() - startedAt.current,
      expectedMs: SECONDS * 1000,
      streakDays: profile.streakDays,
      continuous: true,
    });

    const next = [
      ...results,
      {
        item,
        picked,
        correct,
        pointsHit: hitPoints.size,
        meter: planned.meter,
        xp: planned.xp,
        attemptId: planned.id,
        planned,
      },
    ];
    setResults(next);
    setHitPoints(new Set());
    setPicked(null);
    setViewIndex(null);

    if (index + 1 < items.length) {
      setIndex(index + 1);
      setStage('choosing');
      startedAt.current = Date.now();
      return;
    }

    // The full run is complete: only now does anything reach the database.
    await persistAttempts(db, next.map((r) => r.planned));

    const gains: Partial<Record<MeterKey, number>> = {};
    for (const result of next) gains[result.meter] = (gains[result.meter] ?? 0) + result.xp;

    // The daily chest opens on the first completed session of the day, and an
    // arena run counts: checked before recordDay marks today as practiced.
    let chest = 0;
    if (await isFirstSessionToday(db)) {
      const profileBefore = await readProfile(db);
      chest = dailyBonusPoints(profileBefore.streakDays);
      await awardPoints(db, chest);
      setChestPoints(chest);
    }

    await applySessionResult(db, gains);
    await recordDay(db, {
      sessions: 1,
      xp: next.reduce((sum, r) => sum + r.xp, 0),
      itemsAnswered: next.length,
    });
    await applyAttemptsToBoard(
      db,
      next.map((r) => ({ item: r.item, score: r.item.payload.defensible === 'either' ? 1 : r.correct ? 1 : 0, attemptId: r.attemptId }))
    );
    // Same as the drill: do not make the user relaunch to see this elsewhere.
    void syncNow(db).catch(() => {});
    refresh();
    setStage('summary');
  }, [item, picked, hitPoints, results, index, items.length, refresh]);

  if (stage === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (stage === 'summary') {
    const totalXp = results.reduce((sum, r) => sum + r.xp, 0);
    const rightCalls = results.filter((r) => r.correct).length;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          paddingTop: insets.top + space.xxl,
          paddingHorizontal: space.lg,
        }}>
        {rightCalls === results.length && results.length > 0 ? <Confetti count={18} /> : null}
        <Animated.View entering={FadeInDown.duration(motion.slow)}>
          <Stack gap={space.xl}>
            <Stack gap={space.xs}>
              <Eyebrow tone="accent">Arena complete</Eyebrow>
              <Text variant="display">
                {rightCalls} / {results.length}
              </Text>
              <Text variant="small" tone="textMuted">
                Defensible calls. The reasoning behind them is what an interviewer actually
                scores, reread the field takes you missed.
              </Text>
            </Stack>
            <Card>
              <Stack gap={space.sm}>
                <Row justify="space-between" align="baseline">
                  <Eyebrow>XP earned</Eyebrow>
                  <CountUp value={totalXp} />
                </Row>
                {chestPoints > 0 ? (
                  <Row justify="space-between" align="center">
                    <Row gap={6} align="center">
                      <IconGem color={theme.accent} size={14} />
                      <Text variant="small" tone="textMuted">
                        Daily chest
                      </Text>
                    </Row>
                    <Text variant="numericSm" tone="accent">
                      +{chestPoints} points
                    </Text>
                  </Row>
                ) : null}
              </Stack>
            </Card>
          </Stack>
        </Animated.View>
        <View style={{ flex: 1 }} />
        <View style={{ paddingBottom: Math.max(insets.bottom, space.lg) }}>
          <Button title="Done" size="lg" full onPress={() => goBack('/')} />
        </View>
      </View>
    );
  }

  if (!item) return null;
  const reviewing = viewIndex !== null;
  const viewed = reviewing ? results[viewIndex] : null;
  const revealed = reviewing || stage === 'revealed';
  const shownItem = viewed ? viewed.item : item;
  const payload = shownItem.payload;
  const shownPicked = viewed ? viewed.picked : picked;
  // Rounds finished before the live one; the live round reviews itself.
  const reviewableCount = index;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top + space.sm }}>
      {exitDialog}
      <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
        <Row justify="space-between" align="center">
          <Pressable onPress={requestExit} hitSlop={12}>
            <Text variant="eyebrow" tone="textFaint">
              CLOSE
            </Text>
          </Pressable>
          <Row gap={space.sm} align="center">
            {reviewing ? <Chip label="Reviewing" color={theme.warning} /> : null}
            {stage === 'choosing' ? (
              <Text
                variant="numericSm"
                color={remaining <= 10 ? theme.negative : theme.textMuted}>
                {remaining}s
              </Text>
            ) : null}
            <Tappable
              onPress={() => setViewIndex(reviewing ? Math.max(0, viewIndex - 1) : index - 1)}
              disabled={reviewableCount === 0 || viewIndex === 0}
              accessibilityLabel="Review the previous call"
              height={32}
              style={{ opacity: reviewableCount === 0 || viewIndex === 0 ? 0.3 : 1 }}>
              <IconArrowLeft color={theme.textMuted} size={17} />
            </Tappable>
            <Text variant="eyebrow" tone="textFaint">
              {(reviewing ? viewIndex : index) + 1} / {items.length}
            </Text>
            <Tappable
              onPress={() =>
                setViewIndex(reviewing && viewIndex + 1 < reviewableCount ? viewIndex + 1 : null)
              }
              disabled={!reviewing}
              accessibilityLabel="Go forward"
              height={32}
              style={{ opacity: reviewing ? 1 : 0.3 }}>
              <IconArrowRight color={theme.textMuted} size={17} />
            </Tappable>
          </Row>
        </Row>
        {stage === 'choosing' ? (
          <Bar
            value={remaining / SECONDS}
            color={remaining <= 10 ? theme.negative : theme.accent}
            height={3}
          />
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl, gap: space.lg }}
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(motion.base)}>
          <Stack gap={space.sm}>
            <Row justify="space-between" align="center">
              <Eyebrow>The constraint</Eyebrow>
              <DifficultyTag difficulty={shownItem.difficulty} mode="arena" />
            </Row>
            <Text variant="question">{payload.situation}</Text>
          </Stack>
        </Animated.View>

        <Stack gap={space.sm}>
          <OptionCard
            label="A"
            text={payload.optionA}
            picked={shownPicked === 'A'}
            revealed={revealed}
            defensible={payload.defensible}
            onPress={revealed || reviewing ? undefined : () => commit('A')}
          />
          <OptionCard
            label="B"
            text={payload.optionB}
            picked={shownPicked === 'B'}
            revealed={revealed}
            defensible={payload.defensible}
            onPress={revealed || reviewing ? undefined : () => commit('B')}
          />
        </Stack>

        {reviewing && viewed ? (
          <Animated.View entering={FadeIn.duration(motion.base)}>
            <Card accent={viewed.correct ? theme.positive : theme.negative}>
              <Stack gap={space.sm}>
                <Eyebrow tone={viewed.correct ? 'positive' : 'negative'}>
                  {payload.defensible === 'either'
                    ? 'Both were defensible'
                    : viewed.correct
                      ? 'You made the defensible call'
                      : `Defensible: option ${payload.defensible}`}
                </Eyebrow>
                <Text variant="body">{payload.fieldTake}</Text>
                <Divider />
                <Text variant="small" tone="textMuted">
                  {shownItem.explanation}
                </Text>
              </Stack>
            </Card>
          </Animated.View>
        ) : null}

        {revealed && !reviewing ? (
          <>
            <Animated.View entering={FadeInDown.duration(motion.slow)}>
              <Card accent={theme.accent}>
                <Stack gap={space.md}>
                  <Eyebrow tone="accent">
                    {payload.defensible === 'either'
                      ? 'Both are defensible: the justification is the whole answer'
                      : `Defensible: option ${payload.defensible}`}
                  </Eyebrow>
                  <Text variant="small" tone="textMuted">
                    Tick every beat your one-line justification actually covered. Be honest, 
                    this is the only part nobody else can check for you.
                  </Text>
                  <Divider />
                  {payload.keyPoints.map((point, i) => {
                    const hit = hitPoints.has(i);
                    return (
                      <Pressable
                        key={point}
                        onPress={() => {
                          const next = new Set(hitPoints);
                          if (hit) next.delete(i);
                          else next.add(i);
                          setHitPoints(next);
                        }}>
                        <Row gap={space.md} align="flex-start">
                          <View
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: radius.sm - 4,
                              borderWidth: 1.5,
                              borderColor: hit ? theme.positive : theme.borderStrong,
                              backgroundColor: hit ? theme.positiveSoft : 'transparent',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginTop: 2,
                            }}>
                            {hit ? <IconCheck color={theme.positive} size={14} /> : null}
                          </View>
                          <Text variant="small" style={{ flex: 1 }}>
                            {point}
                          </Text>
                        </Row>
                      </Pressable>
                    );
                  })}
                </Stack>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(motion.slow).delay(120)}>
              <Card>
                <Stack gap={space.sm}>
                  <Eyebrow>The field take</Eyebrow>
                  <Text variant="body">{payload.fieldTake}</Text>
                  <Divider />
                  <Text variant="small" tone="textMuted">
                    {item.explanation}
                  </Text>
                </Stack>
              </Card>
            </Animated.View>
          </>
        ) : null}
      </ScrollView>

      <View
        style={{
          padding: space.lg,
          paddingBottom: Math.max(insets.bottom, space.lg),
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.surface,
        }}>
        {reviewing ? (
          <Button
            title="Back to the current call"
            size="lg"
            full
            kind="secondary"
            onPress={() => setViewIndex(null)}
          />
        ) : revealed ? (
          <Button
            title={index + 1 < items.length ? 'Next call' : 'Finish'}
            size="lg"
            full
            onPress={advance}
            right={<IconArrowRight color={theme.accentText} size={18} />}
          />
        ) : (
          <Text variant="caption" tone="textFaint" center>
            Commit to one. You will see the reasoning after you choose.
          </Text>
        )}
      </View>
    </View>
  );
}

function OptionCard({
  label,
  text,
  picked,
  revealed,
  defensible,
  onPress,
}: {
  label: 'A' | 'B';
  text: string;
  picked: boolean;
  revealed: boolean;
  defensible: 'A' | 'B' | 'either';
  onPress?: () => void;
}) {
  const theme = useTheme();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.02, motion.spring) }],
  }));

  const isDefensible = revealed && (defensible === 'either' || defensible === label);
  const isWrong = revealed && picked && !isDefensible;

  const border = isDefensible
    ? theme.positive
    : isWrong
      ? theme.negative
      : picked
        ? theme.accent
        : theme.border;
  const background = isDefensible
    ? theme.positiveSoft
    : isWrong
      ? theme.negativeSoft
      : picked
        ? theme.accentSoft
        : theme.surface;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        onPressIn={() => (pressed.value = 1)}
        onPressOut={() => (pressed.value = 0)}
        style={{
          borderWidth: picked || revealed ? 1.5 : 1,
          borderColor: border,
          backgroundColor: background,
          borderRadius: radius.md,
          padding: space.lg,
        }}>
        <Row gap={space.md} align="center">
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: radius.sm,
              backgroundColor: theme.elevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text variant="numericSm" tone={picked ? 'accent' : 'textMuted'}>
              {label}
            </Text>
          </View>
          <Text variant="body" style={{ flex: 1 }}>
            {text}
          </Text>
          {isDefensible ? <IconCheck color={theme.positive} size={19} /> : null}
          {isWrong ? <IconCross color={theme.negative} size={19} /> : null}
        </Row>
      </Pressable>
    </Animated.View>
  );
}
