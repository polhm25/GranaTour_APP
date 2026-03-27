// Store de modo offline: estado de conectividad y cola de acciones pendientes
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NewBookingData } from '@/stores/bookingsStore';

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Tipo discriminado para las acciones que se pueden encolar offline
export interface PendingCreateBooking {
  id: string;           // UUID local para identificar la acción
  type: 'create_booking';
  payload: NewBookingData;
  timestamp: number;    // Unix ms
}

export type PendingAction = PendingCreateBooking;

// ─── Estado e interfaz ────────────────────────────────────────────────────────

interface OfflineState {
  // Estado
  isOnline: boolean;
  pendingActions: PendingAction[];
  syncing: boolean;    // Verdadero mientras se procesan acciones pendientes

  // Acciones
  setOnlineStatus: (online: boolean) => void;
  addPendingAction: (action: Omit<PendingAction, 'id' | 'timestamp'>) => void;
  removePendingAction: (id: string) => void;
  clearPendingActions: () => void;
  setSyncing: (syncing: boolean) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      isOnline: true,
      pendingActions: [],
      syncing: false,

      // Actualizar el estado de conectividad
      setOnlineStatus: (online: boolean) => set({ isOnline: online }),

      // Añadir una acción a la cola con ID único y timestamp
      addPendingAction: (action) => {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const pending: PendingAction = {
          ...action,
          id,
          timestamp: Date.now(),
        } as PendingAction;

        set((state) => ({
          pendingActions: [...state.pendingActions, pending],
        }));
      },

      // Eliminar una acción de la cola por su ID
      removePendingAction: (id: string) =>
        set((state) => ({
          pendingActions: state.pendingActions.filter((a) => a.id !== id),
        })),

      // Limpiar toda la cola
      clearPendingActions: () => set({ pendingActions: [] }),

      setSyncing: (syncing: boolean) => set({ syncing }),
    }),
    {
      name: 'offline-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Solo persistir la cola de acciones. isOnline siempre se recalcula al arrancar.
      partialize: (state) => ({ pendingActions: state.pendingActions }),
    }
  )
);
