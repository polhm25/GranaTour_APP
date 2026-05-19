// Cliente para Unsplash API — imágenes de alta calidad como fallback
// Requiere EXPO_PUBLIC_UNSPLASH_ACCESS_KEY en .env
// Documentación: https://unsplash.com/developers  (50 req/hora en tier free)

const BASE = 'https://api.unsplash.com';

// Cache en memoria para no gastar llamadas en la misma zona
const photoCache = new Map<string, string | null>();

export async function fetchUnsplashPhoto(zona: string): Promise<string | null> {
  const key = zona.toLowerCase().trim();
  if (photoCache.has(key)) return photoCache.get(key)!;

  const apiKey = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!apiKey) return null;

  const query = encodeURIComponent(`${zona} senderismo montaña naturaleza`);
  const url = `${BASE}/search/photos?query=${query}&client_id=${apiKey}&per_page=1&orientation=landscape`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      photoCache.set(key, null);
      return null;
    }
    const data = await res.json();
    const photoUrl: string | null = data.results?.[0]?.urls?.regular ?? null;
    photoCache.set(key, photoUrl);
    return photoUrl;
  } catch {
    photoCache.set(key, null);
    return null;
  }
}
