// app/logistica/switch-vista-web-movil.tsx
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

export default function SwitchVistaWebMovil() {
  useEffect(() => {
    // Redirigir según la plataforma
    if (Platform.OS === 'web') {
      router.replace('/logistica/seguimiento-web');
    } else {
      router.replace('/logistica/seguimiento-movil');
    }
  }, []);

  // Mostrar un mensaje de carga mientras se redirige
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Redirigiendo...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});
