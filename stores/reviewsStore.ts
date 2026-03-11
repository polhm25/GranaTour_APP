// Store de reviews y valoraciones de excursiones (Fase 7)
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Review, ReviewConUsuario, Usuario } from '@/lib/types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface NewReviewData {
  id_excursion: number;
  puntuacion: number; // 1-5
  comentario?: string;
}

// Campos seleccionados en las queries de reviews (incluye JOIN a usuarios)
const REVIEW_FIELDS =
  'id_review, id_usuario, id_excursion, puntuacion, comentario, fecha, usuario:usuarios!id_usuario(id_usuario, nombre, ap1, avatar_url)';

// Tipo local que describe la respuesta de Supabase para REVIEW_FIELDS.
// Supabase puede devolver los campos de JOIN como array o como objeto único,
// dependiendo de la relación inferida; se maneja en mapToReviewConUsuario. (C-03)
type RawReviewRow = {
  id_review: number;
  id_usuario: number;
  id_excursion: number;
  puntuacion: number;
  comentario: string | null;
  fecha: string;
  usuario:
    | Pick<Usuario, 'id_usuario' | 'nombre' | 'ap1' | 'avatar_url'>
    | Pick<Usuario, 'id_usuario' | 'nombre' | 'ap1' | 'avatar_url'>[]
    | null;
};

// Payload tipado para edición de reviews (I-07)
type EditReviewPayload = {
  puntuacion?: number;
  comentario?: string | null;
};

interface ReviewsState {
  // Lista de reviews de la excursión actual
  reviews: ReviewConUsuario[];
  // Review del usuario autenticado para la excursión actual (null si no ha valorado)
  userReview: Review | null;
  // Media de valoraciones calculada localmente (null si no hay reviews)
  averageRating: number | null;
  // ¿Puede el usuario crear una review? (tiene reserva confirmada y no ha valorado aún)
  userCanReview: boolean;

  // Flags de carga independientes por operación
  loadingList: boolean;
  loadingCreate: boolean;
  loadingEdit: boolean;
  loadingDelete: boolean;
  error: string | null;

