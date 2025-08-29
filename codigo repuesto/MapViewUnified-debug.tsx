import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

// Declaraciones de tipos para Google Maps Web
declare global {
  interface Window {
    google: any;
  }
}

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
  stops?: any[];
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
}

// Implementación simplificada para Android/iOS
const SimpleNativeMapView = forwardRef<MapViewUnifiedRef, MapViewUnifiedProps>((props, ref) => {
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapComponents, setMapComponents] = useState<any>(null);
  const mapRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: Region, duration = 1000) => {
      console.log('🗺️ Debug: Animando a región:', region);
      if (mapRef.current?.animateToRegion) {
        mapRef.current.animateToRegion(region, duration);
      }
    },
    fitToCoordinates: (coordinates: Array<{ latitude: number; longitude: number }>, options = {}) => {
      console.log('🗺️ Debug: Ajustando a coordenadas:', coordinates.length);
      if (mapRef.current?.fitToCoordinates) {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
          ...options,
        });
      }
    },
  }));

  // Carga simplificada de react-native-maps
  useEffect(() => {
    const loadMap = async () => {
      console.log('🗺️ Debug: Iniciando carga simple de mapa...');
      
      try {
        // Delay para simular carga
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const maps = require('react-native-maps');
        console.log('🗺️ Debug: react-native-maps requerido:', !!maps);
        console.log('🗺️ Debug: MapView disponible:', !!maps.default);
        console.log('🗺️ Debug: Marker disponible:', !!maps.Marker);
        
        setMapComponents(maps);
        setLoading(false);
        
        // Simular mapa listo después de un poco más de tiempo
        setTimeout(() => {
          console.log('🗺️ Debug: Mapa simulado como listo');
          onMapReady?.();
        }, 500);
        
      } catch (err) {
        console.error('🗺️ Debug: Error cargando mapa:', err);
        setError(`Error: ${err}`);
        setLoading(false);
      }
    };

    loadMap();
  }, [onMapReady]);

  const handleMapReady = () => {
    console.log('🗺️ Debug: handleMapReady llamado');
    onMapReady?.();
  };

  const handleRegionChange = (region: Region) => {
    console.log('🗺️ Debug: Región cambió:', region);
    onRegionChange?.(region);
  };

  const handleVehiclePress = (vehicleId: string | number) => {
    console.log('🗺️ Debug: Vehículo presionado:', vehicleId);
    onVehiclePress?.(vehicleId);
  };

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error de Mapa</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      </View>
    );
  }

  if (loading || !mapComponents) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066FF" />
          <Text style={styles.loadingText}>Cargando mapa de debug...</Text>
          <Text style={styles.debugText}>
            Datos: {vehicles.length} vehículos{'\n'}
            Región: {initialRegion.latitude.toFixed(4)}, {initialRegion.longitude.toFixed(4)}
          </Text>
        </View>
      </View>
    );
  }

  const { default: MapView, Marker } = mapComponents;

  if (!MapView) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>MapView no disponible</Text>
          <Text style={styles.errorSubtext}>Componente MapView no encontrado</Text>
        </View>
      </View>
    );
  }

  console.log('🗺️ Debug: Renderizando MapView con', vehicles.length, 'vehículos');

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onMapReady={handleMapReady}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation={true}
        showsMyLocationButton={true}
        zoomEnabled={true}
        scrollEnabled={true}
        provider={Platform.OS === 'android' ? 'google' : undefined}
        loadingEnabled={true}
        loadingIndicatorColor="#0066FF"
      >
        {vehicles.map((vehicle) => (
          <Marker
            key={`vehicle-${vehicle.id}`}
            coordinate={{
              latitude: vehicle.lat,
              longitude: vehicle.lng,
            }}
            title={vehicle.codigo}
            description={vehicle.matricula}
            onPress={() => handleVehiclePress(vehicle.id)}
            pinColor={selectedVehicleId === vehicle.id ? '#FF0000' : '#0066FF'}
          />
        ))}
      </MapView>
      
      {/* Info overlay */}
      <View style={styles.debugOverlay}>
        <Text style={styles.debugInfo}>
          Debug: {vehicles.length}v | {Platform.OS}
        </Text>
      </View>
    </View>
  );
});

