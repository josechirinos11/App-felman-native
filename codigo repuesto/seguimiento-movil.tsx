
// app/logistica/seguimiento-movil.tsx - Optimizado para móvil y web
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { LatLng, MapPressEvent, MapType, Marker, PROVIDER_GOOGLE, Polyline, Region } from 'react-native-maps';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';

// ================== INTERFACES ==================
interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

interface CustomMarker {
  id: number;
  coordinate: LatLng;
  title: string;
  description: string;
  type: 'custom' | 'location' | 'waypoint';
  timestamp: number;
}

interface RoutePolyline {
  coordinates: LatLng[];
  color: string;
  strokeWidth: number;
}

// ================== CONFIGURACIÓN ==================
const GOOGLE_MAPS_CONFIG = {
  // API Key para móvil (Android/iOS) - ya configurada en app.config.js
  mobileApiKey: "AIzaSyAEWw8B6utUMKBNmeou8EAovnWRGLxldGs",
  // API Key para web - diferente de la móvil
  webApiKey: "AIzaSyAtdufUHs9jULLbARMm38OLQH6Y0D049QU",
  
  // Configuración de ubicación
  locationConfig: {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 5000, // 5 segundos
    distanceInterval: 10, // 10 metros
  },
  
  // Configuración de mapa
  mapConfig: {
    provider: PROVIDER_GOOGLE,
    mapType: 'hybrid' as MapType, // 'standard', 'satellite', 'hybrid', 'terrain'
    showsUserLocation: true,
    showsMyLocationButton: false, // Usaremos botón personalizado
    showsCompass: true,
    showsScale: true,
    showsBuildings: true,
    showsTraffic: false,
    showsIndoors: true,
    followsUserLocation: false, // Controlado manualmente
  },
  
  // Configuración de región
  regionConfig: {
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  }
};

