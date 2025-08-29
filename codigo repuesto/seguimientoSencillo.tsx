// app/logistica/seguimiento.tsx - Mapas completos para Web y Android
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView as SafeAreaViewSA } from 'react-native-safe-area-context';

import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import WebMapView from '../../components/WebMapView';

import * as Location from 'expo-location';

// Import directo y simple como en tu código que funcionaba
import MapView, { Marker } from 'react-native-maps';

export default function SeguimientoScreen() {
  // Estados básicos
  const [userName, setUserName] = useState('Usuario');
  const [userRole, setUserRole] = useState('Demo');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'loading' | 'granted' | 'denied'>('loading');
  
  // Estados del mapa
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('satellite'); // CAMBIAR A SATELLITE PARA PRUEBA
  const [currentZoom, setCurrentZoom] = useState(15);
  const [isEmulator, setIsEmulator] = useState(false);
  
  // Ref para el mapa
  const mapRef = useRef<any>(null);

  // Detectar si es emulador (Android) - Mejorado para dispositivo físico
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Para dispositivos físicos, no es emulador
      setIsEmulator(false);
      console.log('📱 ANDROID: Configurando para DISPOSITIVO FÍSICO');
      console.log('📱 ANDROID: Habilitando todas las funciones del mapa');
      console.log('📱 ANDROID: Si no funciona, verificar Google Maps API Key');
    }
  }, []);

  // Solicitar permisos de ubicación
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        console.log('🗺️ Simple: Solicitando permisos de ubicación...');
        
        const granted = await Location.requestForegroundPermissionsAsync();
        if (granted.status === 'granted') {
          console.log('✅ Simple: Permisos concedidos');
          setPermissionStatus('granted');
          // Llamar getCurrentLocation inmediatamente
          console.log('🔄 Simple: Llamando getCurrentLocation...');
          await getCurrentLocation();
        } else {
          console.log('❌ Simple: Permisos denegados');
          setPermissionStatus('denied');
        }
      } catch (error) {
        console.error('❌ Simple: Error solicitando permisos:', error);
        setPermissionStatus('denied');
      }
    };

    requestLocationPermission();
  }, []);

  // Obtener ubicación actual
  const getCurrentLocation = async () => {
    try {
      console.log('📍 Simple: Obteniendo ubicación actual...');
      
      // Crear una promesa con timeout manual
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low, // Más rápido y menos preciso
      });
      
      // Timeout de 8 segundos
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout obteniendo ubicación')), 8000);
      });
      
      const currentLocation = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
      
      console.log('✅ Simple: Ubicación obtenida:', {
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude
      });
      
      // Forzar actualización del estado
      setLocation(currentLocation);
      console.log('🔄 Simple: Estado location actualizado');
      
    } catch (error) {
      console.error('❌ Simple: Error obteniendo ubicación:', error);
      console.log('🔄 Simple: Usando ubicación por defecto debido al error');
      
      // Usar ubicación por defecto (Valencia)
      const defaultLocation = {
        coords: {
          latitude: 39.4699075,
          longitude: -0.3762881,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as Location.LocationObject;
      
      setLocation(defaultLocation);
      console.log('🔄 Simple: Ubicación por defecto establecida');
    }
  };

  // Región inicial para el mapa
  const initialRegion = {
    latitude: location?.coords.latitude || 39.4699075,
    longitude: location?.coords.longitude || -0.3762881,
    latitudeDelta: 0.01, // Zoom moderado para mejor interactividad
    longitudeDelta: 0.01, // Zoom moderado para mejor interactividad
  };

  console.log('🗺️ Simple: Región inicial calculada:', initialRegion);

  // Callback cuando el mapa está listo
  const handleMapReady = () => {
    console.log('🗺️ Mapa completo cargado y listo');
    if (Platform.OS === 'android') {
      console.log('🤖 ANDROID: MapView renderizado correctamente');
      console.log('🗺️ ANDROID: Si ves fondo marrón = problema de tiles/texturas');
      console.log('🔑 ANDROID: API Key configurado, pero puede necesitar restricciones');
      console.log('📱 ANDROID: Prueba cambiar tipo de mapa (satellite/hybrid)');
      console.log('🔧 ANDROID: Toca botón 🔧 para diagnóstico avanzado');
    }
  };

  // Callback para cambios de región
  const handleRegionChange = (region: any) => {
    console.log('🗺️ Región cambió:', region);
    setCurrentZoom(region.longitudeDelta ? Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2) : 15);
  };

  // Funciones de control del mapa
  const zoomIn = () => {
    if (Platform.OS === 'web') {
      // Control para Google Maps Web
      console.log('🔍 Zoom In en web');
    } else if (mapRef.current) {
      // Control para React Native Maps
      mapRef.current.animateToRegion({
        ...initialRegion,
        latitudeDelta: initialRegion.latitudeDelta * 0.5,
        longitudeDelta: initialRegion.longitudeDelta * 0.5,
      }, 1000);
    }
  };

  const zoomOut = () => {
    if (Platform.OS === 'web') {
      // Control para Google Maps Web
      console.log('🔍 Zoom Out en web');
    } else if (mapRef.current) {
      // Control para React Native Maps
      mapRef.current.animateToRegion({
        ...initialRegion,
        latitudeDelta: initialRegion.latitudeDelta * 2,
        longitudeDelta: initialRegion.longitudeDelta * 2,
      }, 1000);
    }
  };

  const toggleMapType = () => {
    const types: ('standard' | 'satellite' | 'hybrid')[] = ['standard', 'satellite', 'hybrid'];
    const currentIndex = types.indexOf(mapType);
    const nextType = types[(currentIndex + 1) % types.length];
    setMapType(nextType);
    console.log('🗺️ Tipo de mapa cambiado a:', nextType);
  };

  const centerOnLocation = () => {
    if (location && mapRef.current) {
      const region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      if (Platform.OS === 'web') {
        console.log('📍 Centrando en ubicación en web');
      } else {
        mapRef.current.animateToRegion(region, 1000);
      }
    }
  };

  // Debug: Log de estados actuales
  console.log('🔍 Debug Estados:', {
    permissionStatus,
    hasLocation: !!location,
    mapType,
    currentZoom,
    locationCoords: location?.coords ? {
      lat: location.coords.latitude,
      lng: location.coords.longitude
    } : null
  });

  // Debug adicional para entender el renderizado
  console.log('🎯 Debug Renderizado:', {
    showLoading: permissionStatus === 'loading',
    showError: permissionStatus === 'denied', 
    showLocationLoading: permissionStatus === 'granted' && !location,
    showMap: permissionStatus === 'granted' && !!location
  });

  return (
    <SafeAreaProvider>
      <SafeAreaViewSA edges={['top', 'bottom']} style={styles.container}>
        {/* Header */}
        <AppHeader
          titleOverride="Mapa Simple"
          count={location ? 1 : 0}
          userNameProp={userName}
          roleProp={userRole}
          serverReachableOverride={true}
          onRefresh={() => getCurrentLocation()}
          onUserPress={() => setUserModalVisible(true)}
        />

        {/* Modal de usuario */}
        <ModalHeader
          visible={userModalVisible}
          userName={userName}
          role={userRole}
          onClose={() => setUserModalVisible(false)}
        />

        {/* Contenido principal */}
        <View style={styles.content}>
          {permissionStatus === 'loading' ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066FF" />
              <Text style={styles.loadingText}>Solicitando permisos de ubicación...</Text>
            </View>
          ) : permissionStatus === 'denied' ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Permisos de ubicación denegados</Text>
              <Text style={styles.errorSubtext}>
                Por favor, habilita los permisos de ubicación en la configuración de la app
              </Text>
            </View>
          ) : permissionStatus === 'granted' && !location ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066FF" />
              <Text style={styles.loadingText}>Obteniendo ubicación GPS...</Text>
            </View>
          ) : (
            <View style={styles.mapContainer}>
              <Text style={styles.mapTitle}>
                🗺️ MAPA COMPLETO ({Platform.OS.toUpperCase()}) - Lat: {location?.coords.latitude.toFixed(6)}, Lng: {location?.coords.longitude.toFixed(6)}
              </Text>
              
              {/* MAPA SEGÚN PLATAFORMA */}
              <View style={styles.mapWrapper}>
                {Platform.OS === 'web' ? (
                  /* GOOGLE MAPS PARA WEB */
                  <WebMapView
                    initialRegion={initialRegion}
                    onMapReady={handleMapReady}
                    showsUserLocation={true}
                  />
                ) : (
                  /* REACT NATIVE MAPS - CON PROVIDER GOOGLE Y CONFIGURACIÓN ESPECÍFICA */
                  <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={initialRegion}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                    mapType={mapType}
                    provider="google"
                    zoomEnabled={true}
                    scrollEnabled={true}
                    rotateEnabled={true}
                    onMapReady={handleMapReady}
                    onRegionChangeComplete={handleRegionChange}
                  >
                    {/* Marcador en la ubicación actual */}
                    {location && (
                      <Marker
                        coordinate={{
                          latitude: location.coords.latitude,
                          longitude: location.coords.longitude,
                        }}
                        title="Tu ubicación"
                        description={`Coordenadas: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`}
                        pinColor="red"
                      />
                    )}
                  </MapView>
                )}
                
                {/* CONTROLES DE MAPA */}
                <View style={styles.mapControls}>
                  <TouchableOpacity style={styles.controlButton} onPress={zoomIn}>
                    <Text style={styles.controlButtonText}>🔍+</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.controlButton} onPress={zoomOut}>
                    <Text style={styles.controlButtonText}>🔍-</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.controlButton} onPress={toggleMapType}>
                    <Text style={styles.controlButtonText}>🗺️</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.controlButton} onPress={centerOnLocation}>
                    <Text style={styles.controlButtonText}>📍</Text>
                  </TouchableOpacity>
                  
                  {/* Botón de diagnóstico para Android */}
                  {Platform.OS === 'android' && (
                    <TouchableOpacity 
                      style={[styles.controlButton, { backgroundColor: isEmulator ? '#ff6b6b' : '#4CAF50' }]} 
                      onPress={() => {
                        console.log('🔧 DIAGNÓSTICO FONDO MARRÓN:');
                        console.log('📱 Es emulador:', isEmulator);
                        console.log('🗺️ Tipo de mapa:', mapType);
                        console.log('📍 Ubicación:', location?.coords);
                        console.log('🏗️ MapRef:', !!mapRef.current);
                        console.log('🔍 Región actual:', initialRegion);
                        console.log('🚨 PROBLEMA: Fondo marrón = Tiles de Google Maps no cargan');
                        console.log('🔑 POSIBLES CAUSAS:');
                        console.log('   1. API Key sin Maps SDK for Android habilitado');
                        console.log('   2. API Key sin restricciones de aplicación Android');
                        console.log('   3. Falta SHA-1 fingerprint en Google Console');
                        console.log('   4. Cuota de API excedida');
                        console.log('� SOLUCIONES:');
                        console.log('   1. Ve a Google Cloud Console');
                        console.log('   2. Habilita "Maps SDK for Android"');
                        console.log('   3. Agrega restricción: com.felman.appfelmannative');
                        console.log('   4. Prueba cambiar tipo de mapa →');
                        
                        // Intentar forzar re-render del mapa
                        if (mapRef.current && location) {
                          console.log('🔄 Forzando animación del mapa...');
                          mapRef.current.animateToRegion({
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            latitudeDelta: 0.005, // Zoom más cercano
                            longitudeDelta: 0.005,
                          }, 1000);
                        }
                      }}
                    >
                      <Text style={styles.controlButtonText}>🔧</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* INFO DEL MAPA */}
                <View style={styles.mapInfo}>
                  <Text style={styles.mapInfoText}>
                    📊 Tipo: {mapType} | Zoom: {currentZoom} | Plataforma: {Platform.OS}
                  </Text>
                  {Platform.OS === 'android' && (
                    <Text style={styles.mapInfoText}>
                      �️ FONDO MARRÓN = Problema de API Key | Toca 🔧 para diagnóstico | Prueba cambiar tipo: {mapType}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </SafeAreaViewSA>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  mapContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f0f0', // Fondo visible para debug
  },
  mapTitle: {
    fontSize: 12,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 300, // Altura mínima garantizada
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e3f2fd', // Fondo azul para verificar que el contenedor existe
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'column',
    gap: 8,
    zIndex: 1000, // Asegurar que estén por encima del mapa
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 44,
    minHeight: 44,
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mapInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 6,
    zIndex: 1000, // Asegurar que esté por encima del mapa
  },
  mapInfoText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
