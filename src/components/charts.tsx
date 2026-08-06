import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Row, Text } from '@/components/ui';
import {
  METER_KEYS,
  METER_META,
  meterColor,
  radius,
  sequentialStep,
  space,
  useScheme,
  useTheme,
} from '@/theme';
import type { Meters } from '@shared/progression';
import type { MeterKey } from '@shared/taxonomy';

/**
 * Chart primitives.
 *
 * Built to one set of rules so the app reads as a system rather than a pile of
 * drawings: thin marks, 2px strokes, recessive axes, a 2px surface gap between
 * adjacent fills, and color assigned by the job it does, categorical hues for
 * the five meters (fixed order, never cycled) and a single-hue sequential ramp
 * for magnitude. Text always wears text tokens; a colored mark beside it
 * carries the identity, so nothing depends on color alone.
 */

// ── Sparkline ──────────────────────────────────────────────────────────────

/**
 * Change over time, one series. No legend, the title names it, and no marker
 * on every point; only the latest value is labeled, which is the one a reader
 * actually wants.
 */
export function Sparkline({
  values,
  labels,
  width,
  height = 56,
  color,
  showLast = true,
  unit = 'XP',
}: {
  values: number[];
  /** One label per value (e.g. the day); shown in the scrub readout. */
  labels?: string[];
  width: number;
  height?: number;
  color?: string;
  showLast?: boolean;
  unit?: string;
}) {
  const theme = useTheme();
  const stroke = color ?? theme.accent;
  const pad = 6;
  // Which point the finger is on. Sticky after release so the readout can be
  // read at leisure; tapping the chart again moves or clears it.
  const [scrub, setScrub] = useState<number | null>(null);

  if (values.length < 2) {
    return (
      <View style={{ height, justifyContent: 'center' }}>
        <Text variant="caption" tone="textFaint">
          Not enough history yet, a few more days and the trend appears here.
        </Text>
      </View>
    );
  }

  const max = Math.max(...values, 1);
  const stepX = (width - pad * 2) / (values.length - 1);
  const y = (value: number) => pad + (1 - value / max) * (height - pad * 2);

  const points = values.map((value, i) => [pad + i * stepX, y(value)] as const);
  const line = points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px},${py}`).join(' ');
  // Area fill sits under the line at low opacity to give the trend weight
  // without competing with it.
  const area = `${line} L${points[points.length - 1][0]},${height - pad} L${pad},${height - pad} Z`;
  const [lastX, lastY] = points[points.length - 1];

  const indexAt = (x: number) =>
    Math.max(0, Math.min(values.length - 1, Math.round((x - pad) / stepX)));

  const scrubbed = scrub !== null ? points[scrub] : null;

  return (
    <View style={{ gap: space.xs }}>
      <View
        style={{ width, height }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => setScrub(indexAt(e.nativeEvent.locationX))}
        onResponderMove={(e) => setScrub(indexAt(e.nativeEvent.locationX))}>
        <Svg width={width} height={height} pointerEvents="none">
          <Path d={area} fill={stroke} opacity={0.12} />
          <Path d={line} stroke={stroke} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {scrubbed ? (
            <>
              <Line
                x1={scrubbed[0]}
                y1={pad}
                x2={scrubbed[0]}
                y2={height - pad}
                stroke={theme.borderStrong}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <Circle cx={scrubbed[0]} cy={scrubbed[1]} r={5.5} fill={theme.surface} />
              <Circle cx={scrubbed[0]} cy={scrubbed[1]} r={4} fill={stroke} />
            </>
          ) : null}
          {showLast && scrub === null ? (
            <>
              {/* 2px surface ring so the marker stays readable over the area fill. */}
              <Circle cx={lastX} cy={lastY} r={5} fill={theme.surface} />
              <Circle cx={lastX} cy={lastY} r={3.5} fill={stroke} />
            </>
          ) : null}
        </Svg>
      </View>
      {scrub !== null ? (
        <Row justify="space-between" align="center">
          <Text variant="caption" tone="textMuted">
            {labels?.[scrub] ?? `Point ${scrub + 1} of ${values.length}`}
          </Text>
          <Row gap={space.sm} align="center">
            <Text variant="smallStrong">
              {values[scrub].toLocaleString()} {unit}
            </Text>
            <Pressable onPress={() => setScrub(null)} hitSlop={8}>
              <Text variant="caption" tone="textFaint">
                clear
              </Text>
            </Pressable>
          </Row>
        </Row>
      ) : (
        <Text variant="caption" tone="textFaint">
          Touch and drag to inspect a day.
        </Text>
      )}
    </View>
  );
}

// ── Progress ring ──────────────────────────────────────────────────────────

/** A single headline value. The number is the mark; the arc is context. */
export function ProgressRing({
  fraction,
  size = 108,
  stroke = 9,
  color,
  label,
  caption,
}: {
  fraction: number;
  size?: number;
  stroke?: number;
  color?: string;
  label: string;
  caption?: string;
}) {
  const theme = useTheme();
  const tint = color ?? theme.accent;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.elevated} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={tint}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * clamped} ${circumference}`}
          />
        </G>
      </Svg>
      <Text variant="numeric" style={{ fontSize: size * 0.26, lineHeight: size * 0.3 }}>
        {label}
      </Text>
      {caption ? (
        <Text variant="caption" tone="textFaint">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

// ── Calendar heatmap ───────────────────────────────────────────────────────

/**
 * Absolute XP thresholds for the heatmap shade.
 *
 * Deliberately not normalized against the user's own peak. Scaling to the
 * maximum means the very first session is also the maximum, so day one paints
 * the darkest shade and every later day looks like a regression, the scale
 * silently rewrites history as you go. Fixed buckets keep a given color meaning
 * the same amount of work forever, which is the only way the grid is readable
 * as a record. Roughly: one short session, a full session, two, three or more.
 */
const XP_BUCKETS = [40, 90, 160, 260];

function intensity(xp: number): number {
  for (let i = 0; i < XP_BUCKETS.length; i += 1) {
    if (xp <= XP_BUCKETS[i]) return (i + 1) / XP_BUCKETS.length;
  }
  return 1;
}

/**
 * Practice history. Magnitude, so a single-hue sequential ramp light to dark, 
 * a categorical palette here would imply days differ in kind rather than amount.
 */
export function CalendarHeatmap({
  days,
  weeks = 17,
  width,
  onSelectDay,
}: {
  days: { day: string; xp: number }[];
  weeks?: number;
  width: number;
  /** Long-press a cell to inspect that day. */
  onSelectDay?: (day: string) => void;
}) {
  const theme = useTheme();
  const scheme = useScheme();

  const gap = 3;
  const cell = Math.max(9, Math.floor((width - gap * (weeks - 1)) / weeks));
  const height = cell * 7 + gap * 6;

  const byDay = new Map(days.map((d) => [d.day, d.xp]));

  const today = new Date();
  /**
   * Anchor the last column to the *current* week.
   *
   * Step back to this week's Sunday, then back `weeks - 1` further weeks. An
   * earlier version also subtracted the full span, which shifted the whole grid
   * back by the day of the week and meant today's cell was never drawn, 
   * practicing had no visible effect until the following Sunday.
   */
  const start = new Date(today);
  start.setDate(start.getDate() - today.getDay() - (weeks - 1) * 7);

  const cells: { x: number; y: number; fill: string; key: string }[] = [];
  for (let w = 0; w < weeks; w += 1) {
    for (let d = 0; d < 7; d += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      if (date > today) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const xp = byDay.get(key) ?? 0;
      cells.push({
        key,
        x: w * (cell + gap),
        y: d * (cell + gap),
        fill: xp > 0 ? sequentialStep(intensity(xp), scheme) : theme.elevated,
      });
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ width: weeks * (cell + gap) - gap, height }}>
        <Svg width={weeks * (cell + gap) - gap} height={height}>
          {cells.map((c) => (
            <Rect key={c.key} x={c.x} y={c.y} width={cell} height={cell} rx={2.5} fill={c.fill} />
          ))}
        </Svg>
        {onSelectDay
          ? cells.map((c) => (
              <Pressable
                key={`hit-${c.key}`}
                onLongPress={() => onSelectDay(c.key)}
                onPress={() => onSelectDay(c.key)}
                delayLongPress={180}
                // Hit slop widens the target past the 9-11px cell without
                // changing the drawn grid.
                hitSlop={3}
                style={{
                  position: 'absolute',
                  left: c.x,
                  top: c.y,
                  width: cell,
                  height: cell,
                }}
              />
            ))
          : null}
      </View>
      <Row justify="space-between" align="center">
        <Text variant="caption" tone="textFaint">
          {weeks} weeks
        </Text>
        <Row gap={4} align="center">
          <Text variant="caption" tone="textFaint">
            less
          </Text>
          <Svg width={5 * 13} height={11}>
            {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
              <Rect
                key={f}
                x={i * 13}
                y={0}
                width={10}
                height={10}
                rx={2.5}
                fill={f === 0 ? theme.elevated : sequentialStep(f, scheme)}
              />
            ))}
          </Svg>
          <Text variant="caption" tone="textFaint">
            more
          </Text>
        </Row>
      </Row>
    </View>
  );
}

