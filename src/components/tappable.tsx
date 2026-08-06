import { forwardRef, type ReactNode } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useMotion } from '@/theme/motion-prefs';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The standard tappable surface.
 *
 * Exists because roughly twenty `Pressable`s across the app had no press
 * feedback at all. A card that does not acknowledge a tap reads as broken for
 * the ~150ms before the next screen arrives, and on a slow read it reads as
 * unresponsive entirely.
 *
 * Two guarantees it enforces that hand-rolled Pressables kept missing:
 *   - a minimum 44pt touch target via hitSlop, computed from the rendered size,
 *   - an accessibility role and label, so an icon-only control is announced.
 *
 * The squish is a spring rather than a timing curve: pressing a physical thing
 * has overshoot, and a linear scale-down feels like a state change instead of a
 * touch. It flattens to no movement when the system asks for reduced motion.
 */

interface TappableProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Rendered height, used to work out how much hitSlop restores 44pt. */
  height?: number;
  /** Skip the scale animation for large surfaces where it looks odd. */
  scaleOnPress?: boolean;
  /** Required whenever the content is icon-only. */
  accessibilityLabel?: string;
}

export const Tappable = forwardRef<View, TappableProps>(function Tappable(
  {
    children,
    style,
    height,
    scaleOnPress = true,
    accessibilityLabel,
    accessibilityRole = 'button',
    disabled,
    ...rest
  },
  ref
) {
  const motion = useMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(
          scaleOnPress ? 1 - pressed.value * (1 - motion.pressScale) : 1,
          motion.spring
        ),
      },
    ],
    opacity: withTiming(1 - pressed.value * 0.1, { duration: motion.fast }),
  }));

  // Restore a 44pt target for anything rendered smaller, rather than trusting
  // every call site to remember.
  const slop = height && height < 44 ? Math.ceil((44 - height) / 2) : 0;

  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={slop || undefined}
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}
      {...rest}
      style={[{ opacity: disabled ? 0.4 : 1 }, animatedStyle, style]}>
      {children}
    </AnimatedPressable>
  );
});
