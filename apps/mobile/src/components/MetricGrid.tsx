import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../lib/theme';

interface MetricTileProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  color?: string;
  bgColor?: string;
  progress?: number;
  onPress?: () => void;
}

function MetricTile({ icon, value, label, color = theme.colors.text, bgColor = theme.colors.surface, progress, onPress }: MetricTileProps) {
  const content = (
    <View style={[styles.tile, { backgroundColor: bgColor }]}>
      <View style={styles.tileHeader}>
        {icon}
        <Text style={[styles.tileValue, { color }]} numberOfLines={1}>{value}</Text>
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
      {progress !== undefined && (
        <View style={styles.miniTrack}>
          <View style={[styles.miniFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: color }]} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity activeOpacity={0.7} onPress={onPress}>{content}</TouchableOpacity>;
  }
  return content;
}

interface MetricGridProps {
  revenueCollected: number;
  revenueExpected: number;
  occupancyRate: number;
  occupiedBeds: number;
  totalBeds: number;
  collectionRate: number;
  activeTenants: number;
  onRevenuePress?: () => void;
  onOccupancyPress?: () => void;
  onCollectionPress?: () => void;
  onTenantsPress?: () => void;
}

export function MetricGrid({
  revenueCollected, revenueExpected, occupancyRate, occupiedBeds, totalBeds,
  collectionRate, activeTenants,
  onRevenuePress, onOccupancyPress, onCollectionPress, onTenantsPress,
}: MetricGridProps) {
  const formatRevenue = (n: number) => {
    if (n >= 10000000) return `\u20B9${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `\u20B9${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `\u20B9${(n / 1000).toFixed(0)}K`;
    return `\u20B9${n}`;
  };

  const occupancyColor = occupancyRate >= 80 ? theme.colors.success : occupancyRate >= 50 ? theme.colors.warning : theme.colors.info;
  const collectionColor = collectionRate >= 80 ? theme.colors.success : collectionRate >= 50 ? theme.colors.warning : theme.colors.danger;

  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <View style={styles.half}>
          <MetricTile
            icon={<View style={[styles.iconDot, { backgroundColor: theme.colors.primarySurface }]}><Text style={{ fontSize: 12, color: theme.colors.primary }}>{'\u20B9'}</Text></View>}
            value={formatRevenue(revenueCollected)}
            label={`of ${formatRevenue(revenueExpected)} expected`}
            color={theme.colors.primary}
            progress={revenueExpected > 0 ? (revenueCollected / revenueExpected) * 100 : 0}
            onPress={onRevenuePress}
          />
        </View>
        <View style={styles.half}>
          <MetricTile
            icon={<View style={[styles.iconDot, { backgroundColor: theme.colors.infoSurface }]}><Text style={{ fontSize: 12, color: theme.colors.info }}>{occupiedBeds}</Text></View>}
            value={`${occupancyRate}%`}
            label={`${occupiedBeds}/${totalBeds} beds occupied`}
            color={occupancyColor}
            progress={occupancyRate}
            onPress={onOccupancyPress}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <MetricTile
            icon={<View style={[styles.iconDot, { backgroundColor: collectionColor + '15' }]}><Text style={{ fontSize: 12, color: collectionColor }}>{'%'}</Text></View>}
            value={`${collectionRate}%`}
            label="monthly collection rate"
            color={collectionColor}
            progress={collectionRate}
            onPress={onCollectionPress}
          />
        </View>
        <View style={styles.half}>
          <MetricTile
            icon={<View style={[styles.iconDot, { backgroundColor: theme.colors.successSurface }]}><Text style={{ fontSize: 12, color: theme.colors.success }}>{activeTenants}</Text></View>}
            value={`${activeTenants}`}
            label="active tenants"
            color={theme.colors.success}
            onPress={onTenantsPress}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  tile: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    minHeight: 88,
    ...theme.shadow.sm,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  iconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileValue: {
    fontSize: 20,
    fontFamily: theme.font.extraBold,
    flex: 1,
  },
  tileLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: theme.font.medium,
  },
  miniTrack: {
    height: 3,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 1.5,
    marginTop: 6,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});
