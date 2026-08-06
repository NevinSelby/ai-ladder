import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import { radius, space, useTheme } from '@/theme';

/**
 * The AI Ladder mark.
 *
 * Five rungs stepping up and to the right, the same geometry as the app icon,
 * redrawn as a component so it inherits the theme instead of shipping a second
 * copy as a bitmap. Rails are deliberately absent: they vanish below about 40px,
 * and the diagonal offset is what makes the rungs read as climbing rather than
 * as a bar chart.
 */
export function LadderMark({
  size = 24,
  color,
  topColor,
}: {
  size?: number;
  color?: string;
  topColor?: string;
}) {
  const theme = useTheme();
  const base = color ?? theme.textMuted;
  const top = topColor ?? theme.accent;

  // Authored on a 1024 grid to match the icon, then scaled.
  const rungs = [
    { x: 168, y: 700 },
    { x: 232, y: 574 },
    { x: 296, y: 448 },
    { x: 360, y: 322 },
    { x: 424, y: 196 },
  ];

  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      {rungs.map((rung, index) => {
        const isTop = index === rungs.length - 1;
        return (
          <Rect
            key={rung.y}
            x={rung.x}
            y={rung.y}
            width={420}
            height={74}
            rx={37}
            fill={isTop ? top : base}
            opacity={isTop ? 1 : 0.4 + index * 0.13}
          />
        );
      })}
    </Svg>
  );
}

/** Mark plus wordmark, for screen headers. */
export function Wordmark({ size = 22 }: { size?: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <View
        style={{
          width: size + 10,
          height: size + 10,
          borderRadius: radius.sm,
          backgroundColor: theme.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <LadderMark size={size} color={theme.accent} topColor={theme.accent} />
      </View>
      <Text variant="eyebrow" tone="textMuted">
        AI LADDER
      </Text>
    </View>
  );
}
