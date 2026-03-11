// Store del panel de guía: excursiones asignadas, reservas y estado de participantes
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Reserva, Usuario, DificultadExcursion, EstadoReserva } from '@/lib/types';

// ─── URL de la Edge Function de notificaciones push ──────────────────────────
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SEND_PUSH_URL = `${SUPABASE_URL}/functions/v1/send-push-notification`;

// ─── Tipos públicos ────────────────────────────────────────────────────────────

// Excursión asignada al guía con conteos de reservas por estado
export interface ExcursionGuia {
  id_excursion: number;
  nombre_ruta: string;
  zona: string;
  fecha_inicio: string;
  imagen_url: string | null;
  plazas_disponibles: number;
  precio_persona: number;
  dificultad: DificultadExcursion | null;
  duracion_horas: number;
  pendiente_count: number;   // Reservas pendientes de confirmar
  confirmada_count: number;  // Reservas confirmadas (participantes)
}

// Reserva con datos del cliente para la vista del guía
export interface ReservaConCliente extends Reserva {
  usuario?: Pick<Usuario, 'id_usuario' | 'nombre' | 'ap1'>;
}

// ─── Tipos internos para respuestas de Supabase ───────────────────────────────

// Fila de reserva raw del JOIN en fetchGuideExcursions
interface RawReservaMinRow {
  estado: EstadoReserva;
  num_personas: number;
}

// Fila raw de excursión con reservas incluidas (JOIN)
interface RawExcursionWithReservas {
  id_excursion: number;
  nombre_ruta: string;
  zona: string;
  fecha_inicio: string;
  imagen_url: string | null;
  plazas_disponibles: number;
  precio_persona: number;
  dificultad: DificultadExcursion | null;
  duracion_horas: number;
  reservas: RawReservaMinRow[] | null;
}

// Usuario del JOIN en fetchExcursionBookings (Supabase puede inferirlo como array)
type UsuarioJoin = Pick<Usuario, 'id_usuario' | 'nombre' | 'ap1'>;

// Fila raw de reserva con usuario JOIN
interface RawReservaClienteRow extends Reserva {
  usuario: UsuarioJoin | UsuarioJoin[] | null;
}

// Normaliza el campo usuario del JOIN (Supabase a veces lo infiere como array)
function mapToReservaConCliente(raw: RawReservaClienteRow): ReservaConCliente {
  const usuario = Array.isArray(raw.usuario) ? raw.usuario[0] : raw.usuario;
  return { ...raw, usuario: usuario ?? undefined };
}

// ─── Mapeo de errores ─────────────────────────────────────────────────────────

function getGuideErrorMessage(error: unknown, context: string): string {
  console.error(`[GranaTour] guideStore.${context}:`, error);
  return 'No se pudo completar la operación. Inténtalo de nuevo';
}

// ─── Estado e interfaz ────────────────────────────────────────────────────────

interface GuideState {
  // Estado
  guideExcursions: ExcursionGuia[];
  excursionBookings: ReservaConCliente[];
  loadingExcursions: boolean;
  loadingBookings: boolean;
  // ID de la reserva que se está actualizando (null = ninguna en curso)
  // Un flag por reserva evita bloquear todas las tarjetas a la vez (I5)
  updatingBookingId: number | null;
  error: string | null;

  // Acciones
  fetchGuideExcursions: () => Promise<void>;
  fetchExcursionBookings: (excursionId: number) => Promise<void>;
  updateBookingStatus: (
    bookingId: number,
    newStatus: 'confirmada' | 'cancelada',
    numPersonas: number,
    excursionId: number
  ) => Promise<boolean>;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGuideStore = create<GuideState>((set, get) => ({
  guideExcursions: [],
  excursionBookings: [],
  loadingExcursions: false,
  loadingBookings: false,
  updatingBookingId: null,
  error: null,

  // ── fetchGuideExcursions ───────────────────────────────────────────────────
  // Carga las excursiones donde id_guia = usuario autenticado
  fetchGuideExcursions: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: 'Usuario no autenticado', guideExcursions: [] });
      return;
    }

