// Store de autenticación: sesión de Supabase y datos del usuario autenticado
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import type { Usuario } from '@/lib/types';

interface AuthState {
  // Estado
  session: Session | null;
  user: Usuario | null;
  // CR-01: initializing evita la race condition al arrancar la app.
  // Es true hasta que getSession() resuelve, impidiendo redirecciones prematuras.
  initializing: boolean;
  loading: boolean;
  error: string | null;

  // Acciones de sesión
  setSession: (session: Session | null) => void;
  setUser: (user: Usuario | null) => void;
  setInitializing: (initializing: boolean) => void;
  setLoading: (loading: boolean) => void;

  // Acciones de autenticación (implementar en Fase 1)
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

export interface SignUpData {
  email: string;
  password: string;
  nombre: string;
  ap1: string;
  ap2?: string;
  dni: string;
  telefono?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      initializing: true,
      loading: false,
      error: null,

      setSession: (session) => set({ session }),
      setUser: (user) => set({ user }),
      setInitializing: (initializing) => set({ initializing }),
      setLoading: (loading) => set({ loading }),

      signIn: async (_email, _password) => {
        // Implementar en Fase 1
      },

      signUp: async (_data) => {
        // Implementar en Fase 1
      },

      signOut: async () => {
        // Implementar en Fase 1
      },

      resetPassword: async (_email) => {
        // Implementar en Fase 1
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Solo persiste el usuario; la sesión la gestiona Supabase directamente.
      // initializing no se persiste: siempre arranca en true hasta que getSession resuelve.
      partialize: (state) => ({ user: state.user }),
    }
  )
);
