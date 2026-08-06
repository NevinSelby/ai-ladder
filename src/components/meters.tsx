import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { Bar, Chip, Eyebrow, Row, Stack, Text } from '@/components/ui';
import {
  METER_KEYS,
  METER_META,
  meterColor,
  radius,
  space,
  useScheme,
  useTheme,
} from '@/theme';
import { LEVELS, levelProgress, meterFraction, type Meters } from '@shared/progression';
import type { MeterKey } from '@shared/taxonomy';

/** Five labeled bars. The everyday view of where you stand. */
export function MeterList({ meters, highlight }: { meters: Meters; highlight?: MeterKey }) {
  const scheme = useScheme();
  const theme = useTheme();

  return (
    <Stack gap={space.md}>
      {METER_KEYS.map((key) => {
        const color = meterColor(key, scheme);
        const isWeak = key === highlight;
        return (
          <View key={key} style={{ gap: 6 }}>
            <Row justify="space-between" align="baseline">
              <Row gap={space.sm} align="center">
                <Text variant="smallStrong" color={color}>
                  {METER_META[key].label}
                </Text>
                {isWeak ? <Chip label="gating" color={theme.warning} filled /> : null}
              </Row>
              <Text variant="numericSm" tone="textMuted">
                {meters[key].toLocaleString()}
              </Text>
            </Row>
            <Bar value={meterFraction(meters[key])} color={color} height={7} />
          </View>
        );
      })}
    </Stack>
  );
}

/**
 * Pentagon radar.
 *
 * The shape is the point: a balanced practitioner draws a regular pentagon, and
 * anyone who has only ground multiple-choice questions draws a spike. It makes
 * the gating rule legible at a glance in a way five bars do not.
 */
export function MeterRadar({ meters, size = 220 }: { meters: Meters; size?: number }) {
  const scheme = useScheme();
  const theme = useTheme();

  const cx = size / 2;
  const cy = size / 2 + 6;
  const maxR = size / 2 - 34;

  const angleFor = (index: number) => (Math.PI * 2 * index) / METER_KEYS.length - Math.PI / 2;
  const pointAt = (index: number, r: number) => {
    const angle = angleFor(index);
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const ringPoints = (scale: number) =>
    METER_KEYS.map((_, index) => pointAt(index, maxR * scale).join(',')).join(' ');

  const dataPoints = METER_KEYS.map((key, index) =>
    pointAt(index, Math.max(6, maxR * meterFraction(meters[key]))).join(',')
  ).join(' ');

  return (
    <Svg width={size} height={size + 12}>
      {rings.map((scale) => (
        <Polygon
          key={scale}
          points={ringPoints(scale)}
          fill="none"
          stroke={theme.border}
          strokeWidth={1}
        />
      ))}
      {METER_KEYS.map((_, index) => {
        const [x, y] = pointAt(index, maxR);
        return <Line key={index} x1={cx} y1={cy} x2={x} y2={y} stroke={theme.border} strokeWidth={1} />;
      })}

      <Polygon
        points={dataPoints}
        fill={theme.accent + '2E'}
        stroke={theme.accent}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {METER_KEYS.map((key, index) => {
        const [x, y] = pointAt(index, Math.max(6, maxR * meterFraction(meters[key])));
        return <Circle key={key} cx={x} cy={y} r={3.5} fill={meterColor(key, scheme)} />;
      })}

      {METER_KEYS.map((key, index) => {
        const [x, y] = pointAt(index, maxR + 16);
        return (
          <SvgText
            key={key}
            x={x}
            y={y + 4}
            fill={meterColor(key, scheme)}
            fontSize={10}
            fontWeight="700"
            textAnchor="middle">
            {METER_META[key].short}
          </SvgText>
        );
      })}
    </Svg>
  );
}

/**
 * The level card.
 *
 * It deliberately names the meter holding you back and how far away it is.
 * Telling someone they are "78% to Senior FDE" is motivating; telling them the
 * only thing standing in the way is 340 more XP of Client work is actionable.
 */
export function LevelCard({ meters }: { meters: Meters }) {
  const theme = useTheme();
  const scheme = useScheme();
  const progress = levelProgress(meters);
  const blockColor = meterColor(progress.blockedBy, scheme);

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: space.lg,
        gap: space.md,
      }}>
      <Row justify="space-between" align="flex-start">
        <View style={{ flex: 1, gap: 2 }}>
          <Eyebrow>Level {progress.level.index + 1} of {LEVELS.length}</Eyebrow>
          <Text variant="title">{progress.level.title}</Text>
        </View>
        <Text variant="numeric" tone="accent">
          {String(progress.level.index + 1).padStart(2, '0')}
        </Text>
      </Row>

      <Text variant="small" tone="textMuted">
        {progress.level.note}
      </Text>

      {progress.next ? (
        <View style={{ gap: 8 }}>
          <Bar value={progress.fraction} color={theme.accent} height={8} />
          <Row justify="space-between">
            <Text variant="caption" tone="textFaint">
              Next: {progress.next.title}
            </Text>
            <Text variant="caption" color={blockColor}>
              {progress.deficit.toLocaleString()} XP of {METER_META[progress.blockedBy].label} to go
            </Text>
          </Row>
        </View>
      ) : (
        <Text variant="small" tone="accent">
          Top of the ladder. Every meter maxed.
        </Text>
      )}
    </View>
  );
}
