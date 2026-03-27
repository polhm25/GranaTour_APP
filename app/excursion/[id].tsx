// Pantalla de detalle de una excursión.
// Muestra imagen hero, info completa, guía asignado y botón flotante de reserva.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExcursionMapView } from '@/components/MapView';
import { PhotoCapture } from '@/components/PhotoCapture';
import { StarRating } from '@/components/StarRating';
import { ReviewCard } from '@/components/ReviewCard';
import { COLORS } from '@/lib/constants';
import { formatDate, formatDuration, formatPrice, getDifficultyColor } from '@/lib/utils';
import { useExcursionsStore } from '@/stores/excursionsStore';
import { useBookingsStore } from '@/stores/bookingsStore';
import { usePhotosStore } from '@/stores/photosStore';
import { useReviewsStore } from '@/stores/reviewsStore';
import { useAuthStore } from '@/stores/authStore';
import type { Foto } from '@/lib/types';

// Ancho de columna para la cuadrícula de 2 columnas
const SCREEN_WIDTH = Dimensions.get('window').width;
const COMMUNITY_PHOTO_SIZE = (SCREEN_WIDTH - 32) / 2;

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
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const excursionId = rawId ? parseInt(rawId, 10) : NaN;

  // ── Store de excursiones ──────────────────────────────────────────────────
  const { currentExcursion, loading, error, getExcursionById } = useExcursionsStore(
    useShallow((state) => ({
      currentExcursion: state.currentExcursion,
      loading: state.loading,
      error: state.error,
      getExcursionById: state.getExcursionById,
    }))
  );

  // ── Store de reservas ─────────────────────────────────────────────────────
  const { loadingCreate, bookingError, createBooking, clearBookingError } = useBookingsStore(
    useShallow((state) => ({
      loadingCreate: state.loadingCreate,
      bookingError: state.error,
      createBooking: state.createBooking,
      clearBookingError: state.clearError,
    }))
  );

  // ── Store de fotos — array dedicado para excursión (C-02) ─────────────────
  const { photos, loadingPhotos } = usePhotosStore(
    useShallow((state) => ({
      photos: state.excursionPhotos,
      loadingPhotos: state.loadingExcursion,
    }))
  );

  // Acciones con referencias estables — fuera de useShallow (I-02)
  const fetchPhotosByExcursion = usePhotosStore((state) => state.fetchPhotosByExcursion);
  const clearExcursionPhotos = usePhotosStore((state) => state.clearExcursionPhotos);

  // ── Store de reviews ──────────────────────────────────────────────────────
  const {
    reviews,
    userReview,
    averageRating,
    userCanReview,
    loadingReviews,
    loadingCreateReview,
    loadingEditReview,
    loadingDeleteReview,
    reviewsError,
  } = useReviewsStore(
    useShallow((state) => ({
      reviews: state.reviews,
      userReview: state.userReview,
      averageRating: state.averageRating,
      userCanReview: state.userCanReview,
      loadingReviews: state.loadingList,
      loadingCreateReview: state.loadingCreate,
      loadingEditReview: state.loadingEdit,
      loadingDeleteReview: state.loadingDelete,
      reviewsError: state.error,
    }))
  );

  // Acciones del store de reviews — referencias estables
  const fetchReviewsByExcursion = useReviewsStore((state) => state.fetchReviewsByExcursion);
  const createReview = useReviewsStore((state) => state.createReview);
  const editReview = useReviewsStore((state) => state.editReview);
  const deleteReview = useReviewsStore((state) => state.deleteReview);
  const clearReviews = useReviewsStore((state) => state.clearReviews);
  const clearReviewsError = useReviewsStore((state) => state.clearError);

  // Usuario autenticado para comparar con el autor de cada review
  const currentUser = useAuthStore((state) => state.user);

  // ── Estado del booking sheet ──────────────────────────────────────────────
  const [showSheet, setShowSheet] = useState(false);
  const [numPersonas, setNumPersonas] = useState(1);

  // ── Estado del lightbox de fotos ──────────────────────────────────────────
  const [selectedPhoto, setSelectedPhoto] = useState<Foto | null>(null);

  // ── Estado del formulario de review ──────────────────────────────────────
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [editingReview, setEditingReview] = useState(false);

  // ── Carga al montar ─── I-06: getExcursionById incluido en deps ──────────
  useEffect(() => {
    if (!isNaN(excursionId)) {
      getExcursionById(excursionId);
    }
  }, [excursionId, getExcursionById]);

  // ── Cargar fotos de la excursión ──────────────────────────────────────────
  useEffect(() => {
    if (!isNaN(excursionId)) {
      fetchPhotosByExcursion(excursionId);
    }
    return () => clearExcursionPhotos();
  }, [excursionId, fetchPhotosByExcursion, clearExcursionPhotos]);

  // ── Cargar reviews de la excursión ────────────────────────────────────────
  useEffect(() => {
    if (!isNaN(excursionId)) {
      fetchReviewsByExcursion(excursionId);
    }
    return () => clearReviews();
  }, [excursionId, fetchReviewsByExcursion, clearReviews]);

  // ── Mostrar errores del store de reviews ──────────────────────────────────
  useEffect(() => {
    if (reviewsError) {
      Alert.alert('Error', reviewsError, [{ text: 'OK', onPress: clearReviewsError }]);
    }
  }, [reviewsError, clearReviewsError]);

  // ── Callback tras subir foto en la galería ─────────────────────────────────
  const handlePhotoUploaded = useCallback(
    (_foto: Foto) => {
      // Recargar fotos de la excursión para que aparezca la nueva
      fetchPhotosByExcursion(excursionId);
    },
    [excursionId, fetchPhotosByExcursion]
  );

  // ── Iniciar edición de la review propia ───────────────────────────────────
  const handleEditReview = useCallback(() => {
    if (!userReview) return;
    setReviewStars(userReview.puntuacion);
    setReviewComment(userReview.comentario ?? '');
    setEditingReview(true);
  }, [userReview]);

  // ── Guardar nueva review o edición ───────────────────────────────────────
  const handleSubmitReview = useCallback(async () => {
    if (editingReview && userReview) {
      await editReview(userReview.id_review, {
        puntuacion: reviewStars,
        comentario: reviewComment,
      });
      setEditingReview(false);
    } else {
      await createReview({
        id_excursion: excursionId,
        puntuacion: reviewStars,
        comentario: reviewComment,
      });
      setReviewComment('');
      setReviewStars(5);
    }
  }, [editingReview, userReview, editReview, createReview, excursionId, reviewStars, reviewComment]);

  // ── Eliminar review propia ────────────────────────────────────────────────
  const handleDeleteReview = useCallback(() => {
    if (!userReview) return;
    Alert.alert(
      'Eliminar valoración',
      '¿Seguro que quieres eliminar tu valoración?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteReview(userReview.id_review) },
      ]
    );
  }, [userReview, deleteReview]);

  // ── Resetear personas al abrir el sheet ─── I-05: useCallback ───────────
  const openSheet = useCallback(() => {
    setNumPersonas(1);
    clearBookingError(); // limpiar error previo al abrir
    setShowSheet(true);
  }, [clearBookingError]);

  // ── Confirmar reserva ─── I-05: useCallback ───────────────────────────────
  const handleConfirmBooking = useCallback(async () => {
    if (!currentExcursion) return;

    const result = await createBooking({
      id_excursion: currentExcursion.id_excursion,
      num_personas: numPersonas,
      precio_persona: currentExcursion.precio_persona,
    });

    if (result) {
      // Haptic de éxito al confirmar la reserva
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSheet(false);
      // Navegar a la pestaña de reservas para ver la nueva reserva
      router.replace('/(tabs)/bookings');
    }
  }, [currentExcursion, numPersonas, createBooking, router]);

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

  const difficultyColor = dificultad ? getDifficultyColor(dificultad) : COLORS.neutral[400];
  const difficultyLabel = dificultad ? (DIFFICULTY_LABELS[dificultad] ?? dificultad) : null;
  const isSoldOut = plazas_disponibles === 0;
  const maxPersonas = Math.min(plazas_disponibles, 10); // máximo 10 personas por reserva
  const precioTotal = numPersonas * precio_persona;

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
            <View
              className="bg-primary-100 items-center justify-center"
              style={styles.heroImage}
            >
              <Text style={styles.heroPlaceholderIcon}>🏔</Text>
            </View>
          )}

          {/* Badge de dificultad */}
          {difficultyLabel && (
            <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}>
              <Text className="text-white font-semibold" style={styles.difficultyBadgeText}>
                {difficultyLabel}
              </Text>
            </View>
          )}

          {/* Botón back */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonIcon}>←</Text>
          </TouchableOpacity>
        </View>

        {/* ── 2. Info principal ───────────────────────────────────────────── */}
        <View className="px-4 pt-5 pb-4">
          <Text className="text-neutral-800 font-bold mb-2" style={styles.routeName}>
            {nombre_ruta}
          </Text>

          <Text className="text-neutral-500 mb-4" style={styles.zona}>
            📍 {zona}
          </Text>

          {/* Pills de stats */}
          <View className="flex-row flex-wrap mb-4">
            <View className="bg-neutral-100 rounded-lg px-3 py-2 mr-2 mb-2">
              <Text className="text-neutral-600" style={styles.statText}>
                ⏱ {formatDuration(duracion_horas)}
              </Text>
            </View>

            {distancia_km !== null && (
              <View className="bg-neutral-100 rounded-lg px-3 py-2 mr-2 mb-2">
                <Text className="text-neutral-600" style={styles.statText}>
                  📏 {distancia_km} km
                </Text>
              </View>
            )}

            {desnivel_positivo !== null && (
              <View className="bg-neutral-100 rounded-lg px-3 py-2 mr-2 mb-2">
                <Text className="text-neutral-600" style={styles.statText}>
                  ↗ {desnivel_positivo} m
                </Text>
              </View>
            )}

            <View className="bg-primary-50 rounded-lg px-3 py-2 mr-2 mb-2">
              <Text className="text-primary-700 font-semibold" style={styles.statText}>
                💰 {formatPrice(precio_persona)}/persona
              </Text>
            </View>
          </View>

          <Text className="text-neutral-600 mb-2" style={styles.dateText}>
            📅 {formatDate(fecha_inicio)}
          </Text>

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

        <View className="bg-neutral-200 mx-4" style={styles.separator} />

        {/* ── 3. Descripción ───────────────────────────────────────────────── */}
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

        {/* ── 4. Guía asignado ─────────────────────────────────────────────── */}
        {guia ? (
          <>
            <View className="bg-neutral-200 mx-4" style={styles.separator} />
            <View className="px-4 py-5">
              <Text className="text-neutral-800 font-bold mb-4" style={styles.sectionTitle}>
                Tu guía
              </Text>
              <View className="flex-row items-center">
                {guia.avatar_url ? (
                  <Image source={{ uri: guia.avatar_url }} style={styles.guideAvatar} />
                ) : (
                  <View
                    className="bg-primary-100 items-center justify-center"
                    style={styles.guideAvatar}
                  >
                    <Text style={styles.guideAvatarPlaceholder}>👤</Text>
                  </View>
                )}
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

        {/* ── 5. Punto de inicio en mapa ────────────────────────────────────── */}
        {latitud !== null && longitud !== null ? (
          <>
            <View className="bg-neutral-200 mx-4" style={styles.separator} />
            <View className="py-5">
              <Text
                className="text-neutral-800 font-bold mb-3 px-4"
                style={styles.sectionTitle}
              >
                Punto de inicio
              </Text>
              {/* Mapa mini no interactivo centrado en el punto de inicio */}
              <ExcursionMapView
                excursions={[currentExcursion]}
                onMarkerPress={() => {}}
                selectedId={excursionId}
                interactive={false}
                style={styles.miniMap}
              />
            </View>
          </>
        ) : null}

        {/* ── 6. Fotos de la comunidad ──────────────────────────────────── */}
        <View className="bg-neutral-200 mx-4" style={styles.separator} />
        <View className="py-5">
          <View className="flex-row items-center justify-between px-4 mb-3">
            <Text className="text-neutral-800 font-bold" style={styles.sectionTitle}>
              Fotos de la comunidad
            </Text>
            <PhotoCapture
              onPhotoUploaded={handlePhotoUploaded}
              id_excursion={excursionId}
            />
          </View>

          {loadingPhotos ? (
            <ActivityIndicator color={COLORS.primary[500]} style={{ marginTop: 8 }} />
          ) : photos.length === 0 ? (
            <View className="items-center py-6 px-8">
              <Text className="text-4xl mb-2">📸</Text>
              <Text className="text-neutral-500 text-sm text-center">
                Sé el primero en compartir una foto de esta excursión
              </Text>
            </View>
          ) : (
            // FlatList con scrollEnabled=false para embeberse en el ScrollView padre (C-03)
            <FlatList
              data={photos}
              keyExtractor={(item) => String(item.id_foto)}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.photoGridContainer}
              columnWrapperStyle={styles.photoGridRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.photoGridItem}
                  onPress={() => setSelectedPhoto(item)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: item.url_storage }}
                    style={styles.photoGridImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        {/* ── 7. Valoraciones ──────────────────────────────────────────────── */}
        <View className="bg-neutral-200 mx-4" style={styles.separator} />
        <View className="px-4 py-5">
          {/* Cabecera con media */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-neutral-800 font-bold" style={styles.sectionTitle}>
              Valoraciones
            </Text>
            {averageRating !== null && (
              <View className="flex-row items-center">
                <StarRating value={averageRating} size={16} showValue />
                <Text className="text-neutral-400 ml-1" style={styles.reviewCount}>
                  ({reviews.length})
                </Text>
              </View>
            )}
          </View>

          {/* Formulario de nueva review o edición (solo si puede valorar o está editando) */}
          {(userCanReview || editingReview) && (
            <View className="bg-neutral-50 rounded-xl p-4 mb-4">
              <Text className="text-neutral-700 font-semibold mb-3" style={styles.formLabel}>
                {editingReview ? 'Editar tu valoración' : 'Tu valoración'}
              </Text>
              <StarRating
                value={reviewStars}
                onChange={setReviewStars}
                size={32}
              />
              <TextInput
                style={styles.reviewInput}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="Añade un comentario (opcional)"
                placeholderTextColor={COLORS.neutral[400]}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
              <View className="flex-row gap-2 mt-3">
                {editingReview && (
                  <TouchableOpacity
                    style={[styles.reviewBtn, styles.cancelReviewBtn]}
                    onPress={() => setEditingReview(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelReviewBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.reviewBtn, styles.submitReviewBtn, { flex: 1 }]}
                  onPress={handleSubmitReview}
                  disabled={loadingCreateReview || loadingEditReview}
                  activeOpacity={0.8}
                >
                  {loadingCreateReview || loadingEditReview ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitReviewBtnText}>
                      {editingReview ? 'Guardar cambios' : 'Publicar valoración'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Lista de reviews */}
          {loadingReviews ? (
            <ActivityIndicator color={COLORS.primary[500]} />
          ) : reviews.length === 0 ? (
            <View className="items-center py-4">
              <Text className="text-neutral-400 text-sm text-center">
                Aún no hay valoraciones. ¡Sé el primero en valorar esta excursión!
              </Text>
            </View>
          ) : (
            reviews.map((review) => (
              <ReviewCard
                key={review.id_review}
                review={review}
                isOwn={review.id_usuario === currentUser?.id_usuario}
                onEdit={review.id_usuario === currentUser?.id_usuario ? handleEditReview : undefined}
                onDelete={review.id_usuario === currentUser?.id_usuario ? handleDeleteReview : undefined}
                loadingDelete={loadingDeleteReview}
              />
            ))
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── 6. Botón flotante de reserva ──────────────────────────────────── */}
      <SafeAreaView edges={['bottom']} className="bg-white border-t border-neutral-200">
        <View className="px-4 py-3">
          <TouchableOpacity
            onPress={openSheet}
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

      {/* ── 7. Booking sheet (Modal) ───────────────────────────────────────── */}
      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSheet(false)}
      >
        {/* Overlay semitransparente */}
        <Pressable style={styles.sheetOverlay} onPress={() => setShowSheet(false)} />

        {/* Contenido del sheet */}
        <View style={styles.sheetContainer}>
          {/* Handle visual */}
          <View style={styles.sheetHandle} />

          {/* Cabecera */}
          <Text className="text-neutral-800 font-bold mb-1" style={styles.sheetTitle}>
            Reservar excursión
          </Text>
          <Text className="text-neutral-500 mb-6" style={styles.sheetSubtitle}>
            {nombre_ruta}
          </Text>

          {/* Selector de personas */}
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-neutral-700 font-semibold" style={styles.sheetLabel}>
                Número de personas
              </Text>
              <Text className="text-neutral-400 mt-0.5" style={styles.sheetLabelSub}>
                Máximo {maxPersonas} por reserva
              </Text>
            </View>
            <View className="flex-row items-center">
              {/* Botón − */}
              <TouchableOpacity
                onPress={() => setNumPersonas((n) => Math.max(1, n - 1))}
                disabled={numPersonas <= 1}
                style={[
                  styles.counterButton,
                  numPersonas <= 1 && styles.counterButtonDisabled,
                ]}
                activeOpacity={0.7}
              >
                <Text style={styles.counterButtonText}>−</Text>
              </TouchableOpacity>

              {/* Valor actual */}
              <Text className="text-neutral-800 font-bold mx-4" style={styles.counterValue}>
                {numPersonas}
              </Text>

              {/* Botón + */}
              <TouchableOpacity
                onPress={() => setNumPersonas((n) => Math.min(maxPersonas, n + 1))}
                disabled={numPersonas >= maxPersonas}
                style={[
                  styles.counterButton,
                  numPersonas >= maxPersonas && styles.counterButtonDisabled,
                ]}
                activeOpacity={0.7}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Desglose de precio */}
          <View className="bg-neutral-50 rounded-xl p-4 mb-6">
            <View className="flex-row justify-between mb-2">
              <Text className="text-neutral-500" style={styles.priceRow}>
                {formatPrice(precio_persona)} × {numPersonas}{' '}
                {numPersonas === 1 ? 'persona' : 'personas'}
              </Text>
              <Text className="text-neutral-700" style={styles.priceRow}>
                {formatPrice(precioTotal)}
              </Text>
            </View>
            <View className="h-px bg-neutral-200 mb-2" />
            <View className="flex-row justify-between">
              <Text className="text-neutral-800 font-bold" style={styles.priceTotal}>
                Total
              </Text>
              <Text className="text-primary-600 font-bold" style={styles.priceTotal}>
                {formatPrice(precioTotal)}
              </Text>
            </View>
          </View>

          {/* Error de reserva */}
          {bookingError ? (
            <View className="mb-4 rounded-lg bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{bookingError}</Text>
            </View>
          ) : null}

          {/* Botón confirmar */}
          <TouchableOpacity
            onPress={handleConfirmBooking}
            disabled={loadingCreate}
            style={[styles.confirmButton, loadingCreate && styles.confirmButtonLoading]}
            activeOpacity={0.85}
          >
            {loadingCreate ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-white font-bold text-center" style={styles.confirmButtonText}>
                Confirmar reserva
              </Text>
            )}
          </TouchableOpacity>

          {/* Botón cancelar */}
          <TouchableOpacity
            onPress={() => setShowSheet(false)}
            disabled={loadingCreate}
            className="mt-3 items-center py-3"
          >
            <Text className="text-neutral-400" style={styles.cancelText}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Lightbox de fotos de la comunidad ─────────────────────────── */}
      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <Pressable style={styles.lightboxOverlay} onPress={() => setSelectedPhoto(null)}>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto.url_storage }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
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
  // ── Info ─────────────────────────────────────────────────────────────────
  routeName: {
    fontSize: 24,
    lineHeight: 30,
  },
  zona: {
    fontSize: 15,
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
  // ── Mapa mini en detalle de excursión ────────────────────────────────────
  miniMap: {
    height: 200,
  },
  // ── Botón reservar ───────────────────────────────────────────────────────
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
  // ── Estados carga/error ───────────────────────────────────────────────────
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
  // ── Booking sheet (Modal) ────────────────────────────────────────────────
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
  },
  sheetSubtitle: {
    fontSize: 14,
  },
  sheetLabel: {
    fontSize: 15,
  },
  sheetLabelSub: {
    fontSize: 12,
  },
  // Contador de personas
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonDisabled: {
    backgroundColor: COLORS.neutral[200],
  },
  counterButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 24,
    fontWeight: '600',
  },
  counterValue: {
    fontSize: 22,
    minWidth: 28,
    textAlign: 'center',
  },
  // Desglose precio
  priceRow: {
    fontSize: 14,
  },
  priceTotal: {
    fontSize: 16,
  },
  // Botón confirmar
  confirmButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmButtonLoading: {
    backgroundColor: COLORS.primary[300],
  },
  confirmButtonText: {
    fontSize: 16,
  },
  cancelText: {
    fontSize: 14,
  },
  // ── Galería de fotos de la comunidad (FlatList con scrollEnabled=false) ──
  photoGridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  photoGridRow: {
    gap: 4,
    marginBottom: 4,
  },
  photoGridItem: {
    width: COMMUNITY_PHOTO_SIZE,
    height: COMMUNITY_PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
  },
  // ── Lightbox ──────────────────────────────────────────────────────────────
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '80%',
  },
  // ── Reviews ───────────────────────────────────────────────────────────────
  reviewCount: {
    fontSize: 13,
  },
  formLabel: {
    fontSize: 15,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.neutral[800],
    marginTop: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reviewBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelReviewBtn: {
    backgroundColor: COLORS.neutral[100],
    paddingHorizontal: 20,
  },
  cancelReviewBtnText: {
    fontSize: 14,
    color: COLORS.neutral[600],
    fontWeight: '600',
  },
  submitReviewBtn: {
    backgroundColor: COLORS.primary[500],
  },
  submitReviewBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
