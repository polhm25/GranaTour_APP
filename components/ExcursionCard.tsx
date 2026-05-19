// Tarjeta de excursión para listas en la pantalla Explorar y Home.
// Muestra imagen, badge de dificultad, stats, valoración media y precio de la excursión.

import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ExcursionConGuia } from '@/lib/types';
import { COLORS } from '@/lib/constants';
import { fetchUnsplashPhoto } from '@/lib/unsplash';
import {
  getDifficultyColor,
  formatPrice,
  formatDuration,
  formatDateShort,
  formatFrecuencia,
} from '@/lib/utils';

const DIFFICULTY_LABELS: Record<NonNullable<ExcursionConGuia['dificultad']>, string> = {
  facil: 'Fácil',
  moderada: 'Moderada',
  dificil: 'Difícil',
  muy_dificil: 'Muy difícil',
};

const LOW_AVAILABILITY_THRESHOLD = 5;

interface ExcursionCardProps {
  excursion: ExcursionConGuia;
  onPress: () => void;
}

export function ExcursionCard({ excursion, onPress }: ExcursionCardProps) {
  const {
    nombre_ruta,
    zona,
    duracion_horas,
    distancia_km,
    desnivel_positivo,
    dificultad,
    precio_persona,
    plazas_disponibles,
    imagen_url,
    valoracion_media,
    frecuencia,
    proxima_salida,
    fecha_inicio,
  } = excursion;

  // Imagen de Unsplash como fallback cuando la excursión no tiene imagen propia
  const [fallbackImage, setFallbackImage] = useState<string | null>(null);
  useEffect(() => {
    if (!imagen_url) {
      fetchUnsplashPhoto(zona).then(setFallbackImage).catch(() => null);
    }
  }, [imagen_url, zona]);

  const imageUri = imagen_url ?? fallbackImage;

  const isRecurring = frecuencia && frecuencia !== 'unica';
  const nextDate = proxima_salida ?? fecha_inicio;

  const difficultyBadgeColor = dificultad ? getDifficultyColor(dificultad) : '#A3A3A3';
  const difficultyLabel = dificultad ? DIFFICULTY_LABELS[dificultad] : null;

  const isLowAvailability = plazas_disponibles < LOW_AVAILABILITY_THRESHOLD;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden"
    >
      {/* ── Imagen superior ─────────────────────────────────────────── */}
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View
            className="items-center justify-center bg-primary-100"
            style={styles.image}
          >
            <Ionicons name="image-outline" size={48} color={COLORS.neutral[400]} />
          </View>
        )}

        {/* Badge de frecuencia — esquina superior izquierda */}
        {isRecurring && (
          <View style={styles.frecuenciaBadge}>
            <Ionicons name="repeat-outline" size={10} color="#fff" />
            <Text style={styles.frecuenciaText}>{formatFrecuencia(frecuencia)}</Text>
          </View>
        )}

        {difficultyLabel && (
          <View
            style={[styles.difficultyBadge, { backgroundColor: difficultyBadgeColor }]}
          >
            <Text className="text-white font-semibold" style={styles.difficultyText}>
              {difficultyLabel}
            </Text>
          </View>
        )}
      </View>

      {/* ── Cuerpo de la tarjeta ────────────────────────────────────── */}
      <View className="p-3">
        <Text
          className="text-neutral-800 font-bold mb-1"
          style={styles.routeName}
          numberOfLines={2}
        >
          {nombre_ruta}
        </Text>

        {/* Zona */}
        <View style={styles.statItem} className="mb-2">
          <Ionicons name="location-outline" size={13} color={COLORS.neutral[400]} />
          <Text className="text-neutral-500 ml-1" style={styles.zona}>{zona}</Text>
        </View>

        {/* Fila de stats: duración, distancia y desnivel */}
        <View className="flex-row mb-3" style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={12} color={COLORS.neutral[400]} />
            <Text className="text-neutral-500 ml-1" style={styles.statText}>
              {formatDuration(duracion_horas)}
            </Text>
          </View>

          {distancia_km !== null && (
            <View style={styles.statItem}>
              <Ionicons name="footsteps-outline" size={12} color={COLORS.neutral[400]} />
              <Text className="text-neutral-500 ml-1" style={styles.statText}>
                {distancia_km}km
              </Text>
            </View>
          )}

          {desnivel_positivo !== null && (
            <View style={styles.statItem}>
              <Ionicons name="trending-up-outline" size={12} color={COLORS.neutral[400]} />
              <Text className="text-neutral-500 ml-1" style={styles.statText}>
                {desnivel_positivo}m
              </Text>
            </View>
          )}
        </View>

        {/* Próxima salida */}
        <View style={styles.statItem} className="mb-2">
          <Ionicons name="calendar-outline" size={12} color={COLORS.neutral[400]} />
          <Text className="text-neutral-500 ml-1" style={styles.statText}>
            {formatDateShort(nextDate)}
          </Text>
        </View>

        {/* Media de valoraciones */}
        {valoracion_media !== null && valoracion_media !== undefined && (
          <View style={styles.statItem} className="mb-2">
            <Ionicons name="star" size={13} color={COLORS.warning} />
            <Text style={[styles.ratingText, { marginLeft: 3 }]}>
              {valoracion_media.toFixed(1)}
            </Text>
            <Text className="text-neutral-400 ml-1" style={styles.ratingCount}>
              valoración
            </Text>
          </View>
        )}

        {/* Fila inferior: precio y plazas disponibles */}
        <View className="flex-row items-center justify-between">
          <Text className="text-primary-600 font-bold" style={styles.price}>
            {formatPrice(precio_persona)}
            <Text className="font-normal text-neutral-400" style={styles.perPerson}>
              {' '}
              /persona
            </Text>
          </Text>

          <Text
            className={isLowAvailability ? 'text-warning' : 'text-neutral-400'}
            style={styles.availabilityText}
          >
            {plazas_disponibles}{' '}
            {plazas_disponibles === 1 ? 'plaza' : 'plazas'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  image: {
    width: '100%',
    height: 180,
  },
  frecuenciaBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  frecuenciaText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  difficultyBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  difficultyText: {
    fontSize: 11,
  },
  routeName: {
    fontSize: 16,
  },
  zona: {
    fontSize: 13,
  },
  statsRow: {
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
  },
  ratingText: {
    fontSize: 13,
    color: COLORS.neutral[700],
    fontWeight: '600',
  },
  ratingCount: {
    fontSize: 12,
  },
  price: {
    fontSize: 15,
  },
  perPerson: {
    fontSize: 13,
  },
  availabilityText: {
    fontSize: 12,
  },
});