// ── Meter bars ─────────────────────────────────────────────────────────────

/**
 * The five meters as a ranked horizontal bar chart.
 *
 * Bars beat the radar for "which am I behind on" because length is judged far
 * more accurately than area; the radar still earns its place for shape. Each
 * bar is directly labeled, which is also what makes the palette's one CVD
 * warning acceptable, identity never rests on hue alone.
 */
export function MeterBars({
  meters,
  width,
  highlight,
  onSelect,
  selected,
}: {
  meters: Meters;
  width: number;
  highlight?: MeterKey;
  /** Tap a row to inspect that meter. */
  onSelect?: (key: MeterKey) => void;
  selected?: MeterKey | null;
}) {
  const theme = useTheme();
  const scheme = useScheme();

  const rowH = 30;
  const labelW = 74;
  const valueW = 46;
  const trackW = Math.max(40, width - labelW - valueW);
  const peak = Math.max(...METER_KEYS.map((k) => meters[k]), 1);

  return (
    <View style={{ width, height: rowH * METER_KEYS.length }}>
      <Svg width={width} height={rowH * METER_KEYS.length} pointerEvents="none">
        {METER_KEYS.map((key, i) => {
          const y = i * rowH;
          const value = meters[key];
          const w = Math.max(value > 0 ? 4 : 0, (value / peak) * trackW);
          const tint = meterColor(key, scheme);
          const dimmed = selected != null && selected !== key;
          return (
            <G key={key} opacity={dimmed ? 0.4 : 1}>
              <SvgText x={0} y={y + rowH / 2 + 4} fill={theme.textMuted} fontSize={11.5} fontWeight="600">
                {METER_META[key].label}
              </SvgText>
              <Rect x={labelW} y={y + 7} width={trackW} height={11} rx={5.5} fill={theme.elevated} />
              <Rect x={labelW} y={y + 7} width={w} height={11} rx={5.5} fill={tint} />
              {highlight === key ? (
                <Circle cx={labelW + trackW + 12} cy={y + 12.5} r={3} fill={theme.warning} />
              ) : null}
              <SvgText
                x={width}
                y={y + rowH / 2 + 4}
                fill={theme.textFaint}
                fontSize={11}
                textAnchor="end">
                {value.toLocaleString()}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      {onSelect
        ? METER_KEYS.map((key, i) => (
            <Pressable
              key={`hit-${key}`}
              onPress={() => onSelect(key)}
              accessibilityLabel={`Inspect the ${METER_META[key].label} meter`}
              style={{ position: 'absolute', left: 0, top: i * rowH, width, height: rowH }}
            />
          ))
        : null}
    </View>
  );
}

// ── Branch mastery ─────────────────────────────────────────────────────────

/** Part-to-whole per branch, as a compact stacked bar with a 2px surface gap. */
export function BranchProgress({
  items,
  width,
}: {
  items: { label: string; completed: number; total: number }[];
  width: number;
}) {
  const theme = useTheme();
  const rowH = 26;
  const labelW = Math.min(150, width * 0.52);
  const trackW = Math.max(40, width - labelW - 40);

  return (
    <Svg width={width} height={rowH * items.length}>
      {items.map((item, i) => {
        const y = i * rowH;
        const fraction = item.total ? item.completed / item.total : 0;
        const done = fraction * trackW;
        return (
          <G key={item.label}>
            <SvgText x={0} y={y + rowH / 2 + 4} fill={theme.textMuted} fontSize={11.5}>
              {item.label.length > 22 ? `${item.label.slice(0, 21)}…` : item.label}
            </SvgText>
            <Rect x={labelW} y={y + 8} width={trackW} height={9} rx={4.5} fill={theme.elevated} />
            {done > 0 ? (
              <Rect x={labelW} y={y + 8} width={Math.max(4, done)} height={9} rx={4.5} fill={theme.accent} />
            ) : null}
            <SvgText x={width} y={y + rowH / 2 + 4} fill={theme.textFaint} fontSize={10.5} textAnchor="end">
              {item.completed}/{item.total}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ── Session accuracy ───────────────────────────────────────────────────────

/** Per-item outcome strip for a finished session. A glanceable run of results. */
export function ResultStrip({ scores, width }: { scores: number[]; width: number }) {
  const theme = useTheme();
  const gap = 4;
  const w = Math.max(8, (width - gap * (scores.length - 1)) / Math.max(scores.length, 1));

  return (
    <Svg width={width} height={22}>
      {scores.map((score, i) => (
        <Rect
          key={i}
          x={i * (w + gap)}
          y={0}
          width={w}
          height={22}
          rx={5}
          fill={score >= 1 ? theme.positive : score > 0 ? theme.warning : theme.negative}
          opacity={score >= 1 ? 1 : 0.85}
        />
      ))}
    </Svg>
  );
}

export { radius };
