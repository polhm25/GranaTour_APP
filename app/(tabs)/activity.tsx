// Tab Actividad: tracking GPS en tiempo real con mapa, stats y guardado en Supabase
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Polyline, Region } from 'react-native-maps';
import { useFocusEffect, useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import * as Haptics from 'expo-haptics';

import { useActivityStore } from '@/stores/activityStore';
import { ActivityCard } from '@/components/ActivityCard';
import { PhotoCapture } from '@/components/PhotoCapture';
import { ElevationProfileChart } from '@/components/ui/ElevationProfileChart';
import { COLORS } from '@/lib/constants';
import { fetchElevationProfile, type ElevationProfile } from '@/lib/openElevation';
import { formatDistanceLabel, formatSpeedLabel, formatTimer } from '@/lib/utils';
import type { Foto } from '@/lib/types';

// ─── Región inicial centrada en Granada ───────────────────────────────────────

const GRANADA_REGION: Region = {
  latitude: 37.1773,
  longitude: -3.5986,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function ActivityScreen() {
  const router = useRouter();

  // Selector 1: datos que cambian frecuentemente durante el tracking (timer, puntos, stats)
  // Selector separado para evitar re-renders del componente completo por el timer (C-03, I-01)
  const {
    trackingActive,
    trackingPaused,
    startingTracking,
    gpsPoints,
    currentDistance,
    durationSeconds,
    currentSpeed,
    elevationGain,
    pendingSummary,
  } = useActivityStore(
    useShallow((state) => ({
      trackingActive: state.trackingActive,
      trackingPaused: state.trackingPaused,
      startingTracking: state.startingTracking,
      gpsPoints: state.gpsPoints,
      currentDistance: state.currentDistance,
      durationSeconds: state.durationSeconds,
      currentSpeed: state.currentSpeed,
      elevationGain: state.elevationGain,
      pendingSummary: state.pendingSummary,
    }))
  );

  // Selector 2: historial y flags de carga (cambian raramente)
  const { activities, loading, loadingSave, error } = useActivityStore(
    useShallow((state) => ({
      activities: state.activities,
      loading: state.loading,
      loadingSave: state.loadingSave,
      error: state.error,
    }))
  );

  // Acciones: referencias estables de Zustand, no necesitan useShallow
  const startTracking = useActivityStore((state) => state.startTracking);
  const pauseTracking = useActivityStore((state) => state.pauseTracking);
  const resumeTracking = useActivityStore((state) => state.resumeTracking);
  const stopTracking = useActivityStore((state) => state.stopTracking);
  const saveActivity = useActivityStore((state) => state.saveActivity);
  const discardActivity = useActivityStore((state) => state.discardActivity);
  const fetchActivities = useActivityStore((state) => state.fetchActivities);
  const clearError = useActivityStore((state) => state.clearError);
  const addTrackingPhoto = useActivityStore((state) => state.addTrackingPhoto);

  // Título editable en el modal de guardado
  const [titulo, setTitulo] = useState('');
  // Perfil de altitud obtenido de Open-Elevation al mostrar el resumen
  const [elevationProfile, setElevationProfile] = useState<ElevationProfile | null>(null);
  const [loadingElevation, setLoadingElevation] = useState(false);
  // Referencia al mapa para animar la cámara al añadir puntos
  const mapRef = useRef<MapView>(null);

  // Cargar historial al enfocar la pestaña
  useFocusEffect(
    useCallback(() => {
      if (!trackingActive && !pendingSummary) {
        fetchActivities();
      }
    }, [trackingActive, pendingSummary, fetchActivities])
  );

  // Centrar mapa en el último punto GPS cuando lleguen nuevas coordenadas
  useEffect(() => {
    if (!trackingActive || gpsPoints.length === 0) return;
    const lastPoint = gpsPoints[gpsPoints.length - 1];
    mapRef.current?.animateToRegion(
      {
        latitude: lastPoint.latitud,
        longitude: lastPoint.longitud,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      500
    );
  }, [gpsPoints.length, trackingActive]); // Solo reaccionar al cambio de longitud, no al array (C-03)

  // Coordenadas del trayecto para el Polyline
  const polylineCoords = useMemo(
    () => gpsPoints.map((p) => ({ latitude: p.latitud, longitude: p.longitud })),
    [gpsPoints]
  );

  // Mostrar alerta de error y limpiar
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error, clearError]);

  // Cargar perfil de altitud desde Open-Elevation al abrir el modal de resumen
  useEffect(() => {
    if (!pendingSummary || pendingSummary.points.length < 2) return;
    setElevationProfile(null);
    setLoadingElevation(true);
    fetchElevationProfile(pendingSummary.points)
      .then(setElevationProfile)
      .catch(() => null)
      .finally(() => setLoadingElevation(false));
  }, [pendingSummary]);

  const handleStartTracking = useCallback(async () => {
    // Haptic de impacto al iniciar el tracking GPS
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startTracking();
  }, [startTracking]);

  const handleStopTracking = useCallback(() => {
    Alert.alert(
      'Detener actividad',
      '¿Seguro que quieres detener el tracking?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Detener',
          style: 'destructive',
          onPress: () => {
            stopTracking();
            setTitulo('');
          },
        },
      ]
    );
  }, [stopTracking]);

  const handleSaveActivity = useCallback(async () => {
    await saveActivity(titulo);
  }, [saveActivity, titulo]);

  const handleDiscardActivity = useCallback(() => {
    Alert.alert(
      'Descartar actividad',
      '¿Descartar esta actividad? Los datos no se guardarán.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: discardActivity },
      ]
    );
  }, [discardActivity]);

  // Callback al subir una foto durante el tracking (C-01, I-05).
  // Registra el id_foto para que saveActivity pueda vincularla a la actividad con UPDATE.
  // También muestra feedback visual al usuario.
  const handlePhotoUploaded = useCallback(
    (foto: Foto) => {
      addTrackingPhoto(foto.id_foto);
      Alert.alert('¡Foto guardada!', 'La foto se ha subido correctamente y quedará asociada a esta actividad al guardarla.');
    },
    [addTrackingPhoto]
  );

  // Último punto GPS para geolocalizar la foto
  const lastGpsPoint = gpsPoints.length > 0 ? gpsPoints[gpsPoints.length - 1] : null;

  // ── Estado: tracking activo ────────────────────────────────────────────────

  if (trackingActive) {
    return (
      <View className="flex-1 bg-black">
        {/* Mapa en tiempo real con polyline del trayecto */}
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={GRANADA_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          pitchEnabled={false}
        >
          {polylineCoords.length > 1 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor={COLORS.primary[500]}
              strokeWidth={4}
            />
          )}
        </MapView>

        {/* Panel de stats en la parte superior */}
        <View style={styles.statsPanel}>
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text style={styles.statValue}>{formatTimer(durationSeconds)}</Text>
              <Text style={styles.statLabel}>Tiempo</Text>
            </View>
            <View style={styles.statDivider} />
            <View className="items-center">
              <Text style={styles.statValue}>{formatDistanceLabel(currentDistance)}</Text>
              <Text style={styles.statLabel}>Distancia</Text>
            </View>
            <View style={styles.statDivider} />
            <View className="items-center">
              <Text style={styles.statValue}>{formatSpeedLabel(currentSpeed)}</Text>
              <Text style={styles.statLabel}>Velocidad</Text>
            </View>
          </View>
          {elevationGain > 0 && (
            <View className="mt-2 items-center">
              <Text style={styles.elevationText}>↑ +{Math.round(elevationGain)} m desnivel</Text>
            </View>
          )}
          {trackingPaused && (
            <View className="mt-2 items-center">
              <Text style={styles.pausedBadge}>PAUSADO</Text>
            </View>
          )}
        </View>

        {/* Botón flotante de cámara: esquina inferior derecha, encima de los controles */}
        <View style={styles.cameraButtonContainer}>
          <PhotoCapture
            onPhotoUploaded={handlePhotoUploaded}
            latitud={lastGpsPoint?.latitud}
            longitud={lastGpsPoint?.longitud}
          />
        </View>

        {/* Controles en la parte inferior */}
        <View style={styles.controlsPanel}>
          <View className="flex-row justify-center gap-4">
            {/* Pausar / Reanudar */}
            <TouchableOpacity
              style={[styles.controlBtn, styles.pauseBtn]}
              onPress={trackingPaused ? resumeTracking : pauseTracking}
              activeOpacity={0.8}
            >
              <Text style={styles.controlBtnText}>
                {trackingPaused ? 'Reanudar' : 'Pausar'}
              </Text>
            </TouchableOpacity>

            {/* Detener */}
            <TouchableOpacity
              style={[styles.controlBtn, styles.stopBtn]}
              onPress={handleStopTracking}
              activeOpacity={0.8}
            >
              <Text style={styles.controlBtnText}>Detener</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── Estado: idle + historial ───────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 pt-14 pb-4 px-5">
        <Text className="text-2xl font-bold text-neutral-800">Actividad</Text>
      </View>

      {/* Botón de inicio + historial (solo cuando no hay resumen pendiente) */}
      {!pendingSummary && (
        <>
          {/* Botón Iniciar actividad */}
          <View className="items-center py-10">
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartTracking}
              disabled={startingTracking}
              activeOpacity={0.85}
            >
              <View style={[styles.startButtonInner, startingTracking && styles.startButtonDisabled]}>
                {startingTracking ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Text style={styles.startButtonIcon}>▶</Text>
                )}
              </View>
            </TouchableOpacity>
            <Text className="mt-4 text-base font-semibold text-neutral-700">
              {startingTracking ? 'Solicitando permisos…' : 'Iniciar actividad'}
            </Text>
            <Text className="mt-1 text-sm text-neutral-400 text-center px-8">
              Graba tu ruta GPS en tiempo real y guárdala en tu historial
            </Text>
          </View>

          {/* Historial de actividades */}
          <View className="flex-1">
            <Text className="px-5 mb-2 text-sm font-semibold text-neutral-500 uppercase tracking-wide">
              Mis actividades
            </Text>

            {loading ? (
              <ActivityIndicator color={COLORS.primary[500]} size="large" className="mt-8" />
            ) : activities.length === 0 ? (
              <View className="items-center mt-8 px-8">
                <Text className="text-4xl mb-3">🏃</Text>
                <Text className="text-base font-semibold text-neutral-600 text-center">
                  Sin actividades todavía
                </Text>
                <Text className="text-sm text-neutral-400 text-center mt-1">
                  Inicia tu primera ruta pulsando el botón de arriba
                </Text>
              </View>
            ) : (
              <FlatList
                data={activities}
                keyExtractor={(item) => String(item.id_actividad)}
                renderItem={({ item }) => (
                  <ActivityCard
                    actividad={item}
                    onPress={() => router.push(`/activity/${item.id_actividad}`)}
                  />
                )}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </>
      )}

      {/* Modal de resumen: guardar o descartar */}
      <Modal
        visible={pendingSummary !== null}
        animationType="slide"
        transparent
        onRequestClose={handleDiscardActivity}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Resumen de actividad</Text>

            {/* Stats del resumen */}
            <View style={styles.summaryStats}>
              <View className="items-center flex-1">
                <Text style={styles.summaryStatValue}>
                  {formatDistanceLabel(pendingSummary?.distanceKm ?? 0)}
                </Text>
                <Text style={styles.summaryStatLabel}>Distancia</Text>
              </View>
              <View style={styles.statDivider} />
              <View className="items-center flex-1">
                <Text style={styles.summaryStatValue}>
                  {pendingSummary?.durationMinutes ?? 0} min
                </Text>
                <Text style={styles.summaryStatLabel}>Duración</Text>
              </View>
              <View style={styles.statDivider} />
              <View className="items-center flex-1">
                <Text style={styles.summaryStatValue}>
                  {formatSpeedLabel(pendingSummary?.averageSpeed ?? 0)}
                </Text>
                <Text style={styles.summaryStatLabel}>V. media</Text>
              </View>
            </View>

            {/* Desnivel (si > 0) */}
            {(pendingSummary?.elevationGain ?? 0) > 0 && (
              <Text className="mt-2 text-sm text-neutral-500 text-center">
                ↑ +{Math.round(pendingSummary?.elevationGain ?? 0)} m desnivel positivo
              </Text>
            )}

            {/* Perfil de altitud desde Open-Elevation */}
            <View style={styles.elevationSection}>
              <Text style={styles.elevationTitle}>Perfil de altitud</Text>
              {loadingElevation ? (
                <View style={styles.elevationLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary[500]} />
                  <Text style={styles.elevationLoadingText}>Obteniendo datos de altitud...</Text>
                </View>
              ) : elevationProfile ? (
                <ElevationProfileChart profile={elevationProfile} />
              ) : null}
            </View>

            {/* Campo título */}
            <View className="mt-4">
              <Text className="text-sm font-medium text-neutral-600 mb-1">
                Título de la actividad
              </Text>
              <TextInput
                style={styles.titleInput}
                value={titulo}
                onChangeText={setTitulo}
                placeholder={`Actividad ${new Date(pendingSummary?.startTime ?? Date.now()).toLocaleDateString('es-ES')}`}
                placeholderTextColor={COLORS.neutral[400]}
                maxLength={80}
                returnKeyType="done"
              />
            </View>

            {/* Puntos GPS registrados */}
            <Text className="mt-2 text-xs text-neutral-400 text-center">
              {pendingSummary?.points.length ?? 0} puntos GPS registrados
            </Text>

            {/* Botones de acción */}
            <View className="mt-5 gap-3">
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveActivity}
                disabled={loadingSave}
                activeOpacity={0.85}
              >
                {loadingSave ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar actividad</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.discardBtn]}
                onPress={handleDiscardActivity}
                disabled={loadingSave}
                activeOpacity={0.85}
              >
                <Text style={styles.discardBtnText}>Descartar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Estilos (valores dinámicos, shadows y posición absoluta que NativeWind no resuelve) ──

