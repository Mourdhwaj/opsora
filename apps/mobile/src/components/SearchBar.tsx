import { View, TextInput, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { theme } from '../lib/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...', style }: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <Search size={18} color={theme.colors.textMuted} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={() => onChangeText('')} activeOpacity={0.5}>
          <X size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    height: 44,
  },
  icon: { marginRight: theme.spacing.sm },
  input: { flex: 1, fontSize: 15, fontFamily: theme.font.regular, color: theme.colors.text, padding: 0 },
  clearBtn: { padding: 4 },
});
