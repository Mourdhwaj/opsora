import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input } from '../src/components';
import { useAuth } from '../src/services/auth';
import { theme } from '../src/lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role === 'owner' || user.role === 'admin') router.replace('/(owner)/dashboard');
    else if (user.role === 'resident') router.replace('/(tenant)/dashboard');
    else if (user.role === 'staff') router.replace('/(staff)/dashboard');
  }, [user, authLoading, router]);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <Text style={styles.title}>Opsora</Text>
        <Text style={styles.subtitle}>PG & Hostel Management</Text>
        <View style={styles.form}>
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="admin@sunshinepg.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="Enter password" secureTextEntry />
          <Button title="Sign In" onPress={handleLogin} loading={loading} style={styles.button} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 36, fontFamily: theme.font.extraBold, color: theme.colors.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 48 },
  form: { marginTop: 16 },
  button: { marginTop: 8 },
});
