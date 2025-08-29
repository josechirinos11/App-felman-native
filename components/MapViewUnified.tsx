import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import MapDiagnostic from './MapDiagnostic';

// Singleton para react-native-maps para evitar múltiples registros
let RNMapsComponents: any = null;
let isLoadingMaps = false;

// Función singleton para cargar react-native-maps una sola vez
const loadReactNativeMaps = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (RNMapsComponents) {
      resolve(RNMapsComponents);
      return;
    }

    if (isLoadingMaps) {
      // Si ya se está cargando, esperar con timeout más largo
      const maxWait = 5000; // 5 segundos
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (RNMapsComponents) {
          clearInterval(checkInterval);
          resolve(RNMapsComponents);
        } else if (Date.now() - startTime > maxWait) {
          clearInterval(checkInterval);
          reject(new Error('Timeout cargando react-native-maps'));
        }
      }, 100);
      return;
    }

    isLoadingMaps = true;
    
    try {
      console.log('🗺️ Cargando react-native-maps (singleton)...');
      RNMapsComponents = require('react-native-maps');
      isLoadingMaps = false;
      console.log('✅ react-native-maps cargado exitosamente');
      resolve(RNMapsComponents);
    } catch (err) {
      isLoadingMaps = false;
      console.error('❌ Error cargando react-native-maps:', err);
      reject(err);
    }
  });
};

// Declaraciones de tipos para Google Maps
declare global {
  interface Window {
    google: any;
  }
}

// Tipos básicos de Google Maps
type GoogleMap = any;
type GoogleMarker = any;
type GooglePolyline = any;

// Tipos de datos
export interface VehicleFeature {
  id: string | number;
  lat: number;
  lng: number;
  heading?: number;
  state?: 'en_ruta' | 'detenido' | 'retraso';
  codigo: string;
  matricula: string;
}

export interface StopFeature {
  id: string;
  lat: number;
  lng: number;
  status?: 'PENDING' | 'DONE' | 'FAILED';
}

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// Props del componente
export interface MapViewUnifiedProps {
  initialRegion: Region;
  vehicles?: VehicleFeature[];
  routeCoordinates?: Array<{ latitude: number; longitude: number }>;
  stops?: StopFeature[];
  selectedVehicleId?: string | number | null;
  onVehiclePress?: (vehicleId: string | number) => void;
  onRegionChange?: (region: Region) => void;
  onMapReady?: () => void;
  apiKey?: string;
  style?: any;
}

// Ref methods
export interface MapViewUnifiedRef {
  animateToRegion: (region: Region, duration?: number) => void;
  fitToCoordinates: (coordinates: Array<{ latitude: number; longitude: number }>, options?: any) => void;
  getMapBounds: () => Promise<any>;
}

