/**
 * Olive Scan design tokens.
 *
 * The look is borrowed from the "holistic scanner" category (Olive, Yuka, Fig):
 * warm off-white paper, deep olive greens, generous rounding, one accent colour
 * per verdict tier so a score is legible in a half-second glance.
 */

export const colors = {
  // Surfaces
  bg: '#FBF8F1',
  bgAlt: '#F4F0E6',
  surface: '#FFFFFF',
  surfaceSunken: '#F7F4EC',
  overlay: 'rgba(23, 31, 22, 0.55)',

  // Brand
  olive: '#2F5233',
  oliveDeep: '#1E3521',
  oliveMid: '#4C7A48',
  oliveSoft: '#DCE7D5',
  oliveTint: '#EEF3EA',
  lime: '#A9C46C',

  // Text
  text: '#1A2318',
  textMuted: '#6B7566',
  textFaint: '#9AA394',
  onDark: '#F6F5EE',
  onDarkMuted: 'rgba(246, 245, 238, 0.7)',

  // Lines
  border: '#E7E1D3',
  borderStrong: '#D6CEBB',

  // Verdict tiers
  excellent: '#2E8B57',
  good: '#7BAE4A',
  moderate: '#E8A33D',
  poor: '#E4703A',
  avoid: '#CF4A45',

  // Verdict tints (backgrounds)
  excellentTint: '#E4F2EA',
  goodTint: '#EFF5E4',
  moderateTint: '#FBF0DF',
  poorTint: '#FBEBE2',
  avoidTint: '#FAE7E6',

  // Utility
  info: '#3C6E9F',
  infoTint: '#E5EDF5',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
  xxxl: 48,
} as const;

export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const, letterSpacing: -0.8 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  h1: { fontSize: 21, lineHeight: 27, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 17, lineHeight: 23, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '700' as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: '700' as const, letterSpacing: 0.6 },
} as const;

/** RN 0.86 no longer types `StyleSheet.absoluteFillObject`; this is the spreadable equivalent. */
export const absoluteFill = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

export const shadow = {
  card: {
    shadowColor: '#2A2417',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  lifted: {
    shadowColor: '#2A2417',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;

export type VerdictTier = 'excellent' | 'good' | 'moderate' | 'poor' | 'avoid';

export const tierMeta: Record<
  VerdictTier,
  { label: string; color: string; tint: string; blurb: string }
> = {
  excellent: {
    label: 'Excellent',
    color: colors.excellent,
    tint: colors.excellentTint,
    blurb: 'Clean ingredients. Enjoy freely.',
  },
  good: {
    label: 'Good',
    color: colors.good,
    tint: colors.goodTint,
    blurb: 'Solid choice with minor trade-offs.',
  },
  moderate: {
    label: 'Moderate',
    color: colors.moderate,
    tint: colors.moderateTint,
    blurb: 'Fine occasionally — check the flags.',
  },
  poor: {
    label: 'Poor',
    color: colors.poor,
    tint: colors.poorTint,
    blurb: 'Several concerns. Consider a swap.',
  },
  avoid: {
    label: 'Avoid',
    color: colors.avoid,
    tint: colors.avoidTint,
    blurb: 'Heavily processed or high-risk ingredients.',
  },
};

export function tierForScore(score: number): VerdictTier {
  if (score >= 80) return 'excellent';
  if (score >= 62) return 'good';
  if (score >= 44) return 'moderate';
  if (score >= 26) return 'poor';
  return 'avoid';
}
