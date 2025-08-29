// app/logistica/seguimiento-web.tsx - Solo para WEB
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';

// ================== INTERFACES ==================
type UserData = { nombre?: string; rol?: string; name?: string; role?: string };

export default function SeguimientoWebScreen() {
  const [userName, setUserName] = useState('—');
  const [userRole, setUserRole] = useState('—');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados adicionales para funcionalidad de mapa
  const [manualLocation, setManualLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [showDirectionsModal, setShowDirectionsModal] = useState(false);
  const [directionsList, setDirectionsList] = useState<any[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);
  const [trackingPath, setTrackingPath] = useState<any[]>([]);

  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        console.log('🌐 WEB: Solicitando permisos de ubicación...');
        
        // Debug info para troubleshooting
        logApiKeyInfo();
        
        // Verificar si estamos en HTTPS o localhost para web
        if (Platform.OS === 'web') {
          const isSecureContext = window.location.protocol === 'https:' || 
                                 window.location.hostname === 'localhost' || 
                                 window.location.hostname === '127.0.0.1';
          
          console.log('🌐 WEB: Protocol:', window.location.protocol);
          console.log('🌐 WEB: Host:', window.location.host);
          
          if (!isSecureContext) {
            console.warn('⚠️ WEB: Geolocalización requiere HTTPS - usando Valencia, España. Protocolo actual:', window.location.protocol);
            setPermissionStatus('denied');
            useDefaultLocation(); // Usar automáticamente Valencia, España
            setIsLoading(false);
            return;
          }
        }
        
        const granted = await Location.requestForegroundPermissionsAsync();
        if (granted.status === 'granted') {
          console.log('✅ WEB: Permisos concedidos');
          setPermissionStatus('granted');
          getCurrentLocation();
        } else {
          console.log('❌ WEB: Permisos denegados por el usuario - usando Valencia, España');
          setPermissionStatus('denied');
          useDefaultLocation(); // Usar automáticamente Valencia, España
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ WEB: Error solicitando permisos - usando Valencia, España:', error);
        setPermissionStatus('denied');
        useDefaultLocation(); // Usar automáticamente Valencia, España
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
      console.error('❌ WEB: Error obteniendo ubicación GPS - usando Valencia, España:', error);
      useDefaultLocation(); // Usar automáticamente Valencia, España
      setIsLoading(false);
    }
  };

  // Funciones adicionales del componente móvil
  const formatTimestamp = useCallback(() => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }, []);

  const setManualLocationCoords = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('Por favor ingresa coordenadas válidas');
      return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Las coordenadas están fuera de rango válido');
      return;
    }
    
    setManualLocation({ lat, lng });
    setShowManualInput(false);
    console.log('📍 WEB: Ubicación manual establecida:', { lat, lng });
  };

  const useDefaultLocation = () => {
    // Ubicación por defecto (Valencia, España)
    const defaultLat = 39.4699; 
    const defaultLng = -0.3763;
    setManualLocation({ lat: defaultLat, lng: defaultLng });
    console.log('📍 WEB: Usando ubicación por defecto - Valencia, España');
  };

  const getCurrentDisplayLocation = () => {
    if (location) {
      return {
        lat: location.coords.latitude,
        lng: location.coords.longitude
      };
    }
    if (manualLocation) {
      return manualLocation;
    }
    return null;
  };

  // Debug info para API key
  const logApiKeyInfo = () => {
    if (Platform.OS === 'web') {
      console.log('🔑 API Key Info:');
      console.log('   Protocol:', window.location.protocol);
      console.log('   Host:', window.location.host);
      console.log('   Hostname:', window.location.hostname);
      console.log('   Port:', window.location.port);
      console.log('   Full URL:', window.location.href);
      console.log('   Referrer:', document.referrer);
    }
  };

  // Función para expandir/contraer el mapa
  const toggleMapExpanded = useCallback(() => {
    setIsMapExpanded(prev => !prev);
    console.log(isMapExpanded ? '📱 Contrayendo mapa' : '🗺️ Expandiendo mapa');
  }, [isMapExpanded]);

  // Función para mostrar/ocultar modal de direcciones
  const toggleDirectionsModal = useCallback(() => {
    setShowDirectionsModal(prev => !prev);
    console.log(showDirectionsModal ? '📋 Cerrando lista de direcciones' : '📋 Mostrando lista de direcciones');
  }, [showDirectionsModal]);

  const clearAllMarkers = useCallback(() => {
    setMarkers([]);
    console.log('🧹 Todos los marcadores eliminados');
  }, []);

  const clearTrackingPath = useCallback(() => {
    setTrackingPath([]);
    console.log('🧹 Ruta de seguimiento limpiada');
  }, []);

  // ================== USER DATA ==================
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        const userData: UserData | null = storedUserData ? JSON.parse(storedUserData) : null;
        
        if (userData) {
          setUserName(userData.nombre || userData.name || '—');
          setUserRole(userData.rol || userData.role || '—');
          console.log('👤 WEB: Datos de usuario cargados:', userData);
        } else {
          console.log('👤 WEB: No se encontraron datos de usuario guardados');
        }
      } catch (error) {
        console.error('❌ WEB: Error cargando datos de usuario:', error);
      }
    };

    loadUserData();
  }, []);

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

        {/* Modal para entrada manual de coordenadas */}
        {showManualInput && Platform.OS === 'web' && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              minWidth: '300px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}>
              <h3 style={{ marginTop: 0, color: '#333' }}>📍 Ingresar Ubicación Manual</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#666' }}>
                  Latitud (-90 a 90):
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ej: 10.1621"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#666' }}>
                  Longitud (-180 a 180):
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ej: -68.0077"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowManualInput(false)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f8f9fa',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={setManualLocationCoords}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Establecer Ubicación
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de direcciones */}
        <Modal
          visible={showDirectionsModal}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setShowDirectionsModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
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
        </Modal>

        <View style={[styles.webMapContainer, isMapExpanded && styles.mapContainerExpanded]}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066FF" />
              <Text style={styles.loadingText}>🌐 Cargando mapa web...</Text>
            </View>
          ) : (permissionStatus === 'granted' && location) || manualLocation ? (
            Platform.OS === 'web' ? (
              <div style={{
                width: '100%',
                height: '100%',
                position: 'relative'
              }}>
                {(() => {
                  const displayLocation = getCurrentDisplayLocation();
                  return displayLocation ? (
                    <>
                      <iframe
                        src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyAtdufUHs9jULLbARMm38OLQH6Y0D049QU&center=${displayLocation.lat},${displayLocation.lng}&zoom=18&maptype=satellite`}
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          borderRadius: '8px'
                        }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        onLoad={() => {
                          console.log('✅ Google Maps iframe cargado exitosamente');
                          logApiKeyInfo();
                        }}
                        onError={(e) => {
                          console.error('❌ Error cargando Google Maps iframe:', e);
                          logApiKeyInfo();
                        }}
                      />
                      
                      {/* Info overlay - top left con controles de ubicación */}
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        width: 'fit-content',
                        maxWidth: '250px'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <span>🌐 Mapa Web Activo</span>
                        </div>
                        <div>{location ? '📍 GPS' : '📍 Manual'}</div>
                        <div>📍 Lat: {displayLocation.lat.toFixed(6)}</div>
                        <div>📍 Lng: {displayLocation.lng.toFixed(6)}</div>
                        {Platform.OS === 'web' && (
                          <div style={{ 
                            marginTop: '8px', 
                            fontSize: '12px', 
                            color: '#ccc',
                            borderTop: '1px solid rgba(255,255,255,0.2)',
                            paddingTop: '5px'
                          }}>
                            🏠 {window.location.host}
                          </div>
                        )}
                        
                        {/* Botones de puntero y lápiz debajo del localhost */}
                        <div style={{ 
                          display: 'flex', 
                          gap: '15px', 
                          marginTop: '8px',
                          justifyContent: 'center'
                        }}>
                          {permissionStatus === 'granted' && (
                            <button
                              style={{
                                backgroundColor: '#0066FF',
                                color: 'white',
                                border: 'none',
                                padding: '4px 6px',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onClick={() => getCurrentLocation()}
                              title="Actualizar ubicación GPS"
                            >
                              📍
                            </button>
                          )}
                          
                          <button
                            style={{
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              padding: '4px 6px',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onClick={() => setShowManualInput(true)}
                            title="Ubicación manual"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>

                      {/* Controles personalizados - top right */}
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        {/* Botón expandir/contraer mapa */}
                        <button
                          style={{
                            backgroundColor: isMapExpanded ? '#FF6B35' : 'rgba(255, 255, 255, 0.95)',
                            color: isMapExpanded ? 'white' : '#333',
                            border: '1px solid #ddd',
                            padding: '12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            minWidth: '48px',
                            minHeight: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onClick={toggleMapExpanded}
                          title={isMapExpanded ? "Contraer mapa" : "Expandir mapa"}
                        >
                          {isMapExpanded ? '⏸️' : '🔍'}
                        </button>

                        {/* Botón lista de direcciones */}
                        <button
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            color: '#333',
                            border: '1px solid #ddd',
                            padding: '12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            minWidth: '48px',
                            minHeight: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onClick={toggleDirectionsModal}
                          title="Lista de direcciones"
                        >
                          📋
                        </button>

                        {/* Botón limpiar marcadores */}
                        <button
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            color: '#333',
                            border: '1px solid #ddd',
                            padding: '12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            minWidth: '48px',
                            minHeight: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onClick={clearAllMarkers}
                          title="Limpiar marcadores"
                        >
                          🧹
                        </button>
                      </div>

                      {/* Controles de ubicación eliminados - ahora están en el info overlay superior */}
                    </>
                  ) : null;
                })()}
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
              
              {permissionStatus === 'denied' && (
                <>
                  <Text style={styles.errorSubText}>
                    💡 Los permisos de ubicación requieren HTTPS en navegadores.
                  </Text>
                  <Text style={styles.errorSubText}>
                    Puedes usar una ubicación manual o por defecto:
                  </Text>
                  
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => setShowManualInput(true)}
                    >
                      <Text style={styles.actionButtonText}>📍 Ubicación Manual</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={useDefaultLocation}
                    >
                      <Text style={styles.actionButtonText}>🌍 Ubicación por Defecto</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => {
                  setIsLoading(true);
                  getCurrentLocation();
                }}
              >
                <Text style={styles.retryButtonText}>🔄 Reintentar GPS</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.infoPanel, isMapExpanded && styles.hiddenPanel]}>
          <Text style={styles.infoPanelTitle}>🌐 Estado del Seguimiento Web</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📍 Ubicación:</Text>
            <Text style={styles.infoValue}>{location ? '✅ GPS Activa' : manualLocation ? '✅ Manual' : '❌ No disponible'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🔑 Permisos:</Text>
            <Text style={styles.infoValue}>{permissionStatus === 'granted' ? '✅ Concedidos' : '❌ Denegados'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📌 Marcadores:</Text>
            <Text style={styles.infoValue}>{markers.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🛤️ Puntos de ruta:</Text>
            <Text style={styles.infoValue}>{trackingPath.length}</Text>
          </View>
          {(() => {
            const displayLocation = getCurrentDisplayLocation();
            return displayLocation ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>📐 Latitud:</Text>
                  <Text style={styles.infoValue}>{displayLocation.lat.toFixed(6)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>📐 Longitud:</Text>
                  <Text style={styles.infoValue}>{displayLocation.lng.toFixed(6)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>🔍 Fuente:</Text>
                  <Text style={styles.infoValue}>{location ? 'GPS' : 'Manual'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>⏰ Actualizado:</Text>
                  <Text style={styles.infoValue}>{formatTimestamp()}</Text>
                </View>
              </>
            ) : null;
          })()}
          
          {permissionStatus === 'denied' && (
            <Text style={styles.httpsWarning}>
              ⚠️ Para GPS automático, usar HTTPS
            </Text>
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
  errorSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 5,
    marginVertical: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
  
  // Nuevos estilos agregados del componente móvil
  mapContainerExpanded: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: '#fff',
    margin: 0,
    borderRadius: 0,
  },
  hiddenPanel: {
    display: 'none',
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
  httpsWarning: {
    fontSize: 12,
    color: '#856404',
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Estilos para modal
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
