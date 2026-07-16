import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { theme } from '../../lib/theme';

interface BedSquareProps {
  bedId: string;
  bedNumber: string;
  status: 'vacant' | 'occupied' | 'gender-locked' | 'selected';
  onPress: (bedId: string) => void;
}

export function BedSquare({ bedId, bedNumber, status, onPress }: BedSquareProps) {
  const isTappable = status === 'vacant' || status === 'selected';

  return (
    <TouchableOpacity
      style={[
        styles.bed,
        status === 'selected' && styles.bedSelected,
        status === 'occupied' && styles.bedOccupied,
        status === 'gender-locked' && styles.bedLocked,
      ]}
      onPress={() => isTappable && onPress(bedId)}
      disabled={!isTappable}
      activeOpacity={0.6}
    >
      {status === 'occupied' || status === 'gender-locked' ? (
        <Lock size={14} color={theme.colors.textMuted} />
      ) : (
        <Text style={[styles.bedText, status === 'selected' && styles.bedTextSelected]}>
          {bedNumber}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bed: {
    width: 48, height: 48, borderRadius: theme.borderRadius.sm,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  bedSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, borderStyle: 'solid' },
  bedOccupied: { backgroundColor: theme.colors.borderLight, borderColor: theme.colors.borderLight, borderStyle: 'solid' },
  bedLocked: { backgroundColor: theme.colors.borderLight, borderColor: theme.colors.borderLight, borderStyle: 'solid', opacity: 0.5 },
  bedText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  bedTextSelected: { color: '#fff' },
});
