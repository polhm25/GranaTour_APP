// Gráfico de perfil de altitud con react-native-svg.
// Muestra el trazado de elevación de una actividad grabada.
import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { COLORS } from '@/lib/constants';
import type { ElevationProfile } from '@/lib/openElevation';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 48; // 24px padding × 2
const CHART_HEIGHT = 100;
const PADDING_TOP = 8;
const PADDING_BOTTOM = 4;
const DRAW_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

interface ElevationProfileChartProps {
  profile: ElevationProfile;
}

export function ElevationProfileChart({ profile }: ElevationProfileChartProps) {
  const { elevations, minElevation, maxElevation } = profile;

  // Construye el path SVG: línea superior + relleno hasta la base
  const svgPath = useMemo(() => {
    if (elevations.length < 2) return '';

    const range = maxElevation - minElevation || 1;

    // Normaliza un valor de elevación al espacio SVG (Y invertido: arriba = 0)
    const toY = (elev: number) =>
      PADDING_TOP + DRAW_HEIGHT - ((elev - minElevation) / range) * DRAW_HEIGHT;

    const toX = (i: number) => (i / (elevations.length - 1)) * CHART_WIDTH;

    // Curva suave con bezier cúbico (control points a 1/3 del intervalo)
    let d = `M ${toX(0)} ${toY(elevations[0])}`;
    for (let i = 1; i < elevations.length; i++) {
      const x0 = toX(i - 1);
      const x1 = toX(i);
      const y0 = toY(elevations[i - 1]);
      const y1 = toY(elevations[i]);
      const cp = (x1 - x0) / 3;
      d += ` C ${x0 + cp} ${y0}, ${x1 - cp} ${y1}, ${x1} ${y1}`;
    }

    // Cerrar el área hasta la base del gráfico
    d += ` L ${CHART_WIDTH} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;
    return d;
  }, [elevations, minElevation, maxElevation]);

  // Path solo de la línea (sin relleno) para dibujar la línea por encima
  const linePath = useMemo(() => {
    if (elevations.length < 2) return '';

    const range = maxElevation - minElevation || 1;
    const toY = (elev: number) =>
      PADDING_TOP + DRAW_HEIGHT - ((elev - minElevation) / range) * DRAW_HEIGHT;
    const toX = (i: number) => (i / (elevations.length - 1)) * CHART_WIDTH;

    let d = `M ${toX(0)} ${toY(elevations[0])}`;
    for (let i = 1; i < elevations.length; i++) {
      const x0 = toX(i - 1);
      const x1 = toX(i);
      const y0 = toY(elevations[i - 1]);
      const y1 = toY(elevations[i]);
      const cp = (x1 - x0) / 3;
      d += ` C ${x0 + cp} ${y0}, ${x1 - cp} ${y1}, ${x1} ${y1}`;
    }
    return d;
  }, [elevations, minElevation, maxElevation]);

  return (
    <View>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT} style={styles.svg}>
        <Defs>
          <LinearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={COLORS.primary[500]} stopOpacity="0.35" />
            <Stop offset="100%" stopColor={COLORS.primary[500]} stopOpacity="0.04" />
          </LinearGradient>
        </Defs>

        {/* Área rellena */}
        <Path d={svgPath} fill="url(#elevGrad)" />

        {/* Línea de perfil */}
        <Path
          d={linePath}
          stroke={COLORS.primary[500]}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>

      {/* Etiquetas de altitud mín/máx */}
      <View style={styles.labels}>
        <Text style={styles.labelText}>{minElevation} m</Text>
        <Text style={[styles.labelText, styles.maxLabel]}>▲ {maxElevation} m</Text>
        <Text style={styles.labelText}>{minElevation} m</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: {
    alignSelf: 'center',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  labelText: {
    fontSize: 10,
    color: COLORS.neutral[400],
  },
  maxLabel: {
    color: COLORS.primary[600],
    fontWeight: '600',
  },
});
