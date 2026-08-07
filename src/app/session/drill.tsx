import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/lib/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConfirmExit } from '@/components/confirm-exit';
import { DifficultyTag } from '@/components/difficulty-tag';
import { Diagram } from '@/components/diagrams';
import { IconArrowLeft, IconArrowRight, IconCheck, IconCross, IconGem, IconLink } from '@/components/icons';
import {
  Bar,
  Button,
  Card,
  Chip,
  Divider,
  Eyebrow,
  Row,
  Spacer,
  Stack,
  Text,
} from '@/components/ui';
import { applyAttemptsToBoard } from '@/data/accounts';
import { syncNow } from '@/data/sync';
import { planAttempt, persistAttempts, type PlannedAttempt } from '@/data/attempts';
import { successHaptic, warningHaptic } from '@/lib/haptics';
import { Confetti, CountUp } from '@/components/celebrate';
import { StreakFlame } from '@/components/streak-flame';
import { Tappable } from '@/components/tappable';
import { LadderCard } from '@/components/climb';
import { isFirstSessionToday, recordDay } from '@/data/learning';
import { applySessionResult, awardPoints, readProfile } from '@/data/profile';
import { buildDrillSession } from '@/data/session';
import { db } from '@/db';
import { useProfile, useRefreshAppState } from '@/hooks/use-app-state';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { ShareCard, sessionShareLine } from '@/components/share-card';
import {
  MAX_CONTENT_WIDTH,
  METER_META,
  meterColor,
  motion,
  radius,
  space,
  useScheme,
  useTheme,
} from '@/theme';
import type { ContentItem, DrillPayload } from '@shared/content';
import {
  comboMultiplier,
  crossedMilestone,
  currentLevel,
  dailyBonusPoints,
  goalSize,
  type Level,
} from '@shared/progression';
import { scoreDrill, type DrillResponse } from '@shared/scoring';
import { TAXONOMY_BY_ID, type MeterKey } from '@shared/taxonomy';

import {
  MatchQuestion,
  McqQuestion,
  MultiQuestion,
  OrderQuestion,
} from '@/features/drill/questions';

/** Rough time a well-prepared answer takes; feeds the FSRS ease rating. */
const EXPECTED_MS: Record<DrillPayload['kind'], number> = {
  mcq: 22_000,
  multi: 32_000,
  match: 38_000,
  order: 38_000,
};

type Stage = 'loading' | 'question' | 'feedback' | 'summary';

interface Result {
  item: ContentItem;
  score: number;
  response: DrillResponse;
  /** The unwritten attempt; persisted only when the session completes. */
  planned: PlannedAttempt;
  meter: MeterKey;
  xp: number;
  combo: number;
  attemptId: string;
}

