import { forwardRef, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MAX_CONTENT_WIDTH,
  elevation,
  motion,
  radius,
  space,
  type,
  useLayout,
  useTheme,
} from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ── Text ───────────────────────────────────────────────────────────────────

type Variant = keyof typeof type;

interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: 'text' | 'textMuted' | 'textFaint' | 'accent' | 'positive' | 'negative' | 'warning';
  color?: string;
  center?: boolean;
}

export function Text({
  variant = 'body',
  tone = 'text',
  color,
  center,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        type[variant],
        { color: color ?? theme[tone] },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}

/** All-caps monospaced section label. */
export function Eyebrow({
  children,
  style,
  tone = 'textFaint',
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  tone?: AppTextProps['tone'];
}) {
  return (
    <Text variant="eyebrow" tone={tone} style={style}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Text>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────

export function Screen({
  children,
  scroll = true,
  padded = true,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const constrain = { ...styles.constrain, maxWidth: layout.contentWidth };
  const inner = <View style={[constrain, padded && styles.padded]}>{children}</View>;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }}
          showsVerticalScrollIndicator={false}
          // Momentum tuned down a touch: this is a reading surface, not a feed.
          decelerationRate="normal">
          {inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{inner}</View>
      )}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              paddingBottom: Math.max(insets.bottom, space.lg),
            },
          ]}>
          <View style={[styles.constrain, { maxWidth: layout.contentWidth }]}>{footer}</View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export function Row({
  children,
  gap = space.sm,
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  style,
}: {
  children: ReactNode;
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Stack({
  children,
  gap = space.md,
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Spacer({ size = space.lg }: { size?: number }) {
  return <View style={{ height: size }} />;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[{ height: 1, backgroundColor: theme.border }, style]} />;
}

/** Staggered fade-and-rise. Used to bring a screen's sections in on mount. */
export function Appear({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(motion.slow).delay(delay)}
      layout={LinearTransition.duration(motion.base)}
      style={style}>
      {children}
    </Animated.View>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────

interface CardProps extends ViewProps {
  children: ReactNode;
  /** Draws a thin left rule in this colour. Does not tint the whole block. */
  accent?: string;
  padded?: boolean;
  /**
   * How much container this block gets.
   *
   * `bare` is the default and draws nothing: the block is defined by the space
   * around it and the type inside it. `panel` adds a quiet fill for something
   * genuinely inset, such as a form. `raised` is the old card and exists for
   * the one hero block per screen.
   */
  surface?: 'bare' | 'panel' | 'raised';
  /** Deprecated alias for `surface`, kept so existing call sites still build. */
  level?: 0 | 1 | 2;
}

/**
 * A content block.
 *
 * This used to draw a bordered, rounded, shadowed rectangle every time, so a
 * headline stat and a settings row looked identical and the app read as a
 * stack of boxes. A box is the loudest thing a layout can do; using one for
 * everything is precisely why nothing had hierarchy.
 *
 * It now draws nothing by default. Separation comes from whitespace and from
 * the fading rules in surface.tsx. A container is opt-in, for the rare block
 * that genuinely needs to look inset or lifted.
 */
export function Card({
  children,
  accent,
  padded = true,
  surface,
  level,
  style,
  ...rest
}: CardProps) {
  const theme = useTheme();
  // Old numeric levels map onto the new vocabulary, so call sites did not have
  // to change: only an explicit level 2 still asks to be lifted.
  const mode: 'bare' | 'panel' | 'raised' = surface ?? (level === 2 ? 'raised' : 'bare');

  const container =
    mode === 'raised'
      ? {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
          overflow: 'hidden' as const,
          ...elevation(theme, 1),
        }
      : mode === 'panel'
        ? {
            backgroundColor: theme.elevated,
            borderRadius: radius.md,
            overflow: 'hidden' as const,
          }
        : {};

  return (
    <View {...rest} style={[container, style]}>
      {accent ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 2,
            bottom: 2,
            width: 2,
            borderRadius: 1,
            backgroundColor: accent,
          }}
        />
      ) : null}
      <View
        style={
          padded
            ? {
                paddingVertical: mode === 'bare' ? 0 : space.lg,
                paddingHorizontal: mode === 'bare' ? (accent ? space.lg : 0) : space.lg,
              }
            : undefined
        }>
        {children}
      </View>
    </View>
  );
}

// ── Button ─────────────────────────────────────────────────────────────────

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  full?: boolean;
  left?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Buttons scale down slightly on press.
 *
 * A spring on scale reads as physical in a way an opacity change does not, and
 * it is the cheapest way to make the whole app feel responsive.
 */
export const Button = forwardRef<View, ButtonProps>(function Button(
  { title, kind = 'primary', size = 'md', full, left, right, style, disabled, ...rest },
  ref
) {
  const theme = useTheme();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.02, motion.spring) }],
    opacity: withTiming(1 - pressed.value * 0.12, { duration: motion.fast }),
  }));

  const surface =
    kind === 'primary'
      ? theme.accent
      : kind === 'secondary'
        ? theme.elevated
        : kind === 'danger'
          ? theme.negative
          : 'transparent';
  const label =
    kind === 'primary' || kind === 'danger' ? theme.accentText : theme.text;

  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}
      {...rest}
      style={[
        {
          backgroundColor: surface,
          borderRadius: radius.md,
          paddingVertical: size === 'lg' ? space.lg : space.md + 1,
          paddingHorizontal: space.xl,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space.sm,
          borderWidth: kind === 'ghost' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.borderStrong,
          opacity: disabled ? 0.38 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        kind === 'primary' && !disabled ? elevation(theme, 1) : null,
        animatedStyle,
        style,
      ]}>
      {left}
      <RNText
        style={[
          size === 'lg' ? type.bodyStrong : type.smallStrong,
          { color: label, letterSpacing: 0.1 },
        ]}>
        {title}
      </RNText>
      {right}
    </AnimatedPressable>
  );
});

// ── Chip ───────────────────────────────────────────────────────────────────

export function Chip({
  label,
  color,
  filled = false,
  style,
}: {
  label: string;
  color?: string;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const tint = color ?? theme.textMuted;
  return (
    <View
      style={[
        {
          paddingHorizontal: space.sm + 1,
          paddingVertical: 4,
          borderRadius: radius.sm,
          borderWidth: filled ? 0 : StyleSheet.hairlineWidth,
          borderColor: tint + '66',
          backgroundColor: filled ? tint + '1F' : 'transparent',
        },
        style,
      ]}>
      <RNText style={[type.eyebrow, { color: tint }]}>{label.toUpperCase()}</RNText>
    </View>
  );
}

// ── Bars ───────────────────────────────────────────────────────────────────

/** Progress bar that animates to its value rather than jumping. */
export function Bar({
  value,
  color,
  height = 8,
  track,
  animate = true,
}: {
  /** 0..1 */
  value: number;
  color: string;
  height?: number;
  track?: string;
  animate?: boolean;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, value));

  const animatedStyle = useAnimatedStyle(() => ({
    width: animate
      ? withTiming(`${clamped * 100}%`, { duration: motion.slow })
      : `${clamped * 100}%`,
  }));

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: track ?? theme.elevated,
        overflow: 'hidden',
      }}>
      <Animated.View
        style={[
          { height: '100%', backgroundColor: color, borderRadius: height / 2 },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  constrain: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  padded: { paddingHorizontal: space.lg },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
});
