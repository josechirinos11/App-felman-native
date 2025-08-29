// app/optima/seguimiento.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView as SafeAreaViewSA } from 'react-native-safe-area-context';

import AppHeader from '../../components/AppHeader'; // Asumiendo que existe
import MapViewUnified from '../../components/MapViewUnified-debug';
import ModalHeader from '../../components/ModalHeader'; // Asumiendo que existe
import { API_URL } from '../../config/constants';
import { getGoogleMapsApiKey } from '../../config/maps';

import { PermissionsAndroid, Platform } from 'react-native';

import * as Location from 'expo-location';



type Perm = 'idle' | 'checking' | 'granted' | 'denied';

/** GeoJSON mínimo */
type LineString = { type: 'LineString'; coordinates: [number, number][] };

type UserData = { nombre?: string; rol?: string; name?: string; role?: string };

type VehicleDTO = {
  id: string | number;
  codigo?: string;
  matricula?: string;
  conductor?: string;
  centro?: string;
  state?: 'en_ruta' | 'detenido' | 'retraso';
  lat: number;
  lng: number;
  heading?: number;
  speed_kmh?: number;
  lastTs?: number;
  routeId?: string;
  nextStopId?: string;
};

type RouteDTO = {
  routeId: string;
  geometry?: LineString;
  stops: Array<{ id: string; lat: number; lng: number; eta?: string; status?: 'PENDING' | 'DONE' | 'FAILED' }>;
};

type CrudAction = 'marcar' | 'recalcular' | 'incidencia';

type WebSocketData = {
  type: 'gps' | 'event' | 'error';
  payload?: any;
  error?: string;
};

const ENDPOINTS = {
  flota: `${API_URL}/control-optima/seguimiento/flota`,
  ruta: (routeId: string) => `${API_URL}/control-optima/seguimiento/ruta/${encodeURIComponent(routeId)}`,
  marcar: `${API_URL}/control-optima/seguimiento/marcar-entrega`,
};

