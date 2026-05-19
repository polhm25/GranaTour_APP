// Drawer lateral deslizable desde la derecha con opciones de usuario.
// Se abre desde el header de Home con el icono de menú burger.
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

const ROLE_LABELS: Record<string, string> = {
  cliente: 'Cliente',
  guia: 'Guía',
  admin: 'Administrador',
};

interface BurgerMenuProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuItemProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, danger = false }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons
        name={icon}
        size={20}
        color={danger ? COLORS.error : COLORS.neutral[600]}
        style={styles.menuItemIcon}
      />
      <Text style={[styles.menuItemLabel, danger && styles.menuItemDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.neutral[300]} />
    </TouchableOpacity>
  );
}

export function BurgerMenu({ visible, onClose }: BurgerMenuProps) {
  const router = useRouter();
  const { user } = useAuth();
  const signOut = useAuthStore((state) => state.signOut);

  // Animación de deslizamiento desde la derecha
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, overlayAnim]);

  function handleNavigate(path: string) {
    onClose();
    setTimeout(() => router.push(path as never), 250);
  }

  async function handleSignOut() {
    onClose();
    setTimeout(async () => {
      await signOut();
    }, 250);
  }

  const fullName = user ? `${user.nombre} ${user.ap1}` : '';
  const roleLabel = user?.rol ? (ROLE_LABELS[user.rol] ?? user.rol) : '';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Overlay semitransparente */}
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer deslizante */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        <SafeAreaView style={styles.drawerInner} edges={['top', 'bottom']}>

          {/* Cabecera del drawer: avatar + info usuario */}
          <View style={styles.userHeader}>
            <TouchableOpacity
              onPress={() => handleNavigate('/(tabs)/profile')}
              activeOpacity={0.8}
            >
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {user ? `${user.nombre.charAt(0)}${user.ap1.charAt(0)}` : '?'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{fullName}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{user?.email ?? ''}</Text>
              {roleLabel ? (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{roleLabel}</Text>
                </View>
              ) : null}
            </View>

            {/* Botón cerrar */}
            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={12}>
              <Ionicons name="close" size={22} color={COLORS.neutral[500]} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Sección principal */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Mi cuenta</Text>
            <MenuItem
              icon="person-outline"
              label="Mi perfil"
              onPress={() => handleNavigate('/(tabs)/profile')}
            />
            <MenuItem
              icon="calendar-outline"
              label="Mis reservas"
              onPress={() => handleNavigate('/(tabs)/bookings')}
            />
            <MenuItem
              icon="location-outline"
              label="Mis actividades"
              onPress={() => handleNavigate('/(tabs)/activity')}
            />
          </View>

          <View style={styles.divider} />

          {/* Sección de app */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Aplicación</Text>
            <MenuItem
              icon="compass-outline"
              label="Explorar excursiones"
              onPress={() => handleNavigate('/(tabs)/explore')}
            />
            <MenuItem
              icon="information-circle-outline"
              label="Acerca de GranaTour"
              onPress={() => handleNavigate('/(tabs)/profile')}
            />
          </View>

          <View style={styles.divider} />

          {/* Cerrar sesión */}
          <View style={styles.section}>
            <MenuItem
              icon="log-out-outline"
              label="Cerrar sesión"
              onPress={handleSignOut}
              danger
            />
          </View>

          {/* Versión */}
          <Text style={styles.version}>GranaTour v1.0.0</Text>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerInner: {
    flex: 1,
  },
  // ── Cabecera de usuario ────────────────────────────────────────────────────
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary[600],
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.neutral[800],
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.neutral[500],
    marginTop: 2,
  },
  roleBadge: {
    marginTop: 5,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary[50],
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary[700],
  },
  closeButton: {
    padding: 4,
  },
  // ── Secciones de menú ──────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: COLORS.neutral[100],
    marginHorizontal: 20,
  },
  section: {
    paddingVertical: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  menuItemIcon: {
    marginRight: 14,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 15,
    color: COLORS.neutral[700],
    fontWeight: '500',
  },
  menuItemDanger: {
    color: COLORS.error,
  },
  // ── Pie ───────────────────────────────────────────────────────────────────
  version: {
    fontSize: 11,
    color: COLORS.neutral[300],
    textAlign: 'center',
    paddingBottom: 12,
    marginTop: 'auto',
  },
});
