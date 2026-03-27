// Tab 5: Perfil del usuario — estadísticas, edición de perfil, historial y galería (Fase 11)
import React, { useCallback, useState } from 'react';
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
import { useFocusEffect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/hooks/useAuth';
import { usePhotosStore } from '@/stores/photosStore';
import { useActivityStore } from '@/stores/activityStore';
import { useProfileStore } from '@/stores/profileStore';
import { ActivityChart } from '@/components/ui/ActivityChart';
import { ActivityCard } from '@/components/ActivityCard';
import { PhotoCapture } from '@/components/PhotoCapture';
import { COLORS } from '@/lib/constants';
import type { Foto } from '@/lib/types';

// ─── Constantes ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_WIDTH - 4) / 3; // cuadrícula 3 columnas con 2px de gap

// Actividades recientes a mostrar en el perfil (sin paginar)
const RECENT_ACTIVITIES_LIMIT = 5;

// ─── Componente auxiliar: tarjeta de estadística ──────────────────────────────

interface StatCardProps {
  value: string;
  label: string;
  icon: string;
}

function StatCard({ value, label, icon }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text className="text-xl font-bold text-neutral-800 mt-1">{value}</Text>
      <Text className="text-xs text-neutral-500 mt-0.5 text-center">{label}</Text>
    </View>
  );
}

