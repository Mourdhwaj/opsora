import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface PageHeaderProps { title: string; action?: React.ReactNode; }

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {action && <View>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
});
