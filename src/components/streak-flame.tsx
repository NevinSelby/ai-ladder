import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { IconFlame } from '@/components/icons';
import { Text } from '@/components/ui';
import { radius, space, useTheme } from '@/theme';
import { useMotion } from '@/theme/motion-prefs';

/**
 * The streak pill.
 *
 * Deliberately the plain flame mark, not a simulated fire. Two attempts at
 * layered animated flame both read as cheap at 22px: at icon scale there are
 * not enough pixels for the illusion to hold, and the motion just draws the
 * eye to the seams. A crisp icon with a warm tint and a soft glow reads as
 * "lit" without pretending to be a campfire.
 *
 * Lit gets a slow glow pulse; unlit is flat grey and still. Reduce-motion
 * removes the pulse and keeps both states legible.
 */
export function StreakFlame({
  days,
  lit,
  celebrate = false,
  size = 22,
  showCount = true,
}: {
  days: number;
  lit: boolean;
  celebrate?: boolean;
  size?: number;
  showCount?: boolean;
}) {
  const theme = useTheme();
  const motion = useMotion();

  const punch = useSharedValue(1);
  const glow = useSharedValue(0);
  const animate = lit && !motion.reduced;

  // A slow warm halo behind the mark while the streak is alive.
  useEffect(() => {
    if (!animate) {
      cancelAnimation(glow);
      glow.value = withTiming(0, { duration: 160 });
      return;
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.35, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    return () => cancelAnimation(glow);
  }, [animate, glow]);

  // The one-off celebration when a session lights the flame.
  useEffect(() => {
    if (!celebrate || motion.reduced) return;
    punch.value = withSequence(
      withDelay(60, withTiming(1.45, { duration: 200, easing: Easing.out(Easing.cubic) })),
      withSpring(1, { damping: 9, stiffness: 200 })
    );
  }, [celebrate, motion.reduced, punch]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: punch.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.28,
    transform: [{ scale: 0.9 + glow.value * 0.5 }],
  }));

  const tint = lit ? theme.warning : theme.textFaint;

  return (
    <View
      accessibilityLabel={`${days} day streak${lit ? ', active today' : ''}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: showCount ? space.md : space.sm,
        paddingVertical: space.sm - 2,
        borderRadius: radius.pill,
        backgroundColor: lit ? theme.warningSoft : theme.elevated,
      }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {lit ? (
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: theme.warning,
              },
              glowStyle,
            ]}
          />
        ) : null}
        <Animated.View style={markStyle}>
          <IconFlame color={tint} size={size} />
        </Animated.View>
      </View>
      {showCount ? (
        <Text variant="numericSm" color={tint}>
          {days}
        </Text>
      ) : null}
    </View>
  );
}
