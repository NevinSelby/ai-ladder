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
/**
 * Light: warm paper, ink, and three electric accents.
 *
 * The accents are loud on purpose. Hot pink leads, canary carries reward, cyan
 * carries the second half of every gradient. They are used as flat fills and
 * gradient stops behind content, never as body text, so the loudness lands on
 * shapes rather than on anything anyone has to read.
 */
/**
 * Near-monochrome.
 *
 * The previous palette put hot pink, canary and cyan on screen at once and it
 * was loud and cheap. Restraint is what actually reads as modern: a greyscale
 * ramp does the structural work, and exactly one accent exists so that when
 * something is coloured it means something.
 *
 * Hierarchy comes from weight, size and space, never from hue.
 */
/**
 * Slate neutrals with a single blue accent.
 *
 * Pure grey was correct to reach for after the pink, but it was inert. A
 * slightly cool slate ramp reads as considered rather than absent, and one
 * blue carries every primary action so colour still means something when it
 * appears. Hierarchy stays carried by weight, size and space.
 */
const light = {
  scheme: 'light' as 'light' | 'dark',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  elevated: '#F1F5F9',
  elevatedActive: '#E2E8F0',
  border: '#E6EBF0',
  borderStrong: '#CBD5E1',
  text: '#0F172A',
  textMuted: '#55637A',
  textFaint: '#8A97AB',
  accent: '#2563EB',
  accentText: '#FFFFFF',
  accentSoft: '#EAF0FE',
  accentAlt: '#0D9488',
  accentWarm: '#B45309',
  positive: '#15803D',
  positiveSoft: '#EAF5EE',
  negative: '#B42318',
  negativeSoft: '#FDEEEC',
  warning: '#B45309',
  warningSoft: '#FBF3E7',
  flameDeep: '#C2410C',
  flameMid: '#EA580C',
  flameCore: '#F59E0B',
  scrim: 'rgba(15,23,42,0.42)',
  shadow: 'rgba(15,23,42,0.06)',
  shadowStrong: 'rgba(15,23,42,0.12)',
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
/**
 * Dark: deep slate rather than black, with the accents lifted.
 *
 * Hot pink at its light-mode value vibrates badly on a dark field, so it moves
 * up in lightness and down in saturation. Surfaces step tonally so elevation
 * survives without borders doing all the work.
 */
/** Dark: the same restraint, inverted through tonal steps rather than flipped. */
/** Dark: the same slate, stepped tonally, with the accent lifted for contrast. */
const dark: Palette = {
  scheme: 'dark',
  bg: '#0B1120',
  surface: '#121A2A',
  elevated: '#1A2436',
  elevatedActive: '#243044',
  border: '#1F2937',
  borderStrong: '#374253',
  text: '#E8EDF5',
  textMuted: '#9AA8BE',
  textFaint: '#6B7A91',
  accent: '#6098FF',
  accentText: '#0B1120',
  accentSoft: '#152340',
  accentAlt: '#2DD4BF',
  accentWarm: '#D97706',
  positive: '#4ADE80',
  positiveSoft: '#0F2018',
  negative: '#F87171',
  negativeSoft: '#241417',
  warning: '#FBBF24',
  warningSoft: '#241D10',
  flameDeep: '#EA580C',
  flameMid: '#F97316',
  flameCore: '#FBBF24',
  scrim: 'rgba(0,0,0,0.66)',
  shadow: 'rgba(0,0,0,0.40)',
  shadowStrong: 'rgba(0,0,0,0.58)',
};

export const PALETTES = { light, dark };
export type SchemeName = keyof typeof PALETTES;

export function meterColor(key: MeterKey, scheme: SchemeName): string {
  return METER_COLORS[key][scheme];
}

/** 4pt base scale, named by intent rather than arithmetic. */
export const space = {
  /** Between top-level sections of a screen. */
  section: 40,
  /** Between blocks inside a section. */
  block: 24,
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
/**
 * Editorial pairing: a display serif against a geometric sans.
 *
 * Instrument Serif carries headlines. It has real contrast between thick and
 * thin strokes, which is what makes a page look set rather than rendered, and
 * its italic is the voice of the whole design. Plus Jakarta Sans does the
 * functional work: geometric, even, quiet enough to disappear under the serif.
 * JetBrains Mono stays for anything that is a number or a machine label.
 *
 * The previous single-family setup read as competent and anonymous. High
 * typographic contrast is the cheapest way to look designed.
 */
/**
 * Two faces, used uniformly.
 *
 * The display serif is gone. Mixing a high-contrast serif into a dense
 * interface meant headings and body belonged to different worlds, and the
 * seam showed on every screen. One sans across the whole product with real
 * weight steps carries hierarchy perfectly well, and mono is reserved for
 * anything that is a figure, a label or machine output.
 */
export const fonts = {
  sans: 'PlusJakartaSans_400Regular',
  sansMedium: 'PlusJakartaSans_500Medium',
  sansSemi: 'PlusJakartaSans_600SemiBold',
  sansBold: 'PlusJakartaSans_700Bold',
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
/**
 * The scale.
 *
 * Display sizes run very large and very tight, because a serif with this much
 * stroke contrast only shows its character above about 30px. Body sizes stay
 * modest so the gap between the two is dramatic: that gap is the design.
 * Serif line-heights sit below 1.0 at the top end, which is normal for
 * display setting and wrong for anything you actually read.
 */
/**
 * The scale.
 *
 * Steps are proportional rather than dramatic. The previous scale jumped from a
 * 52px serif straight to 16px body, which is a cliff, not a hierarchy: it made
 * headlines collide with themselves at phone width and left everything below
 * them looking cramped by comparison.
 *
 * The serif is reserved for hero and display. From `title` down everything is
 * the sans, because a high-contrast serif at 17px in a dense list reads as
 * fussy rather than considered.
 */
export const type = {
  hero: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
    fontFamily: fonts.sansBold,
  },
  heroItalic: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '400' as const,
    letterSpacing: -0.4,
    fontFamily: fonts.sansSemi,
  },
  display: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    fontFamily: fonts.sansBold,
  },
  /** From here down, the sans. */
  title: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    fontFamily: fonts.sansSemi,
  },
  heading: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.15,
    fontFamily: fonts.sansSemi,
  },
  question: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '500' as const,
    letterSpacing: -0.1,
    fontFamily: fonts.sansMedium,
  },
  body: { fontSize: 15.5, lineHeight: 25, fontWeight: '400' as const, fontFamily: fonts.sans },
  bodyStrong: {
    fontSize: 15.5,
    lineHeight: 25,
    fontWeight: '600' as const,
    fontFamily: fonts.sansSemi,
  },
  small: { fontSize: 14, lineHeight: 22, fontWeight: '400' as const, fontFamily: fonts.sans },
  smallStrong: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600' as const,
    fontFamily: fonts.sansSemi,
  },
  caption: { fontSize: 12.5, lineHeight: 18, fontWeight: '400' as const, fontFamily: fonts.sans },
  eyebrow: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '500' as const,
    letterSpacing: 1.4,
    fontFamily: fonts.mono,
  },
  numeric: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
    fontFamily: fonts.monoBold,
  },
  numericSm: {
    fontSize: 13.5,
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
