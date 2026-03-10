// Helper para subir imágenes a Supabase Storage bucket activity-photos
import { supabase } from '@/lib/supabase';

// Nombre del bucket público donde se almacenan las fotos de actividades
const BUCKET = 'activity-photos';

/**
 * Sube una imagen local a Supabase Storage y devuelve su URL pública.
 * Path en el bucket: {userId}/{timestamp}.jpg
 *
 * @param uri      URI local de la imagen (file:// o content://)
 * @param userId   ID del usuario autenticado (como string para el path)
 * @returns        URL pública de la imagen subida
 * @throws         Error con mensaje en español si la subida falla
 */
export async function uploadPhoto(uri: string, userId: string): Promise<string> {
  // Obtener el Blob a partir de la URI local
  const response = await fetch(uri);
  const blob = await response.blob();

  // Construir el path único dentro del bucket
  // Se añade sufijo aleatorio para evitar colisión si se suben dos fotos en el mismo ms (I-04)
  const suffix = Math.random().toString(36).slice(2, 8);
  const path = `${userId}/${Date.now()}_${suffix}.jpg`;

  // Subir al bucket
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) {
    console.error('[GranaTour] Error subiendo foto a Storage:', uploadError);
    throw new Error('No se pudo subir la foto. Inténtalo de nuevo');
  }

  // Obtener URL pública
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error('No se pudo obtener la URL pública de la foto');
  }

  return data.publicUrl;
}