const styles = StyleSheet.create({
  // ── Tracking activo ──────────────────────────────────────────────────────────
  statsPanel: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.neutral[800],
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.neutral[500],
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.neutral[200],
    marginHorizontal: 8,
  },
  elevationText: {
    fontSize: 12,
    color: COLORS.primary[600],
    fontWeight: '600',
  },
  pausedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warning,
    letterSpacing: 1,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  // Botón flotante de cámara: posición absoluta entre el panel de stats y los controles
  cameraButtonContainer: {
    position: 'absolute',
    bottom: 110,
    right: 16,
  },
  controlsPanel: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pauseBtn: {
    backgroundColor: COLORS.primary[500],
  },
  stopBtn: {
    backgroundColor: COLORS.error,
  },
  controlBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Estado idle ──────────────────────────────────────────────────────────────
  startButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary[50],
    borderWidth: 3,
    borderColor: COLORS.primary[200],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  startButtonInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: COLORS.neutral[400],
  },
  startButtonIcon: {
    fontSize: 28,
    color: '#fff',
    marginLeft: 4, // Compensar desplazamiento visual del triángulo ▶
  },

  // ── Modal resumen ────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.neutral[800],
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral[50],
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  summaryStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.neutral[800],
  },
  summaryStatLabel: {
    fontSize: 11,
    color: COLORS.neutral[500],
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.neutral[800],
    backgroundColor: COLORS.neutral[50],
  },
  modalBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: COLORS.primary[500],
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  discardBtn: {
    backgroundColor: COLORS.neutral[100],
  },
  discardBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
  elevationSection: {
    marginTop: 16,
    marginBottom: 4,
  },
  elevationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.neutral[600],
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  elevationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  elevationLoadingText: {
    fontSize: 13,
    color: COLORS.neutral[400],
  },
});
