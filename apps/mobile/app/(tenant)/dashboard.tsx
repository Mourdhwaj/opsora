import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';

export default function TenantDashboard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tenant-dashboard'],
    queryFn: () => api.get('/tenant/dashboard').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.greeting}>Good Morning!</Text>

      <Card style={styles.rentCard}>
        <Text style={styles.cardTitle}>Rent Due</Text>
        <Text style={styles.rentAmount}>{formatCurrency(data?.rentDue?.amount || 0)}</Text>
        <Text style={styles.dueDate}>Due: {formatDate(data?.rentDue?.dueDate || '')}</Text>
      </Card>

      <View style={styles.row}>
        <Card style={[styles.smallCard, { flex: 1, marginRight: 4 }]}>
          <Text style={styles.cardTitle}>Water Level</Text>
          <Text style={[styles.percentage, { color: (data?.waterLevel || 0) > 20 ? '#3b82f6' : '#ef4444' }]}>
            {data?.waterLevel || 0}%
          </Text>
        </Card>
        <Card style={[styles.smallCard, { flex: 1, marginLeft: 4 }]}>
          <Text style={styles.cardTitle}>Today's Menu</Text>
          <Text style={styles.menuText}>{data?.todayMenu || 'Not set'}</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 20 },
  rentCard: { marginBottom: 12 },
  cardTitle: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  rentAmount: { fontSize: 36, fontWeight: '800', color: '#111827', marginTop: 8 },
  dueDate: { fontSize: 13, color: '#ef4444', marginTop: 4 },
  row: { flexDirection: 'row', marginBottom: 12 },
  smallCard: { padding: 16 },
  percentage: { fontSize: 32, fontWeight: '800', marginTop: 8 },
  menuText: { fontSize: 16, fontWeight: '600', color: '#111827', marginTop: 8 },
});
