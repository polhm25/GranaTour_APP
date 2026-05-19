// Pantalla de detalle de una actividad GPS grabada.
// Muestra mapa con ruta, stats completas, perfil de altitud y fotos tomadas.
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ElevationProfileChart } from '@/components/ui/ElevationProfileChart';
import { COLORS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { formatDateShort, formatDistanceLabel, formatSpeedLabel } from '@/lib/utils';
import type { ElevationProfile } from '@/lib/openElevation';
import type { Actividad, Foto } from '@/lib/types';
import { useActivityStore } from '@/stores/activityStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_WIDTH - 48) / 3;

// Parsea un GeoJSON LineString guardado en ruta_geojson y devuelve coords para MapView
interface LatLon { latitude: number; longitude: number }
interface LatLonAlt extends LatLon { altitude: number | null }

function parseGeoJson(geojson: string | null): LatLonAlt[] {
  if (!geojson) return [];
  try {
    const parsed = JSON.parse(geojson) as { type: string; coordinates: number[][] };
    if (parsed.type !== 'LineString') return [];
    return parsed.coordinates.map(([lon, lat, alt]) => ({
      latitude: lat,
      longitude: lon,
      altitude: alt ?? null,
    }));
  } catch {
    return [];
  }
}

// Construye un ElevationProfile a partir de los puntos con altitud del GeoJSON
function buildElevationProfile(points: LatLonAlt[]): ElevationProfile | null {
  const withAlt = points.filter((p) => p.altitude !== null);
  if (withAlt.length < 2) return null;

  const elevations = withAlt.map((p) => Math.round(p.altitude!));
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);

  let totalGain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) totalGain += diff;
  }

  return { elevations, minElevation, maxElevation, totalGain: Math.round(totalGain) };
}

