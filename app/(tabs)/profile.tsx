// Tab 5: Perfil del usuario — galería personal de fotos (Fase 6)
// Fases posteriores (11) añadirán estadísticas, edición de perfil y avatar
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { useAuth } from '@/hooks/useAuth';
import { usePhotosStore } from '@/stores/photosStore';
import { PhotoCapture } from '@/components/PhotoCapture';
import { COLORS } from '@/lib/constants';
import type { Foto } from '@/lib/types';

// Ancho de columna para la cuadrícula de 3 columnas
const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_WIDTH - 4) / 3; // 3 columnas con 2px de gap entre ellas

export default function ProfileScreen() {
  const { user } = useAuth();

  // Store de fotos
  const { photos, loading, uploading, error, fetchMyPhotos, deletePhoto, clearError } =
    usePhotosStore(
      useShallow((state) => ({
        photos: state.photos,
        loading: state.loading,
        uploading: state.uploading,
        error: state.error,
        fetchMyPhotos: state.fetchMyPhotos,
        deletePhoto: state.deletePhoto,
        clearError: state.clearError,
      }))
    );

  // Foto seleccionada para el lightbox
  const [selectedPhoto, setSelectedPhoto] = useState<Foto | null>(null);

  // Cargar fotos al enfocar la pestaña
  useFocusEffect(
    useCallback(() => {
      fetchMyPhotos();
    }, [fetchMyPhotos])
  );

  // Mostrar error como alerta
  React.useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error, clearError]);

  // Callback cuando se sube una nueva foto desde el perfil
  const handlePhotoUploaded = useCallback(
    (_foto: Foto) => {
      fetchMyPhotos();
    },
    [fetchMyPhotos]
  );

  // Eliminar foto con confirmación (long press o botón en lightbox)
  const handleDeletePhoto = useCallback(
    (foto: Foto) => {
      Alert.alert(
        'Eliminar foto',
        '¿Estás seguro de que quieres eliminar esta foto?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              const success = await deletePhoto(foto.id_foto, foto.url_storage);
              if (success) {
                setSelectedPhoto(null);
              }
            },
          },
        ]
      );
    },
    [deletePhoto]
  );

  // ── Renderizado de cada foto en la cuadrícula ─────────────────────────────
  const renderPhotoItem = useCallback(
    ({ item }: { item: Foto }) => (
      <TouchableOpacity
        style={styles.photoItem}
        onPress={() => setSelectedPhoto(item)}
        onLongPress={() => handleDeletePhoto(item)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: item.url_storage }} style={styles.photoImage} resizeMode="cover" />
      </TouchableOpacity>
    ),
    [handleDeletePhoto]
  );

  const keyExtractor = useCallback((item: Foto) => String(item.id_foto), []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 pt-14 pb-4 px-5">
        <Text className="text-2xl font-bold text-neutral-800">Perfil</Text>
        {user && (
          <Text className="text-neutral-500 mt-1" style={styles.userName}>
            {user.nombre} {user.ap1}
          </Text>
        )}
      </View>

      {/* Sección mis fotos */}
      <View className="flex-1">
        {/* Cabecera de la sección con botón para añadir foto */}
        <View className="flex-row items-center justify-between px-4 pt-5 pb-3">
          <View>
            <Text className="text-neutral-800 font-bold" style={styles.sectionTitle}>
              Mis fotos
            </Text>
            <Text className="text-neutral-400 mt-0.5" style={styles.sectionSubtitle}>
              {photos.length > 0
                ? `${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'}`
                : 'Sin fotos todavía'}
            </Text>
          </View>
          <PhotoCapture onPhotoUploaded={handlePhotoUploaded} />
        </View>

        {/* Indicador de subida */}
        {uploading && (
          <View className="flex-row items-center px-4 py-2 bg-primary-50 mx-4 rounded-lg mb-3">
            <ActivityIndicator size="small" color={COLORS.primary[500]} />
            <Text className="ml-2 text-primary-700" style={styles.uploadingText}>
              Subiendo foto...
            </Text>
          </View>
        )}

        {/* Contenido: loading, vacío o cuadrícula */}
        {loading && photos.length === 0 ? (
          <ActivityIndicator
            color={COLORS.primary[500]}
            size="large"
            style={{ marginTop: 40 }}
          />
        ) : photos.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-5xl mb-4">📷</Text>
            <Text className="text-neutral-600 font-semibold text-base text-center">
              Aún no has subido fotos
            </Text>
            <Text className="text-neutral-400 text-sm text-center mt-2">
              Toma fotos durante tus rutas o desde el detalle de una excursión
            </Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            keyExtractor={keyExtractor}
            renderItem={renderPhotoItem}
            numColumns={3}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
            // Mantener cuadrícula estable
            getItemLayout={(_data, index) => ({
              length: PHOTO_SIZE,
              offset: PHOTO_SIZE * Math.floor(index / 3),
              index,
            })}
          />
        )}
      </View>

      {/* Lightbox — vista ampliada de la foto seleccionada */}
      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.lightboxOverlay}>
          {/* Imagen a pantalla completa */}
          {selectedPhoto && (
            <Pressable
              style={styles.lightboxImageContainer}
              onPress={() => setSelectedPhoto(null)}
            >
              <Image
                source={{ uri: selectedPhoto.url_storage }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            </Pressable>
          )}

          {/* Controles del lightbox */}
          <View style={styles.lightboxControls}>
            {/* Fecha de la foto */}
            {selectedPhoto && (
              <Text style={styles.lightboxDate}>
                {new Date(selectedPhoto.fecha).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            )}

            {/* Botón eliminar */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => selectedPhoto && handleDeletePhoto(selectedPhoto)}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteButtonText}>🗑 Eliminar</Text>
            </TouchableOpacity>
          </View>

          {/* Botón cerrar */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedPhoto(null)}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  userName: {
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 18,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  uploadingText: {
    fontSize: 14,
  },

  // ── Cuadrícula de fotos ───────────────────────────────────────────────────
  gridContainer: {
    paddingBottom: 24,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    margin: 0.5,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },

  // ── Lightbox ──────────────────────────────────────────────────────────────
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  lightboxImageContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  lightboxDate: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.8,
  },
  deleteButton: {
    backgroundColor: 'rgba(239,68,68,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
