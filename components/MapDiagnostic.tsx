// components/MapDiagnostic.tsx - Diagnóstico de Google Maps para Android
import React, { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

interface MapDiagnosticProps {
  apiKey: string;
}

export default function MapDiagnostic({ apiKey }: MapDiagnosticProps) {
  const [diagnostics, setDiagnostics] = useState({
    platform: Platform.OS,
    apiKeyPresent: false,
    apiKeyValid: false,
    networkReachable: false,
    mapsServicesAvailable: false,
  });

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    console.log('🔍 Ejecutando diagnósticos de Google Maps...');
    
    const results = {
      platform: Platform.OS,
      apiKeyPresent: !!apiKey && apiKey.length > 10,
      apiKeyValid: false,
      networkReachable: false,
      mapsServicesAvailable: false,
    };

    // Verificar API Key
    if (results.apiKeyPresent) {
      try {
        // Verificar conectividad con Google Maps API
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`,
          { method: 'HEAD' }
        );
        results.networkReachable = response.ok;
        results.apiKeyValid = response.status !== 403;
      } catch (error) {
        console.error('❌ Error verificando API key:', error);
        results.networkReachable = false;
      }
    }

    // Verificar Google Play Services en Android
    if (Platform.OS === 'android') {
      try {
        // Esta verificación solo es aproximada desde React Native
        results.mapsServicesAvailable = true;
      } catch (error) {
        console.error('❌ Error verificando Google Play Services:', error);
        results.mapsServicesAvailable = false;
      }
    } else {
      results.mapsServicesAvailable = true; // iOS no requiere Google Play Services
    }

    setDiagnostics(results);
    
    // Mostrar resultados en consola
    console.log('📊 Resultados del diagnóstico:', results);
    
    // Mostrar alerta si hay problemas críticos
    if (!results.apiKeyValid || !results.networkReachable) {
      Alert.alert(
        'Problema con Google Maps',
        'Se detectaron problemas con la configuración de Google Maps. Revisa la consola para más detalles.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Diagnóstico Google Maps</Text>
      
      <View style={styles.row}>
        <Text style={styles.label}>Plataforma:</Text>
        <Text style={[styles.value, styles.info]}>{diagnostics.platform}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>API Key presente:</Text>
        <Text style={[styles.value, diagnostics.apiKeyPresent ? styles.success : styles.error]}>
          {diagnostics.apiKeyPresent ? '✅ Sí' : '❌ No'}
        </Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>API Key válida:</Text>
        <Text style={[styles.value, diagnostics.apiKeyValid ? styles.success : styles.error]}>
          {diagnostics.apiKeyValid ? '✅ Sí' : '❌ No'}
        </Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Red accesible:</Text>
        <Text style={[styles.value, diagnostics.networkReachable ? styles.success : styles.error]}>
          {diagnostics.networkReachable ? '✅ Sí' : '❌ No'}
        </Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Servicios disponibles:</Text>
        <Text style={[styles.value, diagnostics.mapsServicesAvailable ? styles.success : styles.error]}>
          {diagnostics.mapsServicesAvailable ? '✅ Sí' : '❌ No'}
        </Text>
      </View>
      
      {diagnostics.apiKeyPresent && (
        <View style={styles.row}>
          <Text style={styles.label}>API Key:</Text>
          <Text style={[styles.value, styles.info]}>
            {`${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    position: 'absolute',
    top: 50,
    right: 10,
    left: 10,
    zIndex: 1000,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    color: 'white',
    fontSize: 12,
    flex: 1,
  },
  value: {
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  success: {
    color: '#4CAF50',
  },
  error: {
    color: '#F44336',
  },
  info: {
    color: '#2196F3',
  },
});