// Implementación para Android/iOS usando react-native-maps
const NativeMapView = forwardRef<MapViewUnifiedRef, MapViewUnifiedProps>((props, ref) => {
  const {
    initialRegion,
    vehicles = [],
    routeCoordinates = [],
    stops = [],
    selectedVehicleId,
    onVehiclePress,
    onRegionChange,
    onMapReady,
    style,
  } = props;

  const [mapReady, setMapReady] = useState(false);
  const [mapComponents, setMapComponents] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const mapRef = useRef<any>(null);

  // Cargar react-native-maps usando singleton
  useEffect(() => {
    const initMapComponents = async () => {
      try {
        setIsInitializing(true);
        console.log('🗺️ Iniciando carga de componentes nativos...');
        const components = await loadReactNativeMaps();
        setMapComponents(components);
        setIsInitializing(false);
        console.log('✅ Componentes nativos cargados exitosamente');
      } catch (err) {
        console.error('❌ Error cargando react-native-maps:', err);
        setError('react-native-maps no disponible');
        setIsInitializing(false);
      }
    };

    initMapComponents();
  }, []);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: Region, duration = 1000) => {
      console.log('🗺️ Native: Animando a región:', region);
      if (mapRef.current?.animateToRegion) {
        mapRef.current.animateToRegion(region, duration);
      }
    },
    fitToCoordinates: (coordinates: Array<{ latitude: number; longitude: number }>, options = {}) => {
      console.log('🗺️ Native: Ajustando a coordenadas:', coordinates.length);
      if (mapRef.current?.fitToCoordinates) {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
          ...options,
        });
      }
    },
    getMapBounds: async () => {
      try {
        return await mapRef.current?.getMapBoundaries?.();
      } catch {
        return null;
      }
    },
  }));

  const handleMapReady = () => {
    console.log('🗺️ Native: Mapa listo');
    setMapReady(true);
    setIsInitializing(false);
    onMapReady?.();
  };

  const handleRegionChangeComplete = (region: Region) => {
    console.log('🗺️ Native: Región cambiada:', region);
    onRegionChange?.(region);
  };

  const handleVehiclePress = (vehicleId: string | number) => {
    console.log('🗺️ Native: Vehículo presionado:', vehicleId);
    onVehiclePress?.(vehicleId);
  };

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>Instala react-native-maps para Android</Text>
        </View>
      </View>
    );
  }

  if (!mapComponents || isInitializing) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066FF" />
          <Text style={styles.loadingText}>Cargando mapa nativo...</Text>
        </View>
      </View>
    );
  }

  const { default: MapView, Marker, Polyline } = mapComponents;

  if (!MapView) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>MapView no disponible</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        key="native-map-view-stable" // Key estable para evitar re-inicializaciones
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onMapReady={handleMapReady}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={false}
        zoomEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
        mapType="standard"
        provider={null}
        loadingEnabled={true}
        loadingIndicatorColor="#0066FF"
        loadingBackgroundColor="#ffffff"
        // CONFIGURACIÓN SIMPLIFICADA PARA ANDROID
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        showsBuildings={false}
        showsIndoors={false}
        showsPointsOfInterest={false}
        showsTraffic={false}
        cacheEnabled={false}
        // REMOVER CONFIGURACIONES QUE PUEDEN CAUSAR PROBLEMAS
        maxZoomLevel={20}
        minZoomLevel={3}
      >
        {/* Marcadores de vehículos */}
        {vehicles.map((vehicle) => (
          <Marker
            key={`vehicle-${vehicle.id}`}
            coordinate={{
              latitude: vehicle.lat,
              longitude: vehicle.lng,
            }}
            title={vehicle.codigo}
            description={`${vehicle.matricula} - ${vehicle.state || 'Sin estado'}`}
            onPress={() => handleVehiclePress(vehicle.id)}
            pinColor={selectedVehicleId === vehicle.id ? '#FF0000' : '#0066FF'}
            rotation={vehicle.heading || 0}
          />
        ))}

        {/* Marcadores de paradas */}
        {stops.map((stop) => (
          <Marker
            key={`stop-${stop.id}`}
            coordinate={{
              latitude: stop.lat,
              longitude: stop.lng,
            }}
            title={`Parada ${stop.id}`}
            pinColor={
              stop.status === 'DONE' ? '#00FF00' :
              stop.status === 'FAILED' ? '#FF0000' : '#FFA500'
            }
          />
        ))}

        {/* Línea de ruta */}
        {routeCoordinates.length > 1 && Polyline && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#0066FF"
            strokeWidth={4}
            strokePattern={[10, 5]}
          />
        )}
      </MapView>
      
      {/* Overlay de carga mientras el mapa se inicializa */}
      {(!mapReady || isInitializing) && (
        <View style={styles.mapLoadingOverlay}>
          <ActivityIndicator size="large" color="#0066FF" />
          <Text style={styles.mapLoadingText}>Inicializando mapa...</Text>
        </View>
      )}
      
      {/* Diagnóstico de Maps en Debug - SIEMPRE VISIBLE EN ANDROID */}
      {Platform.OS === 'android' && (
        <MapDiagnostic apiKey="AIzaSyAEWw8B6utUMKBNmeou8EAovnWRGLxldGs" />
      )}
    </View>
  );
});

