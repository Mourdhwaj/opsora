import { View, Text, TextInput, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...', style }: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={() => onChangeText('')} activeOpacity={0.5}>
          <Text style={styles.clear}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    height: 44,
  },
  icon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#111827', padding: 0 },
  clearBtn: { padding: 4 },
  clear: { fontSize: 16, color: '#9ca3af' },
});
