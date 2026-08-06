/**
 * AI Ladder design tokens.
 *
 * Visual identity: study paper. Warm off-white ground, ink-blue accent, generous
 * line height, soft elevation instead of hard borders. The brief is long study
 * sessions, so the priorities are in this order:
 *
 *   1. Low glare, never pure white on pure black. The background is warm
 *      (#FBFAF6) and the text is near-ink (#22262B) rather than #000; maximum
 *      contrast is what makes an hour of reading tiring.
 *   2. Calm accents, one desaturated ink blue carries every interactive
 *      affordance. Saturated brand colors fatigue quickly at this reading load.
 *   3. Quiet hierarchy, weight and spacing separate things, not boxes and rules.
 *
 * Light is the default and the design target. The dark palette exists for night
 * reading and is deliberately soft rather than the usual harsh charcoal.
 *
 * Contrast is held above WCAG AA (4.5:1) for body text and 3:1 for large text
 * and meaningful non-text marks, in both schemes.
 */

import { Platform } from 'react-native';

/** The five craft meters, in canonical display order. */
export const METER_KEYS = ['depth', 'platform', 'aiCraft', 'client', 'scope'] as const;
export type MeterKey = (typeof METER_KEYS)[number];

export const METER_META: Record<
  MeterKey,
  { label: string; short: string; blurb: string }
> = {
  depth: {
    label: 'Depth',
    short: 'DEP',
    blurb: 'Practical coding, data wrangling, integration and client engineering.',
  },
  platform: {
    label: 'Platform',
    short: 'PLT',
    blurb: 'Cloud architecture, identity, perimeters, scaling and compliance controls.',
  },
  aiCraft: {
    label: 'AI Craft',
    short: 'AIC',
    blurb: 'RAG, agents, evals, guardrails, latency and token economics.',
  },
  client: {
    label: 'Client',
    short: 'CLI',
    blurb: 'Discovery, executive comms, bad news, saying no well.',
  },
  scope: {
    label: 'Scope',
    short: 'SCP',
    blurb: 'Decomposition, risk sequencing, napkin math, TCO, productionizing.',
  },
};

/**
 * Meter hues.
 *
 * Spread across the wheel rather than five tints of one color, so they stay
 * distinguishable under the common color-vision deficiencies. The light values
 * are darkened well past their dark-mode counterparts. A hue that reads
 * comfortably on charcoal is illegible on paper.
 */
export const METER_COLORS: Record<MeterKey, { dark: string; light: string }> = {
  depth: { dark: '#B8842C', light: '#9A6A00' },
  platform: { dark: '#5F92D4', light: '#1F63C7' },
  aiCraft: { dark: '#D563A8', light: '#A8318F' },
  client: { dark: '#2E9E74', light: '#1C9159' },
  scope: { dark: '#CE7250', light: '#8E3A12' },
};

/**
 * Sequential ramp for magnitude: one hue, light to dark.
 *
 * Used by the streak calendar, where the question is "how much", not "which".
 * Never a rainbow: a multi-hue scale implies categories that do not exist.
 */
export const SEQUENTIAL = {
  light: ['#EDEAE1', '#CBD9EA', '#9CBADD', '#5C8FCB', '#1F63C7'],
  dark: ['#262A31', '#2C3F58', '#375880', '#4576AC', '#5F92D4'],
} as const;

export function sequentialStep(fraction: number, scheme: SchemeName): string {
  const ramp = SEQUENTIAL[scheme];
  if (fraction <= 0) return ramp[0];
  const index = Math.min(ramp.length - 1, Math.ceil(fraction * (ramp.length - 1)));
  return ramp[index];
}

