import { Loader } from '@googlemaps/js-api-loader'; // Asegúrate de instalar: npm install @googlemaps/js-api-loader
import * as React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  type ViewStyle,
} from 'react-native';

// Type declarations for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

// Common types
type LatLng = {
  latitude: number;
  longitude: number;
};

type Region = LatLng & {
  latitudeDelta: number;
  longitudeDelta: number;
};

type LatLngLiteral = {
  lat: number;
  lng: number;
};

type LatLngType = LatLng | LatLngLiteral;

// Type guard y normalizer
const isLatLng = (coord: LatLngType): coord is LatLng => {
  return (coord as LatLng).latitude !== undefined;
};

const normalizeLatLng = (coord: LatLngType): { lat: number; lng: number } => {
  return isLatLng(coord)
    ? { lat: coord.latitude, lng: coord.longitude }
    : coord;
};

// Data types (unificados a lat/lng directo)
type VehicleFeature = {
  id: string | number;
  lat: number;
  lng: number;
  heading?: number;
  state?: 'en_ruta' | 'detenido' | 'retraso';
  codigo: string;
  matricula: string;
};

type StopFeature = {
  id: string;
  name?: string;
  lat: number;
  lng: number;
  status?: 'PENDING' | 'DONE' | 'FAILED';
};

// Component API types
type MapViewUnifiedRef = {
  animateToRegion: (region: Region, duration?: number) => void;
  fitToCoordinates: (coordinates: LatLng[], options?: { padding?: number }) => void;
  getMapBounds: () => Promise<{
    northEast: LatLng;
    southWest: LatLng;
  } | null>;
};

type MapViewUnifiedProps = {
  height?: DimensionValue;
  initialRegion: Region;
  vehicles?: VehicleFeature[];
  routeCoordinates?: LatLng[];
  stops?: StopFeature[];
  selectedVehicleId?: string | number | null;
  onVehiclePress?: (vehicleId: string | number) => void;
  onRegionChange?: (region: Region) => void;
  onMapReady?: () => void;
  apiKey?: string;
  style?: ViewStyle;
};

// Import conditional para native - Añadido try-catch extra para evitar leaks en web
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;

if (Platform.OS !== 'web') {
  try {
    const RNMaps = require('react-native-maps');
    MapView = RNMaps.default || RNMaps.MapView;
    Marker = RNMaps.Marker;
    Polyline = RNMaps.Polyline;
  } catch (error) {
    console.warn('react-native-maps no está disponible:', error);
  }
}

// Helper para color
const getVehicleColor = (state?: string): string => {
  switch (state?.toUpperCase()) {
    case 'DETENIDO':
      return '#f59e0b';
    case 'RETRASO':
      return '#ef4444';
    case 'EN_RUTA':
      return '#10b981';
    default:
      return '#10b981';
  }
};

