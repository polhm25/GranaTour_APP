// Pantalla del panel de guía: lista de excursiones asignadas con conteos de reservas
import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
  ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';

import { useAuthStore } from '@/stores/authStore';
import { useGuideStore } from '@/stores/guideStore';
import { COLORS } from '@/lib/constants';
import { formatDate, formatDuration } from '@/lib/utils';
import type { ExcursionGuia } from '@/stores/guideStore';

// ─── Componente de tarjeta de excursión para guía ────────────────────────────

interface ExcursionGuiaCardProps {
  item: ExcursionGuia;
  onPress: (id: number) => void;
}

function ExcursionGuiaCard({ item, onPress }: ExcursionGuiaCardProps) {
  const hasPending = item.pendiente_count > 0;

  return (
    <Pressable
      onPress={() => onPress(item.id_excursion)}
      className="bg-white rounded-2xl mb-3 overflow-hidden"
      style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}
    >
      {/* Imagen de portada */}
      {item.imagen_url ? (
        <Image
          source={{ uri: item.imagen_url }}
          className="w-full h-32"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-32 bg-neutral-100 items-center justify-center">
          <Ionicons name="image-outline" size={32} color={COLORS.neutral[400]} />
        </View>
      )}

      <View className="p-4">
        {/* Nombre y zona */}
        <Text className="text-base font-semibold text-neutral-900" numberOfLines={2}>
          {item.nombre_ruta}
        </Text>
        <Text className="text-sm text-neutral-500 mt-0.5">{item.zona}</Text>

        {/* Fecha y duración */}
        <View className="flex-row items-center mt-2 gap-3">
          <View className="flex-row items-center gap-1">
            <Ionicons name="calendar-outline" size={13} color={COLORS.neutral[500]} />
            <Text className="text-xs text-neutral-500">{formatDate(item.fecha_inicio)}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="time-outline" size={13} color={COLORS.neutral[500]} />
            <Text className="text-xs text-neutral-500">{formatDuration(item.duracion_horas)}</Text>
          </View>
        </View>

        {/* Contadores de reservas */}
        <View className="flex-row mt-3 gap-2">
          {hasPending && (
            <View className="bg-amber-100 rounded-full px-3 py-1 flex-row items-center gap-1">
              <Ionicons name="time" size={12} color={COLORS.warning} />
              <Text className="text-xs font-medium text-amber-700">
                {item.pendiente_count} pendiente{item.pendiente_count !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {item.confirmada_count > 0 && (
            <View className="bg-emerald-100 rounded-full px-3 py-1 flex-row items-center gap-1">
              <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
              <Text className="text-xs font-medium text-emerald-700">
                {item.confirmada_count} confirmada{item.confirmada_count !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {item.pendiente_count === 0 && item.confirmada_count === 0 && (
            <View className="bg-neutral-100 rounded-full px-3 py-1">
              <Text className="text-xs text-neutral-500">Sin reservas</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function GuideScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const { guideExcursions, loadingExcursions, error } = useGuideStore(
    useShallow((s) => ({
      guideExcursions: s.guideExcursions,
      loadingExcursions: s.loadingExcursions,
      error: s.error,
    }))
  );
  const fetchGuideExcursions = useGuideStore((s) => s.fetchGuideExcursions);

  // Recargar excursiones cada vez que el tab gana el foco
  useFocusEffect(
    useCallback(() => {
      if (user?.rol === 'guia') {
        fetchGuideExcursions();
      }
    }, [fetchGuideExcursions, user?.rol])
  );

  const handleExcursionPress = useCallback(
    (id: number) => {
      router.push(`/guide-excursion/${id}`);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ExcursionGuia>) => (
      <ExcursionGuiaCard item={item} onPress={handleExcursionPress} />
    ),
    [handleExcursionPress]
  );

  const keyExtractor = useCallback((item: ExcursionGuia) => String(item.id_excursion), []);

  // Guardia: pantalla no accesible para usuarios sin rol guía
  if (user && user.rol !== 'guia') {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center p-6">
        <Ionicons name="lock-closed-outline" size={48} color={COLORS.neutral[300]} />
        <Text className="text-lg font-semibold text-neutral-700 mt-4 text-center">
          Acceso restringido
        </Text>
        <Text className="text-sm text-neutral-500 mt-2 text-center">
          Esta sección es exclusiva para guías de GranaTour.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      {/* Cabecera */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-neutral-900">Panel de guía</Text>
        <Text className="text-sm text-neutral-500 mt-1">
          Hola, {user?.nombre ?? 'Guía'} — gestiona tus excursiones
        </Text>
      </View>

      {/* Estado de carga */}
      {loadingExcursions && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text className="text-sm text-neutral-500 mt-3">Cargando excursiones…</Text>
        </View>
      )}

      {/* Error */}
      {!loadingExcursions && error && (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text className="text-base text-neutral-700 mt-3 text-center">{error}</Text>
          <Pressable
            onPress={fetchGuideExcursions}
            className="mt-4 bg-primary-500 rounded-xl px-6 py-3"
          >
            <Text className="text-white font-semibold">Reintentar</Text>
          </Pressable>
        </View>
      )}

      {/* Lista de excursiones */}
      {!loadingExcursions && !error && (
        <FlatList
          data={guideExcursions}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center pt-16">
              <Ionicons name="map-outline" size={56} color={COLORS.neutral[300]} />
              <Text className="text-lg font-semibold text-neutral-600 mt-4">
                Sin excursiones asignadas
              </Text>
              <Text className="text-sm text-neutral-400 mt-2 text-center px-4">
                No tienes excursiones activas asignadas en este momento.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