const light = {
  scheme: 'light' as string,
  /** Warm paper. Pure white at this reading load is glare. */
  bg: '#FBFAF6',
  /** Cards lifted off the page. */
  surface: '#FFFFFF',
  /** Rows and inputs sitting on a card. */
  elevated: '#F4F3EE',
  elevatedActive: '#EAE9E2',
  /** Hairlines only: structure comes from elevation, not from boxes. */
  border: '#E6E4DB',
  borderStrong: '#D2CFC3',
  /** Near-ink, not black. */
  text: '#22262B',
  textMuted: '#5D646C',
  textFaint: '#8C939B',
  /** Ink blue. Desaturated on purpose. This is on screen for hours. */
  accent: '#2F5E8F',
  accentText: '#FFFFFF',
  accentSoft: '#E8EFF7',
  positive: '#1B7355',
  positiveSoft: '#E4F2EC',
  negative: '#A83232',
  negativeSoft: '#FAEAE8',
  warning: '#8A6212',
  warningSoft: '#F8F0DF',
  /** Flame gradient: deep base, hot mid, white-hot core. Fire only. */
  flameDeep: '#D2361B',
  flameMid: '#F58A1F',
  flameCore: '#FFC93F',
  scrim: 'rgba(34,38,43,0.32)',
  /** Soft elevation. Warm-tinted so shadows do not read grey on paper. */
  shadow: 'rgba(58,52,38,0.10)',
  shadowStrong: 'rgba(58,52,38,0.16)',
};

export type Palette = typeof light;

/** Night reading. Soft slate rather than the usual near-black. */
const dark: Palette = {
  scheme: 'dark',
  bg: '#16181C',
  surface: '#1D2025',
  elevated: '#252930',
  elevatedActive: '#2E333B',
  border: '#31363E',
  borderStrong: '#434A54',
  text: '#E6E8EB',
  textMuted: '#A0A8B2',
  textFaint: '#767E88',
  accent: '#7BAAE8',
  accentText: '#12151A',
  accentSoft: '#1F2A38',
  positive: '#5FCBAA',
  positiveSoft: '#182A26',
  negative: '#EE8A82',
  negativeSoft: '#2E1F1F',
  warning: '#E0A93C',
  warningSoft: '#2B2416',
  flameDeep: '#E04A22',
  flameMid: '#FF9A2E',
  flameCore: '#FFD457',
  scrim: 'rgba(0,0,0,0.55)',
  shadow: 'rgba(0,0,0,0.28)',
  shadowStrong: 'rgba(0,0,0,0.42)',
};

export const PALETTES = { light, dark };
export type SchemeName = keyof typeof PALETTES;

export function meterColor(key: MeterKey, scheme: SchemeName): string {
  return METER_COLORS[key][scheme];
}

/** 4pt base scale, named by intent rather than arithmetic. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/**
 * Elevation presets. Cross-platform: iOS reads the shadow* fields, Android reads
 * elevation, and web takes the shadow.
 */
export const elevation = (palette: Palette, level: 0 | 1 | 2 = 1) => {
  if (level === 0) return {};
  const strong = level === 2;
  return Platform.select({
    android: { elevation: strong ? 6 : 2 },
    default: {
      shadowColor: strong ? palette.shadowStrong : palette.shadow,
      shadowOpacity: 1,
      shadowRadius: strong ? 20 : 10,
      shadowOffset: { width: 0, height: strong ? 6 : 2 },
    },
  });
};

export const fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  android: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-display)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
})!;

/**
 * Type scale.
 *
 * Body sits at 16.5/27. That line height is well above the usual 1.4 because the
 * reading unit here is a dense four-line question stem, and tight leading is the
 * single biggest contributor to fatigue over a long session.
 *
 * Mono variants are reserved for numbers, meter labels and status chips, 
 * never for prose.
 */
export const type = {
  display: { fontSize: 30, lineHeight: 38, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 23, lineHeight: 31, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 19, lineHeight: 28, fontWeight: '600' as const, letterSpacing: -0.15 },
  /** Question stems. Slightly larger and looser than body. */
  question: { fontSize: 18.5, lineHeight: 29, fontWeight: '500' as const, letterSpacing: -0.1 },
  body: { fontSize: 16.5, lineHeight: 27, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16.5, lineHeight: 27, fontWeight: '600' as const },
  small: { fontSize: 15, lineHeight: 24, fontWeight: '400' as const },
  smallStrong: { fontSize: 15, lineHeight: 24, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 19, fontWeight: '500' as const },
  eyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    fontFamily: fonts.mono,
  },
  numeric: { fontSize: 27, lineHeight: 32, fontWeight: '700' as const, fontFamily: fonts.mono },
  numericSm: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const, fontFamily: fonts.mono },
} as const;

/** Motion. Short and eased, animation should be felt, not watched. */
export const motion = {
  fast: 140,
  base: 220,
  slow: 340,
  /** Standard easing pair for entrances and exits. */
  spring: { damping: 18, stiffness: 180, mass: 0.9 },
} as const;

export const MAX_CONTENT_WIDTH = 680;