    set({ loadingExcursions: true, error: null });
    try {
      const { data, error } = await supabase
        .from('excursiones')
        .select(`
          id_excursion, nombre_ruta, zona, fecha_inicio, imagen_url,
          plazas_disponibles, precio_persona, dificultad, duracion_horas,
          reservas(estado, num_personas)
        `)
        .eq('id_guia', user.id_usuario)
        .eq('activa', true)
        .order('fecha_inicio', { ascending: true });

      if (error) throw error;

      // Calcular conteos de reservas por estado para cada excursión
      const excursions: ExcursionGuia[] = (data ?? []).map((exc) => {
        const raw = exc as unknown as RawExcursionWithReservas;
        const reservas = raw.reservas ?? [];
        const pendiente_count = reservas.filter((r) => r.estado === 'pendiente').length;
        const confirmada_count = reservas.filter((r) => r.estado === 'confirmada').length;

        return {
          id_excursion: raw.id_excursion,
          nombre_ruta: raw.nombre_ruta,
          zona: raw.zona,
          fecha_inicio: raw.fecha_inicio,
          imagen_url: raw.imagen_url,
          plazas_disponibles: raw.plazas_disponibles,
          precio_persona: raw.precio_persona,
          dificultad: raw.dificultad,
          duracion_horas: raw.duracion_horas,
          pendiente_count,
          confirmada_count,
        };
      });

      set({ guideExcursions: excursions, loadingExcursions: false });
    } catch (error) {
      set({
        error: getGuideErrorMessage(error, 'fetchGuideExcursions'),
        loadingExcursions: false,
      });
    }
  },

  // ── fetchExcursionBookings ─────────────────────────────────────────────────
  // Carga las reservas (no canceladas) de una excursión con datos del cliente
  fetchExcursionBookings: async (excursionId: number) => {
    set({ loadingBookings: true, error: null, excursionBookings: [] });
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          *,
          usuario:usuarios(id_usuario, nombre, ap1)
        `)
        .eq('id_excursion', excursionId)
        .neq('estado', 'cancelada')
        .order('fecha_reserva', { ascending: false });

      if (error) throw error;

      const bookings = (data ?? []).map((row) =>
        mapToReservaConCliente(row as unknown as RawReservaClienteRow)
      );

      set({ excursionBookings: bookings, loadingBookings: false });
    } catch (error) {
      set({
        error: getGuideErrorMessage(error, 'fetchExcursionBookings'),
        loadingBookings: false,
      });
    }
  },

  // ── updateBookingStatus ───────────────────────────────────────────────────
  // Confirma o cancela una reserva. Si se cancela, devuelve plazas a la excursión.
  updateBookingStatus: async (bookingId, newStatus, numPersonas, excursionId) => {
    // C1: Verificar rol como defensa en profundidad (la RLS también lo protege en DB)
    const user = useAuthStore.getState().user;
    if (!user || user.rol !== 'guia') {
      set({ error: 'No tienes permisos para gestionar reservas' });
      return false;
    }

    set({ updatingBookingId: bookingId, error: null });
    try {
      const { error: updateError } = await supabase
        .from('reservas')
        .update({ estado: newStatus })
        .eq('id_reserva', bookingId);

      if (updateError) throw updateError;

      // Si se cancela, devolver plazas a la excursión via RPC
      if (newStatus === 'cancelada') {
        const { error: rpcError } = await supabase.rpc('incrementar_plazas', {
          p_id_excursion: excursionId,
          p_num_personas: numPersonas,
        });
        if (rpcError) {
          console.error('[GranaTour] incrementar_plazas error:', rpcError);
        }
      }

      // Enviar notificación push al cliente si el estado cambia a confirmada o cancelada
      // Obtenemos el id_usuario de la reserva desde la lista local
      const booking = get().excursionBookings.find((b) => b.id_reserva === bookingId);
      if (booking && (newStatus === 'confirmada' || newStatus === 'cancelada')) {
        const excursion = get().guideExcursions.find((e) => e.id_excursion === excursionId);
        const excursionNombre = excursion?.nombre_ruta ?? 'tu excursión';

        // Llamada a la Edge Function en background (no bloquea la UI)
        // C-02: Usar el JWT del usuario autenticado (no la anon key pública)
        // para que la Edge Function pueda verificar que el caller es un guía
        supabase.auth.getSession().then(({ data: { session } }) => {
          const accessToken = session?.access_token;
          if (!accessToken) return;

          fetch(SEND_PUSH_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              id_usuario: booking.id_usuario,
              booking_id: bookingId,
              excursion_nombre: excursionNombre,
              new_status: newStatus,
            }),
          }).catch((err) => {
            // No bloquear el flujo si el envío de push falla
            console.error('[GranaTour] guideStore: error enviando push al cliente:', err);
          });
        }).catch((err) => {
          console.error('[GranaTour] guideStore: error obteniendo sesión para push:', err);
        });
      }

      // Actualizar estado local sin recargar la lista completa
      set((state) => {
        // Guardar el estado anterior del booking antes de modificar la lista
        const booking = state.excursionBookings.find((b) => b.id_reserva === bookingId);
        const oldStatus = booking?.estado;

        const updatedBookings =
          newStatus === 'cancelada'
            ? state.excursionBookings.filter((b) => b.id_reserva !== bookingId)
            : state.excursionBookings.map((b) =>
                b.id_reserva === bookingId ? { ...b, estado: newStatus } : b
              );

        // Actualizar conteos en la lista de excursiones del guía
        const updatedGuideExcursions = state.guideExcursions.map((exc) => {
          if (exc.id_excursion !== excursionId) return exc;
          let { pendiente_count, confirmada_count } = exc;
          if (oldStatus === 'pendiente') pendiente_count = Math.max(0, pendiente_count - 1);
          if (oldStatus === 'confirmada') confirmada_count = Math.max(0, confirmada_count - 1);
          if (newStatus === 'confirmada') confirmada_count += 1;
          return { ...exc, pendiente_count, confirmada_count };
        });

        return {
          excursionBookings: updatedBookings,
          guideExcursions: updatedGuideExcursions,
          updatingBookingId: null,
        };
      });

      return true;
    } catch (error) {
      set({
        error: getGuideErrorMessage(error, 'updateBookingStatus'),
        updatingBookingId: null,
      });
      return false;
    }
  },

  // ── clearError ─────────────────────────────────────────────────────────────
  clearError: () => set({ error: null }),
}));
