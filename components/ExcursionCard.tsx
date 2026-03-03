// Tarjeta de excursión para listas en la pantalla Explorar y Home.
// Muestra imagen, badge de dificultad, stats y precio de la excursión.

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import type { ExcursionConGuia } from '@/lib/types';
import { getDifficultyColor, formatPrice, formatDuration } from '@/lib/utils';

// Etiquetas en español para cada nivel de dificultad
const DIFFICULTY_LABELS: Record<NonNullable<ExcursionConGuia['dificultad']>, string> = {
  facil: 'Fácil',
  moderada: 'Moderada',
  dificil: 'Difícil',
  muy_dificil: 'Muy difícil',
};

// Umbral de plazas bajas para avisar al usuario
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
  } = excursion;

  // Color de fondo del badge según dificultad
  const difficultyBadgeColor = dificultad ? getDifficultyColor(dificultad) : '#A3A3A3';
  const difficultyLabel = dificultad ? DIFFICULTY_LABELS[dificultad] : null;

  // Plazas bajas: menos de 5 disponibles
  const isLowAvailability = plazas_disponibles < LOW_AVAILABILITY_THRESHOLD;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden"
    >
      {/* ── Imagen superior ─────────────────────────────────────────── */}
      <View style={styles.imageContainer}>
        {imagen_url ? (
          <Image
            source={{ uri: imagen_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          // Placeholder cuando no hay imagen
          <View
            className="items-center justify-center bg-primary-100"
            style={styles.image}
          >
            <Text style={styles.placeholderIcon}>🏔</Text>
          </View>
        )}

        {/* Badge de dificultad — posición absolute sobre la imagen */}
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
        {/* Nombre de la ruta */}
        <Text
          className="text-neutral-800 font-bold mb-1"
          style={styles.routeName}
          numberOfLines={2}
        >
          {nombre_ruta}
        </Text>

        {/* Zona con icono de ubicación */}
        <Text className="text-neutral-500 mb-2" style={styles.zona}>
          📍 {zona}
        </Text>

        {/* Fila de stats: duración, distancia y desnivel */}
        <View className="flex-row mb-3" style={styles.statsRow}>
          <Text className="text-neutral-500" style={styles.statText}>
            ⏱ {formatDuration(duracion_horas)}
          </Text>

          {distancia_km !== null && (
            <Text className="text-neutral-500" style={styles.statText}>
              📏 {distancia_km}km
            </Text>
          )}

          {desnivel_positivo !== null && (
            <Text className="text-neutral-500" style={styles.statText}>
              ↗ {desnivel_positivo}m
            </Text>
          )}
        </View>

        {/* Fila inferior: precio y plazas disponibles */}
        <View className="flex-row items-center justify-between">
          {/* Precio por persona */}
          <Text className="text-primary-600 font-bold" style={styles.price}>
            {formatPrice(precio_persona)}
            <Text className="font-normal text-neutral-400" style={styles.perPerson}>
              {' '}
              /persona
            </Text>
          </Text>

          {/* Plazas disponibles — naranja si quedan pocas */}
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

// StyleSheet solo para valores que NativeWind no puede expresar directamente
// (dimensiones numéricas exactas, posición absolute con valores fijos, etc.)
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
  placeholderIcon: {
    fontSize: 48,
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
  statText: {
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
