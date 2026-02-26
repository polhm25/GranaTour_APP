// Root layout: providers globales y listener de sesión de Supabase
import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
  const setSession = useAuthStore((state) => state.setSession);
  const setInitializing = useAuthStore((state) => state.setInitializing);

  useEffect(() => {
    // CR-01: Obtener sesión inicial y marcar como listo al terminar.
    // SU-04: catch explícito para fallos de red en el primer arranque.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .catch(() => {
        // Sin sesión si falla la red; el usuario deberá hacer login
        setSession(null);
      })
      .finally(() => {
        setInitializing(false);
      });

    // Listener de cambios de sesión (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setInitializing]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
