// Store de reservas: reservas del usuario autenticado
import { create } from 'zustand';
import type { Reserva, ReservaConDetalles } from '@/lib/types';

export interface NewBookingData {
  id_excursion: number;
  num_personas: number;
  notas?: string;
}

interface BookingsState {
  // Estado
  bookings: ReservaConDetalles[];
  currentBooking: ReservaConDetalles | null;
  loading: boolean;
  error: string | null;

  // Acciones
  fetchBookings: () => Promise<void>;
  getBookingById: (id: number) => Promise<ReservaConDetalles | null>;
  createBooking: (data: NewBookingData) => Promise<Reserva | null>;
  cancelBooking: (bookingId: number) => Promise<void>;
  clearError: () => void;
}

export const useBookingsStore = create<BookingsState>((set) => ({
  bookings: [],
  currentBooking: null,
  loading: false,
  error: null,

  fetchBookings: async () => {
    // Implementar en Fase 3
  },

  getBookingById: async (_id: number) => {
    // Implementar en Fase 3
    return null;
  },

  createBooking: async (_data: NewBookingData) => {
    // Implementar en Fase 3
    return null;
  },

  cancelBooking: async (_bookingId: number) => {
    // Implementar en Fase 3
  },

  clearError: () => set({ error: null }),
}));
