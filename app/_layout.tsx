// Root layout: providers globales y listener de sesión de Supabase
import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Usuario } from '@/lib/types';

// Busca el perfil del usuario en la tabla USUARIOS por su supabase_auth_id
async function fetchUserProfile(authId: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from('USUARIOS')
    .select(
      'id_usuario, supabase_auth_id, nombre, ap1, ap2, dni, email, telefono, rol, password, avatar_url, bio, valoracion, num_turnos, total_km, total_excursiones, fecha_registro, ultimo_acceso'
    )
    .eq('supabase_auth_id', authId)
    .single();

  if (error) {
    // El trigger puede tardar; no es un error crítico
    if (__DEV__) console.warn('[GranaTour] fetchUserProfile:', error.message);
    return null;
  }
  return data as Usuario;
}

export default function RootLayout() {
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useAuthStore((state) => state.setUser);
  const setInitializing = useAuthStore((state) => state.setInitializing);

  useEffect(() => {
    // CR-01: Obtener sesión inicial y marcar como listo al terminar.
    // SU-04: catch explícito para fallos de red en el primer arranque.
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setSession(session);
        // BUG-05: cargar el perfil también en el arranque inicial
        if (session?.user?.id) {
          const profile = await fetchUserProfile(session.user.id);
          setUser(profile);
        }
      })
      .catch(() => {
        // Sin sesión si falla la red; el usuario deberá hacer login
        setSession(null);
      })
      .finally(() => {
        setInitializing(false);
      });

    // Listener de cambios de sesión (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      // BUG-05: cargar perfil en cada cambio de sesión (login, registro, refresh)
      if (session?.user?.id) {
        const profile = await fetchUserProfile(session.user.id);
        setUser(profile);
      } else {
        // Logout: limpiar perfil
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser, setInitializing]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
