// Store de notificaciones push: gestiona el token, permisos y registro en Supabase
import { create } from 'zustand';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { PlataformaPush } from '@/lib/types';

// ─── Configuración global de notificaciones ───────────────────────────────────

// Comportamiento al recibir notificación con la app en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Estado e interfaz ────────────────────────────────────────────────────────

interface PushState {
  // Estado
  expoPushToken: string | null;
  permissionGranted: boolean;
  loadingRegister: boolean;
  error: string | null;

  // Acciones
  registerPushToken: () => Promise<void>;
  deactivateToken: () => Promise<void>;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePushStore = create<PushState>((set, get) => ({
  expoPushToken: null,
  permissionGranted: false,
  loadingRegister: false,
  error: null,

  // ── registerPushToken ──────────────────────────────────────────────────────
  // Solicita permiso, obtiene el token de Expo y lo guarda en PUSH_TOKENS.
  // Solo funciona en dispositivos físicos (los simuladores no reciben push).
  registerPushToken: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Expo push tokens solo disponibles en dispositivos físicos
    if (!Device.isDevice) {
      if (__DEV__) {
        console.warn('[GranaTour] pushStore: tokens push solo disponibles en dispositivo físico');
      }
      return;
    }

    set({ loadingRegister: true, error: null });
    try {
      // Comprobar/solicitar permiso de notificaciones
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        set({ permissionGranted: false, loadingRegister: false });
        return;
      }

      set({ permissionGranted: true });

      // Obtener el Expo Push Token (formato: ExponentPushToken[xxxxxx])
      const tokenResponse = await Notifications.getExpoPushTokenAsync();
      const token = tokenResponse.data;

      // Determinar plataforma
      const plataforma: PlataformaPush = Platform.OS === 'ios' ? 'ios' : 'android';

      // Guardar o actualizar el token en Supabase usando upsert
      // La combinación (id_usuario, token) es única → actualiza si ya existe
      const { error: upsertError } = await supabase
        .from('push_tokens')
        .upsert(
          {
            id_usuario: user.id_usuario,
            token,
            plataforma,
            activo: true,
            fecha_registro: new Date().toISOString(),
          },
          { onConflict: 'token' }
        );

      if (upsertError) throw upsertError;

      set({ expoPushToken: token, loadingRegister: false });
    } catch (error) {
      console.error('[GranaTour] pushStore.registerPushToken:', error);
      set({
        error: 'No se pudo registrar el dispositivo para notificaciones',
        loadingRegister: false,
      });
    }
  },

  // ── deactivateToken ────────────────────────────────────────────────────────
  // Marca el token como inactivo al cerrar sesión. No elimina el registro
  // para mantener el historial y evitar duplicados al volver a iniciar sesión.
  deactivateToken: async () => {
    const token = get().expoPushToken;
    if (!token) return;

    try {
      const { error } = await supabase
        .from('push_tokens')
        .update({ activo: false })
        .eq('token', token);

      if (error) {
        console.error('[GranaTour] pushStore.deactivateToken:', error);
      }
    } finally {
      // Limpiar estado local independientemente del resultado
      set({ expoPushToken: null, permissionGranted: false });
    }
  },

  // ── clearError ─────────────────────────────────────────────────────────────
  clearError: () => set({ error: null }),
}));
