import { useEffect, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { useMotion } from '@/theme/motion-prefs';

/**
 * Ambient motion: small, slow, behind the content, and gone entirely under
 * reduce-motion. It carries no meaning, it just keeps the app from reading as
 * a printed document.
 */

/**
 * A 0..1 value oscillating forever, or pinned at 0 when motion is off.
 *
 * Every effect here is some shape driven by one of these, so the loop
 * bookkeeping lives in exactly one place.
 */
function useOscillator(period: number, enabled = true, linear = false): SharedValue<number> {
  const value = useSharedValue(0);
  const motion = useMotion();
  const on = enabled && !motion.reduced;

  useEffect(() => {
    if (!on) {
      cancelAnimation(value);
      value.value = withTiming(0, { duration: 140 });
      return;
    }
    value.value = linear
      ? withRepeat(withTiming(1, { duration: period, easing: Easing.linear }), -1, false)
      : withRepeat(
          withSequence(
            withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: period * 1.2, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        );
    return () => cancelAnimation(value);
  }, [on, period, linear, value]);

  return value;
}

/** A dot with an expanding ring, for anything currently active. */
export function PulseDot({ color, size = 8 }: { color?: string; size?: number }) {
  const theme = useTheme();
  const pulse = useOscillator(1800, true, true);
  const tint = color ?? theme.positive;
  const dot: ViewStyle = { width: size, height: size, borderRadius: size / 2, backgroundColor: tint };

  const ring = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.55,
    transform: [{ scale: 1 + pulse.value * 2.4 }],
  }));

  return (
    <View style={{ ...dot, backgroundColor: undefined, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', ...dot }, ring]} />
      <View style={dot} />
    </View>
  );
}

/** Wraps content in a slow scale breath, for art that would otherwise sit inert. */
export function Breathe({
  children,
  amount = 0.03,
  period = 3200,
}: {
  children: ReactNode;
  amount?: number;
  period?: number;
}) {
  const breath = useOscillator(period);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * amount }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** A dot orbiting a medallion. Decoration for an avatar or monogram. */
export function OrbitRing({
  size,
  color,
  duration = 9000,
  dot = 4,
}: {
  size: number;
  color?: string;
  duration?: number;
  dot?: number;
}) {
  const theme = useTheme();
  const spin = useOscillator(duration, true, true);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, alignItems: 'center' }, style]}>
      <View
        style={{
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: color ?? theme.accent,
          marginTop: -dot / 2,
        }}
      />
    </Animated.View>
  );
}
