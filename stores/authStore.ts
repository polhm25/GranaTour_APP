// Store de autenticación: sesión de Supabase y datos del usuario autenticado
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Usuario } from '@/lib/types';

// ─── Mapeo de mensajes de error de Supabase a español ────────────────────────

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'Email o contraseña incorrectos';
  }
  if (lower.includes('email already registered') || lower.includes('user already registered')) {
    return 'Este email ya está registrado';
  }
  if (lower.includes('password should be at least') || lower.includes('weak password')) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  if (lower.includes('invalid email')) {
    return 'El formato del email no es válido';
  }
  if (lower.includes('email not confirmed')) {
    return 'Debes confirmar tu email antes de iniciar sesión';
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Error de red. Comprueba tu conexión a Internet';
  }
  if (lower.includes('signup is disabled')) {
    return 'El registro está desactivado temporalmente';
  }
  // Errores de triggers o constraints en la base de datos
  if (lower.includes('database error') || lower.includes('unexpected') || lower.includes('duplicate')) {
    return 'Error al crear la cuenta. Comprueba que tus datos no estén ya registrados';
  }

  return 'Ha ocurrido un error. Inténtalo de nuevo';
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SignUpData {
  email: string;
  password: string;
  nombre: string;
  ap1: string;
  ap2?: string;
  dni: string;
  telefono?: string;
}

interface AuthState {
  // Estado
  session: Session | null;
  user: Usuario | null;
  // CR-01: initializing evita la race condition al arrancar la app.
  // Es true hasta que getSession() resuelve, impidiendo redirecciones prematuras.
  initializing: boolean;
  loading: boolean;
  error: string | null;

  // Acciones de sesión (usadas desde el root layout)
  setSession: (session: Session | null) => void;
  setUser: (user: Usuario | null) => void;
  setInitializing: (initializing: boolean) => void;
  setLoading: (loading: boolean) => void;

  // Acciones de autenticación
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Estado inicial
      session: null,
      user: null,
      initializing: true,
      loading: false,
      error: null,

      // Setters simples para el root layout (onAuthStateChange)
      setSession: (session) => set({ session }),
      setUser: (user) => set({ user }),
      setInitializing: (initializing) => set({ initializing }),
      setLoading: (loading) => set({ loading }),

      // ── signIn ─────────────────────────────────────────────────────────────
      signIn: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ error: translateAuthError(error.message), loading: false });
            throw error;
          }

          // Guardamos la sesión inmediatamente
          set({ session: data.session });

          // Buscamos el perfil en la tabla USUARIOS vinculado al auth user
          const { data: userData, error: userError } = await supabase
            .from('USUARIOS')
            .select(
              'id_usuario, supabase_auth_id, nombre, ap1, ap2, dni, email, telefono, rol, password, avatar_url, bio, valoracion, num_turnos, total_km, total_excursiones, fecha_registro, ultimo_acceso'
            )
            .eq('supabase_auth_id', data.session.user.id)
            .single();

          if (userError) {
            // El perfil puede no existir aún si el trigger handle_new_user tarda.
            // No es un error bloqueante: el listener onAuthStateChange lo reintentará.
            set({ user: null, loading: false });
            return;
          }

          set({ user: userData as Usuario, loading: false });
        } catch (error) {
          // Solo relanzamos si aún no hemos hecho set del error arriba
          set((state) => ({
            loading: false,
            error: state.error ?? translateAuthError((error as Error).message),
          }));
          throw error;
        }
      },

      // ── signUp ─────────────────────────────────────────────────────────────
      signUp: async (data) => {
        set({ loading: true, error: null });
        try {
          // El trigger handle_new_user en la DB usa el metadata para crear
          // automáticamente la fila en USUARIOS al completar el registro.
          const { data: authData, error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                nombre: data.nombre,
                ap1: data.ap1,
                ap2: data.ap2 ?? null,
                dni: data.dni,
                telefono: data.telefono ?? null,
              },
            },
          });

          // Log para depuración: ver respuesta real de Supabase en la consola de Expo
          if (__DEV__) {
            console.log('[GranaTour] signUp response:', JSON.stringify(authData));
          }

          if (error) {
            // Log del error real para facilitar el diagnóstico
            console.error('[GranaTour] signUp error:', error.message, error);
            set({ error: translateAuthError(error.message), loading: false });
            throw error;
          }

          // BUG-03: Supabase devuelve éxito silencioso con identities vacío
          // cuando email confirmation está activo y el email ya está registrado.
          if (authData.user?.identities?.length === 0) {
            const msg = 'Este email ya está registrado';
            set({ error: msg, loading: false });
            throw new Error(msg);
          }

          // La sesión y el user se gestionan desde onAuthStateChange en _layout.tsx.
          // Aquí solo limpiamos el estado de carga.
          set({ loading: false });
        } catch (error) {
          console.error('[GranaTour] signUp catch:', (error as Error).message);
          set((state) => ({
            loading: false,
            error: state.error ?? translateAuthError((error as Error).message),
          }));
          throw error;
        }
      },

      // ── signOut ────────────────────────────────────────────────────────────
      signOut: async () => {
        set({ loading: true });
        try {
          await supabase.auth.signOut();
        } finally {
          // Limpiamos el estado local independientemente del resultado de Supabase.
          // Si signOut falla en red, el token expirado o inválido igualmente no
          // permitirá al usuario acceder a datos protegidos por RLS.
          set({ session: null, user: null, loading: false, error: null });
        }
      },

      // ── resetPassword ──────────────────────────────────────────────────────
      resetPassword: async (email) => {
        set({ loading: true, error: null });
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email);

          if (error) {
            set({ error: translateAuthError(error.message), loading: false });
            throw error;
          }

          set({ loading: false });
        } catch (error) {
          set((state) => ({
            loading: false,
            error: state.error ?? translateAuthError((error as Error).message),
          }));
          throw error;
        }
      },

      // ── clearError ─────────────────────────────────────────────────────────
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
