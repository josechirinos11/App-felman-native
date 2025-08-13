// components/AppHeader.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';

// hook opcional; si no existe, no rompe
let useOfflineMode: undefined | (() => { serverReachable: boolean });
try {
  // @ts-ignore
  useOfflineMode = require('../hooks/useOfflineMode').useOfflineMode;
} catch {}

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
      <View style={styles.leftCol}>
        <View style={styles.row}>
          <Ionicons name="person-circle-outline" size={18} color="#1f2937" />
          <Text numberOfLines={1} style={styles.user}>{userName}</Text>
        </View>
        <View style={[styles.row, { marginTop: 2 }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#6b7280" />
          <Text numberOfLines={1} style={styles.role}>{role}</Text>
        </View>
      </View>

      {/* CENTRO: Título */}
      <View style={styles.centerCol}>
        <Text numberOfLines={2} style={styles.title}>{title}</Text>
      </View>

      {/* DERECHA: Estado / Conteo / Refresh */}
      <View style={styles.rightCol}>
        <View style={styles.row}>
          <Ionicons
            name={serverReachable ? 'wifi-outline' : 'cloud-offline-outline'}
            size={18}
            color={serverReachable ? '#10b981' : '#ef4444'}
          />
          <Text style={[styles.conn, serverReachable ? styles.ok : styles.bad]}>
            {serverReachable ? 'Conectado' : 'Sin conexión'}
          </Text>

          <Ionicons name="layers-outline" size={18} color="#2e78b7" style={{ marginLeft: 8 }} />
          <Text style={styles.count}>{count} ítems</Text>

          {!!onRefresh && (
            <Pressable style={styles.iconBtn} onPress={onRefresh} accessibilityLabel="Refrescar">
              <Ionicons name="refresh-circle-outline" size={22} color="#2e78b7" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftCol: { minWidth: 200 },
  centerCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rightCol: { minWidth: 200, alignItems: 'flex-end' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  user: { marginLeft: 6, fontSize: 14, fontWeight: '700', color: '#111827', maxWidth: 220 },
  role: { marginLeft: 6, fontSize: 12, color: '#6b7280', maxWidth: 220 },

  conn: { marginLeft: 6, fontSize: 12, fontWeight: '600' },
  ok: { color: '#10b981' },
  bad: { color: '#ef4444' },
  count: { marginLeft: 6, fontSize: 12, color: '#374151' },
  iconBtn: { marginLeft: 10, padding: Platform.OS === 'ios' ? 6 : 4, borderRadius: 8 },

  title: { fontSize: 16, fontWeight: '800', color: '#1f2937', textAlign: 'center' },
});
