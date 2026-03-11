// Root layout: providers globales y listener de sesión de Supabase
import '../global.css';
// Importar la tarea de background GPS para que quede registrada al arrancar la app
// (requisito de expo-task-manager: defineTask debe ejecutarse en el nivel de módulo)
import '@/tasks/backgroundLocation';

import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { usePushStore } from '@/stores/pushStore';
import type { Usuario, ReservaConDetalles } from '@/lib/types';

// Busca el perfil del usuario en la tabla USUARIOS por su supabase_auth_id
async function fetchUserProfile(authId: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from('usuarios')
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

// Obtiene las reservas confirmadas con excursiones en las próximas 48h
async function fetchUpcomingBookings(idUsuario: number): Promise<ReservaConDetalles[]> {
  // Obtener todas las reservas confirmadas con datos de excursión
  const { data, error } = await supabase
    .from('reservas')
    .select(`
      *,
      excursion:excursiones(id_excursion, nombre_ruta, zona, fecha_inicio, imagen_url)
    `)
    .eq('id_usuario', idUsuario)
    .eq('estado', 'confirmada');

  if (error) {
    console.error('[GranaTour] fetchUpcomingBookings:', error);
    return [];
  }

  // Filtrar en el cliente: excursiones que empiezan en las próximas 48h
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  return ((data ?? []) as ReservaConDetalles[]).filter((booking) => {
    const fechaInicio = booking.excursion?.fecha_inicio;
    if (!fechaInicio) return false;
    const fecha = new Date(fechaInicio);
    return fecha >= now && fecha <= in48h;
  });
}

// Programa recordatorios locales para reservas próximas (24h antes)
// Cancela notificaciones programadas anteriores para evitar duplicados
async function scheduleBookingReminders(bookings: ReservaConDetalles[]): Promise<void> {
  try {
    // Cancelar todas las notificaciones programadas anteriores (evitar duplicados)
    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const booking of bookings) {
      const excursionNombre = booking.excursion?.nombre_ruta ?? 'tu excursión';
      const fechaInicio = booking.excursion?.fecha_inicio;
      if (!fechaInicio) continue;

      // Calcular trigger: 24h antes del inicio de la excursión
      const fechaExcursion = new Date(fechaInicio);
      const fechaRecordatorio = new Date(fechaExcursion.getTime() - 24 * 60 * 60 * 1000);

      // Solo programar si el recordatorio aún está en el futuro
      if (fechaRecordatorio <= new Date()) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '¡Mañana tienes una excursión!',
          body: `Recuerda que mañana tienes reservada "${excursionNombre}". ¡Prepárate!`,
          sound: 'default',
          data: { booking_id: booking.id_reserva },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fechaRecordatorio,
        },
      });
    }
  } catch (err) {
    // No bloquear el arranque si la programación falla
    console.error('[GranaTour] scheduleBookingReminders:', err);
  }
}

export default function RootLayout() {
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useAuthStore((state) => state.setUser);
  const setInitializing = useAuthStore((state) => state.setInitializing);
  const registerPushToken = usePushStore((state) => state.registerPushToken);
  const deactivateToken = usePushStore((state) => state.deactivateToken);

  // Ref para el listener de notificaciones recibidas (evitar memory leaks)
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);

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

          // Registrar token push y programar recordatorios al arrancar con sesión activa
          if (profile) {
            await registerPushToken();
            const upcomingBookings = await fetchUpcomingBookings(profile.id_usuario);
            await scheduleBookingReminders(upcomingBookings);
          }
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

        // Registrar token push y programar recordatorios tras login/registro
        if (profile) {
          await registerPushToken();
          const upcomingBookings = await fetchUpcomingBookings(profile.id_usuario);
          await scheduleBookingReminders(upcomingBookings);
        }
      } else {
        // Logout: limpiar perfil y desactivar token push
        setUser(null);
        await deactivateToken();
        // Cancelar notificaciones programadas al cerrar sesión
        Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
      }
    });

    // Listener para manejar notificaciones recibidas mientras la app está activa
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      if (__DEV__) {
        console.log('[GranaTour] Notificación recibida:', notification.request.content.title);
      }
    });

    return () => {
      subscription.unsubscribe();
      notificationListener.current?.remove();
    };
  }, [setSession, setUser, setInitializing, registerPushToken, deactivateToken]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