export default function DrillSession() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const refresh = useRefreshAppState();
  const { data: profile } = useProfile();
  const params = useLocalSearchParams<{ node?: string }>();
  // A node id from a URL is untrusted; the session builder checks it against
  // the taxonomy, and an unknown one simply yields an empty plan.
  const onlyNode = typeof params.node === 'string' ? params.node : undefined;

  const [items, setItems] = useState<ContentItem[]>([]);
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('loading');
  const [response, setResponse] = useState<DrillResponse | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [combo, setCombo] = useState(0);
  const [outcome, setOutcome] = useState<{
    perfectBonus: number;
    leveledUp: Level | null;
    dailyBonus: number;
    milestone: number | null;
  }>({ perfectBonus: 0, leveledUp: null, dailyBonus: 0, milestone: null });
  /**
   * Which already-answered question is being reviewed; null means the live one.
   * Review is read-only: the response is replayed from the result, so there is
   * no way to change an answer after the fact.
   */
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let canceled = false;
    (async () => {
      // Read the goal fresh rather than trusting the cached profile: changing it
      // on the Today screen and starting immediately must take effect now.
      const current = await readProfile(db);
      const plan = await buildDrillSession(db, goalSize(current.dailyGoal), new Date(), onlyNode);
      if (canceled) return;
      setItems(plan.items);
      setStage(plan.items.length > 0 ? 'question' : 'summary');
      startedAt.current = Date.now();
    })();
    return () => {
      canceled = true;
    };
  }, [onlyNode]);

  const item = items[index];
  const payload = item?.mode === 'drill' ? (item.payload as DrillPayload) : null;

  const scored = useMemo(() => {
    if (!payload || !response) return null;
    return scoreDrill(payload, response);
  }, [payload, response]);

  const submit = useCallback(async () => {
    if (!item || !payload || !response || !scored) return;
    const elapsedMs = Date.now() - startedAt.current;

    // A combo only survives a *fully* correct answer. Partial credit on a
    // multi-select is progress, not a chain.
    const nextCombo = scored.correct ? combo + 1 : 0;
    setCombo(nextCombo);

    if (scored.correct) successHaptic();
    else warningHaptic();

    // Scored in memory only. Nothing touches the database until the session
    // completes: the quit dialog promises a discarded session leaves no trace.
    const planned = planAttempt({
      item,
      score: scored.score,
      response,
      feedback: scored.detail,
      elapsedMs,
      expectedMs: EXPECTED_MS[payload.kind],
      streakDays: profile.streakDays,
      combo: nextCombo,
    });

    setResults((prev) => [
      ...prev,
      {
        item,
        score: scored.score,
        response,
        meter: planned.meter,
        xp: planned.xp,
        combo: nextCombo,
        attemptId: planned.id,
        planned,
      },
    ]);
    setStage('feedback');
  }, [item, payload, response, scored, profile.streakDays, combo]);

  /**
   * Bank the session, all of it, only now.
   *
   * Attempts, SRS updates, meters, the streak day and the daily chest all
   * write here, after the final question. Quitting early never reaches this
   * function, which is exactly what the exit dialog promises: an abandoned
   * session is discarded whole, not half-counted in the analytics.
   */
  const bankSession = useCallback(async () => {
    if (results.length === 0) return;
    await persistAttempts(db, results.map((r) => r.planned));
    const gains: Partial<Record<MeterKey, number>> = {};
    for (const result of results) {
      gains[result.meter] = (gains[result.meter] ?? 0) + result.xp;
    }

    // A clean sweep pays 20% extra. The bonus is decided at banking time so an
    // early exit with a perfect partial run does not collect it: "perfect"
    // means the whole session, or it means nothing.
    const perfect = results.length === items.length && results.every((r) => r.score >= 1);
    let perfectBonus = 0;
    if (perfect) {
      for (const result of results) {
        const extra = Math.round(result.xp * 0.2);
        gains[result.meter] = (gains[result.meter] ?? 0) + extra;
        perfectBonus += extra;
      }
    }

    const profileBefore = await readProfile(db);
    const before = currentLevel(profileBefore.meters);

    // The daily chest: first banked session of the day only. Pays points, the
    // spendable currency, never XP: levels stay something you earned by skill.
    let dailyBonus = 0;
    if (await isFirstSessionToday(db)) {
      dailyBonus = dailyBonusPoints(profileBefore.streakDays);
      await awardPoints(db, dailyBonus);
    }

    const bestCombo = results.reduce((best, r) => Math.max(best, r.combo), 0);
    const updated = await applySessionResult(db, gains, bestCombo);
    const after = currentLevel(updated.meters);
    const milestone = crossedMilestone(profileBefore.streakDays, updated.streakDays);

    await recordDay(db, {
      sessions: 1,
      xp: results.reduce((sum, r) => sum + r.xp, 0) + perfectBonus,
      itemsAnswered: results.length,
    });
    // Feed the board: each answer moves the account whose engagement leans on
    // that topic, and the account timeline records which question did it.
    await applyAttemptsToBoard(
      db,
      results.map((r) => ({ item: r.item, score: r.score, attemptId: r.attemptId }))
    );
    // Upload immediately rather than waiting for the next cold start, so a
    // session finished on the phone is visible on another device right away.
    void syncNow(db).catch(() => {});

    setOutcome({
      perfectBonus,
      leveledUp: after.index > before.index ? after : null,
      dailyBonus,
      milestone,
    });
    refresh();
  }, [results, items.length, refresh]);



  const answered = results.length;

  const { dialog: exitDialog, requestExit } = useConfirmExit({
    // Only guard mid-session. The summary screen has nothing left to lose.
    enabled: stage === 'question' || stage === 'feedback',
    title: 'Leave this session?',
    message:
      answered > 0
        ? `All your progress will be lost. The ${answered} answer${answered === 1 ? '' : 's'} you have given will not be saved, and nothing from this session will count toward your XP, streak or stats.`
        : 'Nothing has been answered yet, so nothing is lost and your streak is unchanged.',
    confirmLabel: answered > 0 ? 'Leave and discard' : 'Leave',
    cancelLabel: 'Keep going',
  });



  const advance = useCallback(async () => {
    if (index + 1 < items.length) {
      setIndex(index + 1);
      setResponse(null);
      setViewIndex(null);
      setStage('question');
      startedAt.current = Date.now();
      return;
    }

    // One banking path, and this is it. An earlier version duplicated the
    // meter/streak writes here and left `bankSession` unreachable, so finishing
    // a session never persisted its attempts or advanced the scheduler, which
    // is why the same questions came back forever.
    await bankSession();
    setStage('summary');
  }, [index, items.length, bankSession]);

  /**
   * Keyboard play, web only.
   *
   * Number keys select an option, Enter checks and then advances, Escape asks
   * to leave, and the arrows drive review. Every one of these has a visible
   * control too, so the keyboard is an accelerator rather than the only door.
   */
  const shortcuts = useMemo(() => {
    const map: Record<string, (() => void) | undefined> = {};
    if (stage !== 'question' && stage !== 'feedback') return map;
    const showingFeedback = stage === 'feedback';

    map.Escape = requestExit;
    map.ArrowLeft = () =>
      setViewIndex((current) =>
        current === null ? (index > 0 ? index - 1 : null) : Math.max(0, current - 1)
      );
    map.ArrowRight = () =>
      setViewIndex((current) => (current === null || current + 1 >= index ? null : current + 1));

    if (viewIndex !== null) return map;

    if (showingFeedback) {
      map.Enter = () => void advance();
    } else {
      map.Enter = () => {
        if (isAnswered(response)) void submit();
      };
      // Digits pick a choice on the two option-shaped question kinds. Match
      // and order questions are positional, so a number key has no meaning.
      if (payload && (payload.kind === 'mcq' || payload.kind === 'multi')) {
        payload.choices.forEach((choice, i) => {
          map[String(i + 1)] = () => {
            if (payload.kind === 'mcq') {
              setResponse({ kind: 'mcq', choiceId: choice.id });
            } else {
              setResponse((current) => {
                const chosen =
                  current && current.kind === 'multi' ? new Set(current.choiceIds) : new Set<string>();
                if (chosen.has(choice.id)) chosen.delete(choice.id);
                else chosen.add(choice.id);
                return { kind: 'multi', choiceIds: [...chosen] };
              });
            }
          };
        });
      }
    }
    return map;
  }, [stage, viewIndex, index, payload, response, advance, submit, requestExit]);

  useKeyboardShortcuts(shortcuts, stage === 'question' || stage === 'feedback');

  if (stage === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (stage === 'summary') {
    return (
      <SessionSummary
        results={results}
        perfectBonus={outcome.perfectBonus}
        leveledUp={outcome.leveledUp}
        dailyBonus={outcome.dailyBonus}
        milestone={outcome.milestone}
        streakDays={profile.streakDays}
        onDone={() => goBack('/')}
      />
    );
  }

  if (!item || !payload) return null;

  const showingFeedback = stage === 'feedback';



  // Review mode replays an already-answered question. Everything below renders
  // from `shown*` so the live question and a reviewed one share one layout;
  // review is read-only because the stored response is passed with a no-op
  // onChange and revealed always true.
  const reviewing = viewIndex !== null;
  const viewed = reviewing ? results[viewIndex] : null;
  const shownItem = viewed ? viewed.item : item;
  const shownPayload =
    shownItem?.mode === 'drill' ? (shownItem.payload as DrillPayload) : payload;
  const shownResponse = viewed ? viewed.response : response;
  const revealed = reviewing || showingFeedback;
  // Questions answered before the current one; the live question is never in
  // this range even during feedback, so "back" always means "earlier".
  const reviewableCount = index;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top + space.sm }}>
      {exitDialog}
      {/* ── Progress header ── */}
      <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
        <Row justify="space-between" align="center">
          <Pressable onPress={requestExit} hitSlop={12}>
            <Text variant="eyebrow" tone="textFaint">
              CLOSE
            </Text>
          </Pressable>
          <Row gap={space.sm} align="center">
            {combo >= 2 && !reviewing ? (
              <Chip
                label={`${combo}x combo · ${comboMultiplier(combo).toFixed(1)}× XP`}
                color={theme.accent}
                filled
              />
            ) : null}
            {reviewing ? (
              <Chip label="Reviewing" color={theme.warning} />
            ) : null}
            <Tappable
              onPress={() => setViewIndex(reviewing ? Math.max(0, viewIndex - 1) : index - 1)}
              disabled={reviewableCount === 0 || viewIndex === 0}
              accessibilityLabel="Review the previous question"
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
        {/* Difficulty and the XP it carries, before the answer is given. */}
        <Row justify="space-between" align="center">
          <DifficultyTag difficulty={shownItem.difficulty} mode="drill" />
          {shownItem.nodeIds[0] && TAXONOMY_BY_ID[shownItem.nodeIds[0]] ? (
            <Text variant="caption" tone="textFaint" numberOfLines={1}>
              {TAXONOMY_BY_ID[shownItem.nodeIds[0]].label}
            </Text>
          ) : null}
        </Row>

        <Row gap={4}>
          {items.map((_, i) => (
            <View key={i} style={{ flex: 1 }}>
              <Bar
                value={i < index || (i === index && showingFeedback) ? 1 : 0}
                color={
                  i < results.length
                    ? results[i].score >= 1
                      ? theme.positive
                      : results[i].score > 0
                        ? theme.warning
                        : theme.negative
                    : theme.accent
                }
                height={3}
              />
            </View>
          ))}
        </Row>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: space.xxxl,
          gap: space.lg,
        }}
        showsVerticalScrollIndicator={false}>
        <NodeTags item={shownItem} />

        {shownPayload.kind === 'mcq' ? (
          <McqQuestion
            payload={shownPayload}
            response={shownResponse}
            onChange={reviewing ? () => {} : setResponse}
            revealed={revealed}
          />
        ) : shownPayload.kind === 'multi' ? (
          <MultiQuestion
            payload={shownPayload}
            response={shownResponse}
            onChange={reviewing ? () => {} : setResponse}
            revealed={revealed}
          />
        ) : shownPayload.kind === 'match' ? (
          <MatchQuestion
            payload={shownPayload}
            response={shownResponse}
            onChange={reviewing ? () => {} : setResponse}
            revealed={revealed}
          />
        ) : (
          <OrderQuestion
            payload={shownPayload}
            response={shownResponse}
            onChange={reviewing ? () => {} : setResponse}
            revealed={revealed}
          />
        )}

        {reviewing && viewed ? (
          <Feedback item={viewed.item} score={viewed.score} />
        ) : showingFeedback && scored ? (
          <Feedback item={item} score={scored.score} />
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
            title="Back to the current question"
            size="lg"
            full
            kind="secondary"
            onPress={() => setViewIndex(null)}
          />
        ) : showingFeedback ? (
          <Button
            title={index + 1 < items.length ? 'Next' : 'Finish session'}
            size="lg"
            full
            onPress={advance}
            right={<IconArrowRight color={theme.accentText} size={18} />}
          />
        ) : (
          <Button
            title="Check"
            size="lg"
            full
            disabled={!isAnswered(response)}
            onPress={submit}
          />
        )}
      </View>
    </View>
  );
}

