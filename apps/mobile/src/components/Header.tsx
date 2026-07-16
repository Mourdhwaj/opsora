import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, type LucideIcon } from 'lucide-react-native';
import { theme } from '../lib/theme';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: { icon: LucideIcon; onPress: () => void };
}

export function Header({ title, showBack, rightAction }: HeaderProps) {
  const router = useRouter();
  const RightIcon = rightAction?.icon;

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>
        {rightAction && RightIcon && (
          <TouchableOpacity onPress={rightAction.onPress}>
            <RightIcon size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: 12, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  left: { width: 40 },
  backButton: { padding: 4 },
  title: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text, flex: 1, textAlign: 'center' },
  right: { width: 40, alignItems: 'flex-end' },
});
