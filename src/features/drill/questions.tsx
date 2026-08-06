import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { IconCheck, IconCross } from '@/components/icons';
import { Eyebrow, Row, Stack, Text } from '@/components/ui';
import { motion, radius, space, useTheme } from '@/theme';
import type {
  DrillMatchSchema,
  DrillMcqSchema,
  DrillMultiSchema,
  DrillOrderSchema,
} from '@shared/content';
import type { DrillResponse } from '@shared/scoring';
import type { z } from 'zod';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Mcq = z.infer<typeof DrillMcqSchema>;
type Multi = z.infer<typeof DrillMultiSchema>;
type Match = z.infer<typeof DrillMatchSchema>;
type Order = z.infer<typeof DrillOrderSchema>;

interface Props<P> {
  payload: P;
  response: DrillResponse | null;
  onChange: (response: DrillResponse) => void;
  revealed: boolean;
}

/**
 * Deterministic shuffle, seeded from the item's own text.
 *
 * Presentation order must be stable across re-renders, a list that reshuffles
 * while you are reading it is disorienting, but different per item.
 */
function shuffled<T>(items: T[], seed: string): T[] {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    hash = (Math.imul(hash, 48271) + 11) & 0x7fffffff;
    const j = hash % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function Stem({ text }: { text: string }) {
  return (
    <Animated.View entering={FadeIn.duration(motion.base)}>
      <Text variant="question">{text}</Text>
    </Animated.View>
  );
}

type OptionState = 'idle' | 'correct' | 'wrong' | 'missed';

/**
 * One selectable row.
 *
 * After reveal it takes a state tint and, for a wrong option the player actually
 * chose, expands to explain why. Showing every distractor's reasoning at once is
 * a wall of text; showing the one they picked is the feedback they need.
 */
function Option({
  text,
  detail,
  selected,
  state,
  onPress,
  index,
  delay = 0,
}: {
  text: string;
  detail?: string;
  selected: boolean;
  state: OptionState;
  onPress?: () => void;
  index?: number;
  delay?: number;
}) {
  const theme = useTheme();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.012, motion.spring) }],
  }));

  const border =
    state === 'correct'
      ? theme.positive
      : state === 'wrong'
        ? theme.negative
        : state === 'missed'
          ? theme.warning
          : selected
            ? theme.accent
            : theme.border;

  const background =
    state === 'correct'
      ? theme.positiveSoft
      : state === 'wrong'
        ? theme.negativeSoft
        : state === 'missed'
          ? theme.warningSoft
          : selected
            ? theme.accentSoft
            : theme.surface;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!onPress}
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}
      entering={FadeIn.duration(motion.base).delay(delay)}
      layout={LinearTransition.duration(motion.base)}
      style={[
        {
          borderWidth: selected || state !== 'idle' ? 1.5 : StyleSheet.hairlineWidth,
          borderColor: border,
          backgroundColor: background,
          borderRadius: radius.md,
          padding: space.lg - 2,
          gap: space.sm,
        },
        animatedStyle,
      ]}>
      <Row gap={space.md} align="flex-start">
        {index !== undefined ? (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: radius.sm - 2,
              backgroundColor: theme.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}>
            <Text variant="caption" tone="accent">
              {index}
            </Text>
          </View>
        ) : null}
        <Text variant="body" style={{ flex: 1 }}>
          {text}
        </Text>
        {state === 'correct' ? <IconCheck color={theme.positive} size={19} /> : null}
        {state === 'wrong' ? <IconCross color={theme.negative} size={19} /> : null}
      </Row>
      {detail ? (
        <Animated.View entering={FadeIn.duration(motion.base)}>
          <Text
            variant="small"
            tone="textMuted"
            style={{ paddingLeft: index !== undefined ? 36 : 0 }}>
            {detail}
          </Text>
        </Animated.View>
      ) : null}
    </AnimatedPressable>
  );
}

// ── MCQ ────────────────────────────────────────────────────────────────────

