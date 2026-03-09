// Store de reservas: reservas del usuario autenticado
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
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
  if (__DEV__) console.error(`[GranaTour] bookingsStore.${context}:`, error);
  return 'No se pudo completar la operación. Inténtalo de nuevo';
}

// ─── Estado e interfaz ────────────────────────────────────────────────────────

interface BookingsState {
  // Estado
  bookings: ReservaConDetalles[];
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

export const useBookingsStore = create<BookingsState>((set, get) => ({
  bookings: [],
  currentBooking: null,
  loadingList: false,
  loadingDetail: false,
  loadingCreate: false,
  loadingCancel: false,
  error: null,

  // ── fetchBookings ──────────────────────────────────────────────────────────
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

  // ── getBookingById ─────────────────────────────────────────────────────────
  getBookingById: async (id: number) => {
    // Limpiar estado previo para evitar flash de datos viejos
    set({ currentBooking: null, loadingDetail: true, error: null });
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          *,
          excursion:excursiones(id_excursion, nombre_ruta, zona, fecha_inicio, imagen_url)
        `)
        .eq('id_reserva', id)
        .single();

      if (error) throw error;

      set({ currentBooking: data as ReservaConDetalles, loadingDetail: false });
    } catch (error) {
      set({
        error: getBookingErrorMessage(error, 'getBookingById'),
        loadingDetail: false,
      });
    }
  },

  // ── createBooking ──────────────────────────────────────────────────────────
  createBooking: async (data: NewBookingData) => {
    const user = useAuthStore.getState().user;
    if (!user) return null;

    set({ loadingCreate: true, error: null });
    try {
      const precio_total = data.num_personas * data.precio_persona;

      // 1. Insertar la reserva
      const { data: newBooking, error: insertError } = await supabase
        .from('reservas')
        .insert({
          id_usuario: user.id_usuario,
          id_excursion: data.id_excursion,
          num_personas: data.num_personas,
          precio_total,
          estado: 'pendiente',
          notas: data.notas ?? null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Decrementar plazas disponibles en la excursión
      const { error: updateError } = await supabase.rpc('decrementar_plazas', {
        p_id_excursion: data.id_excursion,
        p_num_personas: data.num_personas,
      });

      // Si el RPC falla lo logueamos pero no bloqueamos: la reserva ya fue creada
      if (updateError && __DEV__) {
        console.error('[GranaTour] decrementar_plazas error:', updateError);
      }

      // 3. Refrescar la lista de reservas en background
      get().fetchBookings();

      set({ loadingCreate: false });
      return newBooking as Reserva;
    } catch (error) {
      set({
        error: getBookingErrorMessage(error, 'createBooking'),
        loadingCreate: false,
      });
      return null;
    }
  },

  // ── cancelBooking ──────────────────────────────────────────────────────────
  cancelBooking: async (bookingId: number) => {
    set({ loadingCancel: true, error: null });
    try {
      // 1. Buscar la reserva para conocer id_excursion y num_personas
      const booking = get().bookings.find((b) => b.id_reserva === bookingId)
        ?? get().currentBooking;

      const { error: updateError } = await supabase
        .from('reservas')
        .update({ estado: 'cancelada' })
        .eq('id_reserva', bookingId);

      if (updateError) throw updateError;

      // 2. Devolver plazas si teníamos los datos de la reserva
      if (booking) {
        const { error: rpcError } = await supabase.rpc('incrementar_plazas', {
          p_id_excursion: booking.id_excursion,
          p_num_personas: booking.num_personas,
        });

        if (rpcError && __DEV__) {
          console.error('[GranaTour] incrementar_plazas error:', rpcError);
        }
      }

      // 3. Actualizar el estado local sin recargar toda la lista
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

  // ── clearError / clearCurrentBooking ───────────────────────────────────────
  clearError: () => set({ error: null }),
  clearCurrentBooking: () => set({ currentBooking: null }),
}));
