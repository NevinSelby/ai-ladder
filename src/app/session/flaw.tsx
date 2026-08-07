import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/lib/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Confetti } from '@/components/celebrate';
import { applyAttemptsToBoard } from '@/data/accounts';
import { useConfirmExit } from '@/components/confirm-exit';
import { DifficultyTag } from '@/components/difficulty-tag';
import { IconCheck, IconCross, IconEye, IconLink } from '@/components/icons';
import { ShareCard } from '@/components/share-card';
import { Button, Card, Chip, Divider, Eyebrow, Row, Stack, Text } from '@/components/ui';
import { persistAttempts, planAttempt, type PlannedAttempt } from '@/data/attempts';
import { recordDay } from '@/data/learning';
import { applySessionResult, readProfile } from '@/data/profile';
import { dailyPuzzle } from '@/data/puzzle';
import { itemsForMode } from '@/data/session';
import { syncNow } from '@/data/sync';
import { db } from '@/db';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useRefreshAppState } from '@/hooks/use-app-state';
import { successHaptic, warningHaptic } from '@/lib/haptics';
import { motion, radius, space, useTheme } from '@/theme';
import type { FlawItem } from '@shared/content';
import { TAXONOMY_BY_ID, type MeterKey } from '@shared/taxonomy';

/**
 * Spot the Flaw.
 *
 * One design, one requirement, one line that breaks it. There is no partial
 * credit and no second guess: an architecture review where you get to keep
 * pointing until something sticks is not a review.
 *
 * Two entry points share this screen. `?puzzle=1` runs the daily puzzle, which
 * is the same item for everyone and offers a share card afterward. Without it,
 * the mode runs as ordinary practice from the rotation.
 */