export default function SeguimientoScreen() {
  const [perm, setPerm] = useState<Perm>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<Location.LocationObject | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);

  // Estado de usuario
  const [userName, setUserName] = useState('—');
  const [userRole, setUserRole] = useState('—');
  const [userModalVisible, setUserModalVisible] = useState(false);

  // Estado de filtros
  const [query, setQuery] = useState('');
  const [centro, setCentro] = useState('');
  const [estado, setEstado] = useState<'en_ruta' | 'detenido' | 'retraso' | null>(null);

  // Estado de datos
  const [flota, setFlota] = useState<VehicleDTO[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | number | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteDTO | null>(null);

  // Estado de UI
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serverReachable, setServerReachable] = useState(true);
  const [loadPct, setLoadPct] = useState(0);
  const [crudModal, setCrudModal] = useState<null | CrudAction>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [mapReady, setMapReady] = useState(false); // Nuevo estado para track map ready

  // Referencias
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<any>(null);
  const hasFittedRef = useRef(false); // Ref para evitar multiple fits

  // Configuración de reconexión WebSocket
  const WS_RECONNECT_INTERVAL = 5000;
  const MAX_RECONNECT_ATTEMPTS = 10;
  const reconnectAttemptsRef = useRef(0);


  // seguimiento.tsx (extracto)
  const DEFAULT_REGION = { latitude: 39.514, longitude: -0.336, latitudeDelta: 0.2, longitudeDelta: 0.2 };


  const lastGoodFlotaRef = useRef<any[]>([]);
  const failsRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);


  const initialRegionRef = useRef(DEFAULT_REGION);

  const fleetsEqual = (a: any[], b: any[]) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    // compara ids/coords básicos para evitar renders inútiles
    for (let i = 0; i < a.length; i++) {
      if (a[i].id !== b[i].id) return false;
      if (a[i].lat !== b[i].lat || a[i].lng !== b[i].lng) return false;
    }
    return true;
  };






  const reqIos = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') console.warn('Permiso iOS denegado');
  };

  // === Inicialización de usuario ===
  useEffect(() => {
    // Activar permisos de ubicación
    requestLocationPermissions();
    
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user: UserData = JSON.parse(userData);
          setUserName(user?.nombre || user?.name || '—');
          setUserRole(user?.rol || user?.role || '—');
        }
      } catch (error) {
        console.warn('Error cargando datos de usuario:', error);
      }
    };

    loadUserData();
  }, []);




  const requestPermission = useCallback(async () => {
    try {
      setError(null);
      setPerm('checking');

      // Foreground
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setPerm('denied');
        if (!canAskAgain) {
          // En iOS/Android puede estar bloqueado en ajustes
          setError('Permiso de ubicación denegado. Actívalo en Ajustes del dispositivo.');
        }
        return;
      }

      setPerm('granted');

      // Opcional: en Android si vas a usar background tracking:
      // if (Platform.OS === 'android') {
      //   await Location.requestBackgroundPermissionsAsync();
      // }

      // Primer fix (rápido)
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      });
      setPos(current);

      // Seguimiento continuo con throttling/desacople
      if (!watcherRef.current) {
        watcherRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 3000,    // ms
            distanceInterval: 5,    // metros
            mayShowUserSettingsDialog: true,
          },
          (update) => setPos(update)
        );
      }
    } catch (e: any) {
      setError(e?.message ?? 'Error solicitando ubicación');
      setPerm('denied');
    }
  }, []);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      watcherRef.current?.remove();
      watcherRef.current = null;
    };
  }, []);



  async function requestLocationPermissions() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        const allGranted = Object.values(granted).every(status => status === PermissionsAndroid.RESULTS.GRANTED);
        if (!allGranted) {
          console.warn('Permisos de ubicación no concedidos');
        } else {
          console.log('Permisos de ubicación concedidos');
        }
      } catch (err) {
        console.warn('Error solicitando permisos de ubicación', err);
      }
    }
  }




  // === Fetch seguro con manejo de errores ===
  const safeJson = async (response: Response) => {
    const ct = (response.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('application/json')) {
      return response.json();
    }
    // lee texto sólo para log corto y NO devuelvas [] para no pisar estado
    const text = await response.text().catch(() => '');
    console.warn('[seguimiento] Respuesta no JSON:', response.status, text.slice(0, 120));
    return null; // <-- clave
  };

  // === Fetch de flota para refresh manual solamente ===
  const fetchFlota = useCallback(async () => {
    if (loading) return; // Solo prevenir si ya está cargando

    setRefreshing(true);
    setLoadPct(10);

    try {
      // Simulamos carga con timeout
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLoadPct(60);

      // Usar datos demo en lugar de llamadas al servidor
      const demoFlota: VehicleDTO[] = [
        {
          id: 'VH001',
          codigo: 'CAM001',
          matricula: '1234-ABC',
          conductor: 'Juan Pérez',
          state: 'en_ruta',
          lat: 39.4699075,
          lng: -0.3762881,
          routeId: 'RT001',
          speed_kmh: 45,
          centro: 'Valencia',
          lastTs: Date.now(),
        },
        {
          id: 'VH002',
          codigo: 'FUR002',
          matricula: '5678-DEF',
          conductor: 'María García',
          state: 'detenido',
          lat: 39.4815,
          lng: -0.3255,
          routeId: 'RT002',
          speed_kmh: 0,
          centro: 'Valencia',
          lastTs: Date.now(),
        },
      ];

      setServerReachable(true);

      const nueva = demoFlota;
      if (!fleetsEqual(nueva, lastGoodFlotaRef.current)) {
        lastGoodFlotaRef.current = nueva;
        setFlota(nueva);
      }

      console.log(`[seguimiento] Flota demo actualizada manualmente: ${nueva.length} vehículos`);

    } catch (error) {
      console.error('[seguimiento] Error al actualizar flota demo:', error);
      setServerReachable(false);
    } finally {
      setLoadPct(100);
      setTimeout(() => setLoadPct(0), 600);
      setRefreshing(false);
    }
  }, []); // Sin dependencias para evitar recreación

  // === Fetch de ruta mejorado ===
  const fetchRoute = useCallback(async (routeId: string) => {
    if (!routeId) {
      setSelectedRoute(null);
      return;
    }

    try {
      const response = await fetch(ENDPOINTS.ruta(routeId), {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      const routeData = await safeJson(response);
      setSelectedRoute(routeData);

      console.log(`[seguimiento] Ruta cargada: ${routeId}`);

    } catch (error) {
      console.error('[seguimiento] Error al obtener ruta:', error);
      setSelectedRoute(null);
    }
  }, []);

  // === Carga inicial (solo una vez) ===
  useEffect(() => {
    // Llamada inicial sin dependencias para evitar bucle infinito
    const loadInitialData = async () => {
      console.log('[seguimiento] Debug: Iniciando loadInitialData');
      setLoading(true);
      setLoadPct(10);

      try {
        // Simulamos carga con timeout
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setLoadPct(60);

        // Usar datos demo en lugar de llamadas al servidor
        const demoFlota: VehicleDTO[] = [
          {
            id: 'VH001',
            codigo: 'CAM001',
            matricula: '1234-ABC',
            conductor: 'Juan Pérez',
            state: 'en_ruta',
            lat: 39.4699075,
            lng: -0.3762881,
            routeId: 'RT001',
            speed_kmh: 45,
            centro: 'Valencia',
            lastTs: Date.now(),
          },
          {
            id: 'VH002',
            codigo: 'FUR002',
            matricula: '5678-DEF',
            conductor: 'María García',
            state: 'detenido',
            lat: 39.4815,
            lng: -0.3255,
            routeId: 'RT002',
            speed_kmh: 0,
            centro: 'Valencia',
            lastTs: Date.now(),
          },
        ];

        setServerReachable(true);
        lastGoodFlotaRef.current = demoFlota;
        setFlota(demoFlota);

        console.log(`[seguimiento] Flota demo cargada inicialmente: ${demoFlota.length} vehículos`);

      } catch (error) {
        console.error('[seguimiento] Error al cargar flota demo inicial:', error);
        setServerReachable(false);
        setFlota([]);
      } finally {
        console.log('[seguimiento] Debug: En finally, setLoading(false)');
        setLoadPct(100);
        setTimeout(() => setLoadPct(0), 600);
        setLoading(false);
        
        // Forzar que se quite el loading después de un tiempo máximo como fallback
        setTimeout(() => {
          console.log('[seguimiento] Forzando fin de loading (fallback)');
          setLoading(false);
        }, 2000);
      }
    };

    loadInitialData();
  }, []); // Sin dependencias para ejecutar solo una vez

  // === WebSocket deshabilitado para demo ===
  const connectWebSocket = useCallback(() => {
    console.log('[seguimiento] WebSocket deshabilitado - usando datos demo estáticos');
    return false; // Siempre retorna false para usar datos demo
    
    /* CÓDIGO ORIGINAL COMENTADO
    const wsUrl = String(WS_URL || '');
    if (!/^wss?:\/\//i.test(wsUrl)) {
      console.warn('[seguimiento] URL WebSocket inválida, usando polling');
      return false;
    }
    // (si es localhost y estás en dispositivo, también devuelve false)
    if (Platform.OS !== 'web' && /localhost|127\.0\.0\.1/.test(wsUrl)) {
      console.warn('[seguimiento] WS localhost no accesible desde dispositivo; polling');
      return false;
    }
    */

    /* RESTO DEL CÓDIGO WEBSOCKET COMENTADO PARA DEMO
    try {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setWsStatus('connecting');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // ... resto del código WebSocket comentado
      
      return true;
    } catch (error) {
      console.error('[seguimiento] Error inicializando WebSocket:', error);
      setWsStatus('disconnected');
      return false;
    }
    */
  }, []);

  // === Polling como fallback (deshabilitado para demo) ===
  const startPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }

    console.log('[seguimiento] Polling deshabilitado - usando datos demo');
    // Comentado para evitar llamadas infinitas
    // pollRef.current = setInterval(() => {
    //   fetchFlota();
    // }, 15000);
  }, []); // Sin dependencias

  // === Iniciar tiempo real (deshabilitado para demo) ===
  const startRealtime = useCallback(() => {
    console.log('[seguimiento] Tiempo real deshabilitado - usando datos demo estáticos');
    // Limpiar cualquier timer existente
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    // No iniciar WebSocket ni polling para demo
  }, []);

  // === Efecto para iniciar tiempo real ===
  useEffect(() => {
    const timer = setTimeout(() => {
      startRealtime();
    }, 2000);

    return () => {
      clearTimeout(timer);

      try {
        wsRef.current?.close();
      } catch (e) {
        console.warn('Error cerrando WebSocket:', e);
      }

      if (pollRef.current) {
        clearInterval(pollRef.current);
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [startRealtime]);

  // === Filtros de vehículos optimizados ===
  const q = query.trim().toUpperCase();
  const flotaFiltered = useMemo(() => {
    let filteredFlota = flota;

    if (estado) {
      filteredFlota = filteredFlota.filter(vehicle =>
        (vehicle.state || '').toUpperCase() === estado.toUpperCase()
      );
    }

    if (q) {
      filteredFlota = filteredFlota.filter(vehicle =>
        (vehicle.codigo || '').toUpperCase().includes(q) ||
        (vehicle.matricula || '').toUpperCase().includes(q) ||
        (vehicle.conductor || '').toUpperCase().includes(q) ||
        (vehicle.centro || '').toUpperCase().includes(q) ||
        (vehicle.routeId || '').toUpperCase().includes(q)
      );
    }

    return filteredFlota;
  }, [flota, q, estado]);

  const headerCount = flotaFiltered.length;

  // === Selección de vehículo mejorada ===
  const selectVehicle = useCallback((id: string | number) => {
    setSelectedVehicleId(id);
    const vehicle = flota.find(v => v.id === id);

    if (vehicle?.routeId) {
      fetchRoute(vehicle.routeId);
    } else {
      setSelectedRoute(null);
    }

    // Centrar mapa en el vehículo seleccionado
    if (vehicle && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: vehicle.lat,
        longitude: vehicle.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [flota, fetchRoute]);

  // === Acciones CRUD ===
  const actionMarcarEntrega = () => setCrudModal('marcar');
  const actionRecalcularRuta = () => setCrudModal('recalcular');
  const actionIncidencia = () => setCrudModal('incidencia');

  // === Datos para el mapa optimizados (memoizados deeply) ===
  const mapData = useMemo(() => {
    // Si no hay datos reales, usar datos de prueba para Valencia
    const hasRealData = flotaFiltered.length > 0;
    
    const vehicles = hasRealData ? flotaFiltered.map(v => ({
      id: v.id,
      lat: v.lat,
      lng: v.lng,
      heading: v.heading || 0,
      state: v.state || 'en_ruta',
      codigo: v.codigo || '',
      matricula: v.matricula || '',
    })) : [
      // Datos de prueba para Valencia, España
      {
        id: 'demo-1',
        lat: 39.4699,
        lng: -0.3763,
        heading: 45,
        state: 'en_ruta' as const,
        codigo: 'DEMO-001',
        matricula: 'TEST-001',
      },
      {
        id: 'demo-2', 
        lat: 39.4750,
        lng: -0.3800,
        heading: 90,
        state: 'detenido' as const,
        codigo: 'DEMO-002',
        matricula: 'TEST-002',
      }
    ];

    const stops = (selectedRoute?.stops || []).map(s => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
      status: s.status || 'PENDING',
    }));

    const routeCoordinates = selectedRoute?.geometry?.coordinates?.map(coord => ({
      latitude: coord[1],
      longitude: coord[0],
    })) || [];

    return { vehicles, stops, routeCoordinates };
  }, [flotaFiltered, selectedRoute]);

  // === Calcular región inicial del mapa ===
  const initialRegion = useMemo(() => {
    // Usar región fija de Valencia para garantizar que el mapa se muestre correctamente
    const valenciaRegion = {
      latitude: 39.4699075,
      longitude: -0.3762881,
      latitudeDelta: 0.02, // Zoom más cercano
      longitudeDelta: 0.02,
    };

    return valenciaRegion;

    /* CÓDIGO ORIGINAL COMENTADO - Calculaba región dinámicamente
    if (flotaFiltered.length > 0) {
      const lats = flotaFiltered.map(v => v.lat);
      const lngs = flotaFiltered.map(v => v.lng);

      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      const deltaLat = Math.max(maxLat - minLat, 0.01) * 1.2;
      const deltaLng = Math.max(maxLng - minLng, 0.01) * 1.2;

      return {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: deltaLat,
        longitudeDelta: deltaLng,
      };
    }

    return valenciaRegion;
    */
  }, []);

  // === Refresh manual ===
  const handleRefresh = useCallback(() => {
    if (!refreshing) {
      fetchFlota();
    }
  }, [refreshing]); // Removemos fetchFlota de las dependencias

  // === Manejar cambio de región del mapa ===
  const handleRegionChange = useCallback((region: any) => {
    // Opcional: guardar la región actual para persistencia, pero no setState para evitar loops
  }, []);

  // === Función para manejar el evento de mapa listo ===
  const handleMapReady = useCallback(() => {
    console.log('🗺️ Mapa listo');
    console.log('📍 Región inicial:', initialRegion);
    console.log('🚗 Vehículos en mapa:', mapData.vehicles.length);
    console.log('🔑 API Key configurada:', !!getGoogleMapsApiKey());
    setMapReady(true);
    // No llamar fit aquí para evitar loops; mover a useEffect
  }, [initialRegion, mapData.vehicles]);

  // === Función para centrar en todos los marcadores ===
  const handleFitAllMarkers = useCallback(() => {
    if (mapRef.current && flotaFiltered.length > 0) {
      const coordinates = flotaFiltered.map(vehicle => ({
        latitude: vehicle.lat,
        longitude: vehicle.lng,
      }));

      // Añadir paradas si hay ruta
      coordinates.push(...(selectedRoute?.stops?.map(stop => ({
        latitude: stop.lat,
        longitude: stop.lng,
      })) || []));

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [flotaFiltered, selectedRoute]);

  // === Efecto para fit solo cuando datos cambien y mapa ready (evita loops) ===
  useEffect(() => {
    if (mapReady && !hasFittedRef.current && flotaFiltered.length > 0) {
      handleFitAllMarkers();
      hasFittedRef.current = true;
    }
  }, [mapReady, flotaFiltered, selectedRoute, handleFitAllMarkers]);

  // Reset fit ref cuando datos cambien significativamente
  useEffect(() => {
    hasFittedRef.current = false;
  }, [selectedVehicleId]); // Ejemplo: Reset en selección de vehículo

  // === Función para centrar en la ubicación del usuario ===
  const handleCenterOnUser = useCallback(() => {
    // Si tenemos la posición del usuario, centrar en ella
    if (pos?.coords && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else if (flotaFiltered.length > 0) {
      // Fallback: centrar en el primer vehículo
      const firstVehicle = flotaFiltered[0];
      mapRef.current?.animateToRegion({
        latitude: firstVehicle.lat,
        longitude: firstVehicle.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      // Fallback final: centrar en Valencia
      mapRef.current?.animateToRegion({
        latitude: 39.4699075,
        longitude: -0.3762881,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [pos, flotaFiltered]);

  // Key para MapViewUnified basado en hash simple de datos (fuerza remount solo si cambia)
  const mapKey = useMemo(() => JSON.stringify([flotaFiltered.length, selectedRoute?.routeId]), [flotaFiltered, selectedRoute]);

  return (
    <SafeAreaProvider>
      <SafeAreaViewSA edges={['top', 'bottom']} style={styles.container}>
        <AppHeader
          titleOverride="Seguimiento en Tiempo Real"
          count={headerCount}
          userNameProp={userName}
          roleProp={userRole}
          serverReachableOverride={serverReachable}
          onRefresh={handleRefresh}
          onUserPress={() => setUserModalVisible(true)}
        />

        <ModalHeader
          visible={userModalVisible}
          onClose={() => setUserModalVisible(false)}
          userName={userName}
          role={userRole}
        />

        {/* Filtros */}
        <View style={styles.filtersGrid}>
          <View style={styles.filterRow}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Centro (opcional)</Text>
              <TextInput
                value={centro}
                onChangeText={setCentro}
                placeholder="Ej: LAM310"
                style={styles.input}
                returnKeyType="search"
                onSubmitEditing={fetchFlota}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={[styles.filterRow, { alignItems: 'center' }]}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Buscar (vehículo / matrícula / conductor / ruta)</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Ej: TR-09 · 1234-ABC · Juan"
                style={styles.input}
                returnKeyType="search"
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={[styles.filterRow, { marginTop: 2 }]}>
            {(['en_ruta', 'detenido', 'retraso'] as const).map(est => (
              <Pressable
                key={est}
                onPress={() => setEstado(prev => prev === est ? null : est)}
                style={[styles.chip, estado === est && styles.chipActive]}
              >
                <Text style={[styles.chipText, estado === est && styles.chipTextActive]}>
                  {est === 'en_ruta' ? 'En ruta' : est === 'detenido' ? 'Detenido' : 'Retraso'}
                </Text>
              </Pressable>
            ))}

            <View style={[styles.connectionIndicator, styles[`connection_${wsStatus}`]]}>
              <Text style={styles.connectionText}>
                {wsStatus === 'connected' ? '🟢' : wsStatus === 'connecting' ? '🟡' : '🔴'}
              </Text>
            </View>
          </View>

          {/* Acciones CRUD */}
          <View style={styles.crudRow}>
            <TouchableOpacity style={[styles.crudBtn, styles.update]} onPress={actionMarcarEntrega}>
              <Ionicons name="checkmark-done-outline" size={22} />
              <Text style={styles.crudText}>Marcar entrega</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.crudBtn, styles.read]} onPress={actionRecalcularRuta}>
              <Ionicons name="navigate-outline" size={22} />
              <Text style={styles.crudText}>Recalcular</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.crudBtn, styles.delete]} onPress={actionIncidencia}>
              <Ionicons name="alert-circle-outline" size={22} />
              <Text style={styles.crudText}>Incidencia</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal de acciones */}
        <Modal
          visible={crudModal !== null}
          animationType="slide"
          onRequestClose={() => setCrudModal(null)}
          presentationStyle="fullScreen"
        >
          <View style={styles.fullModal}>
            <Ionicons
              name={crudModal === 'marcar' ? 'checkmark-done-outline' :
                crudModal === 'recalcular' ? 'navigate-outline' : 'alert-circle-outline'}
              size={72}
              color="#2e78b7"
            />
            <Text style={styles.fullModalTitle}>
              {crudModal === 'marcar' ? 'Marcar entrega' :
                crudModal === 'recalcular' ? 'Recalcular ruta' : 'Crear incidencia'}
            </Text>
            <Text style={styles.fullModalText}>Página en construcción</Text>
            <Pressable onPress={() => setCrudModal(null)} style={styles.closeFullBtn}>
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={styles.closeFullBtnText}>Cerrar</Text>
            </Pressable>
          </View>
        </Modal>

        {/* Contenido principal: Mapa + Lista - FORZADO PARA DEBUG */}
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            {/* Sección del Mapa */}
            <View style={styles.mapSection}>
              <Text style={styles.sectionTitle}>
                Mapa {selectedVehicleId ? `- Vehículo ${selectedVehicleId}` : ''} 
                {/* Debug info */}
                <Text style={{ fontSize: 12, color: '#666' }}>
                  {mapData.vehicles.length > 0 ? ` (${mapData.vehicles.length} vehículos)` : ' (modo demo)'}
                </Text>
              </Text>
              <View style={styles.mapContainer}>
                <MapViewUnified
                  key={mapKey} // Fuerza remount solo cuando datos cambien
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={initialRegion}
                  vehicles={mapData.vehicles}
                  routeCoordinates={mapData.routeCoordinates}
                  stops={mapData.stops}
                  selectedVehicleId={selectedVehicleId}
                  onVehiclePress={selectVehicle}
                  onRegionChange={handleRegionChange}
                  onMapReady={handleMapReady}
                  apiKey={getGoogleMapsApiKey()}
                />

                {/* Controles del mapa */}
                <View style={styles.mapControls}>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={handleCenterOnUser}
                  >
                    <Ionicons name="locate" size={24} color="#333" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.controlButton, styles.controlButtonLast]}
                    onPress={handleFitAllMarkers}
                  >
                    <Ionicons name="expand" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Lista de Vehículos */}
            <FlatList
              data={flotaFiltered}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContainer}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderText}>
                    Vehículos en vista: <Text style={styles.bold}>{flotaFiltered.length}</Text>
                    {selectedVehicleId && (
                      <Text style={styles.selectedIndicator}> • Seleccionado: {selectedVehicleId}</Text>
                    )}
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.empty}>Sin vehículos conectados</Text>
                  {!serverReachable && (
                    <Text style={styles.errorText}>
                      Error de conexión con el servidor
                    </Text>
                  )}
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.card,
                    styles.cardShadow,
                    selectedVehicleId === item.id && styles.cardSelected
                  ]}
                  onPress={() => selectVehicle(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHead}>
                    <Text style={styles.title}>
                      {item.codigo || item.matricula || `Vehículo ${item.id}`}
                    </Text>
                    <Text style={[
                      styles.badge,
                      styles[`badge_${item.state || 'en_ruta'}`]
                    ]}>
                      {(item.state || 'en_ruta').toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.sub}>
                    {item.conductor ? `Conductor: ${item.conductor} • ` : ''}
                    {item.centro ? `Centro: ${item.centro} • ` : ''}
                    {item.routeId ? `Ruta: ${item.routeId}` : 'Sin ruta asignada'}
                  </Text>

                  <Text style={styles.sub}>
                    📍 {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                    {typeof item.speed_kmh === 'number' && (
                      <Text> • 🚗 {item.speed_kmh} km/h</Text>
                    )}
                    {item.lastTs && (
                      <Text> • ⏰ {new Date(item.lastTs).toLocaleTimeString()}</Text>
                    )}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </SafeAreaViewSA>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },

  // Filtros
  filtersGrid: { paddingHorizontal: 12, paddingTop: 10 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  inputGroup: { gap: 6 },
  label: { fontSize: 12, color: '#4b5563', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
  },

  // Chips
  chip: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#6366f133'
  },
  chipActive: { backgroundColor: '#2e78b7' },
  chipText: { color: '#374151', fontWeight: '600', fontSize: 12 },
  chipTextActive: { color: '#fff' },

  // Indicador de conexión
  connectionIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  connection_connected: { backgroundColor: '#ecfdf5' },
  connection_connecting: { backgroundColor: '#fefce8' },
  connection_disconnected: { backgroundColor: '#fef2f2' },
  connectionText: { fontSize: 12 },

  // Botones CRUD
  crudRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  crudBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1
  },
  crudText: { fontWeight: '600', color: '#374151', fontSize: 12 },
  read: { backgroundColor: '#eef2ff', borderColor: '#6366f133' },
  update: { backgroundColor: '#ecfdf5', borderColor: '#10b98133' },
  delete: { backgroundColor: '#fef2f2', borderColor: '#ef444433' },

  // Modal
  fullModal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
    backgroundColor: '#f8fafc'
  },
  fullModalTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  fullModalText: { fontSize: 16, color: '#334155', textAlign: 'center' },
  closeFullBtn: {
    marginTop: 20,
    backgroundColor: '#2e78b7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  closeFullBtnText: { color: '#fff', fontWeight: '700' },


  // Mapa
  mapSection: { paddingHorizontal: 10, paddingBottom: 8, height: 450 }, // Altura aumentada
  sectionTitle: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontWeight: '700',
    color: '#1f2937',
    fontSize: 16,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f0f0f0', // Fondo gris para debug
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3, // Sombra para Android
    shadowColor: '#000', // Sombra para iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  map: {
    flex: 1,
    width: '100%',
    minHeight: 350, // Altura mínima aumentada
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    paddingVertical: 4,
  },
  controlButton: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    minHeight: 56,
  },
  controlButtonLast: {
    borderBottomWidth: 0,
  },

  // Lista
  listContainer: { paddingHorizontal: 10, paddingBottom: 24 },
  listHeader: { paddingHorizontal: 10, paddingVertical: 8 },
  listHeaderText: { color: '#334155', fontSize: 14 },
  bold: { fontWeight: '700' },
  selectedIndicator: { color: '#2e78b7', fontWeight: '600' },

  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  empty: { textAlign: 'center', color: '#6b7280', fontSize: 16, marginBottom: 8 },
  errorText: { textAlign: 'center', color: '#ef4444', fontSize: 14 },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardSelected: {
    borderColor: '#2e78b7',
    borderWidth: 2,
    backgroundColor: '#f8fafc',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  title: { fontWeight: '700', color: '#111827', fontSize: 16 },
  sub: { color: '#475569', marginBottom: 4, fontSize: 13 },

  // Badges por estado
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 11,
    overflow: 'hidden'
  },
  badge_en_ruta: { backgroundColor: '#dcfce7', color: '#166534' },
  badge_detenido: { backgroundColor: '#fef3c7', color: '#92400e' },
  badge_retraso: { backgroundColor: '#fecaca', color: '#991b1b' },

  // Loading
  loadingPanel: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  },
  loadingText: { color: '#334155', fontSize: 16 },
  progressBarOuter: {
    width: '100%',
    height: 8,
    borderRadius: 8,
    backgroundColor: '#e5e7eb'
  },
  progressBarInner: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#2e78b7'
  },

  flex1: { flex: 1 },
});