function isAnswered(response: DrillResponse | null): boolean {
  if (!response) return false;
  switch (response.kind) {
    case 'mcq':
      return response.choiceId !== null;
    case 'multi':
      return response.choiceIds.length > 0;
    case 'match':
      return Object.keys(response.assignment).length > 0;
    case 'order':
      return response.sequence.length > 0;
  }
}

function NodeTags({ item }: { item: ContentItem }) {
  const scheme = useScheme();
  return (
    <Row gap={space.xs} wrap>
      {item.nodeIds.slice(0, 3).map((nodeId) => {
        const node = TAXONOMY_BY_ID[nodeId];
        if (!node) return null;
        return <Chip key={nodeId} label={node.label} color={meterColor(node.meter, scheme)} />;
      })}
    </Row>
  );
}

/**
 * Post-answer teaching panel.
 *
 * Deliberately shown for correct answers too, the explanation carries the
 * distinction being taught, and a player who guessed right needs it more than
 * one who reasoned their way there.
 */
function Feedback({ item, score }: { item: ContentItem; score: number }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const tone = score >= 1 ? theme.positive : score > 0 ? theme.warning : theme.negative;
  const label = score >= 1 ? 'Correct' : score > 0 ? 'Partly right' : 'Not quite';

  // Card padding plus the screen gutter, capped to the reading column.
  const diagramWidth = Math.min(width, MAX_CONTENT_WIDTH) - space.lg * 2 - space.lg * 2;

  return (
    <Animated.View entering={FadeInDown.duration(motion.slow).springify().damping(18)}>
      <Card accent={tone} level={2}>
        <Stack gap={space.md}>
          <Row gap={space.sm} align="center">
            {score >= 1 ? (
              <IconCheck color={tone} size={19} />
            ) : (
              <IconCross color={tone} size={19} />
            )}
            <Text variant="smallStrong" color={tone}>
              {label}
            </Text>
            {score > 0 && score < 1 ? (
              <Text variant="caption" tone="textFaint">
                {Math.round(score * 100)}% credit
              </Text>
            ) : null}
          </Row>

          {item.diagramId ? (
            <Animated.View entering={FadeIn.duration(motion.slow).delay(120)}>
              <Diagram id={item.diagramId} width={diagramWidth} />
            </Animated.View>
          ) : null}

          <Text variant="small">{item.explanation}</Text>

          {item.citations.length > 0 ? (
            <>
              <Divider />
              <Stack gap={space.sm}>
                {item.citations.map((citation) => (
                  <Pressable
                    key={citation.url}
                    onPress={() => Linking.openURL(citation.url).catch(() => {})}
                    hitSlop={6}>
                    <Row gap={space.sm} align="center">
                      <IconLink color={theme.accent} size={14} />
                      <Text variant="caption" tone="accent" style={{ flex: 1 }}>
                        {citation.title}
                      </Text>
                    </Row>
                  </Pressable>
                ))}
              </Stack>
            </>
          ) : null}
        </Stack>
      </Card>
    </Animated.View>
  );
}

