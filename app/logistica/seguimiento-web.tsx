// app/logistica/seguimiento-web.tsx - Solo para WEB
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';

export default function SeguimientoWebScreen() {
  const [userName, setUserName] = useState('Usuario Web');
  const [userRole, setUserRole] = useState('Demo Web');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        console.log('🌐 WEB: Solicitando permisos de ubicación...');
        const granted = await Location.requestForegroundPermissionsAsync();
        if (granted.status === 'granted') {
          console.log('✅ WEB: Permisos concedidos');
          setPermissionStatus('granted');
          getCurrentLocation();
        } else {
          setPermissionStatus('denied');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ WEB: Error solicitando permisos:', error);
        setPermissionStatus('denied');
        setIsLoading(false);
      }
    };
    requestLocationPermission();
  }, []);

  const getCurrentLocation = async () => {
    try {
      console.log('📍 WEB: Obteniendo ubicación actual...');
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ WEB: Error obteniendo ubicación:', error);
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <AppHeader
          titleOverride={`🌐 Seguimiento Web (${Platform.OS})`}
          count={location ? 1 : 0}
          userNameProp={userName}
          roleProp={userRole}
          serverReachableOverride={true}
          onRefresh={() => getCurrentLocation()}
          onUserPress={() => setUserModalVisible(true)}
        />

        <ModalHeader
          visible={userModalVisible}
          userName={userName}
          role={userRole}
          onClose={() => setUserModalVisible(false)}
        />

        <View style={styles.webMapContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066FF" />
              <Text style={styles.loadingText}>🌐 Cargando mapa web...</Text>
            </View>
          ) : permissionStatus === 'granted' && location ? (
            Platform.OS === 'web' ? (
              <div style={{
                width: '100%',
                height: '100%',
                position: 'relative'
              }}>
                <iframe
                  src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyAtdufUHs9jULLbARMm38OLQH6Y0D049QU&center=${location.coords.latitude},${location.coords.longitude}&zoom=18&maptype=satellite`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
                
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  <div>🌐 Mapa Web Activo</div>
                  <div>📍 Lat: {location.coords.latitude.toFixed(6)}</div>
                  <div>📍 Lng: {location.coords.longitude.toFixed(6)}</div>
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <button
                    style={{
                      backgroundColor: '#0066FF',
                      color: 'white',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                    onClick={() => getCurrentLocation()}
                  >
                    📍
                  </button>
                </div>
              </div>
            ) : (
              <View style={styles.fallbackContainer}>
                <Text style={styles.fallbackText}>⚠️ Esta pantalla está optimizada para WEB</Text>
                <Text style={styles.fallbackText}>Usa "Seguimiento Móvil" en dispositivos móviles</Text>
              </View>
            )
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {permissionStatus === 'denied' 
                  ? '❌ Permisos de ubicación denegados' 
                  : '🔍 Obteniendo ubicación...'}
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => {
                  setIsLoading(true);
                  getCurrentLocation();
                }}
              >
                <Text style={styles.retryButtonText}>🔄 Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelTitle}>🌐 Información Web</Text>
          <Text style={styles.infoPanelText}>Platform: {Platform.OS}</Text>
          <Text style={styles.infoPanelText}>Estado: {permissionStatus}</Text>
          <Text style={styles.infoPanelText}>
            Ubicación: {location ? '✅ Disponible' : '❌ No disponible'}
          </Text>
          {location && (
            <>
              <Text style={styles.infoPanelText}>
                Lat: {location.coords.latitude.toFixed(6)}
              </Text>
              <Text style={styles.infoPanelText}>
                Lng: {location.coords.longitude.toFixed(6)}
              </Text>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  webMapContainer: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 20,
  },
  fallbackText: {
    fontSize: 16,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 10,
  },
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
});
