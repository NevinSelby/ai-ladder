import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { elevation, radius, space, useTheme } from '@/theme';

/**
 * A small explanatory popover.
 *
 * Two triggers, because the app runs on two kinds of device: tap toggles it on
 * touch, hover opens it on web where a pointer exists. Tapping again, or
 * moving the pointer away, closes it, and it self-dismisses after a few
 * seconds so a stray tap does not leave a label stuck on screen.
 *
 * Rendered absolutely with `pointerEvents="none"` so it never eats the tap
 * meant for whatever sits underneath it.
 */
export function Tooltip({
  title,
  body,
  children,
  align = 'right',
  width = 220,
}: {
  title: string;
  body: string;
  children: ReactNode;
  /** Which edge the bubble lines up with, so it cannot run off screen. */
  align?: 'left' | 'right' | 'center';
  width?: number;
}) {
  const theme = useTheme();
  /**
   * Hover opens it where a pointer exists; tap only opens it where one does
   * not. On web a click always follows a hover, so wiring both to the same
   * state made the pointer open it and the click immediately close it again.
   * Touch devices have no hover, so they keep the tap, with a timeout so a
   * stray tap cannot leave a label stuck on screen.
   */
  const pointer = Platform.OS === 'web';
  const [hovered, setHovered] = useState(false);
  const [tapped, setTapped] = useState(false);
  const open = pointer ? hovered : tapped;

  useEffect(() => {
    if (!tapped) return;
    const timer = setTimeout(() => setTapped(false), 5000);
    return () => clearTimeout(timer);
  }, [tapped]);

  const position =
    align === 'right'
      ? { right: 0 }
      : align === 'left'
        ? { left: 0 }
        : { left: '50%' as const, transform: [{ translateX: -width / 2 }] };

  return (
    // The wrapper lifts while open so the bubble paints over whatever follows
    // it in the layout. Without this a card further down the screen wins on
    // paint order and clips it.
    <View style={{ position: 'relative', zIndex: open ? 100 : 0 }}>
      <Pressable
        onPress={pointer ? undefined : () => setTapped((v) => !v)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        accessibilityLabel={`${title}. ${body}`}
        accessibilityRole="button">
        {children}
      </Pressable>

      {open ? (
        <View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: '100%',
              marginTop: 6,
              width,
              padding: space.md,
              gap: 3,
              borderRadius: radius.md,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              zIndex: 50,
              ...elevation(theme, 2),
            },
            position,
          ]}>
          <Text variant="smallStrong">{title}</Text>
          <Text variant="caption" tone="textMuted">
            {body}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
