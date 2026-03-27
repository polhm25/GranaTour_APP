// Root layout: providers globales y listener de sesión de Supabase
import '../global.css';
// Importar la tarea de background GPS para que quede registrada al arrancar la app
// (requisito de expo-task-manager: defineTask debe ejecutarse en el nivel de módulo)
import '@/tasks/backgroundLocation';

import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import type { AuthChangeEvent } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { usePushStore } from '@/stores/pushStore';
import { useOfflineStore } from '@/stores/offlineStore';
import { useBookingsStore } from '@/stores/bookingsStore';
import { useNetworkState } from '@/hooks/useNetworkState';
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

  // Filtrar en el cliente: excursiones cuya fecha_inicio cae en las próximas 48h
  // PostgREST no soporta filtros directos en tablas embebidas, por eso filtramos aquí
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  return ((data ?? []) as ReservaConDetalles[]).filter((booking) => {
    const fechaInicio = booking.excursion?.fecha_inicio;
    if (!fechaInicio) return false;
    // C-03: fecha_inicio es 'YYYY-MM-DD' (DATE de PostgreSQL, sin hora).
    // Parseamos como mediodía hora local para evitar que UTC midnight se interprete
    // como madrugada en la zona horaria del usuario (UTC+1/+2 en España).
    const [year, month, day] = fechaInicio.split('-').map(Number);
    const fecha = new Date(year, month - 1, day, 12, 0, 0);
    return fecha >= now && fecha <= in48h;
  });
}

// Programa recordatorios locales para reservas próximas (24h antes, a las 9:00)
async function scheduleBookingReminders(bookings: ReservaConDetalles[]): Promise<void> {
  try {
    // Cancelar recordatorios de reservas anteriores antes de reprogramar
    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const booking of bookings) {
      const excursionNombre = booking.excursion?.nombre_ruta ?? 'tu excursión';
      const fechaInicio = booking.excursion?.fecha_inicio;
      if (!fechaInicio) continue;

      // C-03: parsear fecha como hora local (mediodía) para evitar UTC midnight
      const [year, month, day] = fechaInicio.split('-').map(Number);
      const fechaExcursion = new Date(year, month - 1, day, 12, 0, 0);

      // Recordatorio: el día anterior a las 9:00 hora local
      const fechaRecordatorio = new Date(year, month - 1, day - 1, 9, 0, 0);

      // Solo programar si el recordatorio aún está en el futuro
      if (fechaRecordatorio <= new Date()) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '¡Mañana tienes una excursión!',
          body: `Recuerda que mañana a mediodía tienes "${excursionNombre}". ¡Prepárate!`,
          sound: 'default',
          data: { booking_id: booking.id_reserva },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fechaRecordatorio,
        },
      });

      // Log solo en desarrollo
      if (__DEV__) {
        console.log(`[GranaTour] Recordatorio programado para ${fechaExcursion.toLocaleDateString('es-ES')} — "${excursionNombre}"`);
      }
    }
  } catch (err) {
    // No bloquear el arranque si la programación falla
    console.error('[GranaTour] scheduleBookingReminders:', err);
  }
}

// I-03: Función auxiliar para evitar duplicar la lógica push+recordatorios en dos sitios.
// Se llama al iniciar sesión (SIGNED_IN) o al recuperar sesión activa al arranque.
function initPushAndReminders(
  profile: Usuario,
  registerPushToken: () => Promise<void>
): void {
  // I-01: Lanzar en background (fire-and-forget) para no bloquear setInitializing(false).
  // La inicialización de la app no debe esperar al permiso de notificaciones ni a la red.
  registerPushToken().catch((err) => {
    console.error('[GranaTour] initPushAndReminders registerToken:', err);
  });

  fetchUpcomingBookings(profile.id_usuario)
    .then((bookings) => scheduleBookingReminders(bookings))
    .catch((err) => {
      console.error('[GranaTour] initPushAndReminders reminders:', err);
    });
}

export default function RootLayout() {
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useAuthStore((state) => state.setUser);
  const setInitializing = useAuthStore((state) => state.setInitializing);
  const registerPushToken = usePushStore((state) => state.registerPushToken);
  const deactivateToken = usePushStore((state) => state.deactivateToken);

  // Hook de conectividad: actualiza offlineStore.isOnline en tiempo real
  useNetworkState();

  // Ref para el listener de notificaciones recibidas (evitar memory leaks)
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);

  // Efecto para procesar acciones pendientes cuando se recupera la conexión
  useEffect(() => {
    // subscribe acepta un único listener (state, prevState) sin necesitar subscribeWithSelector
    const unsubscribe = useOfflineStore.subscribe(
      async (state, prevState) => {
        // Solo actuar en la transición offline → online
        if (!(!prevState.isOnline && state.isOnline)) return;

        // I-02: no procesar si el usuario no está autenticado (acciones huérfanas de logout)
        const user = useAuthStore.getState().user;
        if (!user) return;

        const { pendingActions, removePendingAction, setSyncing } = useOfflineStore.getState();
        if (pendingActions.length === 0) return;

        setSyncing(true);
        for (const action of pendingActions) {
          if (action.type === 'create_booking') {
            try {
              const result = await useBookingsStore.getState().createBooking(action.payload);
              if (result !== null) {
                removePendingAction(action.id);
              }
            } catch {
              // Mantener en cola si falla; se reintentará al reconectar de nuevo
            }
          }
        }
        setSyncing(false);
      }
    );

    return unsubscribe;
  }, []);

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

          // I-01: push+recordatorios en background para no retrasar setInitializing
          if (profile) {
            initPushAndReminders(profile, registerPushToken);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session) => {
        setSession(session);

        if (session?.user?.id) {
          const profile = await fetchUserProfile(session.user.id);
          setUser(profile);

          // I-07: Solo registrar token y recordatorios en SIGNED_IN, no en TOKEN_REFRESHED
          // (onAuthStateChange se dispara ~cada hora en token refresh, evitamos re-registro)
          if (profile && event === 'SIGNED_IN') {
            initPushAndReminders(profile, registerPushToken);
          }
        } else {
          // Logout: limpiar perfil, desactivar token push y vaciar cola offline
          setUser(null);
          deactivateToken().catch((err) => {
            console.error('[GranaTour] deactivateToken error:', err);
          });
          // Cancelar notificaciones programadas al cerrar sesión
          Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
          // I-02: limpiar cola offline al cerrar sesión para no ejecutar acciones de otro usuario
          useOfflineStore.getState().clearPendingActions();
        }
      }
    );

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
