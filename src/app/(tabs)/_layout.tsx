import { Tabs } from 'expo-router';
import { useEffect, type ComponentType } from 'react';
import { Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  IconBoard,
  IconLearn,
  IconPractice,
  IconProgress,
  IconToday,
} from '@/components/icons';
import { fonts, radius, space, useLayout, useTheme } from '@/theme';
import { useMotion } from '@/theme/motion-prefs';

/**
 * Tab icons pop when their tab becomes active: a quick overshoot scale with a
 * slight tilt, then settle. The animation runs on selection only, not on every
 * render, and collapses to nothing under reduce-motion.
 */
function TabIcon({
  Icon,
  color,
  focused,
}: {
  Icon: ComponentType<{ color: string; size?: number }>;
  color: string;
  focused: boolean;
}) {
  const motion = useMotion();
  const scale = useSharedValue(1);
  const tilt = useSharedValue(0);

  useEffect(() => {
    if (!focused || motion.reduced) return;
    scale.value = withSequence(
      withTiming(0.82, { duration: 70 }),
      withSpring(1, { damping: 9, stiffness: 320 })
    );
    tilt.value = withSequence(
      withTiming(-0.09, { duration: 70 }),
      withSpring(0, { damping: 7, stiffness: 240 })
    );
  }, [focused, motion.reduced, scale, tilt]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${tilt.value}rad` }],
  }));

  return (
    <Animated.View style={style}>
      <Icon color={color} size={22} />
    </Animated.View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const layout = useLayout();

  /**
   * On a desktop browser the navigation moves to the left edge.
   *
   * A bottom bar is a thumb affordance: pinned to the bottom of a 900px-tall
   * window it is both far from the pointer and a dead giveaway that this is a
   * phone app in a browser. React Navigation 7 supports a left tab bar
   * natively, so the same five destinations just relocate.
   */
  const side = layout.desktop;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: side ? 'left' : 'bottom',
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textFaint,
        tabBarActiveBackgroundColor: side ? theme.accentSoft : undefined,
        tabBarItemStyle: side
          ? {
              borderRadius: radius.md,
              marginHorizontal: space.sm,
              marginVertical: 3,
              paddingVertical: space.sm,
            }
          : undefined,
        tabBarStyle: side
          ? {
              backgroundColor: theme.surface,
              borderRightColor: theme.border,
              borderRightWidth: 1,
              width: 216,
              paddingTop: space.xl,
            }
          : {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              borderTopWidth: 1,
              height: Platform.select({ ios: 88, default: 66 }),
              paddingTop: 8,
            },
        tabBarLabelStyle: side
          ? {
              fontFamily: fonts.mono,
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              marginLeft: space.md,
            }
          : {
              fontFamily: fonts.mono,
              fontSize: 9.5,
              fontWeight: '700',
              letterSpacing: 0.7,
              textTransform: 'uppercase',
            },
        sceneStyle: { backgroundColor: theme.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={IconToday} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={IconLearn} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={IconPractice} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          title: 'Board',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={IconBoard} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={IconProgress} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