export default function FlawSession() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const refresh = useRefreshAppState();
  const params = useLocalSearchParams<{ puzzle?: string }>();
  const isPuzzle = params.puzzle === '1';

  const [item, setItem] = useState<FlawItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<number | null>(null);
  const [banked, setBanked] = useState(false);
  const [alreadySolved, setAlreadySolved] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let canceled = false;
    (async () => {
      if (isPuzzle) {
        const puzzle = await dailyPuzzle(db);
        if (canceled) return;
        setItem(puzzle?.item ?? null);
        setAlreadySolved(Boolean(puzzle?.solved));
      } else {
        const all = (await itemsForMode(db, 'flaw')) as FlawItem[];
        if (canceled) return;
        setItem(all[0] ?? null);
      }
      setLoading(false);
      startedAt.current = Date.now();
    })();
    return () => {
      canceled = true;
    };
  }, [isPuzzle]);

  const revealed = picked !== null;
  const correct = revealed && item !== null && picked === item.payload.flawIndex;

  const commit = useCallback(
    async (index: number) => {
      if (!item || picked !== null || alreadySolved) return;
      setPicked(index);

      const right = index === item.payload.flawIndex;
      if (right) successHaptic();
      else warningHaptic();

      const profile = await readProfile(db);
      const planned: PlannedAttempt = planAttempt({
        item,
        score: right ? 1 : 0,
        response: { picked: index },
        elapsedMs: Date.now() - startedAt.current,
        expectedMs: 60_000,
        streakDays: profile.streakDays,
      });

      // A single-question mode banks immediately: there is no later question
      // for an abandoned run to lose, so the discard rule has nothing to guard.
      await persistAttempts(db, [planned]);
      const gains: Partial<Record<MeterKey, number>> = { [planned.meter]: planned.xp };
      await applySessionResult(db, gains);
      await recordDay(db, { sessions: 1, xp: planned.xp, itemsAnswered: 1 });
      // Spot the Flaw was the one session mode that never reached the board,
      // so puzzles vanished from every account timeline.
      await applyAttemptsToBoard(db, [
        { item: planned.params.item, score: planned.score, attemptId: planned.id },
      ]);
      void syncNow(db).catch(() => {});
      setBanked(true);
      refresh();
    },
    [item, picked, alreadySolved, refresh]
  );

  const { dialog: exitDialog } = useConfirmExit({
    enabled: !revealed && !alreadySolved && item !== null,
    title: 'Leave the puzzle?',
    message: 'Nothing has been answered yet, so nothing is lost.',
    confirmLabel: 'Leave',
    cancelLabel: 'Keep looking',
  });

  // Number keys pick a line, Escape leaves, Enter continues once revealed.
  const shortcuts = useMemo(() => {
    const map: Record<string, (() => void) | undefined> = {
      Escape: () => goBack('/practice'),
    };
    if (item && !revealed && !alreadySolved) {
      item.payload.lines.forEach((_, i) => {
        map[String(i + 1)] = () => void commit(i);
      });
    }
    if (revealed) map.Enter = () => goBack('/practice');
    return map;
  }, [item, revealed, alreadySolved, commit]);

  useKeyboardShortcuts(shortcuts);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!item) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          padding: space.xl,
          paddingTop: insets.top + space.xxl,
        }}>
        <Stack gap={space.md}>
          <Eyebrow>Nothing to review</Eyebrow>
          <Text variant="heading">No designs available yet</Text>
          <Text variant="small" tone="textMuted">
            Spot the Flaw has no items matching your cloud selection. Change it in Profile, or
            pick another mode.
          </Text>
          <Button title="Back" size="lg" full onPress={() => goBack('/practice')} />
        </Stack>
      </View>
    );
  }

  const payload = item.payload;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top + space.sm }}>
      {exitDialog}
      {correct ? <Confetti count={16} /> : null}

      <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
        <Row justify="space-between" align="center">
          <Pressable onPress={() => goBack('/practice')} hitSlop={12}>
            <Text variant="eyebrow" tone="textFaint">
              CLOSE
            </Text>
          </Pressable>
          <Row gap={space.sm} align="center">
            {isPuzzle ? <Chip label="Daily puzzle" color={theme.accent} filled /> : null}
            <DifficultyTag difficulty={item.difficulty} mode="flaw" />
          </Row>
        </Row>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl, gap: space.lg }}
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(motion.base)}>
          <Card accent={theme.warning}>
            <Stack gap={space.xs}>
              <Eyebrow tone="warning">The requirement</Eyebrow>
              <Text variant="bodyStrong">{payload.requirement}</Text>
            </Stack>
          </Card>
        </Animated.View>

        <Text variant="body" tone="textMuted">
          {payload.scenario}
        </Text>

        <Stack gap={space.xs}>
          <Row justify="space-between" align="center">
            <Eyebrow>The proposed design</Eyebrow>
            <Text variant="caption" tone="textFaint">
              {alreadySolved ? 'already solved today' : 'one line breaks it'}
            </Text>
          </Row>

          {payload.lines.map((line, index) => {
            const isFlaw = index === payload.flawIndex;
            const isPicked = picked === index;
            const show = revealed || alreadySolved;

            /**
             * Finding the flaw is the win, so the flawed line is only red when
             * it was missed. Marking a correct answer with a cross, which is
             * what an earlier version did, reads as "you were wrong" at exactly
             * the moment the user was right.
             */
            const foundIt = isFlaw && correct;
            const border = show && foundIt
              ? theme.positive
              : show && isFlaw
                ? theme.warning
                : show && isPicked
                  ? theme.negative
                  : theme.border;
            const fill = show && foundIt
              ? theme.positiveSoft
              : show && isFlaw
                ? theme.warningSoft
                : show && isPicked
                  ? theme.negativeSoft
                  : theme.surface;

            return (
              <Pressable
                key={line}
                disabled={show}
                onPress={() => void commit(index)}
                accessibilityRole="button"
                accessibilityLabel={`Line ${index + 1}. ${line}`}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: space.md,
                    padding: space.md,
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderColor: border,
                    backgroundColor: fill,
                  }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.elevated,
                    }}>
                    <Text variant="caption" tone="textFaint">
                      {index + 1}
                    </Text>
                  </View>
                  <Text variant="small" style={{ flex: 1 }}>
                    {line}
                  </Text>
                  {show && foundIt ? <IconCheck color={theme.positive} size={16} /> : null}
                  {show && isFlaw && !correct ? (
                    <Text variant="caption" tone="warning">
                      the flaw
                    </Text>
                  ) : null}
                  {show && isPicked && !isFlaw ? (
                    <IconCross color={theme.negative} size={16} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </Stack>

        {revealed || alreadySolved ? (
          <Animated.View entering={FadeInDown.duration(motion.slow)}>
            <Card accent={correct ? theme.positive : theme.negative}>
              <Stack gap={space.sm}>
                <Row gap={space.sm} align="center">
                  {correct ? (
                    <IconCheck color={theme.positive} size={18} />
                  ) : (
                    <IconCross color={theme.negative} size={18} />
                  )}
                  <Eyebrow tone={correct ? 'positive' : 'negative'}>
                    {alreadySolved
                      ? 'Solved earlier today'
                      : correct
                        ? 'Found it'
                        : `The flaw was line ${payload.flawIndex + 1}`}
                  </Eyebrow>
                </Row>
                <Text variant="body">{payload.fix}</Text>
                <Divider />
                <Text variant="small" tone="textMuted">
                  {item.explanation}
                </Text>
                <SourceList item={item} />
              </Stack>
            </Card>
          </Animated.View>
        ) : null}

        {(revealed || alreadySolved) && isPuzzle ? (
          <ShareCard
            title={`Spot the Flaw · ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
            line={correct ? 'Found the flaw first try.' : 'Missed it. Reviewing the fix.'}
            detail={payload.requirement}
          />
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
        {revealed || alreadySolved ? (
          <Button title="Done" size="lg" full onPress={() => goBack('/practice')} />
        ) : (
          <Text variant="caption" tone="textFaint" center>
            Pick the line that breaks the requirement. One guess.
          </Text>
        )}
      </View>
    </View>
  );
}

/** The sources behind an item, shown after the answer so it can be checked. */
export function SourceList({ item }: { item: { citations: { title: string; url: string }[] } }) {
  const theme = useTheme();
  if (item.citations.length === 0) return null;

  return (
    <Stack gap={space.xs}>
      <Eyebrow>Grounded in</Eyebrow>
      {item.citations.map((citation) => (
        <Pressable
          key={citation.url}
          accessibilityRole="link"
          onPress={() => {
            // Opened rather than rendered: the app never fetches or embeds a
            // cited page, so a compromised source cannot reach this process.
            if (typeof window !== 'undefined') window.open(citation.url, '_blank', 'noopener');
          }}>
          <Row gap={space.xs} align="center">
            <IconLink color={theme.accent} size={13} />
            <Text variant="caption" tone="accent" style={{ flex: 1 }}>
              {citation.title}
            </Text>
          </Row>
        </Pressable>
      ))}
    </Stack>
  );
}
