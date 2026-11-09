import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface FloatingActionButtonProps {
  onPress: () => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onPress }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        position: 'absolute',
        bottom: 24,
        right: 20,
        zIndex: 50,
        width: 56,
        height: 56,
        borderRadius: theme.metrics.radii.full,
        backgroundColor: theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.colors.accent,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
      }}
    >
      <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
    </TouchableOpacity>
  );
};
