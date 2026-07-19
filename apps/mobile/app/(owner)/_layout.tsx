import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { LayoutDashboard, Users, CreditCard, AlertCircle, Grid2x2 } from 'lucide-react-native';
import { theme } from '../../src/lib/theme';

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.borderLight,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontFamily: theme.font.bold, fontSize: 18 },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="residents"
        options={{
          title: 'Residents',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, size }) => <CreditCard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="complaints"
        options={{
          title: 'Issues',
          tabBarIcon: ({ color, size }) => <AlertCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Grid2x2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="pending-tenants"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="paid-tenants"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="checkout"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    height: 88,
    paddingTop: 8,
    paddingBottom: 28,
  },
  tabBarLabel: {
    fontSize: 10,
    fontFamily: theme.font.semiBold,
  },
});