// Componente principal
const MapViewUnified = React.forwardRef<MapViewUnifiedRef, MapViewUnifiedProps>(
  (props, ref) => {
    const {
      height = '100%',
      initialRegion,
      vehicles = [],
      routeCoordinates = [],
      stops = [],
      selectedVehicleId = null,
      onVehiclePress,
      onRegionChange,
      onMapReady: onMapReadyProp,
      apiKey,
      style,
    } = props;

    const [mapReady, setMapReady] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [hasError, setHasError] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState('');
    const mapRef = React.useRef<any>(null);
    const containerRef = React.useRef<View>(null);
    const isWeb = Platform.OS === 'web';

       const initializedRef = React.useRef(false);

    const handleMapReady = React.useCallback(() => {
      setMapReady(true);
      onMapReadyProp?.();
    }, [onMapReadyProp]);

    const handleRegionChange = React.useCallback(
      (region: Region) => {
        onRegionChange?.(region);
      },
      [onRegionChange]
    );

    React.useEffect(() => {
     if (!isWeb) return;               // 👈 solo web
  if (initializedRef.current) return; // 👈 si ya está, no hagas nada

      const initGoogleMaps = async () => {
        try {
          const loader = new Loader({
            apiKey: apiKey || '',
            libraries: ['geometry', 'places'],
            version: 'weekly',
          });

          await loader.load();

          if (!containerRef.current) return;

          const map = new window.google.maps.Map(containerRef.current, {
            center: {
              lat: initialRegion.latitude,
              lng: initialRegion.longitude,
            },
            zoom: 12,
            disableDefaultUI: true,
          });

          mapRef.current = map;
          initializedRef.current = true;     // 👈 marca que ya se creó
          setIsLoading(false);
          handleMapReady();
        } catch (error) {
          console.error('Error al inicializar Google Maps:', error);
          setHasError(true);
          setErrorMessage('Error al cargar Google Maps. Verifica API key y shim para web.');
          setIsLoading(false);
        }
      };

      initGoogleMaps();
    }, [isWeb, apiKey, handleMapReady]);

    // Nuevo efecto: aplica cambios de initialRegion sin recrear
React.useEffect(() => {
  if (!isWeb || !mapRef.current) return;
  // pan + opcional zoom
  mapRef.current.panTo({ lat: initialRegion.latitude, lng: initialRegion.longitude });
  // opcional: mapRef.current.setZoom(12);
}, [isWeb, initialRegion]);


    React.useImperativeHandle(ref, () => ({
      animateToRegion: (region: Region, duration = 500) => {
        if (mapRef.current) {
          if (isWeb) {
            mapRef.current.panTo({ lat: region.latitude, lng: region.longitude });
            mapRef.current.setZoom(12);
          } else {
            mapRef.current.animateToRegion(region, duration);
          }
        }
      },
      fitToCoordinates: (coordinates: LatLng[] = [], options = {}) => {
        if (!mapRef.current || coordinates.length === 0) return;

        if (isWeb) {
          const bounds = new window.google.maps.LatLngBounds();
          coordinates.forEach(coord => bounds.extend(normalizeLatLng(coord)));
          mapRef.current.fitBounds(bounds);
        } else {
          mapRef.current.fitToCoordinates(coordinates, options);
        }
      },
      getMapBounds: async () => {
        if (!mapRef.current) return null;

        if (isWeb) {
          const bounds = mapRef.current.getBounds();
          if (!bounds) return null;
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          return {
            northEast: { latitude: ne.lat(), longitude: ne.lng() },
            southWest: { latitude: sw.lat(), longitude: sw.lng() },
          };
        } else {
          return mapRef.current.getMapBoundaries();
        }
      },
    }), [isWeb]);

    const renderWebMap = () => (
      <View ref={containerRef} style={{ height, width: '100%' }}>
        {isLoading && <ActivityIndicator size="large" />}
        {hasError && <Text>{errorMessage}</Text>}
      </View>
    );

    const renderNativeMap = () => {
   



      if (!MapView) return <Text>Mapa no disponible. Verifica instalación de react-native-maps.</Text>;
      return (
        <MapView
          ref={mapRef}
          style={{ height, ...style }}
          initialRegion={initialRegion}
          onMapReady={handleMapReady}
          onRegionChangeComplete={handleRegionChange}
        >
          {routeCoordinates.length > 1 && <Polyline coordinates={routeCoordinates} strokeColor="#3b82f6" strokeWidth={4} />}
          {stops.map(stop => (
            <Marker key={`stop-${stop.id}`} coordinate={{ latitude: stop.lat, longitude: stop.lng }} title={stop.name} pinColor="#8b5cf6" />
          ))}
          {vehicles.map(vehicle => (
            <Marker
              key={`vehicle-${vehicle.id}`}
              coordinate={{ latitude: vehicle.lat, longitude: vehicle.lng }}
              title={`${vehicle.codigo} - ${vehicle.matricula}`}
              pinColor={getVehicleColor(vehicle.state)}
              onPress={() => onVehiclePress?.(vehicle.id)}
            />
          ))}
        </MapView>
      );
    };

    return isWeb ? renderWebMap() : renderNativeMap();
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
});

export default MapViewUnified;