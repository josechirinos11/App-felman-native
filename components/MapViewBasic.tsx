// components/MapViewBasic.tsx - Versión ultra básica para debugging
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

let MapView: any = null;
let Marker: any = null;

try {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
} catch (error) {
  console.error('❌ Error cargando react-native-maps:', error);
}

interface BasicMapProps {
  latitude: number;
  longitude: number;
}

export default function MapViewBasic({ latitude, longitude }: BasicMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<any>(null);

  if (!MapView) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>❌ react-native-maps no disponible</Text>
      </View>
    );
  }

  const handleMapReady = () => {
    console.log('🗺️ BASIC: Mapa básico listo');
    setMapReady(true);
  };

  const initialRegion = {
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.debugText}>
        🧪 MAPA BÁSICO - Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
      </Text>
      
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onMapReady={handleMapReady}
        showsUserLocation={true}
        showsMyLocationButton={true}
        // CONFIGURACIÓN MÍNIMA
        provider={null}
        mapType="standard"
        zoomEnabled={true}
        scrollEnabled={true}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title="Mi ubicación"
          description="Ubicación actual"
        />
      </MapView>
      
      {!mapReady && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>🔄 Cargando mapa básico...</Text>
        </View>
      )}
      
      {mapReady && (
        <View style={styles.successOverlay}>
          <Text style={styles.successText}>✅ Mapa básico funcionando</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  debugText: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: 8,
    borderRadius: 4,
    fontSize: 12,
    zIndex: 100,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  overlayText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  successOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 150, 0, 0.9)',
    padding: 10,
    borderRadius: 8,
    zIndex: 100,
  },
  successText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    margin: 20,
  },
});
