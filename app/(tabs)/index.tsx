// Tab 1: Home — saludo al usuario, excursiones destacadas y próximas salidas.
// Usa ScrollView con secciones fijas (no FlatList, porque la estructura no es homogénea).

import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ExcursionCard } from '@/components/ExcursionCard';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ExcursionCardSkeleton } from '@/components/ui/SkeletonLoader';
import { BurgerMenu } from '@/components/ui/BurgerMenu';
import { COLORS } from '@/lib/constants';
import type { ExcursionConGuia } from '@/lib/types';
import { useExcursionsStore } from '@/stores/excursionsStore';
import { useAuth } from '@/hooks/useAuth';

// Número máximo de excursiones próximas que se muestran en Home
const MAX_UPCOMING = 5;

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  // ── Selector del store con useShallow ────────────────────────────────────
  // Se usan flags granulares para que cada sección tenga su propio estado de carga
  // independiente, evitando que el primero en resolver apague el spinner del otro.
  const {
    featuredExcursions,
    upcomingExcursions,
    loadingFeatured,
    loadingUpcoming,
    fetchFeaturedExcursions,
    fetchUpcomingExcursions,
  } = useExcursionsStore(
    useShallow((state) => ({
      featuredExcursions: state.featuredExcursions,
      upcomingExcursions: state.upcomingExcursions,
      loadingFeatured: state.loadingFeatured,
      loadingUpcoming: state.loadingUpcoming,
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
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <OfflineBanner />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header con saludo + avatar + burger ─────────────────────── */}
        <View className="px-4 pt-6 pb-4 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
          <View className="flex-row items-center justify-between">
            {/* Avatar → perfil */}
            <TouchableOpacity
              onPress={() => router.navigate('/(tabs)/profile')}
              activeOpacity={0.8}
              style={styles.avatarButton}
            >
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.headerAvatar} />
              ) : (
                <View style={styles.headerAvatarPlaceholder}>
                  <Text style={styles.headerAvatarInitials}>
                    {user ? `${user.nombre.charAt(0)}${user.ap1.charAt(0)}` : '?'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Saludo central */}
            <View className="flex-1 mx-3">
              <Text className="text-neutral-800 dark:text-neutral-100 font-bold" style={styles.greeting}>
                ¡Hola, {greetingName}!
              </Text>
              <Text className="text-neutral-500 dark:text-neutral-400" style={styles.subGreeting}>
                ¿A dónde vamos hoy?
              </Text>
            </View>

            {/* Burger menu */}
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              activeOpacity={0.7}
              style={styles.burgerButton}
              hitSlop={8}
            >
              <Ionicons name="menu" size={26} color={COLORS.neutral[700]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Drawer lateral */}
        <BurgerMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />

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
          {loadingFeatured && featuredExcursions.length === 0 ? (
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
          {loadingUpcoming && upcomingExcursions.length === 0 ? (
            // Skeletons verticales durante la carga
            <View className="px-4">
              <ExcursionCardSkeleton />
              <ExcursionCardSkeleton />
              <ExcursionCardSkeleton />
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
  // ── Header ────────────────────────────────────────────────────────────────
  avatarButton: {
    flexShrink: 0,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: COLORS.primary[200],
  },
  headerAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary[200],
  },
  headerAvatarInitials: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary[600],
  },
  burgerButton: {
    padding: 4,
    flexShrink: 0,
  },
  greeting: {
    fontSize: 22,
  },
  subGreeting: {
    fontSize: 14,
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
