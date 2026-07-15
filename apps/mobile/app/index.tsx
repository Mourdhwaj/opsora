import { Redirect } from 'expo-router';
import { useAuth } from '../src/services/auth';
import { LoadingSkeleton } from '../src/components';

export default function Index() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <LoadingSkeleton />;
  if (!isAuthenticated) return <Redirect href="/login" />;

  if (user?.role === 'owner' || user?.role === 'admin') return <Redirect href="/(owner)/dashboard" />;
  if (user?.role === 'resident') return <Redirect href="/(tenant)/dashboard" />;
  if (user?.role === 'staff') return <Redirect href="/(staff)/dashboard" />;

  return <Redirect href="/login" />;
}
