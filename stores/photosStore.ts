// Store de fotos geolocalizadas: subida, consulta y eliminación de fotos de actividades
// Los arrays de fotos están separados por contexto para evitar race conditions entre pantallas (C-02)
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { uploadPhoto as uploadPhotoToStorage } from '@/lib/storage';
import type { Foto } from '@/lib/types';

// Campos seleccionados en todas las queries de fotos
const FOTO_FIELDS =
  'id_foto, id_usuario, id_actividad, id_excursion, url_storage, latitud, longitud, descripcion, fecha';

// Límite de fotos por consulta para evitar cargar demasiadas a la vez (I-03)
const PHOTOS_LIMIT = 50;

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
  // Arrays separados por contexto para evitar race conditions (C-02)
  excursionPhotos: Foto[]; // Fotos de una excursión concreta
  myPhotos: Foto[]; // Fotos personales del usuario autenticado

  // Flags de carga separados por contexto
  loadingExcursion: boolean;
  loadingMy: boolean;

  uploading: boolean;
  error: string | null;

  // Acciones
  uploadPhoto: (options: UploadPhotoOptions) => Promise<Foto | null>;
  fetchPhotosByExcursion: (id_excursion: number) => Promise<void>;
  fetchMyPhotos: () => Promise<void>;
  deletePhoto: (id_foto: number, url_storage: string) => Promise<boolean>;
  clearError: () => void;
  clearExcursionPhotos: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePhotosStore = create<PhotosState>((set, get) => ({
  excursionPhotos: [],
  myPhotos: [],
  loadingExcursion: false,
  loadingMy: false,
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
        .select(FOTO_FIELDS)
        .single();

      if (insertError) {
        console.error('[GranaTour] Error insertando foto en DB:', insertError);
        set({ error: 'No se pudo guardar la foto. Inténtalo de nuevo', uploading: false });
        return null;
      }

      const newPhoto = data as Foto;

      // Añadir la nueva foto al contexto correspondiente (sin mutar el estado anterior)
      if (options.id_excursion !== undefined) {
        set((state) => ({
          excursionPhotos: [newPhoto, ...state.excursionPhotos],
          uploading: false,
        }));
      } else {
        set((state) => ({
          myPhotos: [newPhoto, ...state.myPhotos],
          uploading: false,
        }));
      }

      return newPhoto;
    } catch (err) {
      console.error('[GranaTour] uploadPhoto catch:', err);
      set({ error: 'Error al subir la foto. Inténtalo de nuevo', uploading: false });
      return null;
    }
  },

  // ── fetchPhotosByExcursion ─────────────────────────────────────────────────
  fetchPhotosByExcursion: async (id_excursion: number): Promise<void> => {
    set({ loadingExcursion: true, error: null, excursionPhotos: [] });

    try {
      const { data, error } = await supabase
        .from('fotos')
        .select(FOTO_FIELDS)
        .eq('id_excursion', id_excursion)
        .order('fecha', { ascending: false })
        .limit(PHOTOS_LIMIT); // I-03: evitar cargar miles de fotos de golpe

      if (error) {
        console.error('[GranaTour] fetchPhotosByExcursion error:', error);
        set({ error: 'No se pudieron cargar las fotos', loadingExcursion: false });
        return;
      }

      set({ excursionPhotos: (data ?? []) as Foto[], loadingExcursion: false });
    } catch (err) {
      console.error('[GranaTour] fetchPhotosByExcursion catch:', err);
      set({ error: 'Error de conexión al cargar las fotos', loadingExcursion: false });
    }
  },

  // ── fetchMyPhotos ──────────────────────────────────────────────────────────
  fetchMyPhotos: async (): Promise<void> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: 'Debes iniciar sesión para ver tus fotos' });
      return;
    }

    set({ loadingMy: true, error: null, myPhotos: [] });

    try {
      const { data, error } = await supabase
        .from('fotos')
        .select(FOTO_FIELDS)
        .eq('id_usuario', user.id_usuario)
        .order('fecha', { ascending: false })
        .limit(PHOTOS_LIMIT); // I-03: evitar cargar miles de fotos de golpe

      if (error) {
        console.error('[GranaTour] fetchMyPhotos error:', error);
        set({ error: 'No se pudieron cargar tus fotos', loadingMy: false });
        return;
      }

      set({ myPhotos: (data ?? []) as Foto[], loadingMy: false });
    } catch (err) {
      console.error('[GranaTour] fetchMyPhotos catch:', err);
      set({ error: 'Error de conexión al cargar tus fotos', loadingMy: false });
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

      // Actualizar ambos arrays locales eliminando la foto borrada (puede estar en cualquiera)
      set((state) => ({
        excursionPhotos: state.excursionPhotos.filter((p) => p.id_foto !== id_foto),
        myPhotos: state.myPhotos.filter((p) => p.id_foto !== id_foto),
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

  // ── clearExcursionPhotos ────────────────────────────────────────────────────
  clearExcursionPhotos: () => set({ excursionPhotos: [], error: null }),
}));
