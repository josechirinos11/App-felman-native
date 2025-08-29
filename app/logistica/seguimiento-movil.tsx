
// app/logistica/seguimiento-movil.tsx - Optimizado para móvil y web
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { LatLng, MapPressEvent, MapType, Marker, PROVIDER_GOOGLE, Polyline, Region } from 'react-native-maps';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';

// ================== INTERFACES ==================
type UserData = { nombre?: string; rol?: string; name?: string; role?: string };

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
    accuracy: Location.Accuracy.High, // Cambiado para mejor precisión en ubicación
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
    latitudeDelta: 0.01, // Aumentado para mejor vista inicial
    longitudeDelta: 0.01,
  },
  
  // Región por defecto para Valencia, España
  defaultRegion: {
    latitude: 39.4699, // Valencia, España
    longitude: -0.3763,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }
};

export default function SeguimientoMovilScreen() {
  // ================== STATES ==================
  const [userName, setUserName] = useState('—');
  const [userRole, setUserRole] = useState('—');
  const [userModalVisible, setUserModalVisible] = useState(false);
  
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  // Inicializar con región por defecto de Valencia
  const [currentRegion, setCurrentRegion] = useState<Region>(GOOGLE_MAPS_CONFIG.defaultRegion);
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
  const [isMapExpanded, setIsMapExpanded] = useState(false); // Estado para mapa expandido
  const [showDirectionsModal, setShowDirectionsModal] = useState(false); // Estado para modal de direcciones
  const [directionsList, setDirectionsList] = useState<any[]>([]); // Lista de direcciones (futuro fetch)
  
  // ================== REFS ==================
  const mapRef = useRef<MapView>(null);

  // ================== LOGGING UTILITIES ==================
  const formatTimestamp = useCallback(() => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }, []);

  const log = useCallback((level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    const timestamp = formatTimestamp();
    const prefix = `📱 [${Platform.OS.toUpperCase()}] [${level.toUpperCase()}] ${timestamp}`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }, [formatTimestamp]);

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
      
      // Intentar obtener la ubicación con timeout
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: GOOGLE_MAPS_CONFIG.locationConfig.accuracy,
      });
      
      // Timeout manual de 15 segundos
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout obteniendo ubicación')), 15000)
      );
      
      const location = await Promise.race([locationPromise, timeoutPromise]) as any;
      
      const userLoc: UserLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        heading: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
      };
      
      setUserLocation(userLoc);
      
      // Actualizar región con ubicación real del usuario
      const userRegion: Region = {
        latitude: userLoc.latitude,
        longitude: userLoc.longitude,
        ...GOOGLE_MAPS_CONFIG.regionConfig,
      };
      
      setCurrentRegion(userRegion);
      log('info', '🗺️ Región actualizada con ubicación del usuario:', userRegion);
      log('info', '✅ Ubicación obtenida exitosamente:', userLoc);
      
      // Centrar mapa en la ubicación del usuario
      if (mapRef.current && mapReady) {
        mapRef.current.animateToRegion(userRegion, 1000);
      }
      
      return userLoc;
      
    } catch (error) {
      log('warn', '⚠️ No se pudo obtener ubicación del usuario, usando Valencia por defecto:', error);
      // Mantener Valencia como región por defecto
      log('info', '🏙️ Usando Valencia, Venezuela como ubicación por defecto');
      return null;
    }
  }, [log, mapReady]); // Solo depende de log, no de currentRegion

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
          
          const timestamp = formatTimestamp();
          log('info', `📍 Ubicación actualizada [${timestamp}]:`, {
            lat: newLocation.latitude.toFixed(6),
            lng: newLocation.longitude.toFixed(6),
            accuracy: newLocation.accuracy ? `${newLocation.accuracy.toFixed(0)}m` : 'N/A',
            speed: newLocation.speed ? `${(newLocation.speed * 3.6).toFixed(1)} km/h` : 'N/A',
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
    const timestamp = formatTimestamp();
    log('info', `👆 Presión en mapa [${timestamp}]:`, coordinate);
    
    const newMarker: CustomMarker = {
      id: Date.now(),
      coordinate,
      title: `Punto ${markers.length + 1}`,
      description: `📍 Lat: ${coordinate.latitude.toFixed(6)}, Lng: ${coordinate.longitude.toFixed(6)}\n⏰ Creado: ${timestamp}`,
      type: 'custom',
      timestamp: Date.now(),
    };
    
    setMarkers(prev => [...prev, newMarker]);
    log('info', `📌 Nuevo marcador agregado [${timestamp}]:`, newMarker);
  }, [markers.length, log, formatTimestamp]);

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

  // Función para expandir/contraer el mapa
  const toggleMapExpanded = useCallback(() => {
    setIsMapExpanded(prev => !prev);
    log('info', isMapExpanded ? '📱 Contrayendo mapa' : '🗺️ Expandiendo mapa');
  }, [isMapExpanded, log]);

  // Función para mostrar/ocultar modal de direcciones
  const toggleDirectionsModal = useCallback(() => {
    setShowDirectionsModal(prev => !prev);
    log('info', showDirectionsModal ? '📋 Cerrando lista de direcciones' : '📋 Mostrando lista de direcciones');
  }, [showDirectionsModal, log]);

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

  // ================== USER DATA ==================
  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem('userData');
        const u: UserData | null = s ? JSON.parse(s) : null;
        setUserName(u?.nombre || u?.name || '—');
        setUserRole(u?.rol || u?.role || '—');
      } catch {}
    })();
  }, []);

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
        log('info', '🏙️ Región por defecto: Valencia, España');
        
        const hasPermissions = await requestLocationPermissions();
        if (!hasPermissions) {
          log('warn', '⚠️ Sin permisos de ubicación, usando región por defecto');
          setIsLoading(false);
          setIsInitialized(true);
          return;
        }
        
        // Intentar obtener ubicación real del usuario
        const userLocation = await getCurrentLocation();
        
        // Iniciar seguimiento solo si obtuvimos la ubicación
        if (userLocation) {
          await startLocationTracking();
          log('info', '✅ Seguimiento iniciado con ubicación real del usuario');
        } else {
          log('info', '📍 Continuando con región por defecto de Valencia, España');
        }
        
        setIsInitialized(true); // Marcar como inicializado
        setIsLoading(false);
        log('info', '✅ Inicialización completada exitosamente');
        
      } catch (error) {
        log('error', '💥 Error en inicialización:', error);
        log('info', '🔄 Continuando con configuración por defecto...');
        setIsInitialized(true);
        setIsLoading(false);
        // No mostrar alert, solo continuar con la región por defecto
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
      <SafeAreaProvider>
        <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066FF" />
            <Text style={styles.loadingText}>🚀 Inicializando seguimiento móvil...</Text>
            <Text style={styles.loadingSubtext}>Configurando GPS y permisos</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <SafeAreaProvider>
        <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
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
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
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

        <View style={[styles.mapContainer, isMapExpanded && styles.mapContainerExpanded]}>
          {currentRegion ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              mapType={GOOGLE_MAPS_CONFIG.mapConfig.mapType}
              initialRegion={currentRegion}
              showsUserLocation={GOOGLE_MAPS_CONFIG.mapConfig.showsUserLocation}
              showsMyLocationButton={true} // Habilitamos el botón de ubicación de Google Maps
              showsCompass={GOOGLE_MAPS_CONFIG.mapConfig.showsCompass}
              showsScale={GOOGLE_MAPS_CONFIG.mapConfig.showsScale}
              showsBuildings={GOOGLE_MAPS_CONFIG.mapConfig.showsBuildings}
              showsTraffic={GOOGLE_MAPS_CONFIG.mapConfig.showsTraffic}
              showsIndoors={GOOGLE_MAPS_CONFIG.mapConfig.showsIndoors}
              followsUserLocation={GOOGLE_MAPS_CONFIG.mapConfig.followsUserLocation}
              // Controles adicionales de Google Maps
              zoomEnabled={true}
              scrollEnabled={true}
              pitchEnabled={true}
              rotateEnabled={true}
              zoomTapEnabled={true}
              zoomControlEnabled={true} // Solo Android
              toolbarEnabled={true} // Solo Android
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
                  key="user-location"
                  coordinate={userLocation}
                  title="Mi Ubicación"
                  description={`📱 ${Platform.OS} - Precisión: ${userLocation.accuracy?.toFixed(0) || 'N/A'}m\n⏰ Actualizado: ${formatTimestamp()}`}
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
                  key="tracking-path"
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

          {/* Controles personalizados en esquina superior izquierda */}
          <View style={styles.customControlsLeft}>
            {/* Botón para expandir/contraer mapa */}
            <TouchableOpacity 
              style={[styles.customControlButton, isMapExpanded ? styles.customControlButtonActive : null]} 
              onPress={toggleMapExpanded}
            >
              <MaterialIcons 
                name={isMapExpanded ? "fullscreen-exit" : "fullscreen"} 
                size={24} 
                color={isMapExpanded ? "white" : "#333"} 
              />
            </TouchableOpacity>

            {/* Botón para mostrar lista de direcciones */}
            <TouchableOpacity 
              style={styles.customControlButton} 
              onPress={toggleDirectionsModal}
            >
              <MaterialIcons name="list" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Panel de información */}
        <View style={[styles.infoPanel, isMapExpanded && styles.hiddenPanel]}>
          <Text style={styles.infoPanelTitle}>📱 Estado del Seguimiento</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📍 Ubicación:</Text>
            <Text style={styles.infoValue}>{userLocation ? '✅ Activa' : '❌ No disponible'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🎯 Seguimiento:</Text>
            <Text style={styles.infoValue}>{isTracking ? '✅ Activo' : '⏸️ Pausado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📌 Marcadores:</Text>
            <Text style={styles.infoValue}>{markers.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🛤️ Puntos de ruta:</Text>
            <Text style={styles.infoValue}>{trackingPath.length}</Text>
          </View>
          {userLocation && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📐 Precisión:</Text>
                <Text style={styles.infoValue}>{userLocation.accuracy?.toFixed(0) || 'N/A'}m</Text>
              </View>
              {userLocation.speed !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>🚀 Velocidad:</Text>
                  <Text style={styles.infoValue}>{(userLocation.speed * 3.6).toFixed(1)} km/h</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>⏰ Última actualización:</Text>
                <Text style={styles.infoValue}>{formatTimestamp()}</Text>
              </View>
            </>
          )}
        </View>

        {/* Modal de direcciones */}
        <Modal
          visible={showDirectionsModal}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setShowDirectionsModal(false)}
        >
          <SafeAreaProvider>
            <SafeAreaView edges={['top', 'bottom']} style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📍 Lista de Direcciones</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowDirectionsModal(false)}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalContent}>
                {directionsList.length > 0 ? (
                  <FlatList
                    data={directionsList}
                    keyExtractor={(item, index) => `direction-${index}`}
                    renderItem={({ item, index }) => (
                      <View style={styles.directionItem}>
                        <Text style={styles.directionIndex}>{index + 1}</Text>
                        <Text style={styles.directionText}>{item.address || 'Dirección no disponible'}</Text>
                      </View>
                    )}
                    showsVerticalScrollIndicator={false}
                  />
                ) : (
                  <View style={styles.emptyDirections}>
                    <MaterialIcons name="location-off" size={48} color="#ccc" />
                    <Text style={styles.emptyDirectionsText}>No hay direcciones disponibles</Text>
                    <Text style={styles.emptyDirectionsSubtext}>
                      Las direcciones se cargarán automáticamente desde el servidor
                    </Text>
                  </View>
                )}
              </View>
            </SafeAreaView>
          </SafeAreaProvider>
        </Modal>

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
    </SafeAreaProvider>
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
  
  // Estilos para botones personalizados en esquina superior izquierda
  customControlsLeft: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'column',
    gap: 10,
    zIndex: 1,
  },
  customControlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
  },
  customControlButtonActive: {
    backgroundColor: '#0066FF',
    borderColor: '#0066FF',
  },
  expandedActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },

  // Estilos para mapa expandido
  mapContainerExpanded: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: '#fff',
  },
  hiddenPanel: {
    display: 'none',
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 2,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
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

  // Panel de información
  addressModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  addressModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  addressModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  addressModalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  addressList: {
    maxHeight: '70%',
  },
  addressItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addressItemLast: {
    borderBottomWidth: 0,
  },
  addressItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  addressItemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  addressEmptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressEmptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },

  // Estilos para modal en pantalla completa
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  directionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  directionIndex: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066FF',
    marginRight: 15,
    minWidth: 25,
    textAlign: 'center',
  },
  directionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  emptyDirections: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyDirectionsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyDirectionsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