// Calcula la región del mapa que encuadra todos los puntos de la ruta
function getBoundingRegion(points: LatLon[]) {
  if (points.length === 0) return null;
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(0.005, (maxLat - minLat) * 1.3),
    longitudeDelta: Math.max(0.005, (maxLon - minLon) * 1.3),
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ActivityDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const activityId = parseInt(Array.isArray(params.id) ? params.id[0] : params.id ?? '', 10);

  // Buscar la actividad en el store (ya cargadas en la tab Activity)
  const actividad = useActivityStore(
    (state) => state.activities.find((a) => a.id_actividad === activityId) ?? null
  );

  const [photos, setPhotos] = useState<Foto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Foto | null>(null);

  // Cargar fotos asociadas a esta actividad
  useEffect(() => {
    if (isNaN(activityId)) return;
    setLoadingPhotos(true);
    void supabase
      .from('fotos')
      .select('*')
      .eq('id_actividad', activityId)
      .order('fecha', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setPhotos((data as Foto[]) ?? []);
        setLoadingPhotos(false);
      });
  }, [activityId]);

  // Parsear la ruta geojson
  const routePoints = useMemo(
    () => (actividad ? parseGeoJson(actividad.ruta_geojson) : []),
    [actividad]
  );

  const mapRegion = useMemo(() => getBoundingRegion(routePoints), [routePoints]);

  const elevationProfile = useMemo(
    () => buildElevationProfile(routePoints),
    [routePoints]
  );

  // ── ID inválido ───────────────────────────────────────────────────────────
  if (isNaN(activityId)) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-neutral-600 text-base text-center">Actividad no encontrada</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary-600 font-semibold">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Actividad no en store ─────────────────────────────────────────────────
  if (!actividad) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </SafeAreaView>
    );
  }

  const startPoint = routePoints[0];
  const endPoint = routePoints[routePoints.length - 1];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={COLORS.neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {actividad.titulo ?? 'Actividad'}
        </Text>
        <View style={styles.statusBadge}>
          <Text style={[
            styles.statusText,
            { color: actividad.estado === 'completada' ? COLORS.primary[700] : COLORS.neutral[600] },
          ]}>
            {actividad.estado === 'completada' ? 'Completada' : actividad.estado}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── 1. Mapa con ruta ──────────────────────────────────────────────── */}
        {routePoints.length > 1 && mapRegion ? (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={mapRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Polyline
                coordinates={routePoints}
                strokeColor={COLORS.primary[500]}
                strokeWidth={3}
              />
              {/* Marker de inicio */}
              {startPoint && (
                <Marker coordinate={startPoint} anchor={{ x: 0.5, y: 0.5 }}>
                  <View style={[styles.markerDot, { backgroundColor: '#22c55e' }]} />
                </Marker>
              )}
              {/* Marker de fin */}
              {endPoint && endPoint !== startPoint && (
                <Marker coordinate={endPoint} anchor={{ x: 0.5, y: 0.5 }}>
                  <View style={[styles.markerDot, { backgroundColor: COLORS.error }]} />
                </Marker>
              )}
            </MapView>

            {/* Leyenda inicio/fin */}
            <View style={styles.mapLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                <Text style={styles.legendText}>Inicio</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
                <Text style={styles.legendText}>Fin</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noMapContainer}>
            <Ionicons name="map-outline" size={36} color={COLORS.neutral[300]} />
            <Text style={styles.noMapText}>Sin datos de ruta GPS</Text>
          </View>
        )}

        {/* ── 2. Stats principales ─────────────────────────────────────────── */}
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            {actividad.distancia_km !== null && (
              <StatItem
                value={formatDistanceLabel(actividad.distancia_km)}
                label="Distancia"
                icon="footsteps-outline"
              />
            )}
            {actividad.duracion_minutos !== null && (
              <StatItem
                value={formatDuration(actividad.duracion_minutos)}
                label="Duración"
                icon="time-outline"
              />
            )}
            {actividad.velocidad_media !== null && (
              <StatItem
                value={formatSpeedLabel(actividad.velocidad_media)}
                label="V. media"
                icon="speedometer-outline"
              />
            )}
            {actividad.desnivel_positivo !== null && actividad.desnivel_positivo > 0 && (
              <StatItem
                value={`+${actividad.desnivel_positivo} m`}
                label="Desnivel"
                icon="trending-up-outline"
              />
            )}
          </View>

          {/* Fechas */}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.neutral[400]} />
            <Text style={styles.dateText}>
              Inicio: {formatDateTime(actividad.fecha_inicio)}
            </Text>
          </View>
          {actividad.fecha_fin && (
            <View style={styles.dateRow}>
              <Ionicons name="flag-outline" size={13} color={COLORS.neutral[400]} />
              <Text style={styles.dateText}>
                Fin: {formatDateTime(actividad.fecha_fin)}
              </Text>
            </View>
          )}
        </View>

        {/* ── 3. Perfil de altitud ──────────────────────────────────────────── */}
        {elevationProfile && (
          <View style={styles.section}>
            <SectionTitle icon="trending-up-outline" title="Perfil de altitud" />
            <View style={styles.elevationCard}>
              <View style={styles.elevationSummary}>
                <View className="items-center">
                  <Text style={styles.elevStat}>{elevationProfile.minElevation} m</Text>
                  <Text style={styles.elevLabel}>Mín.</Text>
                </View>
                <View className="items-center">
                  <Text style={[styles.elevStat, { color: COLORS.primary[600] }]}>
                    +{elevationProfile.totalGain} m
                  </Text>
                  <Text style={styles.elevLabel}>Desnivel</Text>
                </View>
                <View className="items-center">
                  <Text style={styles.elevStat}>{elevationProfile.maxElevation} m</Text>
                  <Text style={styles.elevLabel}>Máx.</Text>
                </View>
              </View>
              <ElevationProfileChart profile={elevationProfile} />
            </View>
          </View>
        )}

        {/* ── 4. Fotos de la actividad ──────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionTitle icon="camera-outline" title="Fotos" />
          {loadingPhotos ? (
            <ActivityIndicator color={COLORS.primary[500]} style={{ marginTop: 12 }} />
          ) : photos.length === 0 ? (
            <View style={styles.emptyPhotos}>
              <Ionicons name="images-outline" size={32} color={COLORS.neutral[300]} />
              <Text style={styles.emptyPhotosText}>
                No hay fotos en esta actividad
              </Text>
            </View>
          ) : (
            <FlatList
              data={photos}
              keyExtractor={(item) => String(item.id_foto)}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.photoGrid}
              columnWrapperStyle={styles.photoRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.photoItem}
                  onPress={() => setSelectedPhoto(item)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: item.url_storage }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Lightbox de fotos ─────────────────────────────────────────────── */}
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
    </SafeAreaView>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function StatItem({
  value, label, icon,
}: {
  value: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={statStyles.container}>
      <Ionicons name={icon} size={16} color={COLORS.primary[500]} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function SectionTitle({
  icon, title,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
}) {
  return (
    <View style={sectionStyles.row}>
      <Ionicons name={icon} size={16} color={COLORS.neutral[500]} />
      <Text style={sectionStyles.title}>{title}</Text>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.neutral[800],
  },
  statusBadge: {
    backgroundColor: COLORS.primary[50],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
  },
  // ── Mapa ──────────────────────────────────────────────────────────────────
  mapContainer: {
    position: 'relative',
    height: 240,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  mapLegend: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.neutral[600],
    fontWeight: '500',
  },
  noMapContainer: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral[50],
    gap: 8,
  },
  noMapText: {
    fontSize: 13,
    color: COLORS.neutral[400],
  },
  // ── Stats ─────────────────────────────────────────────────────────────────
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.neutral[500],
  },
  // ── Altitud ───────────────────────────────────────────────────────────────
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  elevationCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  elevationSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
  },
  elevStat: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.neutral[800],
  },
  elevLabel: {
    fontSize: 11,
    color: COLORS.neutral[400],
    marginTop: 2,
  },
  // ── Fotos ─────────────────────────────────────────────────────────────────
  photoGrid: {
    marginTop: 10,
  },
  photoRow: {
    gap: 4,
    marginBottom: 4,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  emptyPhotos: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyPhotosText: {
    fontSize: 13,
    color: COLORS.neutral[400],
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
});

const statStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minWidth: 70,
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.neutral[800],
    marginTop: 4,
  },
  label: {
    fontSize: 11,
    color: COLORS.neutral[400],
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.neutral[700],
  },
});
