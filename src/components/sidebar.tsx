import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { PanResponder, Pressable, View } from 'react-native';

import {
  IconArrowLeft,
  IconArrowRight,
  IconBoard,
  IconLearn,
  IconPractice,
  IconProgress,
  IconToday,
  IconUser,
} from '@/components/icons';
import { LadderMark } from '@/components/logo';
import { Text } from '@/components/ui';
import { fonts, radius, space, useTheme } from '@/theme';

/**
 * Desktop side navigation.
 *
 * Replaces React Navigation's built-in left tab bar, which cannot carry a
 * footer, a collapse control or a drag handle. The default was also far wider
 * than five short labels need, so it ate horizontal space that belongs to the
 * content.
 *
 * Width is user-controlled and remembered: drag the right edge to resize, or
 * collapse to icons only. Settings sits at the foot rather than floating in the
 * top-right corner of the content area, which is where every desktop tool of
 * this shape puts it and which stops it competing with the page heading.
 */

const WIDTH_KEY = 'ailadder.sidebarWidth.v1';
const COLLAPSED_KEY = 'ailadder.sidebarCollapsed.v1';

const MIN_WIDTH = 156;
const MAX_WIDTH = 300;
const DEFAULT_WIDTH = 184;
const COLLAPSED_WIDTH = 60;

const ICONS: Record<string, typeof IconToday> = {
  index: IconToday,
  learn: IconLearn,
  practice: IconPractice,
  board: IconBoard,
  you: IconProgress,
};

export function Sidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([WIDTH_KEY, COLLAPSED_KEY])
      .then(([[, w], [, c]]) => {
        const parsed = Number(w);
        if (Number.isFinite(parsed) && parsed >= MIN_WIDTH) setWidth(parsed);
        if (c === 'true') setCollapsed(true);
      })
      .catch(() => {});
  }, []);

  const persistWidth = useCallback((next: number) => {
    AsyncStorage.setItem(WIDTH_KEY, String(Math.round(next))).catch(() => {});
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      AsyncStorage.setItem(COLLAPSED_KEY, String(!prev)).catch(() => {});
      return !prev;
    });
  }, []);

  // The drag handle. Tracked live so the edge follows the pointer rather than
  // snapping on release, and clamped so the rail can never be dragged to
  // nothing or made wider than the content it sits beside.
  const [responder] = useState(() => {
    let start = DEFAULT_WIDTH;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2,
      onPanResponderGrant: () => setDragging(true),
      onPanResponderMove: (_e, g) => {
        setWidth((current) => {
          if (start === DEFAULT_WIDTH) start = current;
          return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, start + g.dx));
        });
      },
      onPanResponderRelease: () => {
        setDragging(false);
        setWidth((final) => {
          start = final;
          persistWidth(final);
          return final;
        });
      },
    });
  });

  const railWidth = collapsed ? COLLAPSED_WIDTH : width;

  return (
    <View
      style={{
        width: railWidth,
        backgroundColor: theme.surface,
        borderRightWidth: 1,
        borderRightColor: theme.border,
        paddingTop: space.lg,
        paddingBottom: space.md,
      }}>
      {/* Brand and the collapse control share a row, so the toggle is always
          in the same place whether or not the label is showing. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          paddingHorizontal: collapsed ? 0 : space.md,
          marginBottom: space.lg,
        }}>
        {!collapsed ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <LadderMark size={18} color={theme.accent} topColor={theme.accent} />
            <Text variant="eyebrow" tone="textMuted">
              AI LADDER
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={toggleCollapsed}
          accessibilityLabel={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
          hitSlop={10}
          style={{ padding: 4, borderRadius: radius.sm }}>
          {collapsed ? (
            <IconArrowRight color={theme.textFaint} size={16} />
          ) : (
            <IconArrowLeft color={theme.textFaint} size={16} />
          )}
        </Pressable>
      </View>

      {/* Destinations */}
      <View style={{ gap: 2, paddingHorizontal: collapsed ? space.sm : space.sm }}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const Icon = ICONS[route.name] ?? IconToday;
          const label = (descriptors[route.key].options.title ?? route.name) as string;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={({ hovered }: { hovered?: boolean }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: space.md,
                height: 38,
                paddingHorizontal: collapsed ? 0 : space.md,
                borderRadius: radius.md,
                backgroundColor: focused
                  ? theme.elevatedActive
                  : hovered
                    ? theme.elevated
                    : 'transparent',
              })}>
              <Icon color={focused ? theme.text : theme.textFaint} size={18} />
              {!collapsed ? (
                <Text
                  variant="smallStrong"
                  color={focused ? theme.text : theme.textMuted}
                  numberOfLines={1}>
                  {label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      {/* Settings at the foot: the conventional home for account controls on a
          desktop layout, and out of the way of the page heading. */}
      <View style={{ paddingHorizontal: space.sm }}>
        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityLabel="Profile and settings"
          style={({ hovered }: { hovered?: boolean }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: space.md,
            height: 38,
            paddingHorizontal: collapsed ? 0 : space.md,
            borderRadius: radius.md,
            backgroundColor: hovered ? theme.elevated : 'transparent',
          })}>
          <IconUser color={theme.textFaint} size={18} />
          {!collapsed ? (
            <Text variant="smallStrong" tone="textMuted">
              Settings
            </Text>
          ) : null}
        </Pressable>
      </View>

      {/* Drag handle. A 6px strip on the right edge, invisible until used. */}
      {!collapsed ? (
        <View
          {...responder.panHandlers}
          // @ts-expect-error cursor is web-only and ignored elsewhere.
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: -3,
            width: 6,
            cursor: 'col-resize',
            backgroundColor: dragging ? theme.accent : 'transparent',
          }}
        />
      ) : null}
    </View>
  );
}

export { COLLAPSED_WIDTH, DEFAULT_WIDTH };
