// components/HeaderStatus.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOfflineMode } from '../hooks/useOfflineMode';

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
        color={serverReachable ? '#4CAF50' : '#F44336'}
      />
      <Text style={[styles.status, serverReachable ? styles.ok : styles.bad]}>
        {serverReachable ? 'Conectado' : 'Sin conexión'}
      </Text>

      <Ionicons name="layers" size={20} color="#2e78b7" />
      <Text style={styles.status}>{count} eventos</Text>

      {onRefresh && (
        <Pressable style={styles.iconBtn} onPress={onRefresh}>
          <Ionicons name="refresh-circle-outline" size={24} color="#2e78b7" />
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
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  status: {
    marginHorizontal: 6,
    fontSize: 16,
    fontWeight: 'bold',
  },
  ok: { color: '#4CAF50' },
  bad: { color: '#F44336' },
  iconBtn: { marginLeft: 8, padding: 4 },
});
