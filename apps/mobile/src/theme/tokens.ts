export interface Palette {
  bgPrimary: string;
  bgSecondary: string;
  bgHover: string;
  bgElevated: string;
  bgCard: string;
  bgBackdrop: string;
  bgPill: string;
  bgGlass: string;
  bgGlassBorder: string;
  bgSelection: string;

  textPrimary: string;
  textHeading: string;
  textSecondary: string;
  textBody: string;
  textMuted: string;
  textFaint: string;

  accentGold: string;
  accentAmber: string;
  accentSage: string;
  accentDark: string;
  accentDarkHover: string;

  borderLight: string;
  borderCard: string;

  iconDefault: string;

  danger: string;
  dangerBg: string;
  success: string;
  successBg: string;

  loaderColor: string;

  // Contrast text (dark text on gold/amber surfaces)
  textOnAccent: string;

  // Story status colors (warm literary palette)
  statusOngoing: string;
  statusOngoingBg: string;
  statusCompleted: string;
  statusCompletedBg: string;
  statusHiatus: string;
  statusHiatusBg: string;

  // Analytics stat colors (muted warm tones)
  statReactions: string;
  statComments: string;
  statEngagement: string;

  // Badge colors
  badgeLegendBorder: string;
  badgeLegendGlow: string;
  badgeOGBorder: string;
  badgeOGGlow: string;
}

export const lightPalette: Palette = {
  bgPrimary: '#FAF9F6',
  bgSecondary: '#F3F1ED',
  bgHover: '#EDEAE5',
  bgElevated: '#FFFFFF',
  bgCard: '#FEFEFE',
  bgBackdrop: 'rgba(250,249,246,0.75)',
  bgPill: 'rgba(120,100,80,0.06)',
  bgGlass: 'rgba(255,255,255,0.55)',
  bgGlassBorder: 'rgba(200,180,150,0.2)',
  bgSelection: 'rgba(212,168,83,0.08)',

  textPrimary: '#1A1612',
  textHeading: '#12100D',
  textSecondary: '#6B6560',
  textBody: '#8A8480',
  textMuted: '#A8A29E',
  textFaint: '#C0BBB5',

  accentGold: '#C4943E',
  accentAmber: '#D4A853',
  accentSage: '#8A9E7A',
  accentDark: '#1A1612',
  accentDarkHover: '#3A3530',

  borderLight: 'rgba(120,100,80,0.12)',
  borderCard: 'rgba(120,100,80,0.08)',

  iconDefault: '#8A8480',

  danger: '#DC2626',
  dangerBg: 'rgba(220,38,38,0.08)',
  success: '#16A34A',
  successBg: 'rgba(22,163,74,0.08)',

  loaderColor: '#C4943E',

  textOnAccent: '#1A1612',

  statusOngoing: '#7A9E6A',
  statusOngoingBg: 'rgba(122,158,106,0.10)',
  statusCompleted: '#B8943E',
  statusCompletedBg: 'rgba(184,148,62,0.10)',
  statusHiatus: '#B87A4A',
  statusHiatusBg: 'rgba(184,122,74,0.10)',

  statReactions: '#C47A6A',
  statComments: '#7A8A9E',
  statEngagement: '#A08060',

  badgeLegendBorder: '#FFD700',
  badgeLegendGlow: 'rgba(255,215,0,0.3)',
  badgeOGBorder: '#9B59FF',
  badgeOGGlow: 'rgba(155,89,255,0.3)',
};

export const darkPalette: Palette = {
  bgPrimary: '#0C0C0C',
  bgSecondary: '#141414',
  bgHover: '#1E1E1C',
  bgElevated: '#1A1A18',
  bgCard: '#161614',
  bgBackdrop: 'rgba(12,12,12,0.8)',
  bgPill: 'rgba(255,240,210,0.06)',
  bgGlass: 'rgba(255,255,255,0.05)',
  bgGlassBorder: 'rgba(255,240,210,0.08)',
  bgSelection: 'rgba(212,168,83,0.15)',

  textPrimary: '#F0EBE3',
  textHeading: '#F5F0E8',
  textSecondary: '#B0A89E',
  textBody: '#908880',
  textMuted: '#6B6560',
  textFaint: '#504A45',

  accentGold: '#D4A853',
  accentAmber: '#E0BA6A',
  accentSage: '#9AB08A',
  accentDark: '#F0EBE3',
  accentDarkHover: '#C8C0B5',

  borderLight: 'rgba(255,240,210,0.06)',
  borderCard: 'rgba(255,240,210,0.04)',

  iconDefault: '#908880',

  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.12)',
  success: '#22C55E',
  successBg: 'rgba(34,197,94,0.12)',

  loaderColor: '#D4A853',

  textOnAccent: '#1A1612',

  statusOngoing: '#8AB07A',
  statusOngoingBg: 'rgba(138,176,122,0.12)',
  statusCompleted: '#C8A44E',
  statusCompletedBg: 'rgba(200,164,78,0.12)',
  statusHiatus: '#C88A5A',
  statusHiatusBg: 'rgba(200,138,90,0.12)',

  statReactions: '#D48A7A',
  statComments: '#8A9AB0',
  statEngagement: '#B09070',

  badgeLegendBorder: '#FFD700',
  badgeLegendGlow: 'rgba(255,215,0,0.4)',
  badgeOGBorder: '#9B59FF',
  badgeOGGlow: 'rgba(155,89,255,0.4)',
};
