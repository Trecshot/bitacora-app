import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeMode } from '../theme/theme';

interface ThemeSelectorPillProps {
  compact?: boolean;
}

const MODES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'dark', label: 'Oscuro', icon: Moon },
  { id: 'light', label: 'Claro', icon: Sun },
];

export const ThemeSelectorPill: React.FC<ThemeSelectorPillProps> = ({ compact = false }) => {
  const { themeMode, theme, setThemeMode, toggleTheme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceElevated,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: theme.metrics.radii.full,
        padding: 2,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {MODES.map((mode) => {
        const isSelected = themeMode === mode.id;
        const IconComponent = mode.icon;

        return (
          <TouchableOpacity
            key={mode.id}
            activeOpacity={0.7}
            onPress={() => (isSelected ? toggleTheme() : setThemeMode(mode.id))}
            style={{
              backgroundColor: isSelected ? theme.colors.surface : 'transparent',
              borderColor: isSelected ? theme.colors.border : 'transparent',
              borderWidth: isSelected ? 1 : 0,
              paddingVertical: compact ? 3 : 4,
              paddingHorizontal: compact ? 6 : 9,
              borderRadius: theme.metrics.radii.full,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconComponent
              size={compact ? 12 : 13}
              color={isSelected ? theme.colors.accent : theme.colors.textMuted}
            />
            {!compact && (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? theme.colors.text : theme.colors.textMuted,
                  marginLeft: 4,
                }}
              >
                {mode.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
