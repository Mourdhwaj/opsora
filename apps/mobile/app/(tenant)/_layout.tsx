import { theme } from "../../src/lib/theme";
import { Tabs, useRouter } from 'expo-router';
import { Text, View, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useState, useRef } from 'react';
import { useAuth } from '../../src/services/auth';

const DRAWER_WIDTH = 280;

export default function TenantLayout() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  function openDrawer() {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }

  function closeDrawer() {
    Animated.parallel([
      Animated.spring(translateX, { toValue: -DRAWER_WIDTH, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  }

  function navigateTo(route: string) {
    closeDrawer();
    setTimeout(() => router.push(route), 250);
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerLeft: () => (
            <TouchableOpacity onPress={openDrawer} style={{ paddingLeft: 16, paddingVertical: 8 }}>
              <Text style={{ fontSize: 24, color: '#111827' }}>☰</Text>
            </TouchableOpacity>
          ),
          headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
          headerTintColor: '#111827',
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          tabBarActiveTintColor: 'theme.colors.primary',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: { display: 'none' },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        }}
      >
        <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>🏠</Text> }} />
        <Tabs.Screen name="payments" options={{ title: 'Payments', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>💰</Text> }} />
        <Tabs.Screen name="food" options={{ title: 'Food', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>🍽️</Text> }} />
        <Tabs.Screen name="complaints" options={{ title: 'Issues', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>🎫</Text> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>👤</Text> }} />
        <Tabs.Screen name="complaints/[id]" options={{ href: false as any, title: 'Complaint Detail' }} />
      </Tabs>

      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents={drawerOpen ? 'auto' : 'none'}>
        <TouchableOpacity style={{ flex: 1 }} onPress={closeDrawer} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]} pointerEvents={drawerOpen ? 'auto' : 'none'}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}><Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>O</Text></View>
          <View><Text style={styles.brandName}>Opsora</Text><Text style={styles.brandSub}>Resident Portal</Text></View>
        </View>
        <View style={styles.navSection}>
          {tenantItems.map((item) => (
            <TouchableOpacity key={item.label} style={styles.navItem} onPress={() => navigateTo(item.route)}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              <Text style={styles.navLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.footer}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{user?.fullName?.charAt(0) || 'U'}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.userName}>{user?.fullName || 'User'}</Text><Text style={styles.userRole}>Resident</Text></View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => { closeDrawer(); logout(); }}>
            <Text style={{ fontSize: 18 }}>🚪</Text><Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const tenantItems = [
  { icon: '🏠', label: 'Home', route: '/(tenant)/dashboard' },
  { icon: '💰', label: 'Payments', route: '/(tenant)/payments' },
  { icon: '🍽️', label: 'Food & Meals', route: '/(tenant)/food' },
  { icon: '🎫', label: 'My Complaints', route: '/(tenant)/complaints' },
  { icon: '👤', label: 'My Profile', route: '/(tenant)/profile' },
];

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 10 },
  drawer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: DRAWER_WIDTH, backgroundColor: '#fff', elevation: 16, zIndex: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
  brandIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'theme.colors.primary', justifyContent: 'center', alignItems: 'center' },
  brandName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  brandSub: { fontSize: 12, color: '#9ca3af' },
  navSection: { flex: 1, paddingTop: 12 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, marginHorizontal: 12, borderRadius: 10, gap: 12 },
  navLabel: { fontSize: 15, fontWeight: '500', color: '#6b7280' },
  footer: { borderTopWidth: 1, borderTopColor: '#f3f4f6', padding: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'theme.colors.primary', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  userName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  userRole: { fontSize: 12, color: '#9ca3af' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  logoutText: { fontSize: 14, color: '#ef4444', fontWeight: '500' },
});
