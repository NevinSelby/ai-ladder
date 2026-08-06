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

/**
 * Light: warm paper, near-black ink, one electric accent.
 *
 * The old accent was a safe corporate blue, which is the colour a product
 * lands on when nobody chose. Electric violet is chosen: it collides with none
 * of the semantic colours (green means passed, red means failed, amber means
 * careful), it reads technical rather than playful, and it survives being
 * printed on both paper and ink backgrounds.
 */
const light = {
  scheme: 'light' as 'light' | 'dark',
  /** Warm off-white. Pure white is a screenshot, not a reading surface. */
  bg: '#F7F6F2',
  surface: '#FFFFFF',
  elevated: '#F1EFE9',
  elevatedActive: '#E7E4DC',
  border: '#E5E2D9',
  borderStrong: '#CFCBBF',
  /** Near-ink. Slightly warm so it sits on paper rather than floating. */
  text: '#16161A',
  textMuted: '#5A5A63',
  textFaint: '#8B8B95',
  accent: '#5B4BFF',
  accentText: '#FFFFFF',
  accentSoft: '#ECE9FF',
  /** The second half of every hero gradient. */
  accentAlt: '#00C2C7',
  positive: '#1C7A54',
  positiveSoft: '#E2F3EB',
  negative: '#B0242B',
  negativeSoft: '#FBE9E9',
  warning: '#8A5A0B',
  warningSoft: '#F9EFDC',
  flameDeep: '#D2361B',
  flameMid: '#F58A1F',
  flameCore: '#FFC93F',
  scrim: 'rgba(18,18,22,0.36)',
  shadow: 'rgba(38,34,28,0.10)',
  shadowStrong: 'rgba(38,34,28,0.18)',
};

export type Palette = typeof light;

/** Night reading. Soft slate rather than the usual near-black. */
/**
 * Dark: not an inversion.
 *
 * Surfaces are lifted with tonal steps rather than pure black, the accent is
 * raised in lightness so it keeps its contrast ratio, and the text tops out
 * below pure white because #FFF on near-black vibrates.
 */
const dark: Palette = {
  scheme: 'dark',
  bg: '#0B0C0F',
  surface: '#141519',
  elevated: '#1C1E24',
  elevatedActive: '#25272F',
  border: '#282A31',
  borderStrong: '#3A3D46',
  text: '#E9E9EE',
  textMuted: '#A0A1AC',
  textFaint: '#71737E',
  accent: '#8B7BFF',
  accentText: '#0B0C0F',
  accentSoft: '#1E1B36',
  accentAlt: '#3DDCDF',
  positive: '#4FC894',
  positiveSoft: '#12261F',
  negative: '#F08A84',
  negativeSoft: '#2A1718',
  warning: '#E3A94A',
  warningSoft: '#2A2113',
  flameDeep: '#E04A22',
  flameMid: '#FF9A2E',
  flameCore: '#FFD457',
  scrim: 'rgba(0,0,0,0.62)',
  shadow: 'rgba(0,0,0,0.35)',
  shadowStrong: 'rgba(0,0,0,0.5)',
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

/**
 * Three faces, each with a job.
 *
 * Space Grotesk carries every heading: geometric, slightly odd, and unmistakably
 * chosen rather than defaulted to. Inter does the reading work, because at
 * fifteen pixels on a phone nothing beats it. JetBrains Mono handles anything
 * that is a number, a label or a piece of machine output, which is most of the
 * chrome in a tool for engineers.
 *
 * System fonts were the tell that nobody had made a decision here.
 */
export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

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
/**
 * The scale.
 *
 * Editorial contrast: the display size is deliberately far from body size, so
 * a screen has an obvious loudest thing. Headings run tight (negative tracking,
 * leading below 1.1 at the top end) because Space Grotesk is built for it and
 * because tight display type is what separates designed from generated.
 */
export const type = {
  /** Screen titles. Big enough to be the only thing you read first. */
  hero: {
    fontSize: 44,
    lineHeight: 46,
    fontWeight: '700' as const,
    letterSpacing: -1.6,
    fontFamily: fonts.display,
  },
  display: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: -1,
    fontFamily: fonts.display,
  },
  title: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
    fontFamily: fonts.display,
  },
  heading: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '500' as const,
    letterSpacing: -0.3,
    fontFamily: fonts.displayMedium,
  },
  /** Question stems. Sized to be read once, carefully. */
  question: {
    fontSize: 19,
    lineHeight: 29,
    fontWeight: '400' as const,
    letterSpacing: -0.2,
    fontFamily: fonts.sansMedium,
  },
  body: { fontSize: 16, lineHeight: 26, fontWeight: '400' as const, fontFamily: fonts.sans },
  bodyStrong: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '600' as const,
    fontFamily: fonts.sansSemi,
  },
  small: { fontSize: 14.5, lineHeight: 23, fontWeight: '400' as const, fontFamily: fonts.sans },
  smallStrong: {
    fontSize: 14.5,
    lineHeight: 23,
    fontWeight: '600' as const,
    fontFamily: fonts.sansSemi,
  },
  caption: { fontSize: 12.5, lineHeight: 18, fontWeight: '400' as const, fontFamily: fonts.sans },
  /** Section labels. Mono, tracked wide, always uppercase. */
  eyebrow: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '500' as const,
    letterSpacing: 1.6,
    fontFamily: fonts.mono,
  },
  /** Figures. Tabular by nature, so columns and timers never jitter. */
  numeric: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: -1,
    fontFamily: fonts.monoBold,
  },
  numericSm: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
    fontFamily: fonts.mono,
  },
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
