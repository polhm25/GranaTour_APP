// Hook de autenticación: expone el estado y acciones del authStore
// IM-07: useShallow agrupa los selectores en una sola suscripción para evitar
// re-renders innecesarios cuando cambian partes del store que no interesan.
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { session, user, initializing, loading, error } = useAuthStore(
    useShallow((state) => ({
      session: state.session,
      user: state.user,
      initializing: state.initializing,
      loading: state.loading,
      error: state.error,
    }))
  );

  // Las acciones son referencias estables en Zustand; no necesitan selector reactivo.
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const signOut = useAuthStore((state) => state.signOut);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const clearError = useAuthStore((state) => state.clearError);

  const isAuthenticated = session !== null;

  return {
    session,
    user,
    initializing,
    loading,
    error,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    resetPassword,
    clearError,
  };
}
