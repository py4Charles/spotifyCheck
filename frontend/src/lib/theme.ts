export const colors = {
  background: '#090D0A',
  surface: '#111713',
  surfaceElevated: '#172019',
  surfaceMuted: '#1D2820',
  border: '#253229',
  borderStrong: '#34483A',
  text: '#F3F7F3',
  textMuted: '#93A197',
  textFaint: '#67766B',
  primary: '#1DB954',
  primaryPressed: '#169B45',
  primarySoft: '#12351F',
  danger: '#FF6B6B',
  dangerSoft: '#351719',
  warning: '#F5B942',
  warningSoft: '#352B13',
  success: '#1DB954',
  successSoft: '#12351F',
  black: '#000000',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.72)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const typography = {
  hero: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  tiny: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
};
