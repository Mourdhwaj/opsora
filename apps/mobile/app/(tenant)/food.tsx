import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState } from '../../src/components';
import { api } from '../../src/services/api';
import type { FoodMenu } from '../../src/types';

export default function TenantFood() {
  const { data, isLoading, refetch } = useQuery<FoodMenu[]>({
    queryKey: ['tenant-food'],
    queryFn: () => api.get('/tenant/food').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Today's Menu</Text>

      {(!data || data.length === 0) ? (
        <EmptyState title="No menu for today" />
      ) : (
        data.map((menu) => (
          <Card key={menu.id} style={styles.card}>
            <Text style={styles.mealType}>{menu.mealType.toUpperCase()}</Text>
            {menu.isSpecial && <Text style={styles.special}>✨ Special: {menu.items[0]}</Text>}
            {menu.items.map((item, i) => (
              <Text key={i} style={styles.item}>• {item}</Text>
            ))}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card: { marginBottom: 12 },
  mealType: { fontSize: 16, fontWeight: '700', color: '#3b82f6', marginBottom: 8 },
  special: { fontSize: 14, fontWeight: '600', color: '#eab308', marginBottom: 4 },
  item: { fontSize: 14, color: '#374151', marginBottom: 2 },
});
