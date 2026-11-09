import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { ThemeMode, AppTheme, THEMES, lightTheme } from './theme';
import { triggerHapticImpact } from '../utils/haptics';

interface ThemeContextValue {
  themeMode: ThemeMode;
  theme: AppTheme;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  cycleTheme: () => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'light',
  theme: lightTheme,
  isDark: false,
  setThemeMode: () => {},
  cycleTheme: () => {},
  toggleTheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  initialMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialMode = 'light',
}) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialMode);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    triggerHapticImpact();
    setThemeModeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    triggerHapticImpact();
    setThemeModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const cycleTheme = toggleTheme;

  const theme = useMemo(() => THEMES[themeMode] || lightTheme, [themeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      theme,
      isDark: theme.isDark,
      setThemeMode,
      cycleTheme,
      toggleTheme,
    }),
    [themeMode, theme, setThemeMode, toggleTheme, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider');
  }
  return context;
};