// Implementación simple para Web
const SimpleWebMapView = forwardRef<MapViewUnifiedRef, MapViewUnifiedProps>((props, ref) => {
  const {
    initialRegion,
    vehicles = [],
    selectedVehicleId,
    onVehiclePress,
    onRegionChange,
    onMapReady,
    apiKey,
    style,
  } = props;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region) => {
      console.log('🗺️ Debug Web: Animando a región:', region);
      if (mapRef.current) {
        mapRef.current.panTo({ lat: region.latitude, lng: region.longitude });
        mapRef.current.setZoom(14);
      }
    },
    fitToCoordinates: (coordinates) => {
      console.log('🗺️ Debug Web: Ajustando a coordenadas:', coordinates.length);
      if (mapRef.current && coordinates.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        coordinates.forEach(coord => {
          bounds.extend({ lat: coord.latitude, lng: coord.longitude });
        });
        mapRef.current.fitBounds(bounds);
      }
    },
  }));

  useEffect(() => {
    const loadGoogleMapsWeb = async () => {
      console.log('🗺️ Debug Web: Iniciando carga de Google Maps...');
      
      try {
        if (!apiKey) {
          setError('API Key requerida para web');
          setLoading(false);
          return;
        }

        // Verificar si ya está cargado
        if (typeof window !== 'undefined' && window.google?.maps) {
          console.log('🗺️ Debug Web: Google Maps ya cargado');
          initializeMap();
          return;
        }

        // Cargar script de Google Maps
        if (typeof window !== 'undefined') {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
          script.async = true;
          script.defer = true;
          
          script.onload = () => {
            console.log('🗺️ Debug Web: Script de Google Maps cargado');
            initializeMap();
          };
          
          script.onerror = () => {
            console.error('🗺️ Debug Web: Error cargando Google Maps');
            setError('Error cargando Google Maps');
            setLoading(false);
          };
          
          document.head.appendChild(script);
        }
      } catch (err) {
        console.error('🗺️ Debug Web: Error general:', err);
        setError(`Error: ${err}`);
        setLoading(false);
      }
    };

    const initializeMap = () => {
      if (!containerRef.current || typeof window === 'undefined' || !window.google) {
        return;
      }

      try {
        console.log('🗺️ Debug Web: Inicializando mapa...');
        
        const map = new window.google.maps.Map(containerRef.current, {
          center: {
            lat: initialRegion.latitude,
            lng: initialRegion.longitude,
          },
          zoom: 14,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        });

        mapRef.current = map;

        // Crear marcadores
        vehicles.forEach(vehicle => {
          const marker = new window.google.maps.Marker({
            position: { lat: vehicle.lat, lng: vehicle.lng },
            map: map,
            title: `${vehicle.codigo} - ${vehicle.matricula}`,
            icon: {
              url: selectedVehicleId === vehicle.id ? 
                'http://maps.google.com/mapfiles/ms/icons/red-dot.png' :
                'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              scaledSize: new window.google.maps.Size(32, 32),
            },
          });

          marker.addListener('click', () => {
            console.log('🗺️ Debug Web: Vehículo clickeado:', vehicle.id);
            onVehiclePress?.(vehicle.id);
          });
        });

        setLoading(false);
        console.log('🗺️ Debug Web: Mapa inicializado correctamente');
        onMapReady?.();
        
      } catch (err) {
        console.error('🗺️ Debug Web: Error inicializando mapa:', err);
        setError(`Error inicializando: ${err}`);
        setLoading(false);
      }
    };

    loadGoogleMapsWeb();
  }, [apiKey, initialRegion, vehicles, selectedVehicleId, onVehiclePress, onMapReady]);

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error Web Maps</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066FF" />
          <Text style={styles.loadingText}>Cargando Google Maps...</Text>
          <Text style={styles.debugText}>
            Datos: {vehicles.length} vehículos{'\n'}
            API Key: {apiKey ? 'Configurada' : 'No disponible'}
          </Text>
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
      
      {/* Info overlay */}
      <View style={styles.debugOverlay}>
        <Text style={styles.debugInfo}>
          Debug Web: {vehicles.length}v | Google Maps
        </Text>
      </View>
    </View>
  );
});

// Componente principal para debug
const MapViewUnifiedDebug = forwardRef<MapViewUnifiedRef, MapViewUnifiedProps>((props, ref) => {
  console.log('🗺️ MapViewUnifiedDebug - Plataforma:', Platform.OS);
  
  if (Platform.OS === 'web') {
    return <SimpleWebMapView {...props} ref={ref} />;
  }
  
  return <SimpleNativeMapView {...props} ref={ref} />;
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
  debugText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
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
  debugOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 5,
    borderRadius: 5,
  },
  debugInfo: {
    color: 'white',
    fontSize: 10,
  },
});

MapViewUnifiedDebug.displayName = 'MapViewUnifiedDebug';

export default MapViewUnifiedDebug;
