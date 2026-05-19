// Componente de mapa reutilizable para mostrar excursiones con markers y polylines.
// En modo interactivo (Explorar) onMarkerPress dispara al tocar el pin.
// En modo no interactivo (detalle) el mapa es estático y solo muestra posición.

import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import RNMapView, { Marker, Polyline, Region } from 'react-native-maps';

import { COLORS } from '@/lib/constants';
import type { ExcursionConGuia } from '@/lib/types';

// Región inicial centrada en Granada capital
const GRANADA_REGION: Region = {
  latitude: 37.1773,
  longitude: -3.5986,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

// Parsea un GeoJSON LineString serializado y devuelve coordenadas para Polyline.
// GeoJSON usa [longitude, latitude]; react-native-maps usa { latitude, longitude }.
function parseGeoJsonLineString(text: string): { latitude: number; longitude: number }[] {
  try {
    const geojson = JSON.parse(text) as {
      type: string;
      coordinates: unknown[];
    };
    if (geojson.type !== 'LineString' || !Array.isArray(geojson.coordinates)) {
      return [];
    }
    const coords: { latitude: number; longitude: number }[] = [];
    for (const point of geojson.coordinates) {
      if (!Array.isArray(point) || point.length < 2) continue;
      const lon = Number(point[0]);
      const lat = Number(point[1]);
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
      coords.push({ latitude: lat, longitude: lon });
    }
    return coords;
  } catch {
    return [];
  }
}

function getInitialRegion(excursions: ExcursionConGuia[], selectedId?: number): Region {
  if (selectedId !== undefined) {
    const selected = excursions.find((e) => e.id_excursion === selectedId);
    if (selected !== undefined && selected.latitud !== null && selected.longitud !== null) {
      return {
        latitude: selected.latitud,
        longitude: selected.longitud,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
  }
  return GRANADA_REGION;
}

export interface ExcursionMapViewProps {
  excursions: ExcursionConGuia[];
  onMarkerPress: (id: number) => void;
  selectedId?: number;
  // interactive=false: deshabilita scroll/zoom (para detalle de excursión)
  interactive?: boolean;
  style?: ViewStyle;
}

export function ExcursionMapView({
  excursions,
  onMarkerPress,
  selectedId,
  interactive = true,
  style,
}: ExcursionMapViewProps) {
  const initialRegion = getInitialRegion(excursions, selectedId);

  function hasCoords(
    e: ExcursionConGuia
  ): e is ExcursionConGuia & { latitud: number; longitud: number } {
    return e.latitud !== null && e.longitud !== null;
  }

  const excursionsWithCoords = excursions.filter(hasCoords);

  return (
    <RNMapView
      style={[styles.map, style]}
      initialRegion={initialRegion}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={interactive}
      pitchEnabled={false}
      showsCompass={interactive}
      showsUserLocation={false}
      showsMyLocationButton={false}
    >
      {excursionsWithCoords.map((excursion) => {
        const isSelected = excursion.id_excursion === selectedId;
        const routeCoords =
          excursion.ruta_geojson !== null
            ? parseGeoJsonLineString(excursion.ruta_geojson)
            : [];

        return (
          <React.Fragment key={excursion.id_excursion}>
            <Marker
              coordinate={{
                latitude: excursion.latitud,
                longitude: excursion.longitud,
              }}
              pinColor={isSelected ? COLORS.secondary[500] : COLORS.primary[500]}
              // tracksViewChanges activo solo en el marker seleccionado para reflejar el cambio de color
              tracksViewChanges={isSelected}
              onPress={interactive ? () => onMarkerPress(excursion.id_excursion) : undefined}
            />

            {routeCoords.length > 1 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor={isSelected ? COLORS.secondary[500] : COLORS.primary[600]}
                strokeWidth={isSelected ? 4 : 3}
              />
            )}
          </React.Fragment>
        );
      })}
    </RNMapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
