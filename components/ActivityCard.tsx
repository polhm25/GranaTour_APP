// Tarjeta de actividad GPS para el historial de la pantalla Activity
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '@/lib/constants';
import { formatDateShort, formatDistanceLabel, formatSpeedLabel } from '@/lib/utils';
import type { Actividad } from '@/lib/types';

interface ActivityCardProps {
  actividad: Actividad;
  onPress?: () => void;
}

export function ActivityCard({ actividad, onPress }: ActivityCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}>
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-3">
          <Text className="text-base font-semibold text-neutral-800" numberOfLines={1}>
            {actividad.titulo ?? 'Actividad sin título'}
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {formatDateShort(actividad.fecha_inicio)}
          </Text>
        </View>
        <View
          className="px-2 py-0.5 rounded-full"
          style={{
            backgroundColor:
              actividad.estado === 'completada' ? COLORS.primary[100] : COLORS.neutral[100],
          }}
        >
          <Text
            className="text-xs font-medium"
            style={{
              color:
                actividad.estado === 'completada' ? COLORS.primary[700] : COLORS.neutral[600],
            }}
          >
            {actividad.estado === 'completada' ? 'Completada' : actividad.estado}
          </Text>
        </View>
      </View>

      <View className="flex-row mt-3 gap-4">
        {actividad.distancia_km !== null && (
          <View className="items-center">
            <Text className="text-lg font-bold text-neutral-800">
              {formatDistanceLabel(actividad.distancia_km)}
            </Text>
            <Text className="text-xs text-neutral-500">Distancia</Text>
          </View>
        )}
        {actividad.duracion_minutos !== null && (
          <View className="items-center">
            <Text className="text-lg font-bold text-neutral-800">
              {actividad.duracion_minutos} min
            </Text>
            <Text className="text-xs text-neutral-500">Duración</Text>
          </View>
        )}
        {actividad.velocidad_media !== null && (
          <View className="items-center">
            <Text className="text-lg font-bold text-neutral-800">
              {formatSpeedLabel(actividad.velocidad_media)}
            </Text>
            <Text className="text-xs text-neutral-500">V. media</Text>
          </View>
        )}
        {actividad.desnivel_positivo !== null && actividad.desnivel_positivo > 0 && (
          <View className="items-center">
            <Text className="text-lg font-bold text-neutral-800">
              +{actividad.desnivel_positivo} m
            </Text>
            <Text className="text-xs text-neutral-500">Desnivel</Text>
          </View>
        )}
      </View>

      {/* Indicador visual de que la card es pulsable */}
      {onPress && (
        <View className="flex-row items-center justify-end mt-2">
          <Text className="text-xs text-neutral-400 mr-1">Ver detalles</Text>
          <Ionicons name="chevron-forward" size={12} color={COLORS.neutral[400]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});