// ─── Pantalla principal ────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user } = useAuth();

  // ── Stores ──────────────────────────────────────────────────────────────────
  const { photos, loadingPhotos, uploading, photoError } = usePhotosStore(
    useShallow((state) => ({
      photos: state.myPhotos,
      loadingPhotos: state.loadingMy,
      uploading: state.uploading,
      photoError: state.error,
    }))
  );
  const fetchMyPhotos = usePhotosStore((state) => state.fetchMyPhotos);
  const deletePhoto = usePhotosStore((state) => state.deletePhoto);
  const clearPhotoError = usePhotosStore((state) => state.clearError);

  const { activities, loadingActivities } = useActivityStore(
    useShallow((state) => ({
      activities: state.activities,
      loadingActivities: state.loading,
    }))
  );
  const fetchActivities = useActivityStore((state) => state.fetchActivities);

  const { activityCount, chartData, loadingUpdate, loadingAvatar, profileError } = useProfileStore(
    useShallow((state) => ({
      activityCount: state.activityCount,
      chartData: state.chartData,
      loadingUpdate: state.loadingUpdate,
      loadingAvatar: state.loadingAvatar,
      profileError: state.error,
    }))
  );
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const uploadAvatar = useProfileStore((state) => state.uploadAvatar);
  const fetchActivityStats = useProfileStore((state) => state.fetchActivityStats);
  const fetchActivityChart = useProfileStore((state) => state.fetchActivityChart);
  const clearProfileError = useProfileStore((state) => state.clearError);

  // ── Estado local ─────────────────────────────────────────────────────────────
  const [selectedPhoto, setSelectedPhoto] = useState<Foto | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Campos del formulario de edición
  const [editNombre, setEditNombre] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editTelefono, setEditTelefono] = useState('');

  // ── Carga de datos al enfocar la pestaña ─────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      fetchMyPhotos();
      fetchActivities();
      fetchActivityStats();
      fetchActivityChart();
    }, [fetchMyPhotos, fetchActivities, fetchActivityStats, fetchActivityChart])
  );

  // ── Alertas de error ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (photoError) {
      Alert.alert('Error', photoError, [{ text: 'OK', onPress: clearPhotoError }]);
    }
  }, [photoError, clearPhotoError]);

  React.useEffect(() => {
    if (profileError) {
      Alert.alert('Error', profileError, [{ text: 'OK', onPress: clearProfileError }]);
    }
  }, [profileError, clearProfileError]);

  // ── Abrir modal de edición prellenado ────────────────────────────────────────
  const handleOpenEdit = useCallback(() => {
    if (!user) return;
    setEditNombre(user.nombre);
    setEditBio(user.bio ?? '');
    setEditTelefono(user.telefono ?? '');
    setEditModalVisible(true);
  }, [user]);

  // ── Guardar cambios del perfil ───────────────────────────────────────────────
  const handleSaveProfile = useCallback(async () => {
    const nombre = editNombre.trim();
    if (!nombre) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }
    const success = await updateProfile({
      nombre,
      bio: editBio.trim() || null,
      telefono: editTelefono.trim() || null,
    });
    if (success) {
      setEditModalVisible(false);
    }
  }, [editNombre, editBio, editTelefono, updateProfile]);

  // ── Seleccionar y subir avatar ───────────────────────────────────────────────
  const handlePickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso denegado',
        'Se necesita acceso a la galería para cambiar el avatar'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const success = await uploadAvatar(result.assets[0].uri);
    if (success) {
      Alert.alert('Avatar actualizado', 'Tu foto de perfil se ha actualizado correctamente');
    }
  }, [uploadAvatar]);

  // ── Fotos: subida y eliminación ──────────────────────────────────────────────
  const handlePhotoUploaded = useCallback(
    (_foto: Foto) => {
      fetchMyPhotos();
    },
    [fetchMyPhotos]
  );

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
              if (success) setSelectedPhoto(null);
            },
          },
        ]
      );
    },
    [deletePhoto]
  );

  // ── Formateo de estadísticas ─────────────────────────────────────────────────
  const totalKmLabel = user
    ? user.total_km >= 1000
      ? `${(user.total_km / 1000).toFixed(1)}k`
      : user.total_km.toFixed(1)
    : '—';

  // Actividades recientes (máximo RECENT_ACTIVITIES_LIMIT)
  const recentActivities = activities.slice(0, RECENT_ACTIVITIES_LIMIT);

  // ── Renderizado de fotos ─────────────────────────────────────────────────────
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

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── CABECERA: Avatar + nombre + bio ────────────────────────────────── */}
        <View style={styles.headerCard}>
          {/* Avatar con botón de edición superpuesto */}
          <View className="items-center mb-4">
            <View style={styles.avatarContainer}>
              {loadingAvatar ? (
                <View style={styles.avatarPlaceholder}>
                  <ActivityIndicator color={COLORS.primary[500]} />
                </View>
              ) : user?.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {user ? `${user.nombre[0]}${user.ap1[0]}`.toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              {/* Botón cambiar avatar */}
              <TouchableOpacity
                style={styles.avatarEditButton}
                onPress={handlePickAvatar}
                activeOpacity={0.85}
                disabled={loadingAvatar}
              >
                <Text style={styles.avatarEditIcon}>📷</Text>
              </TouchableOpacity>
            </View>

            {/* Nombre y rol */}
            <Text className="text-xl font-bold text-neutral-800 mt-3">
              {user ? `${user.nombre} ${user.ap1}` : '—'}
            </Text>
            {user?.rol === 'guia' && (
              <View className="mt-1 px-3 py-0.5 rounded-full bg-secondary-100">
                <Text className="text-xs font-semibold text-secondary-700">Guía</Text>
              </View>
            )}

            {/* Bio */}
            {user?.bio ? (
              <Text className="text-sm text-neutral-500 mt-2 text-center px-6">
                {user.bio}
              </Text>
            ) : (
              <Text className="text-sm text-neutral-400 mt-2 italic">
                Sin descripción
              </Text>
            )}

            {/* Email */}
            <Text className="text-xs text-neutral-400 mt-1">{user?.email ?? ''}</Text>
          </View>

          {/* Botón editar perfil */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleOpenEdit}
            activeOpacity={0.85}
          >
            <Text style={styles.editButtonText}>Editar perfil</Text>
          </TouchableOpacity>
        </View>

        {/* ─── ESTADÍSTICAS ────────────────────────────────────────────────────── */}
        <View className="mx-4 mb-4">
          <Text className="text-base font-bold text-neutral-800 mb-3">Mis estadísticas</Text>
          <View className="flex-row gap-3">
            <StatCard
              icon="🏔️"
              value={`${totalKmLabel} km`}
              label="Kilómetros totales"
            />
            <StatCard
              icon="🗺️"
              value={String(user?.total_excursiones ?? 0)}
              label="Excursiones"
            />
            <StatCard
              icon="📍"
              value={String(activityCount)}
              label="Actividades GPS"
            />
          </View>
        </View>

        {/* ─── GRÁFICO ÚLTIMOS 30 DÍAS ─────────────────────────────────────────── */}
        <View style={styles.chartCard}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-neutral-800">Actividad reciente</Text>
            <Text className="text-xs text-neutral-400">Últimos 30 días</Text>
          </View>
          <ActivityChart data={chartData} />
        </View>

        {/* ─── HISTORIAL DE ACTIVIDADES ────────────────────────────────────────── */}
        <View className="mx-4 mb-4">
          <Text className="text-base font-bold text-neutral-800 mb-3">Últimas actividades</Text>

          {loadingActivities && activities.length === 0 ? (
            <ActivityIndicator color={COLORS.primary[500]} style={{ marginVertical: 20 }} />
          ) : recentActivities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text className="text-3xl mb-2">📍</Text>
              <Text className="text-sm text-neutral-500 text-center">
                Aún no has registrado actividades GPS
              </Text>
            </View>
          ) : (
            <>
              {recentActivities.map((actividad) => (
                <ActivityCard key={actividad.id_actividad} actividad={actividad} />
              ))}
              {activities.length > RECENT_ACTIVITIES_LIMIT && (
                <Text className="text-xs text-neutral-400 text-center mt-1">
                  Ver más en la pestaña Actividad
                </Text>
              )}
            </>
          )}
        </View>

        {/* ─── GALERÍA DE FOTOS ────────────────────────────────────────────────── */}
        <View className="mx-4 mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-base font-bold text-neutral-800">Mis fotos</Text>
              <Text className="text-xs text-neutral-400 mt-0.5">
                {photos.length > 0
                  ? `${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'}`
                  : 'Sin fotos todavía'}
              </Text>
            </View>
            <PhotoCapture onPhotoUploaded={handlePhotoUploaded} />
          </View>

          {/* Indicador de subida */}
          {uploading && (
            <View className="flex-row items-center px-3 py-2 bg-primary-50 rounded-lg mb-3">
              <ActivityIndicator size="small" color={COLORS.primary[500]} />
              <Text className="ml-2 text-primary-700 text-sm">Subiendo foto...</Text>
            </View>
          )}

          {loadingPhotos && photos.length === 0 ? (
            <ActivityIndicator color={COLORS.primary[500]} style={{ marginVertical: 20 }} />
          ) : photos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text className="text-3xl mb-2">📷</Text>
              <Text className="text-sm text-neutral-500 text-center">
                Aún no has subido fotos
              </Text>
              <Text className="text-xs text-neutral-400 text-center mt-1">
                Toma fotos durante tus rutas o desde una excursión
              </Text>
            </View>
          ) : (
            <FlatList
              data={photos}
              keyExtractor={keyExtractor}
              renderItem={renderPhotoItem}
              numColumns={3}
              contentContainerStyle={styles.photoGrid}
              scrollEnabled={false}
              getItemLayout={(_data, index) => ({
                length: PHOTO_SIZE,
                offset: PHOTO_SIZE * Math.floor(index / 3),
                index,
              })}
            />
          )}
        </View>
      </ScrollView>

      {/* ─── MODAL: Editar perfil ─────────────────────────────────────────────── */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEditModalVisible(false)}
        >
          <Pressable
            style={styles.editModal}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Editar perfil</Text>

            {/* Nombre */}
            <Text style={styles.fieldLabel}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={editNombre}
              onChangeText={setEditNombre}
              placeholder="Tu nombre"
              placeholderTextColor={COLORS.neutral[400]}
              autoCapitalize="words"
              returnKeyType="next"
            />

            {/* Teléfono */}
            <Text style={styles.fieldLabel}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={editTelefono}
              onChangeText={setEditTelefono}
              placeholder="+34 600 000 000"
              placeholderTextColor={COLORS.neutral[400]}
              keyboardType="phone-pad"
              returnKeyType="next"
            />

            {/* Bio */}
            <Text style={styles.fieldLabel}>Sobre ti</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Cuéntanos algo sobre ti..."
              placeholderTextColor={COLORS.neutral[400]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              returnKeyType="done"
            />

            {/* Botones */}
            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
                activeOpacity={0.85}
                disabled={loadingUpdate}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProfile}
                activeOpacity={0.85}
                disabled={loadingUpdate}
              >
                {loadingUpdate ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── MODAL: Lightbox de fotos ─────────────────────────────────────────── */}
      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.lightboxOverlay}>
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

          <View style={styles.lightboxControls}>
            {selectedPhoto && (
              <Text style={styles.lightboxDate}>
                {new Date(selectedPhoto.fecha).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            )}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => selectedPhoto && handleDeletePhoto(selectedPhoto)}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteButtonText}>🗑 Eliminar</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.lightboxCloseButton}
            onPress={() => setSelectedPhoto(null)}
            activeOpacity={0.8}
          >
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 56, // espacio para el status bar
  },

  // ── Cabecera de perfil ────────────────────────────────────────────────────
  headerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // ── Avatar ────────────────────────────────────────────────────────────────
  avatarContainer: {
    position: 'relative',
    width: 96,
    height: 96,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.neutral[100],
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary[600],
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarEditIcon: {
    fontSize: 13,
  },

  // ── Botón editar perfil ───────────────────────────────────────────────────
  editButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Tarjeta de estadística ────────────────────────────────────────────────
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 22,
  },

  // ── Gráfico ───────────────────────────────────────────────────────────────
  chartCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // ── Estado vacío genérico ─────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 4,
  },

  // ── Cuadrícula de fotos ───────────────────────────────────────────────────
  photoGrid: {
    paddingBottom: 4,
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

  // ── Modal de edición ──────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  editModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.neutral[800],
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.neutral[600],
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.neutral[50],
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: COLORS.neutral[800],
  },
  inputMultiline: {
    height: 80,
    paddingTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButton: {
    backgroundColor: COLORS.neutral[100],
  },
  cancelButtonText: {
    color: COLORS.neutral[600],
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary[500],
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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
  lightboxCloseButton: {
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
  lightboxCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