export default function SeguimientoMovilScreen() {
  // ================== STATES ==================
  const [userName, setUserName] = useState('Usuario Móvil');
  const [userRole, setUserRole] = useState('Operador Logística');
  const [userModalVisible, setUserModalVisible] = useState(false);
  
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [markers, setMarkers] = useState<CustomMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<CustomMarker | null>(null);
  const [routePolylines, setRoutePolylines] = useState<RoutePolyline[]>([]);
  const [trackingPath, setTrackingPath] = useState<LatLng[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // Prevenir re-inicializaciones
  
  // ================== REFS ==================
  const mapRef = useRef<MapView>(null);

  // ================== LOGGING UTILITIES ==================
  const log = useCallback((level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const prefix = `📱 [${Platform.OS.toUpperCase()}] [${level.toUpperCase()}] ${timestamp}`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }, []);

  // ================== LOCATION FUNCTIONS ==================
  const requestLocationPermissions = useCallback(async () => {
    try {
      log('info', '🔑 Solicitando permisos de ubicación...');
      
      // Verificar permisos actuales
      const currentPermissions = await Location.getForegroundPermissionsAsync();
      log('info', '📋 Permisos actuales:', currentPermissions);
      
      if (currentPermissions.status !== 'granted') {
        const requestResult = await Location.requestForegroundPermissionsAsync();
        log('info', '📝 Resultado de solicitud:', requestResult);
        
        if (requestResult.status !== 'granted') {
          setPermissionStatus('denied');
          log('error', '❌ Permisos de ubicación denegados');
          Alert.alert(
            'Permisos Requeridos',
            'La aplicación necesita acceso a la ubicación para funcionar correctamente.',
            [{ text: 'OK' }]
          );
          return false;
        }
      }
      
      // Solicitar permisos de background si es necesario
      if (Platform.OS === 'android') {
        const backgroundPermissions = await Location.requestBackgroundPermissionsAsync();
        log('info', '🔄 Permisos background:', backgroundPermissions);
      }
      
      setPermissionStatus('granted');
      log('info', '✅ Permisos de ubicación concedidos');
      return true;
      
    } catch (error) {
      log('error', '💥 Error solicitando permisos:', error);
      setPermissionStatus('denied');
      return false;
    }
  }, [log]);

  const getCurrentLocation = useCallback(async () => {
    try {
      log('info', '📍 Obteniendo ubicación actual...');
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: GOOGLE_MAPS_CONFIG.locationConfig.accuracy,
      });
      
      const userLoc: UserLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        heading: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
      };
      
      setUserLocation(userLoc);
      
      // Configurar región inicial SOLO si no existe
      setCurrentRegion(prev => {
        if (!prev) {
          const initialRegion: Region = {
            latitude: userLoc.latitude,
            longitude: userLoc.longitude,
            ...GOOGLE_MAPS_CONFIG.regionConfig,
          };
          log('info', '🗺️ Región inicial configurada:', initialRegion);
          return initialRegion;
        }
        return prev; // No cambiar si ya existe
      });
      
      log('info', '✅ Ubicación obtenida exitosamente:', userLoc);
      return userLoc;
      
    } catch (error) {
      log('error', '💥 Error obteniendo ubicación:', error);
      throw error;
    }
  }, [log]); // Solo depende de log, no de currentRegion

  const startLocationTracking = useCallback(async () => {
    try {
      log('info', '🎯 Iniciando seguimiento de ubicación...');
      
      // Detener seguimiento anterior si existe
      if (locationSubscription) {
        locationSubscription.remove();
      }
      
      let lastUpdateTime = 0;
      
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: GOOGLE_MAPS_CONFIG.locationConfig.accuracy,
          timeInterval: GOOGLE_MAPS_CONFIG.locationConfig.timeInterval,
          distanceInterval: GOOGLE_MAPS_CONFIG.locationConfig.distanceInterval,
        },
        (location) => {
          // Throttling: solo actualizar cada 3 segundos para evitar spam
          const now = Date.now();
          if (now - lastUpdateTime < 3000) {
            return;
          }
          lastUpdateTime = now;
          
          const newLocation: UserLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            heading: location.coords.heading || undefined,
            speed: location.coords.speed || undefined,
          };
          
          setUserLocation(newLocation);
          
          // Agregar a la ruta de seguimiento con limite máximo
          const newCoordinate: LatLng = {
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
          };
          
          setTrackingPath(prev => {
            const newPath = [...prev, newCoordinate];
            // Limitar a máximo 100 puntos para evitar memory leaks
            return newPath.length > 100 ? newPath.slice(-100) : newPath;
          });
          
          log('info', '📍 Ubicación actualizada:', {
            lat: newLocation.latitude,
            lng: newLocation.longitude,
            accuracy: newLocation.accuracy,
            speed: newLocation.speed,
          });
        }
      );
      
      setLocationSubscription(subscription);
      setIsTracking(true);
      log('info', '✅ Seguimiento de ubicación iniciado');
      
    } catch (error) {
      log('error', '💥 Error iniciando seguimiento:', error);
      throw error;
    }
  }, [locationSubscription, log]);

  const stopLocationTracking = useCallback(() => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
      setIsTracking(false);
      log('info', '⏹️ Seguimiento de ubicación detenido');
    }
  }, [locationSubscription, log]);

  // ================== MAP FUNCTIONS ==================
  const centerMapOnUser = useCallback(() => {
    if (userLocation && mapRef.current && mapReady) {
      const region: Region = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        ...GOOGLE_MAPS_CONFIG.regionConfig,
      };
      
      mapRef.current.animateToRegion(region, 1000);
      setCurrentRegion(region);
      log('info', '🎯 Mapa centrado en usuario:', region);
    }
  }, [userLocation, mapReady, log]);

  const handleMapPress = useCallback((event: MapPressEvent) => {
    const coordinate = event.nativeEvent.coordinate;
    log('info', '👆 Presión en mapa:', coordinate);
    
    const newMarker: CustomMarker = {
      id: Date.now(),
      coordinate,
      title: `Punto ${markers.length + 1}`,
      description: `📍 Lat: ${coordinate.latitude.toFixed(6)}, Lng: ${coordinate.longitude.toFixed(6)}`,
      type: 'custom',
      timestamp: Date.now(),
    };
    
    setMarkers(prev => [...prev, newMarker]);
    log('info', '📌 Nuevo marcador agregado:', newMarker);
  }, [markers.length, log]);

  const removeMarker = useCallback((markerId: number) => {
    setMarkers(prev => prev.filter(marker => marker.id !== markerId));
    setSelectedMarker(null);
    log('info', '🗑️ Marcador eliminado:', markerId);
  }, [log]);

  const clearAllMarkers = useCallback(() => {
    setMarkers([]);
    setSelectedMarker(null);
    log('info', '🧹 Todos los marcadores eliminados');
  }, [log]);
  const clearTrackingPath = useCallback(() => {
    setTrackingPath([]);
    log('info', '🧹 Ruta de seguimiento limpiada');
  }, [log]);

  // Función de refresh segura - no re-inicializa todo
  const refreshLocation = useCallback(async () => {
    try {
      log('info', '🔄 Refrescando ubicación...');
      await getCurrentLocation();
      log('info', '✅ Ubicación refrescada');
    } catch (error) {
      log('error', '💥 Error refrescando ubicación:', error);
    }
  }, [getCurrentLocation, log]);

  // ================== INITIALIZATION ==================
  useEffect(() => {
    // Prevenir múltiples inicializaciones
    if (isInitialized) {
      log('info', '⏭️ Ya inicializado, saltando...');
      return;
    }

    const initializeLocation = async () => {
      try {
        log('info', '🚀 Inicializando seguimiento móvil...');
        log('info', '📱 Plataforma detectada:', Platform.OS);
        log('info', '🔑 API Key móvil configurada:', GOOGLE_MAPS_CONFIG.mobileApiKey);
        log('info', '⚙️ Configuración de mapa:', GOOGLE_MAPS_CONFIG.mapConfig);
        
        const hasPermissions = await requestLocationPermissions();
        if (!hasPermissions) {
          setIsLoading(false);
          return;
        }
        
        await getCurrentLocation();
        await startLocationTracking();
        
        setIsInitialized(true); // Marcar como inicializado
        setIsLoading(false);
        log('info', '✅ Inicialización completada exitosamente');
        
      } catch (error) {
        log('error', '💥 Error en inicialización:', error);
        setIsLoading(false);
        Alert.alert(
          'Error de Inicialización',
          'No se pudo inicializar el seguimiento de ubicación. Verifique sus permisos.',
          [{ text: 'OK' }]
        );
      }
    };
    
    initializeLocation();
    
    // Cleanup
    return () => {
      stopLocationTracking();
    };
  }, []); // Array vacío - solo ejecutar una vez

  // ================== RENDER ==================
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066FF" />
          <Text style={styles.loadingText}>🚀 Inicializando seguimiento móvil...</Text>
          <Text style={styles.loadingSubtext}>Configurando GPS y permisos</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ Permisos de ubicación requeridos</Text>
          <Text style={styles.errorSubtext}>
            Para usar el seguimiento móvil, debe conceder permisos de ubicación.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setIsLoading(true);
              setPermissionStatus('loading');
            }}
          >
            <Text style={styles.retryButtonText}>🔄 Solicitar Permisos</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <AppHeader
          titleOverride={`📱 Seguimiento Móvil (${Platform.OS})`}
          count={markers.length}
          userNameProp={userName}
          roleProp={userRole}
          serverReachableOverride={true}
          onRefresh={refreshLocation}
          onUserPress={() => setUserModalVisible(true)}
        />

        <ModalHeader
          visible={userModalVisible}
          userName={userName}
          role={userRole}
          onClose={() => setUserModalVisible(false)}
        />

        <View style={styles.mapContainer}>
          {currentRegion ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              mapType={GOOGLE_MAPS_CONFIG.mapConfig.mapType}
              initialRegion={currentRegion}
              showsUserLocation={GOOGLE_MAPS_CONFIG.mapConfig.showsUserLocation}
              showsMyLocationButton={GOOGLE_MAPS_CONFIG.mapConfig.showsMyLocationButton}
              showsCompass={GOOGLE_MAPS_CONFIG.mapConfig.showsCompass}
              showsScale={GOOGLE_MAPS_CONFIG.mapConfig.showsScale}
              showsBuildings={GOOGLE_MAPS_CONFIG.mapConfig.showsBuildings}
              showsTraffic={GOOGLE_MAPS_CONFIG.mapConfig.showsTraffic}
              showsIndoors={GOOGLE_MAPS_CONFIG.mapConfig.showsIndoors}
              followsUserLocation={GOOGLE_MAPS_CONFIG.mapConfig.followsUserLocation}
              onPress={handleMapPress}
              onMapReady={() => {
                setMapReady(true);
                log('info', '🗺️ Mapa listo para interacción');
              }}
              onRegionChangeComplete={(region) => {
                setCurrentRegion(region);
              }}
            >
              {/* Marcador de usuario */}
              {userLocation && (
                <Marker
                  coordinate={userLocation}
                  title="Mi Ubicación"
                  description={`📱 ${Platform.OS} - Precisión: ${userLocation.accuracy?.toFixed(0)}m`}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={styles.userMarkerContainer}>
                    <MaterialIcons name="my-location" size={24} color="#0066FF" />
                    <View style={styles.userMarkerPulse} />
                  </View>
                </Marker>
              )}

              {/* Marcadores personalizados */}
              {markers.map((marker) => (
                <Marker
                  key={marker.id}
                  coordinate={marker.coordinate}
                  title={marker.title}
                  description={marker.description}
                  onPress={() => setSelectedMarker(marker)}
                >
                  <View style={styles.customMarkerContainer}>
                    <MaterialIcons 
                      name={marker.type === 'waypoint' ? 'flag' : 'place'} 
                      size={30} 
                      color={marker.type === 'waypoint' ? '#FF6B35' : '#FF3B30'} 
                    />
                  </View>
                </Marker>
              ))}

              {/* Ruta de seguimiento */}
              {trackingPath.length > 1 && (
                <Polyline
                  coordinates={trackingPath}
                  strokeColor="#0066FF"
                  strokeWidth={3}
                />
              )}

              {/* Polylines adicionales */}
              {routePolylines.map((polyline, index) => (
                <Polyline
                  key={index}
                  coordinates={polyline.coordinates}
                  strokeColor={polyline.color}
                  strokeWidth={polyline.strokeWidth}
                />
              ))}
            </MapView>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066FF" />
              <Text style={styles.loadingText}>🗺️ Configurando mapa...</Text>
            </View>
          )}

          {/* Controles de mapa */}
          <View style={styles.mapControls}>
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={centerMapOnUser}
            >
              <MaterialIcons name="my-location" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, isTracking ? styles.trackingActive : null]} 
              onPress={isTracking ? stopLocationTracking : startLocationTracking}
            >
              <MaterialIcons 
                name={isTracking ? "pause" : "play-arrow"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={clearAllMarkers}
            >
              <MaterialIcons name="clear-all" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={clearTrackingPath}
            >
              <MaterialIcons name="timeline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Panel de información */}
        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelTitle}>📱 Estado del Seguimiento</Text>
          <Text style={styles.infoPanelText}>
            📍 Ubicación: {userLocation ? '✅ Activa' : '❌ No disponible'}
          </Text>
          <Text style={styles.infoPanelText}>
            🎯 Seguimiento: {isTracking ? '✅ Activo' : '⏸️ Pausado'}
          </Text>
          <Text style={styles.infoPanelText}>
            📌 Marcadores: {markers.length}
          </Text>
          <Text style={styles.infoPanelText}>
            🛤️ Puntos de ruta: {trackingPath.length}
          </Text>
          {userLocation && (
            <>
              <Text style={styles.infoPanelText}>
                📐 Precisión: {userLocation.accuracy?.toFixed(0) || 'N/A'}m
              </Text>
              {userLocation.speed !== undefined && (
                <Text style={styles.infoPanelText}>
                  🚀 Velocidad: {(userLocation.speed * 3.6).toFixed(1)} km/h
                </Text>
              )}
            </>
          )}
        </View>

        {/* Modal para marcador seleccionado */}
        {selectedMarker && (
          <View style={styles.markerModal}>
            <Text style={styles.markerModalTitle}>{selectedMarker.title}</Text>
            <Text style={styles.markerModalDescription}>{selectedMarker.description}</Text>
            <View style={styles.markerModalButtons}>
              <TouchableOpacity
                style={styles.markerModalButton}
                onPress={() => removeMarker(selectedMarker.id)}
              >
                <Text style={styles.buttonText}>🗑️ Eliminar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.markerModalButton}
                onPress={() => setSelectedMarker(null)}
              >
                <Text style={styles.buttonText}>❌ Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mapContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Marcadores
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 102, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#0066FF',
  },
  customMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  
  // Controles de mapa
  mapControls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    gap: 10,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 2,
    borderColor: '#0066FF',
    padding: 12,
    borderRadius: 50,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  trackingActive: {
    backgroundColor: '#0066FF',
    borderColor: '#fff',
  },
  
  // Panel de información
  infoPanel: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  infoPanelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoPanelText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  
  // Modal de marcador
  markerModal: {
    position: 'absolute',
    bottom: 100,
    left: 10,
    right: 10,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  markerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  markerModalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  markerModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  markerModalButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
