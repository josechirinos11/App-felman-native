// components/AppHeader.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import React from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import COLORS from '../constants/Colors';

// hook opcional; si no existe, no rompe
let useOfflineMode: undefined | (() => { serverReachable: boolean });
try {
  // @ts-ignore
  useOfflineMode = require('../hooks/useOfflineMode').useOfflineMode;
} catch { }

type Props = {
  count?: number;
  titleOverride?: string;
  onRefresh?: () => void;
  serverReachableOverride?: boolean;
};

type LocalUser = { nombre?: string; rol?: string; name?: string; role?: string };

const titleByPath = (path: string) => {
  const p = path.toLowerCase();
  if (p.includes('/optima/control-terminales')) return 'Control Terminales';
  if (p.includes('/optima/control-operarios')) return 'Control Operarios';
  if (p.includes('/optima/control-dashboard-barcoder-order')) return 'Dashboard Pedidos (Order)';
  if (p.includes('/optima/control-dashboard-barcoder-det')) return 'Dashboard Barcoder Det';
  if (p.includes('/optima/control-dashboard-barcoder')) return 'Dashboard Barcoder';
  if (p.endsWith('/optima') || p.endsWith('/optima/')) return 'Óptima';
  const last = p.split('/').filter(Boolean).pop() || 'Inicio';
  return last.replace(/[-_]/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
};

export default function AppHeader({
  count = 0,
  titleOverride,
  onRefresh,
  serverReachableOverride,
}: Props) {
  const pathname = usePathname();
  const [userName, setUserName] = React.useState('—');
  const [role, setRole] = React.useState('—');
  const isSmallDevice = Dimensions.get('window').width < 500;
  const offline = useOfflineMode ? useOfflineMode() : { serverReachable: true };
  const serverReachable =
    typeof serverReachableOverride === 'boolean' ? serverReachableOverride : offline.serverReachable;

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('userData');
        if (!mounted) return;
        if (raw) {
          const u: LocalUser = JSON.parse(raw);
          setUserName(u.nombre || u.name || 'Sin nombre');
          setRole(u.rol || u.role || 'Sin rol');
        } else {
          setUserName('Sin nombre');
          setRole('Sin rol');
        }
      } catch {
        if (!mounted) return;
        setUserName('Sin nombre');
        setRole('Sin rol');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const title = titleOverride || titleByPath(pathname || '');

  return (
    <View style={styles.wrapper}>
      {/* IZQUIERDA: Usuario / Rol */}
      <View style={[styles.leftCol, isSmallDevice && { minWidth: 20 }]}>
        <View style={styles.row}>
          <Ionicons name="person-circle-outline" size={18} color={COLORS.text} />
          {!isSmallDevice && (
            <Text numberOfLines={1} style={styles.user}>{userName}</Text>
          )}
        </View>
        <View style={[styles.row, { marginTop: 2 }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.textSecondary} />
          {!isSmallDevice && (
            <Text numberOfLines={1} style={styles.role}>{role}</Text>
          )}
        </View>
      </View>

      {/* CENTRO: Título */}
      <View style={styles.centerCol}>
        <View style={styles.row}>
          <Text numberOfLines={2} style={styles.title}>{title}</Text>

          <Pressable style={styles.iconBtn} onPress={onRefresh} accessibilityLabel="Refrescar">
            <Ionicons name="refresh-circle-outline" size={22} color={COLORS.primary} />
          </Pressable>

        </View>
      </View>

      {/* DERECHA: Estado / Conteo / Refresh */}
      <View style={styles.rightCol}>
        <View style={styles.row}>
          <Ionicons
            name={serverReachable ? 'wifi-outline' : 'cloud-offline-outline'}
            size={18}
            color={serverReachable ? COLORS.successAlt : COLORS.errorAlt}
          />
          <Text style={[styles.conn, serverReachable ? styles.ok : styles.bad]}>
            {serverReachable ? 'Conectado' : 'Sin conexión'}
          </Text>
        </View>

        <View style={[styles.row, { marginTop: 2 }]}>
          <Ionicons name="layers-outline" size={18} color={COLORS.primary} style={{ marginLeft: 8 }} />
          <Text style={styles.count}>{count} ítems</Text>
        </View>






      </View>



    </View >
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
    width: '100%', // <-- Asegura el ancho máximo
    maxWidth: '100%'
  },
  leftCol: { minWidth: 90, alignItems: 'flex-start', justifyContent: 'center' },
  centerCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    rightCol: { 
    minWidth: 90, 
    alignItems: 'flex-start', // ya lo tienes, esto está bien
    justifyContent: 'flex-start', // agrega esto para asegurar alineación arriba
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    justifyContent: 'flex-start', // agrega esto para alinear los hijos a la izquierda
  },
  user: { marginLeft: 6, fontSize: 14, fontWeight: '700', color: COLORS.text, maxWidth: 220 },
  role: { marginLeft: 6, fontSize: 12, color: COLORS.textSecondary, maxWidth: 220 },

  conn: { marginLeft: 6, fontSize: 12, fontWeight: '600' },
  ok: { color: COLORS.successAlt },
  bad: { color: COLORS.errorAlt },
  count: { marginLeft: 6, fontSize: 12, color: COLORS.textEmphasis },
  iconBtn: { marginLeft: 10, padding: Platform.OS === 'ios' ? 6 : 4, borderRadius: 8 },

  title: { fontSize: 16, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
});
