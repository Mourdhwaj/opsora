import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface ComingSoonProps {
  title: string;
  features: string[];
}

export function ComingSoon({ title, features }: ComingSoonProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Coming Soon</Text>
        </View>
      </View>
      <View style={styles.features}>
        {features.map((feature, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontFamily: theme.font.bold,
    color: theme.colors.text,
  },
  badge: {
    backgroundColor: theme.colors.warningSurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: theme.font.semiBold,
    color: theme.colors.warning,
  },
  features: {
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.textMuted,
  },
  featureText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.font.medium,
  },
});
