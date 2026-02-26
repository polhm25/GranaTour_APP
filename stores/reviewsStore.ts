// Store de reviews y valoraciones de excursiones
import { create } from 'zustand';
import type { Review, ReviewConUsuario } from '@/lib/types';

export interface NewReviewData {
  id_excursion: number;
  puntuacion: number; // 1-5
  comentario?: string;
}

interface ReviewsState {
  // Estado
  reviews: ReviewConUsuario[];
  loading: boolean;
  error: string | null;

  // Acciones (implementar en Fase 7)
  fetchReviewsByExcursion: (excursionId: number) => Promise<void>;
  createReview: (data: NewReviewData) => Promise<Review | null>;
  editReview: (reviewId: number, data: Partial<NewReviewData>) => Promise<void>;
  deleteReview: (reviewId: number) => Promise<void>;
  clearError: () => void;
}

export const useReviewsStore = create<ReviewsState>((set) => ({
  reviews: [],
  loading: false,
  error: null,

  fetchReviewsByExcursion: async (_excursionId: number) => {
    // Implementar en Fase 7
  },

  createReview: async (_data: NewReviewData) => {
    // Implementar en Fase 7
    return null;
  },

  editReview: async (_reviewId: number, _data: Partial<NewReviewData>) => {
    // Implementar en Fase 7
  },

  deleteReview: async (_reviewId: number) => {
    // Implementar en Fase 7
  },

  clearError: () => set({ error: null }),
}));
