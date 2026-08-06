import { useEffect, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { motion, radius, space, useTheme } from '@/theme';
import { useMotion } from '@/theme/motion-prefs';

/**
 * Depth and light.
 *
 * The app previously had exactly one surface treatment, a rounded card, used
 * for everything from a headline stat to a settings row. That uniformity is
 * what makes an interface read as generated: no element is more important than
 * any other, so the eye has nowhere to land.
 *
 * These give a screen somewhere to land. A glow behind the hero, a hairline
 * gradient rule between sections, an accent bar that belongs to one card only.
 */

// ── Aurora ─────────────────────────────────────────────────────────────────

/**
 * A soft two-colour wash, sitting behind hero content.
 *
 * Drawn as an SVG gradient rather than a stack of translucent views so it
 * stays one paint operation, and clipped by its parent's radius so it reads as
 * lighting rather than as a rectangle someone forgot to round.
 */
export function Aurora({
  width,
  height,
  from,
  to,
  opacity = 0.16,
  radius: r = radius.lg,
}: {
  width: number;
  height: number;
  from?: string;
  to?: string;
  opacity?: number;
  radius?: number;
}) {
  const theme = useTheme();

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', inset: 0, borderRadius: r, overflow: 'hidden', opacity }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="aurora" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from ?? theme.accent} />
            <Stop offset="1" stopColor={to ?? theme.accentAlt} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#aurora)" />
      </Svg>
    </View>
  );
}

// ── Rule ───────────────────────────────────────────────────────────────────

/**
 * A hairline that fades at both ends.
 *
 * Editorial layouts separate sections with rules, not with another box. A rule
 * that fades avoids the hard stop of a full-width border, which is what makes
 * a stack of dividers look like a spreadsheet.
 */
export function Rule({ width, color }: { width: number; color?: string }) {
  const theme = useTheme();
  const tint = color ?? theme.borderStrong;

  return (
    <Svg width={width} height={1}>
      <Defs>
        <LinearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={tint} stopOpacity={0} />
          <Stop offset="0.5" stopColor={tint} stopOpacity={0.9} />
          <Stop offset="1" stopColor={tint} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={1} fill="url(#rule)" />
    </Svg>
  );
}

// ── Section ────────────────────────────────────────────────────────────────

/**
 * A labelled section break.
 *
 * The label is mono, uppercase and tracked wide, sitting on a rule. This is the
 * single most effective device for making a long scroll read as a document
 * rather than a feed: it tells you where you are without another card.
 */
export function SectionLabel({
  label,
  width,
  action,
}: {
  label: string;
  width: number;
  action?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: space.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Animated.Text
          style={{
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 10.5,
            letterSpacing: 1.6,
            color: theme.textFaint,
            textTransform: 'uppercase',
          }}>
          {label}
        </Animated.Text>
        {action}
      </View>
      <Rule width={width} />
    </View>
  );
}

// ── Staggered entrance ─────────────────────────────────────────────────────

/**
 * Reveals children one after another rather than all at once.
 *
 * Material's guidance is 30 to 50ms between items: enough that the eye reads a
 * sequence, little enough that it never feels like waiting. Everything landing
 * simultaneously is the motion equivalent of every card looking the same.
 */
export function Stagger({
  index,
  children,
  step = 45,
  style,
}: {
  index: number;
  children: ReactNode;
  step?: number;
  style?: ViewStyle;
}) {
  const preference = useMotion();
  if (preference.reduced) return <View style={style}>{children}</View>;

  return (
    <Animated.View
      style={style}
      entering={FadeInDown.duration(motion.slow)
        .delay(index * step)
        .springify()
        .damping(18)}>
      {children}
    </Animated.View>
  );
}

// ── Count-in figure ────────────────────────────────────────────────────────

/**
 * A number that arrives with weight: scales up from slightly small and settles.
 *
 * Used for the figures a screen is actually about. Spring rather than easing,
 * because a stat that overshoots and settles reads as physical.
 */
export function Arrive({
  children,
  delay = 0,
  from = 0.88,
}: {
  children: ReactNode;
  delay?: number;
  from?: number;
}) {
  const preference = useMotion();
  const progress = useSharedValue(preference.reduced ? 1 : 0);

  useEffect(() => {
    if (preference.reduced) return;
    progress.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 160 }));
  }, [progress, delay, preference.reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: from + (1 - from) * progress.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

// ── Sheen ──────────────────────────────────────────────────────────────────

/**
 * A one-time light sweep across a surface, on mount.
 *
 * Reserved for the moment something is earned: a level, a milestone. Used more
 * than once or twice in a session it stops meaning anything.
 */
export function Sheen({
  width,
  height,
  delay = 200,
}: {
  width: number;
  height: number;
  delay?: number;
}) {
  const theme = useTheme();
  const preference = useMotion();
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (preference.reduced) return;
    sweep.value = withDelay(
      delay,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
    );
  }, [sweep, delay, preference.reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: sweep.value > 0 && sweep.value < 1 ? 0.35 : 0,
    transform: [{ translateX: -width + sweep.value * width * 2.2 }, { rotate: '16deg' }],
  }));

  if (preference.reduced) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Animated.View
        style={[
          {
            width: width * 0.28,
            height: height * 2.6,
            top: -height * 0.8,
            backgroundColor: theme.accentAlt,
          },
          style,
        ]}
      />
    </View>
  );
}
