// Componente skeleton con efecto shimmer animado para estados de carga
import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { COLORS } from '@/lib/constants';

// ─── Componente base: rectángulo animado ──────────────────────────────────────

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: COLORS.neutral[300],
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── Skeleton de ExcursionCard ────────────────────────────────────────────────

export function ExcursionCardSkeleton() {
  return (
    <View style={styles.excursionCard}>
      {/* Imagen */}
      <Skeleton height={160} borderRadius={12} style={styles.fullWidth} />
      {/* Contenido */}
      <View style={styles.excursionContent}>
        <Skeleton width="70%" height={18} style={styles.mb8} />
        <Skeleton width="40%" height={13} style={styles.mb12} />
        <View style={styles.row}>
          <Skeleton width={60} height={13} style={styles.mr8} />
          <Skeleton width={60} height={13} style={styles.mr8} />
          <Skeleton width={60} height={13} />
        </View>
      </View>
    </View>
  );
}

// ─── Skeleton de BookingCard ──────────────────────────────────────────────────

export function BookingCardSkeleton() {
  return (
    <View style={styles.bookingCard}>
      <View style={styles.row}>
        <Skeleton width={56} height={56} borderRadius={10} style={styles.mr12} />
        <View style={styles.flex1}>
          <Skeleton width="75%" height={16} style={styles.mb8} />
          <Skeleton width="50%" height={13} style={styles.mb6} />
          <Skeleton width="35%" height={13} />
        </View>
      </View>
    </View>
  );
}

// ─── Skeleton de ActivityCard ─────────────────────────────────────────────────

export function ActivityCardSkeleton() {
  return (
    <View style={styles.activityCard}>
      <View style={[styles.row, styles.mb12]}>
        <Skeleton width="55%" height={16} style={styles.mr8} />
        <Skeleton width={80} height={22} borderRadius={12} />
      </View>
      <View style={styles.row}>
        <Skeleton width={56} height={40} borderRadius={6} style={styles.mr16} />
        <Skeleton width={56} height={40} borderRadius={6} style={styles.mr16} />
        <Skeleton width={56} height={40} borderRadius={6} />
      </View>
    </View>
  );
}

// ─── Skeleton de header de perfil ─────────────────────────────────────────────

export function ProfileHeaderSkeleton() {
  return (
    <View style={styles.profileHeader}>
      <Skeleton width={96} height={96} borderRadius={48} style={styles.mb12} />
      <Skeleton width="50%" height={20} style={styles.mb8} />
      <Skeleton width="70%" height={14} style={styles.mb6} />
      <Skeleton width="40%" height={14} />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
  flex1: { flex: 1 },

  // Márgenes helper
  mb6: { marginBottom: 6 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mr8: { marginRight: 8 },
  mr12: { marginRight: 12 },
  mr16: { marginRight: 16 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Tarjetas skeleton ────────────────────────────────────────────────────
  excursionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  excursionContent: {
    padding: 14,
  },

  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  profileHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
});
