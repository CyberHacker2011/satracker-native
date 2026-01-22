import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, View, ActivityIndicator } from 'react-native'; // Added ActivityIndicator
import { ThemedText, Heading } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useTheme } from '../context/ThemeContext';
import { useEffect } from 'react'; // Added useEffect
import { supabase } from '../lib/supabase'; // Added supabase

export default function NotFoundScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
    };
    
    checkAuthAndRedirect();
  }, []);

  return (
    <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ActivityIndicator size="large" color={theme.primary} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 80,
    fontWeight: '900',
    color: '#f59e0b',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  linkText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 40,
    maxWidth: 300,
  },
  link: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 16,
  },
  linkButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
