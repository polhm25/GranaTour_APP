// Store de fotos geolocalizadas: subida, consulta y eliminación de fotos de actividades
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { uploadPhoto as uploadPhotoToStorage } from '@/lib/storage';
import type { Foto } from '@/lib/types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Opciones para subir una foto nueva
export interface UploadPhotoOptions {
  uri: string; // URI local de la imagen
  latitud?: number;
  longitud?: number;
  descripcion?: string;
  id_actividad?: number;
  id_excursion?: number;
}

interface PhotosState {
  photos: Foto[];
  loading: boolean;
  uploading: boolean;
  error: string | null;

  // Acciones
  uploadPhoto: (options: UploadPhotoOptions) => Promise<Foto | null>;
  fetchPhotosByActivity: (id_actividad: number) => Promise<void>;
  fetchPhotosByExcursion: (id_excursion: number) => Promise<void>;
  fetchMyPhotos: () => Promise<void>;
  deletePhoto: (id_foto: number, url_storage: string) => Promise<boolean>;
  clearError: () => void;
  clearPhotos: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePhotosStore = create<PhotosState>((set, get) => ({
  photos: [],
  loading: false,
  uploading: false,
  error: null,

  // ── uploadPhoto ────────────────────────────────────────────────────────────
  uploadPhoto: async (options: UploadPhotoOptions): Promise<Foto | null> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: 'Debes iniciar sesión para subir fotos' });
      return null;
    }

    set({ uploading: true, error: null });

    try {
      // Subir la imagen a Storage y obtener la URL pública
      const urlStorage = await uploadPhotoToStorage(options.uri, String(user.id_usuario));

      // Insertar el registro en la tabla fotos
      const { data, error: insertError } = await supabase
        .from('fotos')
        .insert({
          id_usuario: user.id_usuario,
          id_actividad: options.id_actividad ?? null,
          id_excursion: options.id_excursion ?? null,
          url_storage: urlStorage,
          latitud: options.latitud ?? null,
          longitud: options.longitud ?? null,
          descripcion: options.descripcion ?? null,
          fecha: new Date().toISOString(),
        })
        .select(
          'id_foto, id_usuario, id_actividad, id_excursion, url_storage, latitud, longitud, descripcion, fecha'
        )
        .single();

      if (insertError) {
        console.error('[GranaTour] Error insertando foto en DB:', insertError);
        set({ error: 'No se pudo guardar la foto. Inténtalo de nuevo', uploading: false });
        return null;
      }

      const newPhoto = data as Foto;

      // Añadir la nueva foto al inicio del array local (sin mutar el estado anterior)
      set((state) => ({
        photos: [newPhoto, ...state.photos],
        uploading: false,
      }));

      return newPhoto;
    } catch (err) {
      console.error('[GranaTour] uploadPhoto catch:', err);
      set({ error: 'Error al subir la foto. Inténtalo de nuevo', uploading: false });
      return null;
    }
  },

  // ── fetchPhotosByActivity ──────────────────────────────────────────────────
  fetchPhotosByActivity: async (id_actividad: number): Promise<void> => {
    set({ loading: true, error: null, photos: [] });

    try {
      const { data, error } = await supabase
        .from('fotos')
        .select(
          'id_foto, id_usuario, id_actividad, id_excursion, url_storage, latitud, longitud, descripcion, fecha'
        )
        .eq('id_actividad', id_actividad)
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[GranaTour] fetchPhotosByActivity error:', error);
        set({ error: 'No se pudieron cargar las fotos', loading: false });
        return;
      }

      set({ photos: (data ?? []) as Foto[], loading: false });
    } catch (err) {
      console.error('[GranaTour] fetchPhotosByActivity catch:', err);
      set({ error: 'Error de conexión al cargar las fotos', loading: false });
    }
  },

  // ── fetchPhotosByExcursion ─────────────────────────────────────────────────
  fetchPhotosByExcursion: async (id_excursion: number): Promise<void> => {
    set({ loading: true, error: null, photos: [] });

    try {
      const { data, error } = await supabase
        .from('fotos')
        .select(
          'id_foto, id_usuario, id_actividad, id_excursion, url_storage, latitud, longitud, descripcion, fecha'
        )
        .eq('id_excursion', id_excursion)
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[GranaTour] fetchPhotosByExcursion error:', error);
        set({ error: 'No se pudieron cargar las fotos', loading: false });
        return;
      }

      set({ photos: (data ?? []) as Foto[], loading: false });
    } catch (err) {
      console.error('[GranaTour] fetchPhotosByExcursion catch:', err);
      set({ error: 'Error de conexión al cargar las fotos', loading: false });
    }
  },

  // ── fetchMyPhotos ──────────────────────────────────────────────────────────
  fetchMyPhotos: async (): Promise<void> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: 'Debes iniciar sesión para ver tus fotos' });
      return;
    }

    set({ loading: true, error: null, photos: [] });

    try {
      const { data, error } = await supabase
        .from('fotos')
        .select(
          'id_foto, id_usuario, id_actividad, id_excursion, url_storage, latitud, longitud, descripcion, fecha'
        )
        .eq('id_usuario', user.id_usuario)
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[GranaTour] fetchMyPhotos error:', error);
        set({ error: 'No se pudieron cargar tus fotos', loading: false });
        return;
      }

      set({ photos: (data ?? []) as Foto[], loading: false });
    } catch (err) {
      console.error('[GranaTour] fetchMyPhotos catch:', err);
      set({ error: 'Error de conexión al cargar tus fotos', loading: false });
    }
  },

  // ── deletePhoto ────────────────────────────────────────────────────────────
  deletePhoto: async (id_foto: number, url_storage: string): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: 'Debes iniciar sesión para eliminar fotos' });
      return false;
    }

    set({ error: null });

    try {
      // Extraer el path relativo dentro del bucket a partir de la URL pública
      // Formato URL: https://...supabase.co/storage/v1/object/public/activity-photos/{path}
      const pathInBucket = url_storage.split('/activity-photos/')[1];

      if (!pathInBucket) {
        throw new Error('URL de foto inválida');
      }

      // Eliminar el archivo de Storage
      const { error: storageError } = await supabase.storage
        .from('activity-photos')
        .remove([pathInBucket]);

      if (storageError) {
        console.error('[GranaTour] Error eliminando foto de Storage:', storageError);
        // No bloqueamos: si el archivo ya no existe en Storage, continuamos con el DELETE en DB
      }

      // Eliminar el registro de la tabla fotos (RLS garantiza que solo borra las propias)
      const { error: dbError } = await supabase
        .from('fotos')
        .delete()
        .eq('id_foto', id_foto)
        .eq('id_usuario', user.id_usuario);

      if (dbError) {
        console.error('[GranaTour] Error eliminando foto de DB:', dbError);
        set({ error: 'No se pudo eliminar la foto. Inténtalo de nuevo' });
        return false;
      }

      // Actualizar el array local eliminando la foto borrada
      set((state) => ({
        photos: state.photos.filter((p) => p.id_foto !== id_foto),
      }));

      return true;
    } catch (err) {
      console.error('[GranaTour] deletePhoto catch:', err);
      set({ error: 'Error al eliminar la foto. Inténtalo de nuevo' });
      return false;
    }
  },

  // ── clearError ─────────────────────────────────────────────────────────────
  clearError: () => set({ error: null }),

  // ── clearPhotos ────────────────────────────────────────────────────────────
  clearPhotos: () => set({ photos: [], error: null }),
}));
