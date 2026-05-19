// Cliente para OpenWeatherMap API (tier gratuito — 1000 llamadas/día)
// Requiere EXPO_PUBLIC_OPENWEATHER_API_KEY en .env
// Documentación: https://openweathermap.org/api

const BASE = 'https://api.openweathermap.org/data/2.5';

export interface WeatherData {
  temp: number;         // °C redondeado
  feelsLike: number;    // °C sensación térmica
  description: string;  // en español
  icon: string;         // código de icono OWM (p.ej. "01d")
  humidity: number;     // porcentaje
  windSpeedKmh: number; // km/h
  pop: number;          // probabilidad de lluvia 0–100
}

// Determina si una fecha ISO cae dentro de los próximos 5 días (límite del plan free)
function isWithinForecastRange(dateStr: string): boolean {
  const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 5;
}

export async function fetchWeatherForExcursion(
  lat: number,
  lon: number,
  dateStr: string
): Promise<WeatherData> {
  const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error('Falta EXPO_PUBLIC_OPENWEATHER_API_KEY');

  if (isWithinForecastRange(dateStr)) {
    // Forecast de 5 días/3h — buscar el slot más cercano al mediodía de la fecha
    const url = `${BASE}/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=es&cnt=40`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenWeatherMap forecast: ${res.status}`);
    const data = await res.json();

    // Preferir el slot de las 12:00, si no el primero del día
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const daySlot: any =
      data.list.find((e: { dt_txt: string }) => e.dt_txt.startsWith(dateStr) && e.dt_txt.includes('12:00')) ??
      data.list.find((e: { dt_txt: string }) => e.dt_txt.startsWith(dateStr)) ??
      data.list[0];

    return mapForecastSlot(daySlot);
  }

  // Tiempo actual para fechas fuera del rango de predicción
  const url = `${BASE}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=es`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeatherMap current: ${res.status}`);
  const data = await res.json();

  return {
    temp: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    description: capitalizeFirst(data.weather[0].description),
    icon: data.weather[0].icon,
    humidity: data.main.humidity,
    windSpeedKmh: Math.round(data.wind.speed * 3.6),
    pop: 0,
  };
}

function mapForecastSlot(slot: {
  main: { temp: number; feels_like: number; humidity: number };
  weather: { description: string; icon: string }[];
  wind: { speed: number };
  pop?: number;
}): WeatherData {
  return {
    temp: Math.round(slot.main.temp),
    feelsLike: Math.round(slot.main.feels_like),
    description: capitalizeFirst(slot.weather[0].description),
    icon: slot.weather[0].icon,
    humidity: slot.main.humidity,
    windSpeedKmh: Math.round(slot.wind.speed * 3.6),
    pop: Math.round((slot.pop ?? 0) * 100),
  };
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
