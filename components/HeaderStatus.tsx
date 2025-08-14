// components/HeaderStatus.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOfflineMode } from '../hooks/useOfflineMode';
import COLORS from '../constants/Colors';

interface HeaderStatusProps {
  count: number;
  onRefresh?: () => void;
}

export default function HeaderStatus({ count, onRefresh }: HeaderStatusProps) {
  const { serverReachable } = useOfflineMode();

  return (
    <View style={styles.header}>
      <Ionicons
        name={serverReachable ? 'wifi' : 'wifi-outline'}
        size={20}
        color={serverReachable ? COLORS.success : COLORS.error}
      />
      <Text style={[styles.status, serverReachable ? styles.ok : styles.bad]}>
        {serverReachable ? 'Conectado' : 'Sin conexión'}
      </Text>

      <Ionicons name="layers" size={20} color={COLORS.primary} />
      <Text style={styles.status}>{count} eventos</Text>

      {onRefresh && (
        <Pressable style={styles.iconBtn} onPress={onRefresh}>
          <Ionicons name="refresh-circle-outline" size={24} color={COLORS.primary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
  },
  status: {
    marginHorizontal: 6,
    fontSize: 16,
    fontWeight: 'bold',
  },
  ok: { color: COLORS.success },
  bad: { color: COLORS.error },
  iconBtn: { marginLeft: 8, padding: 4 },
});