function SessionSummary({
  results,
  perfectBonus,
  leveledUp,
  dailyBonus,
  milestone,
  streakDays,
  onDone,
}: {
  results: Result[];
  perfectBonus: number;
  leveledUp: Level | null;
  dailyBonus: number;
  milestone: number | null;
  streakDays: number;
  onDone: () => void;
}) {
  const theme = useTheme();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();

  const totalXp = results.reduce((sum, r) => sum + r.xp, 0) + perfectBonus;
  const correct = results.filter((r) => r.score >= 1).length;
  const bestCombo = results.reduce((best, r) => Math.max(best, r.combo), 0);
  const perfect = perfectBonus > 0;

  const byMeter = results.reduce<Partial<Record<MeterKey, number>>>((acc, r) => {
    acc[r.meter] = (acc[r.meter] ?? 0) + r.xp;
    return acc;
  }, {});

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        paddingTop: insets.top + space.xxl,
        paddingHorizontal: space.lg,
      }}>
      {results.length === 0 ? (
        <Stack gap={space.md}>
          <Text variant="title">Nothing to practice</Text>
          <Text variant="small" tone="textMuted">
            The content bank is empty. That should not happen, the seed bank ships in the
            bundle, so this points at a bootstrap failure worth looking at.
          </Text>
        </Stack>
      ) : (
        <Stack gap={space.xl}>
          {perfect || leveledUp || milestone ? <Confetti /> : null}

          <ShareCard
            title={`AI Ladder · ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
            line={sessionShareLine(correct, results.length, streakDays)}
          />

          <Stack gap={space.xs}>
            <Eyebrow tone="accent">{perfect ? 'Perfect session' : 'Session complete'}</Eyebrow>
            <Text variant="display">
              {correct} / {results.length}
            </Text>
            <Text variant="small" tone="textMuted">
              {correct === results.length
                ? 'Clean sweep. The ones you found easy will come back less often.'
                : 'The concepts you missed move to the front of the review queue.'}
            </Text>
          </Stack>

          {milestone ? (
            <Card accent={theme.warning} level={2}>
              <Row gap={space.md} align="center">
                <StreakFlame days={milestone} lit showCount={false} size={26} />
                <Stack gap={2} style={{ flex: 1 }}>
                  <Eyebrow tone="warning">Streak milestone</Eyebrow>
                  <Text variant="heading">{milestone} days in a row</Text>
                  <Text variant="caption" tone="textFaint">
                    {milestone >= 30
                      ? 'This is a habit now. Most people never get here.'
                      : 'Consistency is the whole trick. Keep the chain alive.'}
                  </Text>
                </Stack>
              </Row>
            </Card>
          ) : null}

          {leveledUp ? (
            <Card accent={theme.accent} level={2}>
              <Stack gap={space.sm}>
                <Eyebrow tone="accent">New rung</Eyebrow>
                <LadderCard meters={profile.meters} celebrateTo={leveledUp.index} />
              </Stack>
            </Card>
          ) : null}

          <Card>
            <Stack gap={space.md}>
              <Row justify="space-between" align="baseline">
                <Eyebrow>XP earned</Eyebrow>
                <CountUp value={totalXp} />
              </Row>
              {dailyBonus > 0 ? (
                <Row justify="space-between">
                  <Row gap={6} align="center">
                    <IconGem color={theme.accent} size={14} />
                    <Text variant="small" tone="textMuted">
                      Daily chest
                    </Text>
                  </Row>
                  <Text variant="numericSm" tone="accent">
                    +{dailyBonus} points
                  </Text>
                </Row>
              ) : null}
              {perfect ? (
                <Row justify="space-between">
                  <Text variant="small" tone="textMuted">
                    Perfect bonus
                  </Text>
                  <Text variant="numericSm" tone="positive">
                    +{perfectBonus} XP
                  </Text>
                </Row>
              ) : null}
              {bestCombo >= 2 ? (
                <Row justify="space-between">
                  <Text variant="small" tone="textMuted">
                    Best combo this session
                  </Text>
                  <Text variant="numericSm" tone="accent">
                    {bestCombo}x · {comboMultiplier(bestCombo).toFixed(1)}× XP
                  </Text>
                </Row>
              ) : null}
              <Divider />
              <Eyebrow>Where it landed</Eyebrow>
              {(Object.keys(byMeter) as MeterKey[]).map((meter) => (
                <Row key={meter} justify="space-between">
                  <Text variant="small" color={meterColor(meter, scheme)}>
                    {METER_META[meter].label}
                  </Text>
                  <Text variant="numericSm" tone="textMuted">
                    +{byMeter[meter]}
                  </Text>
                </Row>
              ))}
              <Text variant="caption" tone="textFaint">
                Each question pays its XP to the craft meter it trains. The ladder climbs on
                your weakest meter, so the "XP away" number on the ladder only moves when XP
                lands on that one meter, not on the session total.
              </Text>
            </Stack>
          </Card>
        </Stack>
      )}

      <Spacer size={space.xl} />
      <Button title="Done" size="lg" full onPress={onDone} />
    </View>
  );
}
