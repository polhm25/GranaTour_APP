// Pantalla de detalle de una excursión.
// Muestra imagen hero, info completa, guía asignado y botón flotante de reserva.

import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/lib/constants';
import { formatDate, formatDuration, formatPrice, getDifficultyColor } from '@/lib/utils';
import { useExcursionsStore } from '@/stores/excursionsStore';

// Etiquetas en español para cada nivel de dificultad
const DIFFICULTY_LABELS: Record<string, string> = {
  facil: 'Fácil',
  moderada: 'Moderada',
  dificil: 'Difícil',
  muy_dificil: 'Muy difícil',
};

export default function ExcursionDetailScreen() {
  const router = useRouter();

  // ── Parámetros de ruta ────────────────────────────────────────────────────
  // useLocalSearchParams puede devolver string | string[]; normalizamos siempre a string.
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const excursionId = rawId ? parseInt(rawId, 10) : NaN;

  // ── Selector del store con useShallow ────────────────────────────────────
  const { currentExcursion, loading, error, getExcursionById } = useExcursionsStore(
    useShallow((state) => ({
      currentExcursion: state.currentExcursion,
      loading: state.loading,
      error: state.error,
      getExcursionById: state.getExcursionById,
    }))
  );

  // ── Carga al montar ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isNaN(excursionId)) {
      getExcursionById(excursionId);
    }
  }, [excursionId]);

  // ── Validación de id inválido ─────────────────────────────────────────────
  if (isNaN(excursionId)) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-neutral-800 font-bold text-center mb-4" style={styles.notFoundTitle}>
          Excursión no encontrada
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-primary-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold" style={styles.backButtonText}>
            Volver
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Estado loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
        <Text className="text-neutral-500 mt-3" style={styles.loadingText}>
          Cargando excursión...
        </Text>
      </SafeAreaView>
    );
  }

  // ── Estado error o excursión no encontrada ────────────────────────────────
  if (error || (!loading && currentExcursion === null)) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-neutral-800 font-bold text-center mb-2" style={styles.notFoundTitle}>
          Excursión no encontrada
        </Text>
        {error && (
          <Text className="text-error text-center mb-4" style={styles.errorText}>
            {error}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-primary-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold" style={styles.backButtonText}>
            Volver
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // A partir de aquí currentExcursion está garantizado como no-null
  if (!currentExcursion) return null;

  const {
    nombre_ruta,
    zona,
    descripcion,
    duracion_horas,
    distancia_km,
    desnivel_positivo,
    dificultad,
    precio_persona,
    fecha_inicio,
    plazas_disponibles,
    imagen_url,
    latitud,
    longitud,
    guia,
  } = currentExcursion;

  // Color e etiqueta del badge de dificultad
  const difficultyColor = dificultad ? getDifficultyColor(dificultad) : COLORS.neutral[400];
  const difficultyLabel = dificultad ? (DIFFICULTY_LABELS[dificultad] ?? dificultad) : null;

  // Sin plazas disponibles
  const isSoldOut = plazas_disponibles === 0;

  // ── Handler del botón de reserva ──────────────────────────────────────────
  function handleReserve() {
    Alert.alert('Próximamente', 'Reservas disponibles en la Fase 3');
  }

  // ── Render principal ──────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 1. Imagen hero ──────────────────────────────────────────────── */}
        <View style={styles.heroContainer}>
          {imagen_url ? (
            <Image
              source={{ uri: imagen_url }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            // Placeholder cuando no hay imagen
            <View
              className="bg-primary-100 items-center justify-center"
              style={styles.heroImage}
            >
              <Text style={styles.heroPlaceholderIcon}>🏔</Text>
            </View>
          )}

          {/* ── 2. Badge de dificultad (absolute, bottom-left sobre la imagen) */}
          {difficultyLabel && (
            <View
              style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}
            >
              <Text className="text-white font-semibold" style={styles.difficultyBadgeText}>
                {difficultyLabel}
              </Text>
            </View>
          )}

          {/* ── 3. Botón back (absolute, top-left sobre la imagen) ────────── */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonIcon}>←</Text>
          </TouchableOpacity>
        </View>

        {/* ── 4. Info principal ───────────────────────────────────────────── */}
        <View className="px-4 pt-5 pb-4">
          {/* Nombre de la ruta */}
          <Text className="text-neutral-800 font-bold mb-2" style={styles.routeName}>
            {nombre_ruta}
          </Text>

          {/* Zona con icono de ubicación */}
          <Text className="text-neutral-500 mb-4" style={styles.zona}>
            📍 {zona}
          </Text>

          {/* Fila de stats en pills grises */}
          <View className="flex-row flex-wrap mb-4" style={styles.statsRow}>
            {/* Duración */}
            <View className="bg-neutral-100 rounded-lg px-3 py-2 mr-2 mb-2">
              <Text className="text-neutral-600" style={styles.statText}>
                ⏱ {formatDuration(duracion_horas)}
              </Text>
            </View>

            {/* Distancia */}
            {distancia_km !== null && (
              <View className="bg-neutral-100 rounded-lg px-3 py-2 mr-2 mb-2">
                <Text className="text-neutral-600" style={styles.statText}>
                  📏 {distancia_km} km
                </Text>
              </View>
            )}

            {/* Desnivel */}
            {desnivel_positivo !== null && (
              <View className="bg-neutral-100 rounded-lg px-3 py-2 mr-2 mb-2">
                <Text className="text-neutral-600" style={styles.statText}>
                  ↗ {desnivel_positivo} m
                </Text>
              </View>
            )}

            {/* Precio */}
            <View className="bg-primary-50 rounded-lg px-3 py-2 mr-2 mb-2">
              <Text className="text-primary-700 font-semibold" style={styles.statText}>
                💰 {formatPrice(precio_persona)}/persona
              </Text>
            </View>
          </View>

          {/* Fecha de inicio */}
          <Text className="text-neutral-600 mb-2" style={styles.dateText}>
            📅 {formatDate(fecha_inicio)}
          </Text>

          {/* Plazas disponibles */}
          {isSoldOut ? (
            <Text className="text-error font-semibold mb-4" style={styles.seatsText}>
              Sin plazas disponibles
            </Text>
          ) : (
            <Text className="text-neutral-600 mb-4" style={styles.seatsText}>
              {plazas_disponibles}{' '}
              {plazas_disponibles === 1 ? 'plaza disponible' : 'plazas disponibles'}
            </Text>
          )}
        </View>

        {/* Separador */}
        <View className="bg-neutral-200 mx-4" style={styles.separator} />

        {/* ── 5. Descripción ───────────────────────────────────────────────── */}
        {descripcion ? (
          <View className="px-4 py-5">
            <Text className="text-neutral-800 font-bold mb-3" style={styles.sectionTitle}>
              Descripción
            </Text>
            <Text className="text-neutral-600 leading-6" style={styles.descriptionText}>
              {descripcion}
            </Text>
          </View>
        ) : null}

        {/* ── 6. Guía asignado ─────────────────────────────────────────────── */}
        {guia ? (
          <>
            <View className="bg-neutral-200 mx-4" style={styles.separator} />
            <View className="px-4 py-5">
              <Text className="text-neutral-800 font-bold mb-4" style={styles.sectionTitle}>
                Tu guía
              </Text>
              <View className="flex-row items-center">
                {/* Avatar del guía */}
                {guia.avatar_url ? (
                  <Image
                    source={{ uri: guia.avatar_url }}
                    style={styles.guideAvatar}
                  />
                ) : (
                  // Placeholder circular del avatar
                  <View
                    className="bg-primary-100 items-center justify-center"
                    style={styles.guideAvatar}
                  >
                    <Text style={styles.guideAvatarPlaceholder}>👤</Text>
                  </View>
                )}

                {/* Nombre y valoración del guía */}
                <View className="ml-3 flex-1">
                  <Text className="text-neutral-800 font-semibold" style={styles.guideName}>
                    {guia.nombre} {guia.ap1}
                  </Text>
                  {guia.valoracion !== null && (
                    <Text className="text-neutral-500 mt-1" style={styles.guideRating}>
                      ⭐ {guia.valoracion.toFixed(1)} / 5
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </>
        ) : null}

        {/* ── 7. Punto de inicio (coordenadas) ─────────────────────────────── */}
        {latitud !== null && longitud !== null ? (
          <>
            <View className="bg-neutral-200 mx-4" style={styles.separator} />
            <View className="px-4 py-5">
              <Text className="text-neutral-800 font-bold mb-3" style={styles.sectionTitle}>
                Punto de inicio
              </Text>
              <View className="bg-neutral-100 rounded-xl p-4">
                <Text className="text-neutral-700 font-semibold mb-1" style={styles.coordTitle}>
                  📍 Punto de inicio
                </Text>
                <Text className="text-neutral-500" style={styles.coordText}>
                  Latitud: {latitud.toFixed(6)}
                </Text>
                <Text className="text-neutral-500" style={styles.coordText}>
                  Longitud: {longitud.toFixed(6)}
                </Text>
                <Text className="text-neutral-400 mt-2" style={styles.coordNote}>
                  Mapa completo disponible en Fase 4
                </Text>
              </View>
            </View>
          </>
        ) : null}

        {/* Espacio inferior para que el botón flotante no tape el contenido */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── 8. Botón flotante de reserva (sticky inferior) ────────────────── */}
      <SafeAreaView edges={['bottom']} className="bg-white border-t border-neutral-200">
        <View className="px-4 py-3">
          <TouchableOpacity
            onPress={handleReserve}
            disabled={isSoldOut}
            style={[
              styles.reserveButton,
              isSoldOut ? styles.reserveButtonDisabled : styles.reserveButtonEnabled,
            ]}
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-center" style={styles.reserveButtonText}>
              {isSoldOut ? 'Sin plazas' : 'Reservar excursión'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  // ── Hero ────────────────────────────────────────────────────────────────
  heroContainer: {
    position: 'relative',
    width: '100%',
    height: 250,
  },
  heroImage: {
    width: '100%',
    height: 250,
  },
  heroPlaceholderIcon: {
    fontSize: 64,
  },
  // Badge de dificultad sobre la imagen
  difficultyBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  difficultyBadgeText: {
    fontSize: 12,
  },
  // Botón back circular semitransparente
  backButton: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonIcon: {
    fontSize: 20,
    color: COLORS.neutral[800],
    lineHeight: 22,
  },
  // ── Info principal ───────────────────────────────────────────────────────
  routeName: {
    fontSize: 24,
    lineHeight: 30,
  },
  zona: {
    fontSize: 15,
  },
  statsRow: {
    gap: 0, // gap gestionado con mr-2 mb-2 en cada pill
  },
  statText: {
    fontSize: 13,
  },
  dateText: {
    fontSize: 14,
    marginBottom: 4,
  },
  seatsText: {
    fontSize: 14,
  },
  separator: {
    height: 1,
  },
  // ── Secciones ────────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 17,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
  },
  // ── Guía ─────────────────────────────────────────────────────────────────
  guideAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  guideAvatarPlaceholder: {
    fontSize: 24,
  },
  guideName: {
    fontSize: 15,
  },
  guideRating: {
    fontSize: 13,
  },
  // ── Coordenadas ──────────────────────────────────────────────────────────
  coordTitle: {
    fontSize: 14,
  },
  coordText: {
    fontSize: 12,
    marginTop: 2,
  },
  coordNote: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  // ── Botón de reserva ─────────────────────────────────────────────────────
  bottomSpacer: {
    height: 16,
  },
  reserveButton: {
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  reserveButtonEnabled: {
    backgroundColor: COLORS.primary[500],
  },
  reserveButtonDisabled: {
    backgroundColor: COLORS.neutral[300],
  },
  reserveButtonText: {
    fontSize: 16,
  },
  // ── Estados de carga/error ────────────────────────────────────────────────
  loadingText: {
    fontSize: 14,
  },
  notFoundTitle: {
    fontSize: 18,
  },
  errorText: {
    fontSize: 14,
  },
  backButtonText: {
    fontSize: 15,
  },
});
