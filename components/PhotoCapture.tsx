// Botón reutilizable de captura de foto: cámara o galería, con subida a Supabase
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

import { usePhotosStore } from '@/stores/photosStore';
import { COLORS } from '@/lib/constants';
import type { Foto } from '@/lib/types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PhotoCaptureProps {
  /** Callback invocado con la foto recién subida cuando la operación tiene éxito */
  onPhotoUploaded: (foto: Foto) => void;
  /** ID de actividad GPS a la que se asocia la foto (durante tracking) */
  id_actividad?: number;
  /** ID de excursión a la que se asocia la foto */
  id_excursion?: number;
  /** Latitud GPS para geolocalizar la foto automáticamente */
  latitud?: number;
  /** Longitud GPS para geolocalizar la foto automáticamente */
  longitud?: number;
  /** Estilos adicionales para el contenedor del botón */
  style?: StyleProp<ViewStyle>;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function PhotoCapture({
  onPhotoUploaded,
  id_actividad,
  id_excursion,
  latitud,
  longitud,
  style,
}: PhotoCaptureProps) {
  // Estado local de procesamiento (antes de que el store actualice `uploading`)
  const [isProcessing, setIsProcessing] = useState(false);

  // Selectores individuales para referencias estables (evitar re-renders innecesarios)
  const uploadPhoto = usePhotosStore((state) => state.uploadPhoto);
  const uploading = usePhotosStore((state) => state.uploading);

  // ── processImage ────────────────────────────────────────────────────────────

  /**
   * Toma el URI local de la imagen seleccionada, la sube a Supabase Storage
   * mediante el store, e invoca el callback si la subida tiene éxito.
   */
  const processImage = useCallback(
    async (uri: string) => {
      setIsProcessing(true);
      try {
        const foto = await uploadPhoto({
          uri,
          latitud,
          longitud,
          id_actividad,
          id_excursion,
        });

        // Si el store devuelve null ya habrá seteado el error internamente
        if (foto !== null) {
          onPhotoUploaded(foto);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [uploadPhoto, latitud, longitud, id_actividad, id_excursion, onPhotoUploaded]
  );

  // ── handleCamera ────────────────────────────────────────────────────────────

  const handleCamera = useCallback(async () => {
    // Solicitar permiso de cámara antes de abrirla
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitas conceder acceso a la cámara para tomar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    await processImage(asset.uri);
  }, [processImage]);

  // ── handleGallery ───────────────────────────────────────────────────────────

  const handleGallery = useCallback(async () => {
    // Solicitar permiso de galería antes de abrirla
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitas conceder acceso a la galería para seleccionar fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    await processImage(asset.uri);
  }, [processImage]);

  // ── handlePress ─────────────────────────────────────────────────────────────

  /**
   * Muestra el Alert con las opciones de captura: cámara, galería o cancelar.
   */
  const handlePress = useCallback(() => {
    Alert.alert('Añadir foto', undefined, [
      {
        text: '📷 Cámara',
        onPress: handleCamera,
      },
      {
        text: '🖼 Galería',
        onPress: handleGallery,
      },
      {
        text: 'Cancelar',
        style: 'cancel',
      },
    ]);
  }, [handleCamera, handleGallery]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const isBusy = isProcessing || uploading;

  return (
    <TouchableOpacity
      style={[styles.cameraButton, style]}
      onPress={handlePress}
      disabled={isBusy}
      activeOpacity={0.8}
    >
      {isBusy ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.cameraIcon}>📷</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cameraButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra: requiere StyleSheet porque NativeWind no soporta estas props en RN
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  cameraIcon: {
    fontSize: 24,
  },
});
