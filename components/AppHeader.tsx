import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname } from 'expo-router';
import React from 'react';
import { Dimensions, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import COLORS from '../constants/Colors';

type Props = {
  count?: number;
  titleOverride?: string;
  onRefresh?: () => void;
  serverReachableOverride?: boolean;
  // onUserPress recibe los datos actuales de user para que el padre abra el modal
  onUserPress?: (user: { userName: string; role: string }) => void;

    userNameProp?: string;
  roleProp?: string;
};

export default function AppHeader({
  count,
  titleOverride,
  onRefresh,
  serverReachableOverride,
  onUserPress,
    userNameProp,          // ✅ desestructurar aquí
  roleProp,              // ✅ desestructurar aquí
}: Props) {
  const pathname = usePathname();
  const [userName, setUserName] = React.useState('—');
  const [role, setRole] = React.useState('—');
  const isSmallDevice = Dimensions.get('window').width < 500;

  const displayedUser = (typeof userNameProp === 'string' && userNameProp.trim()) ? userNameProp : userName;
  const displayedRole = (typeof roleProp === 'string' && roleProp.trim()) ? roleProp : role;


  // carga local del usuario (si la tenías en AppHeader). Mantén aquí la lógica de lectura.
  React.useEffect(() => {
    // ejemplo: cargar desde AsyncStorage o desde un hook global
    // (reemplaza con tu lógica actual)
    (async () => {
      try {
        // const stored = await AsyncStorage.getItem('user');
        // if (stored) { const u = JSON.parse(stored); setUserName(u.name || u.nombre); setRole(u.role || u.rol); }
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const title = titleOverride || pathname?.split('/').pop() || '';

  const handleUserPress = () => {
    if (onUserPress) onUserPress({ userName, role });
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.leftCol, isSmallDevice && styles.leftColSmall]}> 
        <Pressable onPress={handleUserPress} style={[styles.logoMenuPressable, isSmallDevice && styles.logoMenuPressableSmall]}>
          <View style={[styles.logoMenuContainer, isSmallDevice && styles.logoMenuContainerSmall]}>
            {Platform.OS === 'web' && !isSmallDevice ? (
              <Image source={require('../assets/images/logo.png')} style={styles.logoLarge} resizeMode="contain" />
            ) : null}
            <Ionicons name="menu-outline" size={32} color="#ef4444" style={styles.menuIconLarge} />
          </View>
        </Pressable>
      </View>

      <View style={styles.centerCol}>
        <Text numberOfLines={2} style={styles.title}>{title}</Text>
        {onRefresh && (
          <Pressable style={styles.iconBtn} onPress={onRefresh} accessibilityLabel="Refrescar">
            <Ionicons name="refresh-circle-outline" size={22} color={COLORS.primary} />
          </Pressable>
        )}
      </View>

      <View style={styles.rightCol}>
        {/* ejemplo: estado de conexión y count (solo si viene) */}
        <View style={styles.row}>
          <Ionicons name={serverReachableOverride ? 'wifi-outline' : 'cloud-offline-outline'} size={18} color={serverReachableOverride ? COLORS.successAlt : COLORS.errorAlt} />
          <Text style={[styles.conn, serverReachableOverride ? styles.ok : styles.bad]}>
            {serverReachableOverride ? 'Conectado' : 'Sin conexión'}
          </Text>
        </View>

        {typeof count === 'number' && (
          <View style={[styles.row, { marginTop: 2 }]}>
            <Ionicons name="layers-outline" size={18} color={COLORS.primary} style={{ marginLeft: 8 }} />
            <Text style={styles.count}>{count} ítems</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  leftCol: { minWidth: 90, alignItems: 'flex-start', justifyContent: 'center' },
  leftColSmall: { minWidth: 60, alignItems: 'flex-start', justifyContent: 'center' },
  centerCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rightCol: { minWidth: 90, alignItems: 'flex-end', justifyContent: 'center' },
  logoMenuPressable: {
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoMenuPressableSmall: {
    paddingVertical: 6,
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
  },
  logoMenuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
    width: '100%',
  },
  logoMenuContainerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    width: '100%',
    paddingLeft: 0,
  },
  logoLarge: {
    width: 56,
    height: 40,
    marginRight: 0,
  },
  menuIconLarge: {
    marginLeft: 0,
    marginRight: 16, // separa el icono del logo
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-start' },
  logo: { width: 28, height: 20, marginRight: 6 },
  user: { marginLeft: 6, fontSize: 14, fontWeight: '700', color: COLORS.text, maxWidth: 220 },
  role: { marginLeft: 6, fontSize: 12, color: COLORS.textSecondary, maxWidth: 220 },
  conn: { marginLeft: 6, fontSize: 12, fontWeight: '600' },
  ok: { color: COLORS.successAlt },
  bad: { color: COLORS.errorAlt },
  count: { marginLeft: 6, fontSize: 12, color: COLORS.textEmphasis },
  iconBtn: { marginLeft: 10, padding: Platform.OS === 'ios' ? 6 : 4, borderRadius: 8 },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
});