  // Acciones
  // keepExisting: true para refrescar sin limpiar la lista (evita flash visual - I-01)
  fetchReviewsByExcursion: (excursionId: number, keepExisting?: boolean) => Promise<void>;
  createReview: (data: NewReviewData) => Promise<Review | null>;
  editReview: (reviewId: number, data: Partial<NewReviewData>) => Promise<void>;
  deleteReview: (reviewId: number) => Promise<void>;
  clearReviews: () => void;
  clearError: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Convierte la respuesta raw de Supabase al tipo ReviewConUsuario.
// El campo usuario puede venir como objeto o array (Supabase lo infiere diferente
// según la versión de tipos); se normaliza aquí para evitar el cast unsound. (C-03)
function mapToReviewConUsuario(row: RawReviewRow): ReviewConUsuario {
  const rawUsuario = row.usuario;
  const usuario = Array.isArray(rawUsuario) ? (rawUsuario[0] ?? undefined) : (rawUsuario ?? undefined);
  return {
    id_review: row.id_review,
    id_usuario: row.id_usuario,
    id_excursion: row.id_excursion,
    puntuacion: row.puntuacion,
    comentario: row.comentario,
    fecha: row.fecha,
    usuario,
  };
}

// Calcula la media de puntuaciones a partir del array de reviews
function calculateAverage(reviews: ReviewConUsuario[]): number | null {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((acc, r) => acc + r.puntuacion, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

// Valida que puntuacion sea un entero entre 1 y 5 (C-01)
function isValidPuntuacion(puntuacion: number): boolean {
  return Number.isInteger(puntuacion) && puntuacion >= 1 && puntuacion <= 5;
}

// Llama al RPC recalcular_valoracion_guia de Supabase (SECURITY DEFINER)
// para actualizar la valoración del guía tras cambios en sus reviews. (C-02)
// Se llama de forma asíncrona (fire-and-forget) para no bloquear la UI.
async function updateGuideRating(excursionId: number): Promise<void> {
  try {
    const { error } = await supabase.rpc('recalcular_valoracion_guia', {
      p_id_excursion: excursionId,
    });
    if (error) {
      console.error('[GranaTour] updateGuideRating RPC error:', error);
    }
  } catch (err) {
    console.error('[GranaTour] updateGuideRating error:', err);
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useReviewsStore = create<ReviewsState>((set, get) => ({
  reviews: [],
  userReview: null,
  averageRating: null,
  userCanReview: false,
  loadingList: false,
  loadingCreate: false,
  loadingEdit: false,
  loadingDelete: false,
  error: null,

  // ── fetchReviewsByExcursion ────────────────────────────────────────────────
  fetchReviewsByExcursion: async (excursionId: number, keepExisting = false): Promise<void> => {
    // keepExisting=true: no limpiar reviews existentes para evitar flash visual (I-01)
    set(
      keepExisting
        ? { loadingList: true, error: null }
        : {
            loadingList: true,
            error: null,
            reviews: [],
            userReview: null,
            averageRating: null,
            userCanReview: false,
          }
    );

    try {
      // Obtener reviews con datos del usuario que valoró
      const { data, error } = await supabase
        .from('reviews')
        .select(REVIEW_FIELDS)
        .eq('id_excursion', excursionId)
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[GranaTour] fetchReviewsByExcursion error:', error);
        set({ error: 'No se pudieron cargar las valoraciones', loadingList: false });
        return;
      }

      // Mapeo explícito al tipo ReviewConUsuario para evitar casteo inseguro (C-03)
      const reviews: ReviewConUsuario[] = (data as RawReviewRow[]).map(mapToReviewConUsuario);
      const averageRating = calculateAverage(reviews);

      // Buscar la review del usuario autenticado (si existe)
      const user = useAuthStore.getState().user;
      const userReview = user
        ? (reviews.find((r) => r.id_usuario === user.id_usuario) as Review | undefined) ?? null
        : null;

      // Verificar si el usuario puede crear una nueva review:
      // - Está autenticado
      // - No ha valorado todavía esta excursión
      // - Tiene al menos una reserva confirmada para esta excursión
      let userCanReview = false;
      if (user && !userReview) {
        const { data: bookingData } = await supabase
          .from('reservas')
          .select('id_reserva')
          .eq('id_excursion', excursionId)
          .eq('id_usuario', user.id_usuario)
          .eq('estado', 'confirmada')
          .limit(1);

        userCanReview = (bookingData?.length ?? 0) > 0;
      }

      set({ reviews, averageRating, userReview, userCanReview, loadingList: false });
    } catch (err) {
      console.error('[GranaTour] fetchReviewsByExcursion catch:', err);
      set({ error: 'Error de conexión al cargar las valoraciones', loadingList: false });
    }
  },

  // ── createReview ───────────────────────────────────────────────────────────
  createReview: async (data: NewReviewData): Promise<Review | null> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: 'Debes iniciar sesión para valorar una excursión' });
      return null;
    }

    // Validación de puntuacion antes de enviar a Supabase (C-01)
    if (!isValidPuntuacion(data.puntuacion)) {
      set({ error: 'La puntuación debe ser un valor entero entre 1 y 5' });
      return null;
    }

    set({ loadingCreate: true, error: null });

    try {
      const { data: inserted, error } = await supabase
        .from('reviews')
        .insert({
          id_usuario: user.id_usuario,
          id_excursion: data.id_excursion,
          puntuacion: data.puntuacion,
          comentario: data.comentario?.trim() || null,
          fecha: new Date().toISOString(),
        })
        .select('id_review, id_usuario, id_excursion, puntuacion, comentario, fecha')
        .single();

      if (error) {
        console.error('[GranaTour] createReview error:', error);
        // El constraint UNIQUE (id_usuario, id_excursion) lanza error si ya existe
        const isDuplicate =
          error.code === '23505' || error.message.toLowerCase().includes('unique');
        set({
          error: isDuplicate
            ? 'Ya has valorado esta excursión anteriormente'
            : 'No se pudo guardar la valoración. Inténtalo de nuevo',
          loadingCreate: false,
        });
        return null;
      }

      const newReview = inserted as Review;

      // Refrescar la lista sin limpiar la existente para evitar flash visual (I-01)
      await get().fetchReviewsByExcursion(data.id_excursion, true);

      // Actualizar valoración del guía en segundo plano (C-02)
      updateGuideRating(data.id_excursion);

      set({ loadingCreate: false });
      return newReview;
    } catch (err) {
      console.error('[GranaTour] createReview catch:', err);
      set({ error: 'Error de conexión al guardar la valoración', loadingCreate: false });
      return null;
    }
  },

  // ── editReview ─────────────────────────────────────────────────────────────
  editReview: async (reviewId: number, data: Partial<NewReviewData>): Promise<void> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: 'Debes iniciar sesión para editar tu valoración' });
      return;
    }

    // Validación de puntuacion antes de enviar a Supabase (C-01)
    if (data.puntuacion !== undefined && !isValidPuntuacion(data.puntuacion)) {
      set({ error: 'La puntuación debe ser un valor entero entre 1 y 5' });
      return;
    }

    // Guardar id_excursion al inicio para evitar race condition si userReview cambia (I-02)
    const excursionId = get().userReview?.id_excursion;

    set({ loadingEdit: true, error: null });

    try {
      // Payload tipado para evitar Record<string, unknown> (I-07)
      const updatePayload: EditReviewPayload = {};
      if (data.puntuacion !== undefined) updatePayload.puntuacion = data.puntuacion;
      if (data.comentario !== undefined) updatePayload.comentario = data.comentario?.trim() || null;

      const { error } = await supabase
        .from('reviews')
        .update(updatePayload)
        .eq('id_review', reviewId)
        .eq('id_usuario', user.id_usuario); // RLS: solo el propietario puede editar

      if (error) {
        console.error('[GranaTour] editReview error:', error);
        set({ error: 'No se pudo actualizar la valoración. Inténtalo de nuevo', loadingEdit: false });
        return;
      }

      // Refrescar lista sin limpiar para evitar flash visual (I-01, I-02)
      if (excursionId !== undefined) {
        await get().fetchReviewsByExcursion(excursionId, true);
        updateGuideRating(excursionId);
      }

      set({ loadingEdit: false });
    } catch (err) {
      console.error('[GranaTour] editReview catch:', err);
      set({ error: 'Error de conexión al actualizar la valoración', loadingEdit: false });
    }
  },

  // ── deleteReview ───────────────────────────────────────────────────────────
  deleteReview: async (reviewId: number): Promise<void> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: 'Debes iniciar sesión para eliminar tu valoración' });
      return;
    }

    // Guardar id_excursion antes de limpiar el estado
    const excursionId = get().userReview?.id_excursion;

    set({ loadingDelete: true, error: null });

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id_review', reviewId)
        .eq('id_usuario', user.id_usuario); // RLS: solo el propietario puede eliminar

      if (error) {
        console.error('[GranaTour] deleteReview error:', error);
        set({ error: 'No se pudo eliminar la valoración. Inténtalo de nuevo', loadingDelete: false });
        return;
      }

      // Refrescar lista para reflejar la eliminación
      if (excursionId !== undefined) {
        await get().fetchReviewsByExcursion(excursionId);
        updateGuideRating(excursionId);
      }

      set({ loadingDelete: false });
    } catch (err) {
      console.error('[GranaTour] deleteReview catch:', err);
      set({ error: 'Error de conexión al eliminar la valoración', loadingDelete: false });
    }
  },

  // ── clearReviews ───────────────────────────────────────────────────────────
  clearReviews: () =>
    set({
      reviews: [],
      userReview: null,
      averageRating: null,
      userCanReview: false,
      error: null,
    }),

  // ── clearError ─────────────────────────────────────────────────────────────
  clearError: () => set({ error: null }),
}));
