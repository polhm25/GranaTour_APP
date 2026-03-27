// Pantalla de onboarding: se muestra solo en el primer lanzamiento de la app
import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';
import { COLORS } from '@/lib/constants';

// ─── Clave AsyncStorage para marcar el onboarding como completado ──────────────

export const ONBOARDING_KEY = 'granatour_onboarding_done';

// ─── Slides ───────────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  bgColor: string;
}

const SLIDES: Slide[] = [
  {
    id: 'discover',
    emoji: '🏔️',
    title: 'Descubre Granada',
    subtitle:
      'Explora las rutas más espectaculares de la provincia con guías expertos que conocen cada rincón.',
    bgColor: COLORS.primary[500],
  },
  {
    id: 'track',
    emoji: '📍',
    title: 'Registra tus aventuras',
    subtitle:
      'Graba tus rutas GPS en tiempo real, sube fotos geolocalizadas y revive cada momento de tu excursión.',
    bgColor: COLORS.secondary[500],
  },
  {
    id: 'book',
    emoji: '🗺️',
    title: 'Reserva y disfruta',
    subtitle:
      'Elige tu excursión favorita, reserva en segundos y únete a la comunidad GranaTour.',
    bgColor: '#0F766E',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Componente ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const dotAnim = useRef(SLIDES.map(() => new Animated.Value(0))).current;

  // Actualizar el índice activo y animar los dots al hacer scroll
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index !== undefined && viewableItems[0].index !== null) {
        const idx = viewableItems[0].index;
        setCurrentIndex(idx);
        // Animar dot activo
        SLIDES.forEach((_, i) => {
          Animated.timing(dotAnim[i], {
            toValue: i === idx ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
          }).start();
        });
      }
    },
    [dotAnim]
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Finalizar onboarding: guardar flag y navegar al destino correcto
  const handleFinish = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    const session = useAuthStore.getState().session;
    if (session) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, []);

  // Ir al siguiente slide
  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  }, [currentIndex, handleFinish]);

  // Renderizado de cada slide
  const renderSlide = useCallback(
    ({ item }: { item: Slide }) => (
      <View style={[styles.slide, { backgroundColor: item.bgColor }]}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    ),
    []
  );

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Carrusel de slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        style={styles.flatList}
      />

      {/* Área inferior: dots + botones */}
      <View style={styles.footer}>
        {/* Indicadores de posición (dots) */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => {
            const dotWidth = dotAnim[i].interpolate({
              inputRange: [0, 1],
              outputRange: [8, 24],
            });
            const dotOpacity = dotAnim[i].interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 1],
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            );
          })}
        </View>

        {/* Botones de navegación */}
        <View style={styles.buttonsRow}>
          {/* Omitir — solo visible en slides intermedios */}
          {!isLastSlide ? (
            <TouchableOpacity onPress={handleFinish} activeOpacity={0.7} style={styles.skipButton}>
              <Text style={styles.skipText}>Omitir</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipButton} />
          )}

          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.85}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>
              {isLastSlide ? 'Empezar' : 'Siguiente'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary[500],
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 26,
  },

  // ── Pie de página ─────────────────────────────────────────────────────────
  footer: {
    backgroundColor: '#fff',
    paddingTop: 24,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },

  // ── Dots ─────────────────────────────────────────────────────────────────
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary[500],
  },

  // ── Botones ───────────────────────────────────────────────────────────────
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    minWidth: 80,
  },
  skipText: {
    color: COLORS.neutral[500],
    fontSize: 15,
  },
  nextButton: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 140,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
