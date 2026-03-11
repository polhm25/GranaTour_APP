// Store de reviews y valoraciones de excursiones (Fase 7)
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Review, ReviewConUsuario } from '@/lib/types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface NewReviewData {
  id_excursion: number;
  puntuacion: number; // 1-5
  comentario?: string;
}

// Campos seleccionados en las queries de reviews (incluye JOIN a usuarios)
const REVIEW_FIELDS =
  'id_review, id_usuario, id_excursion, puntuacion, comentario, fecha, usuario:usuarios!id_usuario(id_usuario, nombre, ap1, avatar_url)';

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
  fetchReviewsByExcursion: (excursionId: number) => Promise<void>;
  createReview: (data: NewReviewData) => Promise<Review | null>;
  editReview: (reviewId: number, data: Partial<NewReviewData>) => Promise<void>;
  deleteReview: (reviewId: number) => Promise<void>;
  clearReviews: () => void;
  clearError: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Calcula la media de puntuaciones a partir del array de reviews
function calculateAverage(reviews: ReviewConUsuario[]): number | null {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((acc, r) => acc + r.puntuacion, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

// Actualiza la valoración del guía en la tabla usuarios tras cambiar las reviews.
// Se llama de forma asíncrona (fire-and-forget) para no bloquear la UI.
async function updateGuideRating(excursionId: number): Promise<void> {
  try {
    // Paso 1: obtener el guía de la excursión
    const { data: excData } = await supabase
      .from('excursiones')
      .select('id_guia')
      .eq('id_excursion', excursionId)
      .single();

    if (!excData?.id_guia) return;

    // Paso 2: obtener todas las excursiones del guía
    const { data: excursionesData } = await supabase
      .from('excursiones')
      .select('id_excursion')
      .eq('id_guia', excData.id_guia);

    if (!excursionesData || excursionesData.length === 0) return;

    const excursionIds = excursionesData.map((e) => e.id_excursion as number);

    // Paso 3: obtener todas las reviews de esas excursiones
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('puntuacion')
      .in('id_excursion', excursionIds);

    const media =
      reviewsData && reviewsData.length > 0
        ? reviewsData.reduce((sum: number, r) => sum + (r.puntuacion as number), 0) / reviewsData.length
        : null;

    // Paso 4: actualizar el campo valoracion del guía
    await supabase
      .from('usuarios')
      .update({ valoracion: media !== null ? Math.round(media * 100) / 100 : null })
      .eq('id_usuario', excData.id_guia);
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
  fetchReviewsByExcursion: async (excursionId: number): Promise<void> => {
    set({
      loadingList: true,
      error: null,
      reviews: [],
      userReview: null,
      averageRating: null,
      userCanReview: false,
    });

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

      const reviews = (data ?? []) as unknown as ReviewConUsuario[];
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

      // Refrescar la lista local para incluir la nueva review con datos del usuario
      await get().fetchReviewsByExcursion(data.id_excursion);

      // Actualizar valoración del guía en segundo plano
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

    set({ loadingEdit: true, error: null });

    try {
      const updatePayload: Record<string, unknown> = {};
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

      // Refrescar lista para reflejar el cambio
      const userReview = get().userReview;
      if (userReview) {
        await get().fetchReviewsByExcursion(userReview.id_excursion);
        updateGuideRating(userReview.id_excursion);
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
