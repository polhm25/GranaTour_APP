// Tab 4: Mis reservas — lista de reservas del usuario con tabs de estado
import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/lib/constants';
import { formatDate, formatPrice } from '@/lib/utils';
import { useBookingsStore } from '@/stores/bookingsStore';
import type { EstadoReserva, ReservaConDetalles } from '@/lib/types';

// ─── Tabs de filtro ───────────────────────────────────────────────────────────

type TabKey = 'proximas' | 'historial' | 'canceladas';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'proximas', label: 'Próximas' },
  { key: 'historial', label: 'Historial' },
  { key: 'canceladas', label: 'Canceladas' },
];

// Mapea cada tab a los estados de reserva que muestra
const TAB_ESTADOS: Record<TabKey, EstadoReserva[]> = {
  proximas: ['pendiente', 'confirmada'],
  historial: ['confirmada'],
  canceladas: ['cancelada'],
};

// Colores del badge de estado
const ESTADO_COLORS: Record<EstadoReserva, string> = {
  pendiente: COLORS.warning ?? '#F59E0B',
  confirmada: COLORS.success ?? '#10B981',
  cancelada: COLORS.error ?? '#EF4444',
};

const ESTADO_LABELS: Record<EstadoReserva, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
};

// ─── Tarjeta de reserva ───────────────────────────────────────────────────────

interface BookingCardProps {
  booking: ReservaConDetalles;
  onPress: () => void;
}

function BookingCard({ booking, onPress }: BookingCardProps) {
  const { excursion, estado, num_personas, precio_total, fecha_reserva } = booking;
  const estadoColor = ESTADO_COLORS[estado];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.card}
      activeOpacity={0.85}
    >
      {/* Imagen de la excursión */}
      {excursion?.imagen_url ? (
        <Image source={{ uri: excursion.imagen_url }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Text style={styles.cardImageIcon}>🏔</Text>
        </View>
      )}

      {/* Contenido */}
      <View style={styles.cardContent}>
        {/* Nombre de la ruta */}
        <Text className="text-neutral-800 font-semibold" style={styles.cardTitle} numberOfLines={1}>
          {excursion?.nombre_ruta ?? 'Excursión'}
        </Text>

        {/* Zona y fecha de la excursión */}
        <Text className="text-neutral-500 mt-0.5" style={styles.cardSub} numberOfLines={1}>
          {excursion?.zona ?? '—'} · {excursion ? formatDate(excursion.fecha_inicio) : '—'}
        </Text>

        {/* Fila inferior: personas + precio + badge */}
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-neutral-600" style={styles.cardMeta}>
            {num_personas} {num_personas === 1 ? 'persona' : 'personas'} · {formatPrice(precio_total)}
          </Text>
          <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '22' }]}>
            <Text style={[styles.estadoBadgeText, { color: estadoColor }]}>
              {ESTADO_LABELS[estado]}
            </Text>
          </View>
        </View>

        {/* Fecha de reserva */}
        <Text className="text-neutral-400 mt-1" style={styles.cardDate}>
          Reservado el {formatDate(fecha_reserva)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function BookingsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('proximas');

  const { bookings, loadingList, error, fetchBookings } = useBookingsStore(
    useShallow((state) => ({
      bookings: state.bookings,
      loadingList: state.loadingList,
      error: state.error,
      fetchBookings: state.fetchBookings,
    }))
  );

  // Recargar reservas cada vez que el tab recibe foco
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  // Filtrar reservas según el tab activo
  const filteredBookings = bookings.filter((b) =>
    TAB_ESTADOS[activeTab].includes(b.estado)
  );

  // ── Render vacío ──────────────────────────────────────────────────────────
  function renderEmpty() {
    if (loadingList) return null;

    const messages: Record<TabKey, string> = {
      proximas: 'No tienes reservas próximas',
      historial: 'No tienes reservas en el historial',
      canceladas: 'No tienes reservas canceladas',
    };

    return (
      <View className="flex-1 items-center justify-center px-8 py-16">
        <Text style={styles.emptyIcon}>🗓</Text>
        <Text className="text-neutral-700 font-semibold text-center mt-4" style={styles.emptyTitle}>
          {messages[activeTab]}
        </Text>
        {activeTab === 'proximas' && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/explore')}
            className="mt-4 bg-primary-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold" style={styles.emptyButton}>
              Explorar excursiones
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      {/* Cabecera */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-neutral-800 font-bold" style={styles.header}>
          Mis reservas
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 mb-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, isActive && styles.tabActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Error */}
      {error ? (
        <View className="mx-4 mb-2 rounded-lg bg-red-50 px-4 py-3">
          <Text className="text-red-600 text-sm">{error}</Text>
        </View>
      ) : null}

      {/* Loading */}
      {loadingList && bookings.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text className="text-neutral-500 mt-3" style={styles.loadingText}>
            Cargando reservas...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => String(item.id_reserva)}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => router.push(`/booking/${item.id_reserva}`)}
            />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            filteredBookings.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 26,
  },
  // ── Tabs ─────────────────────────────────────────────────────────────────
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary[500],
  },
  tabText: {
    fontSize: 14,
    color: COLORS.neutral[400],
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.primary[600],
    fontWeight: '700',
  },
  // ── Lista ─────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  // ── Tarjeta ───────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage: {
    width: 80,
    height: 90,
  },
  cardImagePlaceholder: {
    backgroundColor: COLORS.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageIcon: {
    fontSize: 28,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
  },
  cardSub: {
    fontSize: 12,
  },
  cardMeta: {
    fontSize: 12,
  },
  cardDate: {
    fontSize: 11,
  },
  // Badge de estado
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  estadoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // ── Vacío / carga ─────────────────────────────────────────────────────────
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 16,
  },
  emptyButton: {
    fontSize: 14,
  },
  loadingText: {
    fontSize: 14,
  },
});
