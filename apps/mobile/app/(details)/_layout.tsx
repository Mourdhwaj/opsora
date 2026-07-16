import { Stack } from 'expo-router';
import { theme } from '../../src/lib/theme';

export default function DetailsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