export function McqQuestion({ payload, response, onChange, revealed }: Props<Mcq>) {
  const chosen = response?.kind === 'mcq' ? response.choiceId : null;
  const order = useMemo(() => shuffled(payload.choices, payload.stem), [payload]);

  return (
    <Stack gap={space.lg}>
      <Stem text={payload.stem} />
      <Stack gap={space.sm}>
        {order.map((choice, i) => {
          const isCorrect = choice.id === payload.correctId;
          const isChosen = choice.id === chosen;
          const state: OptionState = !revealed
            ? 'idle'
            : isCorrect
              ? 'correct'
              : isChosen
                ? 'wrong'
                : 'idle';
          return (
            <Option
              key={choice.id}
              delay={i * 45}
              text={choice.text}
              detail={revealed && isChosen && !isCorrect ? choice.whyWrong : undefined}
              selected={isChosen}
              state={state}
              onPress={revealed ? undefined : () => onChange({ kind: 'mcq', choiceId: choice.id })}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}

// ── Multi-select ───────────────────────────────────────────────────────────

export function MultiQuestion({ payload, response, onChange, revealed }: Props<Multi>) {
  const chosen = response?.kind === 'multi' ? response.choiceIds : [];
  const order = useMemo(() => shuffled(payload.choices, payload.stem), [payload]);
  const correct = new Set(payload.correctIds);

  const toggle = (id: string) => {
    const next = chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id];
    onChange({ kind: 'multi', choiceIds: next });
  };

  return (
    <Stack gap={space.lg}>
      <Stem text={payload.stem} />
      <Eyebrow>Select all that apply · over-selecting costs marks</Eyebrow>
      <Stack gap={space.sm}>
        {order.map((choice, i) => {
          const isChosen = chosen.includes(choice.id);
          const isCorrect = correct.has(choice.id);
          const state: OptionState = !revealed
            ? 'idle'
            : isCorrect && isChosen
              ? 'correct'
              : isCorrect
                ? 'missed'
                : isChosen
                  ? 'wrong'
                  : 'idle';
          return (
            <Option
              key={choice.id}
              delay={i * 45}
              text={choice.text}
              detail={revealed && isChosen && !isCorrect ? choice.whyWrong : undefined}
              selected={isChosen}
              state={state}
              onPress={revealed ? undefined : () => toggle(choice.id)}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}

// ── Matching ───────────────────────────────────────────────────────────────

export function MatchQuestion({ payload, response, onChange, revealed }: Props<Match>) {
  const theme = useTheme();
  const assignment = response?.kind === 'match' ? response.assignment : {};
  const options = useMemo(
    () => shuffled(payload.pairs.map((pair) => pair.right), payload.stem),
    [payload]
  );

  const used = new Set(Object.values(assignment));
  const nextUnassigned = payload.pairs.find((pair) => !assignment[pair.left])?.left;

  const assign = (right: string) => {
    if (!nextUnassigned) return;
    onChange({ kind: 'match', assignment: { ...assignment, [nextUnassigned]: right } });
  };

  const clear = (left: string) => {
    const next = { ...assignment };
    delete next[left];
    onChange({ kind: 'match', assignment: next });
  };

  return (
    <Stack gap={space.lg}>
      <Stem text={payload.stem} />

      <Stack gap={space.sm}>
        {payload.pairs.map((pair, i) => {
          const given = assignment[pair.left];
          const ok = given === pair.right;
          const isTarget = !revealed && pair.left === nextUnassigned;

          return (
            <Animated.View
              key={pair.left}
              entering={FadeIn.duration(motion.base).delay(i * 45)}
              layout={LinearTransition.duration(motion.base)}>
              <Pressable
                disabled={revealed || !given}
                onPress={() => clear(pair.left)}
                style={{
                  borderWidth: isTarget || revealed ? 1.5 : StyleSheet.hairlineWidth,
                  borderColor: revealed
                    ? ok
                      ? theme.positive
                      : theme.negative
                    : isTarget
                      ? theme.accent
                      : theme.border,
                  backgroundColor: revealed
                    ? ok
                      ? theme.positiveSoft
                      : theme.negativeSoft
                    : theme.surface,
                  borderRadius: radius.md,
                  padding: space.lg - 2,
                  gap: 6,
                }}>
                <Text variant="body">{pair.left}</Text>
                <Row gap={space.sm} align="center" wrap>
                  <Text
                    variant="small"
                    tone={given ? 'text' : 'textFaint'}
                    color={revealed ? (ok ? theme.positive : theme.negative) : undefined}>
                    {given ?? (isTarget ? 'choose below' : '')}
                  </Text>
                  {revealed && !ok ? (
                    <Text variant="small" tone="positive">
                      · {pair.right}
                    </Text>
                  ) : null}
                </Row>
              </Pressable>
            </Animated.View>
          );
        })}
      </Stack>

      {!revealed ? (
        <Stack gap={space.sm}>
          <Eyebrow>Options</Eyebrow>
          <Row gap={space.sm} wrap>
            {options.map((option) => (
              <Pressable
                key={option}
                disabled={used.has(option) || !nextUnassigned}
                onPress={() => assign(option)}
                style={{
                  paddingHorizontal: space.md + 2,
                  paddingVertical: space.sm + 2,
                  borderRadius: radius.sm,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.borderStrong,
                  backgroundColor: theme.elevated,
                  opacity: used.has(option) ? 0.32 : 1,
                }}>
                <Text variant="small">{option}</Text>
              </Pressable>
            ))}
          </Row>
        </Stack>
      ) : null}
    </Stack>
  );
}

// ── Ordering ───────────────────────────────────────────────────────────────

export function OrderQuestion({ payload, response, onChange, revealed }: Props<Order>) {
  const theme = useTheme();
  const sequence = response?.kind === 'order' ? response.sequence : [];
  const pool = useMemo(() => shuffled(payload.steps, payload.stem), [payload]);
  const remaining = pool.filter((step) => !sequence.includes(step));

  return (
    <Stack gap={space.lg}>
      <Stem text={payload.stem} />

      {sequence.length > 0 ? (
        <Stack gap={space.sm}>
          {sequence.map((step, i) => {
            const correctPosition = payload.steps.indexOf(step);
            return (
              <Option
                key={step}
                index={i + 1}
                text={step}
                selected={!revealed}
                state={revealed ? (correctPosition === i ? 'correct' : 'wrong') : 'idle'}
                detail={
                  revealed && correctPosition !== i
                    ? `Belongs at position ${correctPosition + 1}`
                    : undefined
                }
                onPress={
                  revealed
                    ? undefined
                    : () => onChange({ kind: 'order', sequence: sequence.filter((s) => s !== step) })
                }
              />
            );
          })}
        </Stack>
      ) : (
        <View
          style={{
            borderRadius: radius.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: theme.borderStrong,
            padding: space.xl,
            backgroundColor: theme.elevated,
          }}>
          <Text variant="small" tone="textMuted" center>
            Tap the steps below in order. Tap again to remove one.
          </Text>
        </View>
      )}

      {!revealed && remaining.length > 0 ? (
        <Stack gap={space.sm}>
          <Eyebrow>Remaining</Eyebrow>
          <Stack gap={space.sm}>
            {remaining.map((step, i) => (
              <Option
                key={step}
                delay={i * 40}
                text={step}
                selected={false}
                state="idle"
                onPress={() => onChange({ kind: 'order', sequence: [...sequence, step] })}
              />
            ))}
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  );
}
