// Pantalla de detalle de una reserva individual con opción de cancelar
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useShallow } from 'zustand/react/shallow';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/lib/constants';
import { formatDate, formatPrice } from '@/lib/utils';
import { useBookingsStore } from '@/stores/bookingsStore';
import type { EstadoReserva } from '@/lib/types';

// ─── Helpers de UI ────────────────────────────────────────────────────────────

const ESTADO_COLORS: Record<EstadoReserva, string> = {
  pendiente: COLORS.warning ?? '#F59E0B',
  confirmada: COLORS.success ?? '#10B981',
  cancelada: COLORS.error ?? '#EF4444',
};

const ESTADO_LABELS: Record<EstadoReserva, string> = {
  pendiente: 'Pendiente de confirmación',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
};

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function BookingDetailScreen() {
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);

  // ── Parámetro de ruta ─────────────────────────────────────────────────────
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const bookingId = rawId ? parseInt(rawId, 10) : NaN;

  // ── Store ─────────────────────────────────────────────────────────────────
  const { currentBooking, loadingDetail, loadingCancel, error, getBookingById, cancelBooking } =
    useBookingsStore(
      useShallow((state) => ({
        currentBooking: state.currentBooking,
        loadingDetail: state.loadingDetail,
        loadingCancel: state.loadingCancel,
        error: state.error,
        getBookingById: state.getBookingById,
        cancelBooking: state.cancelBooking,
      }))
    );

  // ── Carga al montar ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isNaN(bookingId)) {
      getBookingById(bookingId);
    }
  }, [bookingId]);

  // ── Cancelar reserva ──────────────────────────────────────────────────────
  async function handleCancel() {
    setShowCancelModal(false);
    const ok = await cancelBooking(bookingId);
    if (ok) {
      Alert.alert('Reserva cancelada', 'Tu reserva ha sido cancelada correctamente.', [
        { text: 'Aceptar', onPress: () => router.back() },
      ]);
    }
  }

  // ── Id inválido ───────────────────────────────────────────────────────────
  if (isNaN(bookingId)) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-neutral-800 font-bold text-center mb-4" style={styles.notFoundTitle}>
          Reserva no encontrada
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-primary-500 px-6 py-3 rounded-xl">
          <Text className="text-white font-semibold">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadingDetail) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
        <Text className="text-neutral-500 mt-3" style={styles.loadingText}>
          Cargando reserva...
        </Text>
      </SafeAreaView>
    );
  }

  // ── Error / no encontrada ─────────────────────────────────────────────────
  if (error || (!loadingDetail && !currentBooking)) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-neutral-800 font-bold text-center mb-2" style={styles.notFoundTitle}>
          Reserva no encontrada
        </Text>
        {error && (
          <Text className="text-red-500 text-center mb-4" style={styles.loadingText}>
            {error}
          </Text>
        )}
        <TouchableOpacity onPress={() => router.back()} className="bg-primary-500 px-6 py-3 rounded-xl">
          <Text className="text-white font-semibold">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!currentBooking) return null;

  const { excursion, estado, num_personas, precio_total, fecha_reserva, notas } = currentBooking;
  const estadoColor = ESTADO_COLORS[estado];
  const canCancel = estado === 'pendiente';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-neutral-50">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Imagen de la excursión ─────────────────────────────────────── */}
        {excursion?.imagen_url ? (
          <Image source={{ uri: excursion.imagen_url }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]}>
            <Text style={styles.heroIcon}>🏔</Text>
          </View>
        )}

        {/* ── Botón back ────────────────────────────────────────────────── */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
          <Text style={styles.backButtonIcon}>←</Text>
        </TouchableOpacity>

        {/* ── Contenido ─────────────────────────────────────────────────── */}
        <View className="bg-white mx-4 rounded-2xl p-5 mt-4" style={styles.card}>
          {/* Nombre de ruta */}
          <Text className="text-neutral-800 font-bold mb-1" style={styles.routeName}>
            {excursion?.nombre_ruta ?? 'Excursión'}
          </Text>
          <Text className="text-neutral-500 mb-4" style={styles.zona}>
            📍 {excursion?.zona ?? '—'}
          </Text>

          {/* Badge de estado */}
          <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '22' }]}>
            <View style={[styles.estadoDot, { backgroundColor: estadoColor }]} />
            <Text style={[styles.estadoText, { color: estadoColor }]}>
              {ESTADO_LABELS[estado]}
            </Text>
          </View>
        </View>

        {/* ── Detalles de la reserva ─────────────────────────────────────── */}
        <View className="bg-white mx-4 rounded-2xl p-5 mt-3" style={styles.card}>
          <Text className="text-neutral-800 font-bold mb-4" style={styles.sectionTitle}>
            Detalles de la reserva
          </Text>

          <Row label="Fecha de excursión" value={excursion ? formatDate(excursion.fecha_inicio) : '—'} />
          <Row label="Fecha de reserva" value={formatDate(fecha_reserva)} />
          <Row label="Personas" value={`${num_personas} ${num_personas === 1 ? 'persona' : 'personas'}`} />
          <Row label="Precio total" value={formatPrice(precio_total)} highlight />
          {notas ? <Row label="Notas" value={notas} /> : null}
        </View>

        {/* ── Notas informativas ─────────────────────────────────────────── */}
        {estado === 'pendiente' && (
          <View className="mx-4 mt-3 rounded-xl bg-amber-50 p-4">
            <Text className="text-amber-700 text-sm">
              Tu reserva está pendiente de confirmación por el guía. Te avisaremos cuando sea confirmada.
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Botón cancelar (sticky) ────────────────────────────────────────── */}
      {canCancel && (
        <SafeAreaView edges={['bottom']} className="bg-white border-t border-neutral-200">
          <View className="px-4 py-3">
            <TouchableOpacity
              onPress={() => setShowCancelModal(true)}
              disabled={loadingCancel}
              style={[styles.cancelButton, loadingCancel && styles.cancelButtonLoading]}
              activeOpacity={0.85}
            >
              {loadingCancel ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white font-bold text-center" style={styles.cancelButtonText}>
                  Cancelar reserva
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* ── Modal de confirmación de cancelación ──────────────────────────── */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCancelModal(false)}>
          <View style={styles.modalBox}>
            <Text className="text-neutral-800 font-bold mb-2" style={styles.modalTitle}>
              ¿Cancelar reserva?
            </Text>
            <Text className="text-neutral-500 text-center mb-6" style={styles.modalBody}>
              Esta acción no se puede deshacer. Las plazas se liberarán automáticamente.
            </Text>
            <TouchableOpacity
              onPress={handleCancel}
              style={styles.modalConfirmButton}
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold" style={styles.modalButtonText}>
                Sí, cancelar reserva
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowCancelModal(false)}
              className="mt-3 items-center py-2"
            >
              <Text className="text-neutral-400" style={styles.modalButtonText}>
                No, mantener reserva
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Componente fila de detalle ───────────────────────────────────────────────

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View className="flex-row justify-between items-center py-3 border-b border-neutral-100">
      <Text className="text-neutral-500" style={styles.rowLabel}>
        {label}
      </Text>
      <Text
        className={highlight ? 'text-primary-600 font-bold' : 'text-neutral-800 font-medium'}
        style={styles.rowValue}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: 200,
  },
  heroPlaceholder: {
    backgroundColor: COLORS.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    fontSize: 56,
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
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  routeName: {
    fontSize: 20,
    lineHeight: 26,
  },
  zona: {
    fontSize: 14,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  estadoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  estadoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowValue: {
    fontSize: 14,
  },
  bottomSpacer: {
    height: 16,
  },
  // Botón cancelar
  cancelButton: {
    backgroundColor: COLORS.error ?? '#EF4444',
    borderRadius: 14,
    paddingVertical: 15,
  },
  cancelButtonLoading: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  modalConfirmButton: {
    backgroundColor: COLORS.error ?? '#EF4444',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 15,
  },
  // Estados
  notFoundTitle: {
    fontSize: 18,
  },
  loadingText: {
    fontSize: 14,
  },
});
