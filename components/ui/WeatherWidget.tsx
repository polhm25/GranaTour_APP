// Widget de previsión meteorológica para el detalle de una excursión.
// Muestra temperatura, descripción, viento, humedad y probabilidad de lluvia.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import { fetchWeatherForExcursion, type WeatherData } from '@/lib/weather';

interface WeatherWidgetProps {
  lat: number;
  lon: number;
  dateStr: string; // YYYY-MM-DD
}

export function WeatherWidget({ lat, lon, dateStr }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchWeatherForExcursion(lat, lon, dateStr)
      .then((data) => {
        if (!cancelled) {
          setWeather(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lon, dateStr]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primary[500]} />
        <Text style={styles.loadingText}>Cargando previsión...</Text>
      </View>
    );
  }

  if (error || !weather) {
    // Silencio: si no hay API key o falla la red, no mostramos nada
    return null;
  }

  const iconUrl = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;

  // Determinar si la fecha es futura, pasada o hoy
  const targetDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let dateLabel = 'Tiempo en la zona';
  if (diffDays === 0) dateLabel = 'Tiempo hoy en la zona';
  else if (diffDays === 1) dateLabel = 'Tiempo mañana en la zona';
  else if (diffDays > 1 && diffDays <= 5) dateLabel = `Previsión para el día de salida`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="partly-sunny-outline" size={15} color={COLORS.primary[600]} />
        <Text style={styles.headerText}>{dateLabel}</Text>
      </View>

      <View style={styles.body}>
        {/* Icono + temperatura */}
        <View style={styles.tempRow}>
          <Image
            source={{ uri: iconUrl }}
            style={styles.weatherIcon}
            resizeMode="contain"
          />
          <Text style={styles.temp}>{weather.temp}°C</Text>
          <Text style={styles.description}>{weather.description}</Text>
        </View>

        {/* Stats secundarios */}
        <View style={styles.statsRow}>
          <WeatherStat
            icon="water-outline"
            value={`${weather.humidity}%`}
            label="Humedad"
          />
          <WeatherStat
            icon="speedometer-outline"
            value={`${weather.windSpeedKmh} km/h`}
            label="Viento"
          />
          {weather.pop > 0 && (
            <WeatherStat
              icon="rainy-outline"
              value={`${weather.pop}%`}
              label="Lluvia"
            />
          )}
          <WeatherStat
            icon="thermometer-outline"
            value={`${weather.feelsLike}°C`}
            label="Sensación"
          />
        </View>
      </View>
    </View>
  );
}

function WeatherStat({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
}) {
  return (
    <View style={statStyles.container}>
      <Ionicons name={icon} size={14} color={COLORS.neutral[500]} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.neutral[700],
    marginTop: 2,
  },
  label: {
    fontSize: 10,
    color: COLORS.neutral[400],
    marginTop: 1,
  },
});

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.neutral[400],
  },
  container: {
    backgroundColor: COLORS.primary[50],
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.primary[100],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary[700],
  },
  body: {
    gap: 10,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weatherIcon: {
    width: 44,
    height: 44,
  },
  temp: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.neutral[800],
  },
  description: {
    fontSize: 14,
    color: COLORS.neutral[600],
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
  },
});
