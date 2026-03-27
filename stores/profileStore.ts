// Store de perfil: edición de datos personales, avatar y estadísticas del usuario
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Usuario } from '@/lib/types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Datos editables del perfil (campos que puede cambiar el usuario)
export interface ProfileUpdateData {
  nombre: string;
  bio: string | null;
  telefono: string | null;
}

// Punto de datos del gráfico de actividad (un punto por día)
export interface ChartDataPoint {
  date: string;       // 'YYYY-MM-DD'
  distanceKm: number; // km totales del día
  count: number;      // número de actividades del día
}

// Campos SELECT completos para recargar el usuario desde la DB
const USER_SELECT =
  'id_usuario, supabase_auth_id, nombre, ap1, ap2, dni, email, telefono, rol, password, avatar_url, bio, valoracion, num_turnos, total_km, total_excursiones, fecha_registro, ultimo_acceso';

interface ProfileState {
  // Estado de carga por operación independiente
  loadingUpdate: boolean;
  loadingAvatar: boolean;
  loadingStats: boolean;
  loadingChart: boolean;

  // Estadísticas calculadas (complementan los campos de Usuario)
  activityCount: number; // número de actividades de tracking (no descartadas)

  // Datos del gráfico de los últimos 30 días
  chartData: ChartDataPoint[];

  error: string | null;

  // Acciones
  updateProfile: (data: ProfileUpdateData) => Promise<boolean>;
  uploadAvatar: (uri: string) => Promise<boolean>;
  fetchActivityStats: () => Promise<void>;
  fetchActivityChart: () => Promise<void>;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProfileStore = create<ProfileState>((set) => ({
  loadingUpdate: false,
  loadingAvatar: false,
  loadingStats: false,
  loadingChart: false,
  activityCount: 0,
  chartData: [],
  error: null,

  // ── updateProfile ──────────────────────────────────────────────────────────
  updateProfile: async (data) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: 'Usuario no autenticado' });
      return false;
    }

    set({ loadingUpdate: true, error: null });
    try {
      const { data: updated, error } = await supabase
        .from('usuarios')
        .update({
          nombre: data.nombre.trim(),
          bio: data.bio?.trim() || null,
          telefono: data.telefono?.trim() || null,
        })
        .eq('id_usuario', user.id_usuario)
        .select(USER_SELECT)
        .single();

      if (error) {
        console.error('[GranaTour] updateProfile error:', error);
        set({ error: 'No se pudo actualizar el perfil. Inténtalo de nuevo', loadingUpdate: false });
        return false;
      }

      // Propagar el usuario actualizado al authStore para que sea visible en toda la app
      useAuthStore.getState().setUser(updated as Usuario);
      set({ loadingUpdate: false });
      return true;
    } catch (err) {
      console.error('[GranaTour] updateProfile catch:', err);
      set({ error: 'No se pudo actualizar el perfil. Inténtalo de nuevo', loadingUpdate: false });
      return false;
    }
  },

  // ── uploadAvatar ───────────────────────────────────────────────────────────
  uploadAvatar: async (uri) => {
    const user = useAuthStore.getState().user;
    if (!user || !user.supabase_auth_id) {
      set({ error: 'Usuario no autenticado' });
      return false;
    }

    set({ loadingAvatar: true, error: null });
    try {
      // Obtener blob desde la URI local
      const response = await fetch(uri);
      const blob = await response.blob();

      // Path en el bucket avatars: {supabase_auth_id}/avatar.jpg
      // upsert: true para reemplazar el avatar existente
      const path = `${user.supabase_auth_id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) {
        console.error('[GranaTour] uploadAvatar storage error:', uploadError);
        set({ error: 'No se pudo subir el avatar. Inténtalo de nuevo', loadingAvatar: false });
        return false;
      }

      // Cache-busting: la URL del bucket es la misma tras el reemplazo,
      // añadimos timestamp para forzar recarga en la UI
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Actualizar avatar_url en la tabla usuarios
      const { data: updated, error: updateError } = await supabase
        .from('usuarios')
        .update({ avatar_url: avatarUrl })
        .eq('id_usuario', user.id_usuario)
        .select(USER_SELECT)
        .single();

      if (updateError) {
        console.error('[GranaTour] uploadAvatar update error:', updateError);
        set({ error: 'No se pudo actualizar el avatar. Inténtalo de nuevo', loadingAvatar: false });
        return false;
      }

      useAuthStore.getState().setUser(updated as Usuario);
      set({ loadingAvatar: false });
      return true;
    } catch (err) {
      console.error('[GranaTour] uploadAvatar catch:', err);
      set({ error: 'No se pudo subir el avatar. Inténtalo de nuevo', loadingAvatar: false });
      return false;
    }
  },

  // ── fetchActivityStats ─────────────────────────────────────────────────────
  // Cuenta las actividades de tracking del usuario (excluye descartadas)
  fetchActivityStats: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ loadingStats: true });
    try {
      const { count, error } = await supabase
        .from('actividades')
        .select('id_actividad', { count: 'exact', head: true })
        .eq('id_usuario', user.id_usuario)
        .neq('estado', 'descartada');

      if (error) {
        console.error('[GranaTour] fetchActivityStats error:', error);
        set({ loadingStats: false });
        return;
      }

      set({ activityCount: count ?? 0, loadingStats: false });
    } catch (err) {
      console.error('[GranaTour] fetchActivityStats catch:', err);
      set({ loadingStats: false });
    }
  },

  // ── fetchActivityChart ─────────────────────────────────────────────────────
  // Carga actividades de los últimos 30 días y las agrupa por día para el gráfico
  fetchActivityChart: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ loadingChart: true });
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

      const { data, error } = await supabase
        .from('actividades')
        .select('fecha_inicio, distancia_km')
        .eq('id_usuario', user.id_usuario)
        .neq('estado', 'descartada')
        .gte('fecha_inicio', thirtyDaysAgo.toISOString())
        .order('fecha_inicio', { ascending: true });

      if (error) {
        console.error('[GranaTour] fetchActivityChart error:', error);
        set({ loadingChart: false });
        return;
      }

      // Inicializar los 30 días con valores a cero
      const byDay = new Map<string, ChartDataPoint>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        byDay.set(dateStr, { date: dateStr, distanceKm: 0, count: 0 });
      }

      // Acumular datos de actividades
      for (const row of data ?? []) {
        const dateStr = (row.fecha_inicio as string).slice(0, 10);
        const point = byDay.get(dateStr);
        if (point) {
          point.distanceKm += (row.distancia_km as number | null) ?? 0;
          point.count += 1;
        }
      }

      set({ chartData: Array.from(byDay.values()), loadingChart: false });
    } catch (err) {
      console.error('[GranaTour] fetchActivityChart catch:', err);
      set({ loadingChart: false });
    }
  },

  // ── clearError ─────────────────────────────────────────────────────────────
  clearError: () => set({ error: null }),
}));
