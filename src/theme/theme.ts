import { Platform, ViewStyle, TextStyle } from 'react-native';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentText: string;
  accentSubtle: string;
  success: string;
  successSubtle: string;
  warning: string;
  warningSubtle: string;
  danger: string;
  dangerSubtle: string;
  kanbanColumnBg: string;
  inputBg: string;
  cardBg: string;
  badgeBg: string;
}

export interface ThemeMetrics {
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radii: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    full: number;
  };
  borderWidth: number;
}

export interface ThemeTypography {
  titleWeight: TextStyle['fontWeight'];
  bodyWeight: TextStyle['fontWeight'];
  boldWeight: TextStyle['fontWeight'];
  monoFont: string;
}

export interface AppTheme {
  id: ThemeMode;
  name: string;
  description: string;
  isDark: boolean;
  statusBarStyle: 'light' | 'dark';
  colors: ThemeColors;
  metrics: ThemeMetrics;
  typography: ThemeTypography;
  cardStyle: ViewStyle;
}

// -----------------------------------------------------------------------------
// 1. Modo Claro - Estilo y Paleta Original (Azul Real #2563EB, Blanco y Gris Suave)
// -----------------------------------------------------------------------------
export const lightTheme: AppTheme = {
  id: 'light',
  name: 'Claro',
  description: 'Paleta original con acento azul real #2563EB, fondo limpio y tarjetas blancas.',
  isDark: false,
  statusBarStyle: 'dark',
  colors: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    surfaceSubtle: '#F8FAFC',
    border: '#E2E8F0',
    borderSubtle: '#F1F5F9',
    text: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    accent: '#2563EB',     // Azul real original como en las capturas
    accentText: '#FFFFFF',
    accentSubtle: '#EFF6FF',
    success: '#10B981',
    successSubtle: '#ECFDF5',
    warning: '#F59E0B',
    warningSubtle: '#FFFBEB',
    danger: '#EF4444',
    dangerSubtle: '#FEF2F2',
    kanbanColumnBg: '#F1F5F9',
    inputBg: '#FFFFFF',
    cardBg: '#FFFFFF',
    badgeBg: '#EFF6FF',
  },
  metrics: {
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
    radii: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 9999 },
    borderWidth: 1,
  },
  typography: {
    titleWeight: '700',
    bodyWeight: '400',
    boldWeight: '700',
    monoFont: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cardStyle: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#64748B',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
};

// -----------------------------------------------------------------------------
// 2. Modo Oscuro AMOLED (Optimización OLED)
// Fondo #000000, superficies #121212 / #1A1A1A, texto #E0E0E0, acento #3B82F6
// -----------------------------------------------------------------------------
export const darkTheme: AppTheme = {
  id: 'dark',
  name: 'Oscuro AMOLED',
  description: 'Fondo negro absoluto #000000 para ahorro OLED y acento azul #3B82F6.',
  isDark: true,
  statusBarStyle: 'light',
  colors: {
    background: '#000000',
    surface: '#121212',
    surfaceElevated: '#1A1A1A',
    surfaceSubtle: '#1E1E1E',
    border: '#262626',
    borderSubtle: '#1A1A1A',
    text: '#E0E0E0',
    textSecondary: '#A0A0A0',
    textMuted: '#757575',
    accent: '#3B82F6',
    accentText: '#FFFFFF',
    accentSubtle: 'rgba(59, 130, 246, 0.15)',
    success: '#10B981',
    successSubtle: 'rgba(16, 185, 129, 0.15)',
    warning: '#F59E0B',
    warningSubtle: 'rgba(245, 158, 11, 0.15)',
    danger: '#EF4444',
    dangerSubtle: 'rgba(239, 68, 68, 0.15)',
    kanbanColumnBg: '#0D0D0D',
    inputBg: '#121212',
    cardBg: '#121212',
    badgeBg: '#1A1A1A',
  },
  metrics: {
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
    radii: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 9999 },
    borderWidth: 1,
  },
  typography: {
    titleWeight: '700',
    bodyWeight: '400',
    boldWeight: '700',
    monoFont: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cardStyle: {
    backgroundColor: '#121212',
    borderColor: '#262626',
    borderWidth: 1,
    borderRadius: 20,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
};

// Aliases para retrocompatibilidad
export const amoledTheme = darkTheme;
export const minimalistTheme = lightTheme;

export const THEMES: Record<ThemeMode, AppTheme> = {
  light: lightTheme,
  dark: darkTheme,
};
