import React from 'react';
import { View, Text } from 'react-native';
import {
  CheckCircle2,
  ArrowRightLeft,
  PlusCircle,
  Trash2,
  Edit3,
  RotateCcw,
} from 'lucide-react-native';
import { AuditLog } from '../db/types';
import { parseAuditLogEntry, ParsedAuditEntry } from '../utils/auditParser';
import { useTheme } from '../theme/ThemeContext';

interface AuditLogEntryCardProps {
  log: AuditLog;
  compact?: boolean;
}

const getBadgeStyle = (type: ParsedAuditEntry['badgeType'], iconSize: number) => {
  switch (type) {
    case 'CREATE':
      return {
        bg: 'bg-emerald-50 border-emerald-200',
        text: 'text-emerald-700',
        icon: <PlusCircle size={iconSize} color="#059669" />,
      };
    case 'RESTORE':
      return {
        bg: 'bg-teal-50 border-teal-200',
        text: 'text-teal-700',
        icon: <RotateCcw size={iconSize} color="#0D9488" />,
      };
    case 'STATUS':
      return {
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-blue-700',
        icon: <ArrowRightLeft size={iconSize} color="#2563EB" />,
      };
    case 'PRIORITY':
      return {
        bg: 'bg-amber-50 border-amber-200',
        text: 'text-amber-700',
        icon: <Edit3 size={iconSize} color="#D97706" />,
      };
    case 'DELETE':
      return {
        bg: 'bg-rose-50 border-rose-200',
        text: 'text-rose-700',
        icon: <Trash2 size={iconSize} color="#E11D48" />,
      };
    default:
      return {
        bg: 'bg-slate-100 border-slate-200',
        text: 'text-slate-700',
        icon: <CheckCircle2 size={iconSize} color="#475569" />,
      };
  }
};

export const AuditLogEntryCard: React.FC<AuditLogEntryCardProps> = ({ log, compact = false }) => {
  const { theme } = useTheme();
  const parsed = parseAuditLogEntry(log);
  const style = getBadgeStyle(parsed.badgeType, compact ? 11 : 12);

  return (
    <View
      className={`${compact ? 'p-3 mb-2' : 'p-3.5 mb-2.5'} rounded-2xl border`}
      style={{
        backgroundColor: theme.colors.surfaceElevated,
        borderColor: theme.colors.border,
      }}
    >
      <View className={`flex-row items-center justify-between ${compact ? 'mb-1' : 'mb-1.5'}`}>
        <View className={`flex-row items-center px-2 py-0.5 rounded-md border ${style.bg}`}>
          {style.icon}
          <Text className={`text-[10px] font-bold tracking-wide ml-1 ${style.text}`}>
            {parsed.badgeLabel}
          </Text>
        </View>
        <Text
          className={compact ? 'text-[10px]' : 'text-[11px]'}
          style={{ color: theme.colors.textMuted }}
        >
          {log.timestamp}
        </Text>
      </View>

      <Text
        className={`${compact ? 'text-xs' : 'text-sm'} font-bold mt-0.5`}
        style={{ color: theme.colors.text }}
        numberOfLines={1}
      >
        {parsed.title}
      </Text>

      <Text
        className={`${compact ? 'mt-0.5 text-xs' : 'mt-1 text-xs'} leading-relaxed`}
        style={{ color: theme.colors.textSecondary }}
      >
        {parsed.summary}
      </Text>

      {Boolean(parsed.detail) && (
        <Text
          className={`${compact ? 'text-[10px] mt-0.5' : 'text-[11px] mt-1'} font-medium`}
          style={{ color: theme.colors.textMuted }}
        >
          {parsed.detail}
        </Text>
      )}
    </View>
  );
};
