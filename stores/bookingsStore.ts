// Store de reservas: reservas del usuario autenticado (con caché offline persist)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useOfflineStore } from '@/stores/offlineStore';
import type { Reserva, ReservaConDetalles } from '@/lib/types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface NewBookingData {
  id_excursion: number;
  num_personas: number;
  precio_persona: number; // Pasado desde el detalle de excursión
  notas?: string;
}

// ─── Mapeo de errores genéricos ───────────────────────────────────────────────

function getBookingErrorMessage(error: unknown, context: string): string {
  // Siempre logueamos el error real (no solo en __DEV__)
  console.error(`[GranaTour] bookingsStore.${context}:`, error);
  return 'No se pudo completar la operación. Inténtalo de nuevo';
}

// Mensaje específico para errores de createBooking (distingue sin plazas vs error genérico)
function getCreateBookingErrorMessage(error: unknown): string {
  console.error('[GranaTour] bookingsStore.createBooking:', error);
  const msg = ((error as Error).message ?? '').toLowerCase();
  if (msg.includes('plazas insuficientes') || msg.includes('insufficient')) {
    return 'Ya no quedan plazas disponibles para esta excursión';
  }
  return 'No se pudo completar la reserva. Inténtalo de nuevo';
}

// ─── Estado e interfaz ────────────────────────────────────────────────────────

interface BookingsState {
  // Estado (persistido en caché)
  bookings: ReservaConDetalles[];
  // Estado transitorio (no persistido)
  currentBooking: ReservaConDetalles | null;
  loadingList: boolean;    // fetchBookings
  loadingDetail: boolean;  // getBookingById
  loadingCreate: boolean;  // createBooking
  loadingCancel: boolean;  // cancelBooking
  error: string | null;

  // Acciones
  fetchBookings: () => Promise<void>;
  getBookingById: (id: number) => Promise<void>;
  createBooking: (data: NewBookingData) => Promise<Reserva | null>;
  cancelBooking: (bookingId: number) => Promise<boolean>;
  clearError: () => void;
  clearCurrentBooking: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBookingsStore = create<BookingsState>()(
  persist(
    (set, get) => ({
      bookings: [],
      currentBooking: null,
      loadingList: false,
      loadingDetail: false,
      loadingCreate: false,
      loadingCancel: false,
      error: null,

      // ── fetchBookings ────────────────────────────────────────────────────────
      fetchBookings: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        set({ loadingList: true, error: null });
        try {
          const { data, error } = await supabase
            .from('reservas')
            .select(`
              *,
              excursion:excursiones(id_excursion, nombre_ruta, zona, fecha_inicio, imagen_url)
            `)
            .eq('id_usuario', user.id_usuario)
            .order('fecha_reserva', { ascending: false });

          if (error) throw error;

          set({ bookings: (data ?? []) as ReservaConDetalles[], loadingList: false });
        } catch (error) {
          set({
            error: getBookingErrorMessage(error, 'fetchBookings'),
            loadingList: false,
          });
        }
      },

      // ── getBookingById ───────────────────────────────────────────────────────
      getBookingById: async (id: number) => {
        const user = useAuthStore.getState().user;
        // Limpiar estado previo para evitar flash de datos viejos
        set({ currentBooking: null, loadingDetail: true, error: null });
        try {
          // C-02: filtrar por id_usuario además de id_reserva para defensa en profundidad
          const query = supabase
            .from('reservas')
            .select(`
              *,
              excursion:excursiones(id_excursion, nombre_ruta, zona, fecha_inicio, imagen_url)
            `)
            .eq('id_reserva', id);

          // Si tenemos usuario añadimos el filtro; RLS también lo protege en Supabase
          if (user) {
            query.eq('id_usuario', user.id_usuario);
          }

          const { data, error } = await query.single();

          if (error) throw error;

          set({ currentBooking: data as ReservaConDetalles, loadingDetail: false });
        } catch (error) {
          // Fallback offline: buscar en la caché local
          const cached = get().bookings.find((b) => b.id_reserva === id) ?? null;
          if (cached) {
            set({ currentBooking: cached, loadingDetail: false });
            return;
          }
          set({
            error: getBookingErrorMessage(error, 'getBookingById'),
            loadingDetail: false,
          });
        }
      },

      // ── createBooking ────────────────────────────────────────────────────────
      // C-01: Usa RPC atómico `crear_reserva_atomica` que verifica plazas,
      // las decrementa y crea la reserva en una única transacción de PostgreSQL.
      // Modo offline: si no hay conexión, la reserva se encola para sincronizar después.
      createBooking: async (data: NewBookingData) => {
        const user = useAuthStore.getState().user;
        if (!user) {
          set({ error: 'Debes iniciar sesión para realizar una reserva' });
          return null;
        }

        // ── Modo offline: encolar para sincronizar al reconectar ──────────────
        const { isOnline, addPendingAction } = useOfflineStore.getState();
        if (!isOnline) {
          addPendingAction({ type: 'create_booking', payload: data });
          // Notificación informativa de reserva encolada
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Reserva guardada sin conexión',
              body: 'Se enviará automáticamente cuando recuperes la conexión a internet.',
              sound: 'default',
            },
            trigger: null,
          }).catch(() => {});
          return null;
        }

        set({ loadingCreate: true, error: null });
        try {
          const precio_total = data.num_personas * data.precio_persona;

          const { data: newBooking, error: rpcError } = await supabase.rpc(
            'crear_reserva_atomica',
            {
              p_id_usuario: user.id_usuario,
              p_id_excursion: data.id_excursion,
              p_num_personas: data.num_personas,
              p_precio_total: precio_total,
              p_notas: data.notas ?? null,
            }
          );

          if (rpcError) throw rpcError;

          // Refrescar la lista de reservas en background
          get().fetchBookings();

          // Notificación local inmediata de confirmación de reserva
          Notifications.scheduleNotificationAsync({
            content: {
              title: '¡Reserva realizada!',
              body: 'Tu reserva ha sido registrada. Espera la confirmación del guía.',
              sound: 'default',
            },
            trigger: null, // Inmediata
          }).catch((err) => {
            // No bloquear el flujo si las notificaciones no están disponibles
            if (__DEV__) console.warn('[GranaTour] notificación local:', err);
          });

          set({ loadingCreate: false });
          return newBooking as Reserva;
        } catch (error) {
          set({
            error: getCreateBookingErrorMessage(error),
            loadingCreate: false,
          });
          return null;
        }
      },

