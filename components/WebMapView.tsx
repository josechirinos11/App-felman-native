// components/WebMapView.tsx - Mapa Google para Web
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface WebMapViewProps {
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onMapReady?: () => void;
  showsUserLocation?: boolean;
}

export default function WebMapView({ 
  initialRegion, 
  onMapReady,
  showsUserLocation = true 
}: WebMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);

  useEffect(() => {
    // Cargar Google Maps API
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      // Crear script para cargar Google Maps
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAEWw8B6utUMKBNmeou8EAovnWRGLxldGs&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current || !window.google) return;

      // Configuración del mapa
      const mapOptions = {
        center: {
          lat: initialRegion.latitude,
          lng: initialRegion.longitude
        },
        zoom: 15,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        zoomControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        mapTypeControl: true,
        gestureHandling: 'greedy',
      };

      // Crear mapa
      googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);

      // Agregar marcador de ubicación
      if (showsUserLocation) {
        new window.google.maps.Marker({
          position: { lat: initialRegion.latitude, lng: initialRegion.longitude },
          map: googleMapRef.current,
          title: 'Tu ubicación',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            scaledSize: new window.google.maps.Size(40, 40)
          }
        });
      }

      // Callback de mapa listo
      onMapReady?.();
      console.log('🗺️ Google Maps Web cargado exitosamente');
    };

    loadGoogleMaps();
  }, [initialRegion, onMapReady, showsUserLocation]);

  return (
    <View style={styles.container}>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          border: '2px solid #007AFF'
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
