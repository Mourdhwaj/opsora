import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { theme } from '../lib/theme';

interface PageHeaderProps { title: string; action?: React.ReactNode; }

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + theme.spacing.md : theme.spacing.lg }]}>
      <Text style={styles.title}>{title}</Text>
      {action && <View>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md, backgroundColor: theme.colors.background },
  title: { fontSize: 28, fontFamily: theme.font.extraBold, color: theme.colors.text },
});