// Implementación para Web usando Google Maps JavaScript API
const WebMapView = forwardRef<MapViewUnifiedRef, MapViewUnifiedProps>((props, ref) => {
  const {
    initialRegion,
    vehicles = [],
    routeCoordinates = [],
    stops = [],
    selectedVehicleId,
    onVehiclePress,
    onRegionChange,
    onMapReady,
    apiKey,
    style,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const polylineRef = useRef<GooglePolyline | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: Region, duration = 1000) => {
      console.log('🗺️ Web: Animando a región:', region);
      if (mapRef.current) {
        mapRef.current.panTo({ lat: region.latitude, lng: region.longitude });
        mapRef.current.setZoom(14);
      }
    },
    fitToCoordinates: (coordinates: Array<{ latitude: number; longitude: number }>) => {
      console.log('🗺️ Web: Ajustando a coordenadas:', coordinates.length);
      if (mapRef.current && coordinates.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        coordinates.forEach(coord => {
          bounds.extend({ lat: coord.latitude, lng: coord.longitude });
        });
        mapRef.current.fitBounds(bounds);
      }
    },
    getMapBounds: async () => {
      if (mapRef.current) {
        const bounds = mapRef.current.getBounds();
        if (bounds) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          return {
            northEast: { latitude: ne.lat(), longitude: ne.lng() },
            southWest: { latitude: sw.lat(), longitude: sw.lng() },
          };
        }
      }
      return null;
    },
  }));

  // Cargar Google Maps API
  useEffect(() => {
    const loadGoogleMaps = () => {
      console.log('🗺️ Web: Iniciando carga de Google Maps...');
      
      if (!apiKey) {
        setError('Google Maps API Key requerida');
        return;
      }

      // Verificar si ya está cargado
      if (typeof window !== 'undefined' && window.google?.maps) {
        console.log('✅ Google Maps ya estaba cargado');
        initializeMap();
        return;
      }

      // Cargar script
      if (typeof window !== 'undefined') {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          console.log('✅ Google Maps script cargado');
          initializeMap();
        };
        
        script.onerror = () => {
          console.error('❌ Error cargando Google Maps');
          setError('Error cargando Google Maps');
        };
        
        document.head.appendChild(script);
      }
    };

    const initializeMap = () => {
      if (!containerRef.current || typeof window === 'undefined' || !window.google) {
        return;
      }

      try {
        console.log('🗺️ Web: Inicializando mapa...');
        
        const map = new window.google.maps.Map(containerRef.current, {
          center: {
            lat: initialRegion.latitude,
            lng: initialRegion.longitude,
          },
          zoom: 14,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          mapTypeControl: false,
          disableDefaultUI: false,
        });

        mapRef.current = map;

        // Listener para cambios de región
        map.addListener('idle', () => {
          const center = map.getCenter();
          const bounds = map.getBounds();
          if (center && bounds && onRegionChange) {
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            onRegionChange({
              latitude: center.lat(),
              longitude: center.lng(),
              latitudeDelta: ne.lat() - sw.lat(),
              longitudeDelta: ne.lng() - sw.lng(),
            });
          }
        });

        setIsLoaded(true);
        console.log('✅ Mapa web inicializado');
        onMapReady?.();
        
      } catch (err) {
        console.error('❌ Error inicializando mapa:', err);
        setError('Error creando mapa');
      }
    };

    loadGoogleMaps();

    return () => {
      // Cleanup
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [apiKey, initialRegion]);

  // Actualizar marcadores
  useEffect(() => {
    if (!mapRef.current || !isLoaded || typeof window === 'undefined' || !window.google) return;

    console.log('🗺️ Web: Actualizando marcadores...', vehicles.length, 'vehículos');

    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Crear marcadores de vehículos
    vehicles.forEach(vehicle => {
      const marker = new window.google.maps.Marker({
        position: { lat: vehicle.lat, lng: vehicle.lng },
        map: mapRef.current,
        title: `${vehicle.codigo} - ${vehicle.matricula}`,
        icon: {
          url: selectedVehicleId === vehicle.id ? 
            'http://maps.google.com/mapfiles/ms/icons/red-dot.png' :
            'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(32, 32),
        },
      });

      marker.addListener('click', () => {
        console.log('🗺️ Web: Vehículo clickeado:', vehicle.id);
        onVehiclePress?.(vehicle.id);
      });

      markersRef.current.push(marker);
    });

    // Crear marcadores de paradas
    stops.forEach(stop => {
      const marker = new window.google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: mapRef.current,
        title: `Parada ${stop.id}`,
        icon: {
          url: stop.status === 'DONE' ? 
            'http://maps.google.com/mapfiles/ms/icons/green-dot.png' :
            stop.status === 'FAILED' ?
            'http://maps.google.com/mapfiles/ms/icons/red-dot.png' :
            'http://maps.google.com/mapfiles/ms/icons/orange-dot.png',
          scaledSize: new window.google.maps.Size(24, 24),
        },
      });

      markersRef.current.push(marker);
    });

  }, [vehicles, stops, selectedVehicleId, onVehiclePress, isLoaded]);

  // Actualizar polyline de ruta
  useEffect(() => {
    if (!mapRef.current || !isLoaded || typeof window === 'undefined' || !window.google) return;

    // Limpiar polyline existente
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    // Crear nueva polyline si hay coordenadas
    if (routeCoordinates.length > 1) {
      console.log('🗺️ Web: Creando ruta con', routeCoordinates.length, 'puntos');
      
      const polyline = new window.google.maps.Polyline({
        path: routeCoordinates.map(coord => ({ lat: coord.latitude, lng: coord.longitude })),
        geodesic: true,
        strokeColor: '#0066FF',
        strokeOpacity: 1.0,
        strokeWeight: 4,
      });

      polyline.setMap(mapRef.current);
      polylineRef.current = polyline;
    }

  }, [routeCoordinates, isLoaded]);

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>Verifica tu API Key de Google Maps</Text>
        </View>
      </View>
    );
  }

  if (!isLoaded) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066FF" />
          <Text style={styles.loadingText}>Cargando Google Maps...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: 8,
          overflow: 'hidden',
        }} 
      />
    </View>
  );
});

// Componente principal que selecciona la implementación según la plataforma
const MapViewUnified = forwardRef<MapViewUnifiedRef, MapViewUnifiedProps>((props, ref) => {
  // Solo log inicial para evitar spam
  const hasLoggedRef = useRef(false);
  if (!hasLoggedRef.current) {
    console.log('🗺️ MapViewUnified inicializado - Plataforma:', Platform.OS);
    hasLoggedRef.current = true;
  }
  
  if (Platform.OS === 'web') {
    return <WebMapView {...props} ref={ref} />;
  }
  
  return <NativeMapView {...props} ref={ref} />;
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  mapLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

MapViewUnified.displayName = 'MapViewUnified';

export default MapViewUnified;
