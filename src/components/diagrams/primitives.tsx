import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Marker,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import { Text } from '@/components/ui';
import { fonts, radius, space, useTheme, type Palette } from '@/theme';

/**
 * Diagram primitives.
 *
 * Every diagram is inline SVG built from these, no image assets, no network,
 * and colors pulled from the live palette so a diagram never fights the page it
 * sits on. Diagrams are drawn on a fixed viewBox and scaled to fit, so they stay
 * legible from a phone to a tablet.
 */

export interface DiagramProps {
  width: number;
}

export const VB = { w: 340, h: 200 };

/** Frame: title, caption and a scaled SVG canvas. */
export function DiagramFrame({
  width,
  height = VB.h,
  viewBox = `0 0 ${VB.w} ${VB.h}`,
  caption,
  children,
}: {
  width: number;
  height?: number;
  viewBox?: string;
  caption?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const scale = width / VB.w;

  return (
    <View style={{ gap: space.sm }}>
      <View
        style={{
          backgroundColor: theme.elevated,
          borderRadius: radius.md,
          padding: space.md,
          alignItems: 'center',
        }}>
        <Svg width={width - space.md * 2} height={(height - 0) * scale} viewBox={viewBox}>
          <Defs>
            <Marker
              id="arrow"
              markerWidth={7}
              markerHeight={7}
              refX={6}
              refY={3}
              orient="auto"
              markerUnits="strokeWidth">
              <Polygon points="0,0 7,3 0,6" fill={theme.textMuted} />
            </Marker>
            <Marker
              id="arrowAccent"
              markerWidth={7}
              markerHeight={7}
              refX={6}
              refY={3}
              orient="auto"
              markerUnits="strokeWidth">
              <Polygon points="0,0 7,3 0,6" fill={theme.accent} />
            </Marker>
            <Marker
              id="arrowBad"
              markerWidth={7}
              markerHeight={7}
              refX={6}
              refY={3}
              orient="auto"
              markerUnits="strokeWidth">
              <Polygon points="0,0 7,3 0,6" fill={theme.negative} />
            </Marker>
          </Defs>
          {children}
        </Svg>
      </View>
      {caption ? (
        <Text variant="caption" tone="textFaint">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

/** A labeled box. `tone` tints it without adding another color to the page. */
export function Node({
  x,
  y,
  w = 78,
  h = 34,
  label,
  sub,
  tone = 'neutral',
  theme,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  sub?: string;
  tone?: 'neutral' | 'accent' | 'good' | 'bad' | 'warn';
  theme: Palette;
}) {
  const stroke =
    tone === 'accent'
      ? theme.accent
      : tone === 'good'
        ? theme.positive
        : tone === 'bad'
          ? theme.negative
          : tone === 'warn'
            ? theme.warning
            : theme.borderStrong;
  const fill =
    tone === 'accent'
      ? theme.accentSoft
      : tone === 'good'
        ? theme.positiveSoft
        : tone === 'bad'
          ? theme.negativeSoft
          : tone === 'warn'
            ? theme.warningSoft
            : theme.surface;

  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} rx={7} fill={fill} stroke={stroke} strokeWidth={1.2} />
      <SvgText
        fontFamily={fonts.sansSemi}
        x={x + w / 2}
        y={sub ? y + h / 2 - 1 : y + h / 2 + 3.5}
        fill={theme.text}
        fontSize={9.5}
        fontWeight="600"
        textAnchor="middle">
        {label}
      </SvgText>
      {sub ? (
        <SvgText
          fontFamily={fonts.sans}
          x={x + w / 2}
          y={y + h / 2 + 10}
          fill={theme.textMuted}
          fontSize={7.5}
          textAnchor="middle">
          {sub}
        </SvgText>
      ) : null}
    </G>
  );
}

/** A directed edge with an optional label sitting on it. */
export function Edge({
  from,
  to,
  label,
  tone = 'neutral',
  dashed,
  theme,
  labelDy = -4,
}: {
  from: [number, number];
  to: [number, number];
  label?: string;
  tone?: 'neutral' | 'accent' | 'good' | 'bad';
  dashed?: boolean;
  theme: Palette;
  labelDy?: number;
}) {
  const stroke =
    tone === 'accent'
      ? theme.accent
      : tone === 'good'
        ? theme.positive
        : tone === 'bad'
          ? theme.negative
          : theme.textMuted;
  // No dedicated green marker: `good` edges reuse the accent arrowhead, which
  // reads correctly at this size and keeps the marker defs short.
  const marker =
    tone === 'accent' || tone === 'good'
      ? 'url(#arrowAccent)'
      : tone === 'bad'
        ? 'url(#arrowBad)'
        : 'url(#arrow)';

  return (
    <G>
      <Line
        x1={from[0]}
        y1={from[1]}
        x2={to[0]}
        y2={to[1]}
        stroke={stroke}
        strokeWidth={1.3}
        strokeDasharray={dashed ? '4 3' : undefined}
        markerEnd={marker}
      />
      {label ? (
        <SvgText
          fontFamily={fonts.sans}
          x={(from[0] + to[0]) / 2}
          y={(from[1] + to[1]) / 2 + labelDy}
          fill={stroke}
          fontSize={7.5}
          fontWeight="600"
          textAnchor="middle">
          {label}
        </SvgText>
      ) : null}
    </G>
  );
}

/** A dashed boundary: a perimeter, a VPC, a trust zone. */
export function Boundary({
  x,
  y,
  w,
  h,
  label,
  tone = 'neutral',
  theme,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tone?: 'neutral' | 'accent' | 'good' | 'bad';
  theme: Palette;
}) {
  const stroke =
    tone === 'accent'
      ? theme.accent
      : tone === 'good'
        ? theme.positive
        : tone === 'bad'
          ? theme.negative
          : theme.borderStrong;

  return (
    <G>
      <Rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={9}
        fill="none"
        stroke={stroke}
        strokeWidth={1.2}
        strokeDasharray="5 4"
      />
      <SvgText x={x + 8} y={y + 12} fill={stroke} fontSize={8} fontWeight="700" letterSpacing={0.4} fontFamily={fonts.mono}>
        {label.toUpperCase()}
      </SvgText>
    </G>
  );
}

export function Caption({
  x,
  y,
  text,
  theme,
  anchor = 'start',
  tone = 'muted',
}: {
  x: number;
  y: number;
  text: string;
  theme: Palette;
  anchor?: 'start' | 'middle' | 'end';
  tone?: 'muted' | 'faint' | 'bad' | 'good';
}) {
  const fill =
    tone === 'bad'
      ? theme.negative
      : tone === 'good'
        ? theme.positive
        : tone === 'faint'
          ? theme.textFaint
          : theme.textMuted;
  return (
    <SvgText x={x} y={y} fill={fill} fontSize={8} textAnchor={anchor} fontFamily={fonts.sans}>
      {text}
    </SvgText>
  );
}

/** A blocked crossing: the X that shows a path is denied. */
export function Blocked({ x, y, theme }: { x: number; y: number; theme: Palette }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={7.5} fill={theme.negativeSoft} stroke={theme.negative} strokeWidth={1.2} />
      <Path
        d={`M${x - 3.2},${y - 3.2} L${x + 3.2},${y + 3.2} M${x + 3.2},${y - 3.2} L${x - 3.2},${y + 3.2}`}
        stroke={theme.negative}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </G>
  );
}

