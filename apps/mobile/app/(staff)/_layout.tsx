import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function StaffLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#3b82f6',
      tabBarInactiveTintColor: '#9ca3af',
      tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingBottom: 8, paddingTop: 8, height: 60 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
    }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text> }} />
      <Tabs.Screen name="residents" options={{ title: 'Residents', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👥</Text> }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✅</Text> }} />
      <Tabs.Screen name="complaints" options={{ title: 'Complaints', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🎫</Text> }} />
    </Tabs>
  );
}
