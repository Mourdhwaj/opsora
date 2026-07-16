import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, CheckCircle2 } from 'lucide-react-native';
import { theme } from '../../lib/theme';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  isComplete?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, icon, isExpanded, onToggle, isComplete, children }: CollapsibleSectionProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={onToggle} activeOpacity={0.6}>
        <View style={styles.headerLeft}>{icon}<Text style={styles.title}>{title}</Text></View>
        <View style={styles.headerRight}>
          {isComplete && <CheckCircle2 size={18} color={theme.colors.success} />}
          <ChevronDown size={18} color={theme.colors.textMuted} style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
        </View>
      </TouchableOpacity>
      {isExpanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontFamily: theme.font.semiBold, color: theme.colors.text },
  content: { paddingBottom: 14 },
});