      // ── cancelBooking ────────────────────────────────────────────────────────
      cancelBooking: async (bookingId: number) => {
        const user = useAuthStore.getState().user;
        set({ loadingCancel: true, error: null });
        try {
          // Buscar datos de la reserva para saber cuántas plazas devolver
          const booking =
            get().bookings.find((b) => b.id_reserva === bookingId) ??
            get().currentBooking;

          // C-03: filtrar por id_usuario además de id_reserva para defensa en profundidad
          const updateQuery = supabase
            .from('reservas')
            .update({ estado: 'cancelada' })
            .eq('id_reserva', bookingId);

          if (user) {
            updateQuery.eq('id_usuario', user.id_usuario);
          }

          const { error: updateError } = await updateQuery;

          if (updateError) throw updateError;

          // Devolver plazas usando el RPC atómico
          if (booking) {
            const { error: rpcError } = await supabase.rpc('incrementar_plazas', {
              p_id_excursion: booking.id_excursion,
              p_num_personas: booking.num_personas,
            });

            // Siempre logueamos el error (no solo en __DEV__)
            if (rpcError) {
              console.error('[GranaTour] incrementar_plazas error:', rpcError);
            }
          }

          // Actualizar estado local sin recargar toda la lista
          set((state) => ({
            bookings: state.bookings.map((b) =>
              b.id_reserva === bookingId ? { ...b, estado: 'cancelada' } : b
            ),
            currentBooking:
              state.currentBooking?.id_reserva === bookingId
                ? { ...state.currentBooking, estado: 'cancelada' }
                : state.currentBooking,
            loadingCancel: false,
          }));

          return true;
        } catch (error) {
          set({
            error: getBookingErrorMessage(error, 'cancelBooking'),
            loadingCancel: false,
          });
          return false;
        }
      },

      // ── clearError / clearCurrentBooking ─────────────────────────────────────
      clearError: () => set({ error: null }),
      clearCurrentBooking: () => set({ currentBooking: null }),
    }),
    {
      name: 'bookings-cache',
      storage: createJSONStorage(() => AsyncStorage),
      // Solo persistir la lista de reservas; el resto es estado transitorio
      partialize: (state) => ({ bookings: state.bookings }),
    }
  )
);
