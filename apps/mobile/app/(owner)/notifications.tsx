import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bell, CreditCard, AlertCircle, UserPlus, Building, CheckCircle, BedDouble, ChevronLeft, ArrowRight } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { theme } from '../../src/lib/theme';
import { useResponsive } from '../../src/lib/useResponsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Notification {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string;
  actorName: string;
  createdAt: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useResponsive();
  const hp = Math.max(16, Math.round(width * 0.04));

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/dashboard/overview');
      return res.data?.recentActivity || [];
    },
  });

  const getIcon = (entityType: string) => {
    const icons: Record<string, any> = {
      payment: CreditCard, complaint: AlertCircle, resident: UserPlus,
      property: Building, task: CheckCircle, bed: BedDouble,
    };
    return icons[entityType] || Bell;
  };

  const getIconColor = (entityType: string) => {
    const colors: Record<string, string> = {
      payment: theme.colors.success,
      complaint: theme.colors.warning,
      resident: theme.colors.info,
      property: theme.colors.primary,
    };
    return colors[entityType] || theme.colors.primary;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      payment_received: 'Paid',
      complaint_created: 'Filed',
      complaint_resolved: 'Resolved',
      checked_in: 'Checked In',
      resident_checked_out: 'Checked Out',
      bed_allocated: 'Bed Allocated',
      property_updated: 'Updated',
      staff_added: 'Staff Added',
    };
    return labels[action] || action.replace(/_/g, ' ');
  };

  const navigateToNotification = (item: Notification) => {
    if (!item.entityId) return;

    switch (item.entityType) {
      case 'payment':
        const month = item.createdAt.slice(0, 7);
        router.push({ pathname: '/(owner)/payments', params: { filter: 'all', month } });
        break;
      case 'complaint':
        router.push({ pathname: '/(owner)/complaints/[id]', params: { id: item.entityId } });
        break;
      case 'resident':
      case 'tenant':
        router.push({ pathname: '/(details)/residents/[id]', params: { id: item.entityId } });
        break;
      case 'bed':
        router.push('/(details)/rooms');
        break;
      case 'property':
        router.push({ pathname: '/(details)/properties/[id]', params: { id: item.entityId } });
        break;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: hp }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={notifications || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        renderItem={({ item }) => {
          const IconComponent = getIcon(item.entityType);
          const iconColor = getIconColor(item.entityType);
          const actionLabel = getActionLabel(item.action);
          return (
            <TouchableOpacity
              style={styles.notificationItem}
              onPress={() => navigateToNotification(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${iconColor}15` }]}>
                <IconComponent size={18} color={iconColor} />
              </View>
              <View style={styles.content}>
                <View style={styles.topRow}>
                  <Text style={styles.entityName} numberOfLines={1}>{item.entityName}</Text>
                  <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
                </View>
                <View style={styles.actionRow}>
                  <Text style={[styles.actionBadge, { backgroundColor: `${iconColor}15`, color: iconColor }]}>{actionLabel}</Text>
                  {item.entityId && <ArrowRight size={14} color={theme.colors.textMuted} />}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Bell size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  entityName: {
    fontSize: 14,
    fontFamily: theme.font.semiBold,
    color: theme.colors.text,
    flex: 1,
  },
  time: {
    fontSize: 11,
    fontFamily: theme.font.medium,
    color: theme.colors.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBadge: {
    fontSize: 11,
    fontFamily: theme.font.semiBold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
});
