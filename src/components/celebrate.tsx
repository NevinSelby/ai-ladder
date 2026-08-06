import { useEffect, useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useScheme, useTheme, METER_KEYS, meterColor } from '@/theme';
import { useMotion } from '@/theme/motion-prefs';

/**
 * The celebration layer: confetti and a counting number.
 *
 * These exist because a summary screen that simply states "+47 XP" spends the
 * session's emotional peak on a static label. Counting the number up and
 * letting a little paper fall makes the same information land as a payoff,
 * which is most of why finishing a Duolingo lesson feels worth repeating.
 *
 * Both collapse to their end state under reduced motion: the number renders
 * final immediately and the confetti never mounts.
 */

// ── Confetti ───────────────────────────────────────────────────────────────

interface Piece {
  x: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  spin: number;
  drift: number;
}

function Confetto({ piece, height }: { piece: Piece; height: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      piece.delay,
      withTiming(1, { duration: piece.duration, easing: Easing.in(Easing.quad) })
    );
  }, [piece, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: progress.value * height },
      { translateX: Math.sin(progress.value * Math.PI * 2) * piece.drift },
      { rotate: `${progress.value * piece.spin}deg` },
    ],
    opacity: progress.value < 0.75 ? 1 : 1 - (progress.value - 0.75) * 4,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: -20,
          left: piece.x,
          width: piece.size,
          height: piece.size * 0.45,
          borderRadius: 2,
          backgroundColor: piece.color,
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
}

/**
 * One burst, then done. Confetti that loops stops being a reward and starts
 * being weather.
 */
export function Confetti({ count = 26 }: { count?: number }) {
  const motion = useMotion();
  const scheme = useScheme();
  const { width, height } = useWindowDimensions();

  const pieces = useMemo<Piece[]>(() => {
    // The five meter hues are the app's palette; confetti in random rainbow
    // colors would be the one place the app breaks its own color system.
    const colors = METER_KEYS.map((key) => meterColor(key, scheme));
    return Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      delay: Math.random() * 450,
      duration: 1500 + Math.random() * 1100,
      size: 7 + Math.random() * 6,
      color: colors[index % colors.length],
      spin: (Math.random() - 0.5) * 720,
      drift: 14 + Math.random() * 26,
    }));
    // Deliberately created once per mount: a re-render must not reshuffle paper
    // already falling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (motion.reduced) return null;

  return (
    <View style={{ position: 'absolute', inset: 0 }} pointerEvents="none">
      {pieces.map((piece, index) => (
        <Confetto key={index} piece={piece} height={height * 0.9} />
      ))}
    </View>
  );
}

// ── Counting number ────────────────────────────────────────────────────────

/**
 * Counts from zero to the value over ~0.8s, easing out so the last few
 * increments are readable. Driven from JS state rather than a worklet because
 * the thing animating is the *text*, and re-rendering a Text ~30 times over
 * 800ms is well within budget.
 */
export function CountUp({
  value,
  prefix = '+',
  suffix = '',
  variant = 'numeric',
  tone = 'accent',
  durationMs = 800,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  variant?: 'numeric' | 'display';
  tone?: 'accent' | 'text';
  durationMs?: number;
}) {
  const motion = useMotion();
  const [shown, setShown] = useState(motion.reduced ? value : 0);

  useEffect(() => {
    if (motion.reduced || value === 0) {
      setShown(value);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / durationMs);
      const eased = 1 - (1 - t) * (1 - t) * (1 - t);
      setShown(Math.round(value * eased));
      if (t >= 1) clearInterval(timer);
    }, 1000 / 30);
    return () => clearInterval(timer);
  }, [value, durationMs, motion.reduced]);

  return (
    <Text variant={variant} tone={tone}>
      {prefix}
      {shown.toLocaleString()}
      {suffix}
    </Text>
  );
}
