import { ScrollView, Alert, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Building, LayoutGrid, UtensilsCrossed, Droplets, Zap, UserPlus, Archive, Settings } from 'lucide-react-native';
import { PageHeader, MoreGrid } from '../../src/components';
import { useAuth } from '../../src/services/auth';
import { theme } from '../../src/lib/theme';

export default function MoreScreen() {
  const { logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  }

  return (
    <ScrollView style={styles.container}>
      <PageHeader title="More" />
      <MoreGrid
        onNavigate={(route) => router.push(route as any)}
        items={[
          { icon: <Building size={24} color={theme.colors.primary} />, label: 'Properties', route: '/(details)/properties' },
          { icon: <LayoutGrid size={24} color={theme.colors.primary} />, label: 'Room Layout', route: '/(details)/rooms' },
          { icon: <UtensilsCrossed size={24} color={theme.colors.primary} />, label: 'Food & Meals', route: '/(details)/food' },
          { icon: <Droplets size={24} color={theme.colors.primary} />, label: 'Water IoT', route: '/(details)/iot/water' },
          { icon: <Zap size={24} color={theme.colors.primary} />, label: 'Electricity', route: '/(details)/iot/electricity' },
          { icon: <UserPlus size={24} color={theme.colors.primary} />, label: 'Group Check-in', route: '/(details)/check-in' },
          { icon: <Archive size={24} color={theme.colors.primary} />, label: 'Archive', route: '/(details)/archive' },
          { icon: <Settings size={24} color={theme.colors.primary} />, label: 'Settings', route: '/(owner)/more' },
        ]}
      />
      <LogoutButton onPress={handleLogout} />
    </ScrollView>
  );
}

function LogoutButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.logoutButton} onPress={onPress}>
      <Text style={styles.logoutText}>Logout</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  logoutButton: { margin: theme.spacing.lg, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.danger },
  logoutText: { color: theme.colors.danger, fontSize: 16, fontWeight: '600' },
});
