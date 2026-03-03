// Tab 1: Home — saludo al usuario, excursiones destacadas y próximas salidas.
// Usa ScrollView con secciones fijas (no FlatList, porque la estructura no es homogénea).

import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExcursionCard } from '@/components/ExcursionCard';
import { COLORS } from '@/lib/constants';
import type { ExcursionConGuia } from '@/lib/types';
import { useExcursionsStore } from '@/stores/excursionsStore';
import { useAuth } from '@/hooks/useAuth';

// Número máximo de excursiones próximas que se muestran en Home
const MAX_UPCOMING = 5;

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // ── Selector del store con useShallow ────────────────────────────────────
  const { featuredExcursions, upcomingExcursions, loading, fetchFeaturedExcursions, fetchUpcomingExcursions } =
    useExcursionsStore(
      useShallow((state) => ({
        featuredExcursions: state.featuredExcursions,
        upcomingExcursions: state.upcomingExcursions,
        loading: state.loading,
        fetchFeaturedExcursions: state.fetchFeaturedExcursions,
        fetchUpcomingExcursions: state.fetchUpcomingExcursions,
      }))
    );

  // ── Carga paralela de destacadas y próximas al montar ────────────────────
  useEffect(() => {
    Promise.all([fetchFeaturedExcursions(), fetchUpcomingExcursions()]);
  }, []);

  // ── Nombre de saludo (primer nombre del usuario autenticado) ─────────────
  const greetingName = user?.nombre ?? 'viajero';

  // ── Navega al detalle de una excursión ───────────────────────────────────
  function handleExcursionPress(id: number) {
    router.push(`/excursion/${id}`);
  }

  // ── Navega a la tab Explorar ──────────────────────────────────────────────
  // navigate reemplaza la ruta actual en el stack de tabs en lugar de apilar una nueva pantalla
  function handleSeeAll() {
    router.navigate('/(tabs)/explore');
  }

  // ── Skeleton placeholder mientras carga ──────────────────────────────────
  function SkeletonCard({ width }: { width: number | string }) {
    return (
      <View
        className="bg-neutral-200 rounded-xl mb-4"
        style={[styles.skeletonCard, { width: typeof width === 'number' ? width : undefined }]}
      />
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header con saludo ───────────────────────────────────────── */}
        <View className="px-4 pt-6 pb-4 bg-white border-b border-neutral-200">
          <Text className="text-neutral-800 font-bold" style={styles.greeting}>
            ¡Hola, {greetingName}!
          </Text>
          <Text className="text-neutral-500 mt-1" style={styles.subGreeting}>
            ¿A dónde vamos hoy?
          </Text>
        </View>

        {/* ── Sección: Excursiones destacadas ─────────────────────────── */}
        <View className="mt-5">
          {/* Cabecera de sección */}
          <View className="flex-row items-center justify-between px-4 mb-3">
            <Text className="text-neutral-800 font-bold" style={styles.sectionTitle}>
              Destacadas
            </Text>
            <TouchableOpacity onPress={handleSeeAll}>
              <Text className="text-primary-600 font-semibold" style={styles.seeAllText}>
                Ver todas →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scroll horizontal de excursiones destacadas */}
          {loading && featuredExcursions.length === 0 ? (
            // Skeletons horizontales durante la carga
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListContent}
            >
              <SkeletonCard width={280} />
              <SkeletonCard width={280} />
              <SkeletonCard width={280} />
            </ScrollView>
          ) : featuredExcursions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListContent}
            >
              {featuredExcursions.map((excursion: ExcursionConGuia) => (
                <View key={excursion.id_excursion} style={styles.featuredCardWrapper}>
                  <ExcursionCard
                    excursion={excursion}
                    onPress={() => handleExcursionPress(excursion.id_excursion)}
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            // Estado vacío de la sección destacadas
            <View className="px-4 py-6 items-center">
              <Text className="text-neutral-400 text-center" style={styles.emptyText}>
                No hay excursiones destacadas disponibles
              </Text>
            </View>
          )}
        </View>

        {/* ── Sección: Próximas salidas ────────────────────────────────── */}
        <View className="mt-6 mb-6">
          {/* Cabecera de sección */}
          <View className="flex-row items-center justify-between px-4 mb-3">
            <Text className="text-neutral-800 font-bold" style={styles.sectionTitle}>
              Próximas salidas
            </Text>
            <TouchableOpacity onPress={handleSeeAll}>
              <Text className="text-primary-600 font-semibold" style={styles.seeAllText}>
                Ver todas →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lista vertical de excursiones próximas */}
          {loading && upcomingExcursions.length === 0 ? (
            // Skeletons verticales durante la carga
            <View className="px-4">
              <ActivityIndicator
                size="large"
                color={COLORS.primary[500]}
                style={styles.loadingIndicator}
              />
            </View>
          ) : upcomingExcursions.length > 0 ? (
            <View className="px-4">
              {upcomingExcursions.slice(0, MAX_UPCOMING).map((excursion: ExcursionConGuia) => (
                <ExcursionCard
                  key={excursion.id_excursion}
                  excursion={excursion}
                  onPress={() => handleExcursionPress(excursion.id_excursion)}
                />
              ))}
            </View>
          ) : (
            // Estado vacío de la sección próximas
            <View className="px-4 py-6 items-center">
              <Text className="text-neutral-400 text-center" style={styles.emptyText}>
                No hay próximas excursiones disponibles
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  greeting: {
    fontSize: 26,
  },
  subGreeting: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
  },
  seeAllText: {
    fontSize: 14,
  },
  horizontalListContent: {
    paddingHorizontal: 16,
    paddingRight: 8,
  },
  // Wrapper de la card horizontal con ancho fijo de 280
  featuredCardWrapper: {
    width: 280,
    marginRight: 12,
  },
  skeletonCard: {
    height: 220,
    marginRight: 12,
  },
  loadingIndicator: {
    marginVertical: 24,
  },
  emptyText: {
    fontSize: 14,
  },
});
