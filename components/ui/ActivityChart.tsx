// Gráfico de barras simple para visualizar actividades de los últimos 30 días.
// No requiere librerías externas — usa View components con NativeWind.
import React, { useMemo } from 'react';
import { Dimensions, Text, View } from 'react-native';

import { COLORS } from '@/lib/constants';
import type { ChartDataPoint } from '@/stores/profileStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_HORIZONTAL_PADDING = 16; // padding izquierdo + derecho de la tarjeta
const CHART_HEIGHT = 72; // altura máxima de barras en px
const BAR_GAP = 1;       // separación entre barras en px

interface ActivityChartProps {
  data: ChartDataPoint[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  const chartWidth = SCREEN_WIDTH - CHART_HORIZONTAL_PADDING * 2 - 32; // 32 = padding interno de la card
  const barWidth = data.length > 0 ? Math.max(2, (chartWidth - BAR_GAP * (data.length - 1)) / data.length) : 4;

  // Valor máximo de km para normalizar la altura de las barras
  const maxKm = useMemo(
    () => Math.max(...data.map((d) => d.distanceKm), 0.1),
    [data]
  );

  // Etiquetas de semana: mostramos la fecha del primer día de cada semana (i = 0, 7, 14, 21, 28)
  const weekLabels = useMemo(
    () =>
      data
        .filter((_, i) => i % 7 === 0)
        .map((d) => {
          const [, month, day] = d.date.split('-');
          return `${day}/${month}`;
        }),
    [data]
  );

  if (data.length === 0) {
    return (
      <View className="items-center py-4">
        <Text className="text-neutral-400 text-sm">Sin datos de actividad</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Barras del gráfico */}
      <View
        style={{
          height: CHART_HEIGHT,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: BAR_GAP,
        }}
      >
        {data.map((point) => {
          const hasActivity = point.count > 0;
          const barHeight = hasActivity
            ? Math.max(4, (point.distanceKm / maxKm) * CHART_HEIGHT)
            : 3; // barra mínima para marcar el día sin actividad
          return (
            <View
              key={point.date}
              style={{
                width: barWidth,
                height: barHeight,
                backgroundColor: hasActivity ? COLORS.primary[500] : COLORS.neutral[200],
                borderRadius: 2,
              }}
            />
          );
        })}
      </View>

      {/* Etiquetas de fechas (primer día de cada semana) */}
      <View className="flex-row justify-between mt-1.5 px-0.5">
        {weekLabels.map((label) => (
          <Text key={label} className="text-neutral-400" style={{ fontSize: 10 }}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}
