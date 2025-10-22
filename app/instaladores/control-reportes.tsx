// app/control/control-reportes.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import { API_URL } from '../../config/constants';
import COLORS from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineMode } from '../../hooks/useOfflineMode';

// Date picker nativo Android/iOS
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

// Geolocalización
import * as Location from 'expo-location';

type UserData = {
  id: number;
  nombre?: string;
  rol?: string;
  name?: string;
  role?: string;
};

// Estructura principal de Reporte
export type Reporte = {
  id?: number;
  fecha: string;                 // yyyy-mm-dd
  nombre_instalador: string;
  obra: string;
  direccion: string;
  descripcion: string;
  status: string;
  incidencia: string;

  // NUEVOS CAMPOS
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_address?: string | null;   // calle/dirección humana
  hora_modal?: string;           // HH:mm:ss al abrir el modal
};

const isoDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const isoTime = (d: Date) => {
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mi}:${ss}`;
};

const niceDate = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// MiniMap multiplataforma: muestra un mini-mapa con pin en móvil (react-native-maps) y web (iframe Google Maps)
const MiniMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  if (!(Number.isFinite(lat) && Number.isFinite(lng))) return null;

  const containerStyle = {
    marginTop: 8,
    marginBottom: 8,
    width: Platform.OS === 'web' ? '100%' : 180,
    height: 140,
    borderRadius: 10,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EEF2FF',
  };

  if (Platform.OS === 'web') {
    // IFRAME sin API key: muestra un pin en (lat,lng)
    const src = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
    return (
      <div style={containerStyle as any}>
        <iframe
          src={src}
          style={{ width: '100%', height: '100%', border: '0' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          aria-label="mini-mapa"
        />
      </div>
    );
  }

  // MÓVIL (Android/iOS): react-native-maps
  const initialRegion = {
    latitude: lat,
    longitude: lng,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  return (
    <View style={containerStyle as any}>
      <MapView
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        toolbarEnabled={false}
        showsBuildings={false}
        showsCompass={false}
        showsPointsOfInterest={false}
      >
        <Marker coordinate={{ latitude: lat, longitude: lng }} />
      </MapView>
    </View>
  );
};

// Campo de fecha multiplataforma
const DateField: React.FC<{
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
}> = ({ label, value, onChange }) => {
  const text = value ? niceDate(value.toISOString()) : 'Seleccionar fecha';

  const openNative = () => {
    const base = value ?? new Date();
    DateTimePickerAndroid.open({
      value: base,
      onChange: (_e, selected) => {
        if (selected) onChange(selected);
      },
      mode: 'date',
      is24Hour: true,
    });
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.dateFieldContainer}>
        <Text style={styles.dateLabel}>{label}</Text>
        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore */}
        <input
          type="date"
          value={value ? isoDate(value) : ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value; // yyyy-mm-dd
            if (v) onChange(new Date(`${v}T00:00:00`));
          }}
          style={styles.webDateInput as any}
        />
      </View>
    );
  }

  return (
    <View style={styles.dateFieldContainer}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Pressable onPress={openNative} style={styles.nativeDateButton}>
        <Ionicons name="calendar-outline" size={18} color="#374151" />
        <Text style={styles.nativeDateText}>{text}</Text>
      </Pressable>
    </View>
  );
};

export default function ControlReportesScreen() {
  const { authenticated, loading: authLoading } = useAuth();
  const { serverReachable, isCheckingConnection } = useOfflineMode();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingBoot, setLoadingBoot] = useState(true);

  // Filtro de fechas
  const [desde, setDesde] = useState<Date | null>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [hasta, setHasta] = useState<Date | null>(() => new Date());

  // Datos
  const [items, setItems] = useState<Reporte[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Filtrado local de fechas (solo parte yyyy-mm-dd)
  const filteredItems = useMemo(() => {
    if (!desde && !hasta) return items;
    return items.filter((item) => {
      const itemDate = item.fecha?.slice(0, 10); // yyyy-mm-dd
      const desdeStr = desde ? isoDate(desde) : null;
      const hastaStr = hasta ? isoDate(hasta) : null;
      if (desdeStr && itemDate < desdeStr) return false;
      if (hastaStr && itemDate > hastaStr) return false;
      return true;
    });
  }, [items, desde, hasta]);

  // Modal usuario / header
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = React.useState({ userName: '', role: '' });

  // Modal crear/editar
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Reporte>({
    fecha: isoDate(new Date()),
    nombre_instalador: '',
    obra: '',
    direccion: '',
    descripcion: '',
    status: '',
    incidencia: '',
    // nuevos
    geo_lat: null,
    geo_lng: null,
    geo_address: null,
    hora_modal: undefined,
  });
  const [saving, setSaving] = useState(false);

  // ====== GEOLOCATION STATE ======
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'denied' | 'error'>('idle');

  // Carga credenciales y usuario
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const rawUser = await AsyncStorage.getItem('userData');
        if (storedToken) setToken(storedToken);
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed?.nombre && parsed?.rol) setUserData(parsed);
          else if (parsed?.name && parsed?.role) {
            setUserData({ id: parsed.id || 0, nombre: parsed.name, rol: parsed.role });
          }
        }
      } catch (e) {
        console.log('AsyncStorage err:', e);
      } finally {
        setLoadingBoot(false);
      }
    })();
  }, []);

  // Redirección si no autenticado
  useEffect(() => {
    if (!authLoading && !authenticated) {
      router.replace('/login');
    }
  }, [authLoading, authenticated, router]);

  const normalizedRole =
    ((userData?.rol ?? userData?.role) ?? '').toString().trim().toLowerCase();
  const allowed = ['admin', 'developer', 'administrador', 'instalador'].includes(normalizedRole);

  // Leer lista
  const fetchReportes = useCallback(async () => {
    try {
      setLoadingList(true);

      const params = new URLSearchParams();
      if (desde) params.set('from', isoDate(desde));
      if (hasta) params.set('to', isoDate(hasta));

      const res = await fetch(
        `${API_URL}/control-almacen/control-instaladores/read-reportes?${params.toString()}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // Acepta {data:[...]} o lista directa
      const data: Reporte[] = Array.isArray(json) ? json : (json?.data ?? []);
      setItems(data ?? []);
    } catch (e: any) {
      console.log('read-reportes error:', e?.message ?? e);
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, [token, desde, hasta]);

  useEffect(() => {
    fetchReportes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchReportes();
  }, [fetchReportes]);

  // ====== GEO HELPERS ======
  const reverseAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (!results || results.length === 0) return null;
      const r = results[0];
      // Construir una dirección humana limpia (calle, número, localidad)
      const parts = [
        r.street || r.name || '',
        r.streetNumber || '',
        r.postalCode || '',
        r.city || r.subregion || '',
        r.region || '',
        r.country || '',
      ].filter(Boolean);
      const pretty = parts.join(', ');
      return pretty || null;
    } catch {
      return null;
    }
  };

  const canUseWebGeo = () => {
    if (Platform.OS !== 'web') return true;
    const httpsOk =
      typeof window !== 'undefined' &&
      (window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1');
    return httpsOk;
  };

  const captureGeolocation = useCallback(async () => {
    try {
      setGeoStatus('loading');

      // WEB sin https -> no se puede pedir GPS (igual que seguimiento-web)
      if (!canUseWebGeo()) {
        setGeoStatus('denied');
        setForm((prev) => ({
          ...prev,
          geo_lat: null,
          geo_lng: null,
          geo_address: 'Ubicación no disponible (requiere HTTPS en navegador)',
        }));
        return;
      }

      // Pedir permisos foreground
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setGeoStatus('denied');
        setForm((prev) => ({
          ...prev,
          geo_lat: null,
          geo_lng: null,
          geo_address: 'Ubicación denegada por el usuario',
        }));
        return;
      }

      // Obtener posición
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      // Reverse geocoding a dirección
      const address = await reverseAddressFromCoords(lat, lng);

      setForm((prev) => ({
        ...prev,
        geo_lat: lat,
        geo_lng: lng,
        geo_address: address || 'Dirección no disponible',
      }));
      setGeoStatus('ok');
    } catch (err) {
      console.log('Geo error:', err);
      setGeoStatus('error');
      setForm((prev) => ({
        ...prev,
        geo_lat: null,
        geo_lng: null,
        geo_address: 'Error obteniendo ubicación',
      }));
    }
  }, []);

  // Abrir/Reset editor (CREAR)
  const openCreate = () => {
    const now = new Date();
    setEditingId(null);
    setForm({
      fecha: isoDate(now),
      nombre_instalador: '',
      obra: '',
      direccion: '',
      descripcion: '',
      status: '',
      incidencia: '',
      geo_lat: null,
      geo_lng: null,
      geo_address: null,
      hora_modal: isoTime(now), // hora fija al abrir modal (solo lectura)
    });
    setEditorVisible(true);
    // Capturar ubicación al abrir
    captureGeolocation(); // reutiliza lógica de seguimiento móvil/web 
  };

  // Abrir/Reset editor (EDITAR)
  const openEdit = (r: Reporte) => {
    const now = new Date();
    setEditingId(r.id ?? null);
    setForm({
      fecha: r.fecha ? isoDate(new Date(r.fecha)) : isoDate(now),
      nombre_instalador: r.nombre_instalador ?? '',
      obra: r.obra ?? '',
      direccion: r.direccion ?? '',
      descripcion: r.descripcion ?? '',
      status: r.status ?? '',
      incidencia: r.incidencia ?? '',
      geo_lat: r.geo_lat ?? null,
      geo_lng: r.geo_lng ?? null,
      geo_address: r.geo_address ?? null,
      // si el registro no la tiene, fija hora al abrir por primera vez
      hora_modal: r.hora_modal ?? isoTime(now),
    });
    setEditorVisible(true);
    // También intentamos refrescar geolocalización cuando se edita
    captureGeolocation();
  };

  const onDelete = async (id?: number) => {
    if (!id) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/control-almacen/control-instaladores/delete-reportes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchReportes();
    } catch (e: any) {
      console.log('delete-reportes error:', e?.message ?? e);
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    try {
      setSaving(true);
      const payload: Reporte & { id?: number } = {
        ...(editingId ? { id: editingId } : {}),
        ...form,
      };

      const url = editingId
        ? `${API_URL}/control-almacen/control-instaladores/update-reportes`
        : `${API_URL}/control-almacen/control-instaladores/create-reportes`;

      // Log del payload que se envía
      console.log('[CONTROL-REPORTES] Enviando al backend:', url, payload);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      // Log de la respuesta cruda
      const resText = await res.text();
      console.log('[CONTROL-REPORTES] Respuesta backend:', res.status, resText);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditorVisible(false);
      await fetchReportes();
    } catch (e: any) {
      console.log('save error:', e?.message ?? e);
    } finally {
      setSaving(false);
    }
  };

  // Helpers
  const setFormField = (k: keyof Reporte, v: any) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const headerCount = useMemo(() => items.length, [items]);

  // Cargando auth/storage
  if (authLoading || loadingBoot) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!authenticated) return null;
  if (!allowed) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No tiene credenciales para ver esta información</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        titleOverride="Control de Reportes (Instaladores)"
        count={headerCount}
        userNameProp={userData?.nombre || userData?.name || '—'}
        roleProp={userData?.rol || userData?.role || '—'}
        serverReachableOverride={serverReachable ?? undefined}
        onUserPress={({ userName, role }) => {
          setModalUser({ userName, role });
          setUserModalVisible(true);
        }}
      />

      <ModalHeader
        visible={userModalVisible}
        onClose={() => setUserModalVisible(false)}
        userName={userData?.nombre || userData?.name || '—'}
        role={userData?.rol || userData?.role || '—'}
      />

      {/* Estado conexión */}
      {isCheckingConnection && (
        <View style={styles.connectionBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.connectionBannerText}>Verificando conexión...</Text>
        </View>
      )}
      {serverReachable === false && !isCheckingConnection && (
        <View style={[styles.connectionBanner, styles.connectionBannerError]}>
          <Ionicons name="cloud-offline-outline" size={20} color="#fff" />
          <Text style={styles.connectionBannerText}>Sin conexión al servidor</Text>
        </View>
      )}

      {/* Filtro rango de fechas + botón agregar */}
      <View style={styles.filtersRow}>
        <DateField label="Desde" value={desde} onChange={setDesde} />
        <DateField label="Hasta" value={hasta} onChange={setHasta} />
        <TouchableOpacity style={styles.filterAction} onPress={fetchReportes}>
          <Ionicons name="funnel-outline" size={18} color="#fff" />
          <Text style={styles.filterActionText}>Filtrar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Agregar reporte</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {loadingList ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : filteredItems.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="file-tray-outline" size={56} color="#9CA3AF" />
          <Text style={styles.cardText}>Sin resultados para el rango seleccionado.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(it, idx) => String(it.id ?? idx)}
          style={Platform.OS === 'web' ? styles.flatListWeb : styles.flatListMobile}
          contentContainerStyle={Platform.OS === 'web' ? styles.flatListContentWeb : undefined}
          numColumns={Platform.OS === 'web' ? 3 : 1}
          key={Platform.OS === 'web' ? 'web-3-cols' : 'mobile-1-col'}
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                Platform.OS === 'web' ? styles.cardWeb : undefined,
              ]}
            >
              <View style={styles.mainRowContainer}>
                <View style={styles.leftColumn}>
                  <Text style={styles.cardTitle}>{item.obra || 'Obra sin nombre'}</Text>
                  <Text style={styles.cardText}>Fecha: {niceDate(item.fecha)}</Text>
                  <Text style={styles.cardText}>Instalador: {item.nombre_instalador || '—'}</Text>
                  <Text style={styles.cardText}>Dirección: {item.direccion || '—'}</Text>
                  <Text style={styles.cardText}>Status: {item.status || '—'}</Text>
                  <Text style={styles.cardText}>Incidencia: {item.incidencia || '—'}</Text>
                  {/* Mini-mapa con pin */}
                  {typeof item.geo_lat === 'number' && isFinite(item.geo_lat) &&
                   typeof item.geo_lng === 'number' && isFinite(item.geo_lng) ? (
                    <MiniMap lat={item.geo_lat} lng={item.geo_lng} />
                  ) : null}
                  {item.geo_address || item.geo_lat ? (
                    <View style={styles.geoBadge}>
                      <Ionicons name="location-outline" size={16} color="#2563EB" />
                      <Text style={styles.geoBadgeText}>
                        {item.geo_address ? item.geo_address : 'Ubicación capturada'}
                        {typeof item.geo_lat === 'number' && isFinite(item.geo_lat) && typeof item.geo_lng === 'number' && isFinite(item.geo_lng)
                          ? `  ·  (${item.geo_lat.toFixed(6)}, ${item.geo_lng.toFixed(6)})`
                          : ''}
                      </Text>
                    </View>
                  ) : null}
                  {item.hora_modal ? (
                    <Text style={[styles.cardText, { marginTop: 6 }]}> 
                      Hora (apertura modal): {item.hora_modal}
                    </Text>
                  ) : null}
                  {item.descripcion ? (
                    <Text style={[styles.cardText, { marginTop: 6 }]}> 
                      Descripción: {item.descripcion}
                    </Text>
                  ) : null}
                </View>

                {/* Botonera CRUD (sin crear) */}
                <View style={styles.rightColumn}>
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[styles.smallBtn, styles.btnInfo]}
                      onPress={() => openEdit(item)}
                    >
                      <Ionicons name="create-outline" size={16} color="#fff" />
                      <Text style={styles.smallBtnText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.smallBtn, styles.btnDanger]}
                      onPress={() => onDelete(item.id)}
                      disabled={saving}
                    >
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                      <Text style={styles.smallBtnText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal Crear/Editar */}
      <Modal visible={editorVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Editar reporte' : 'Nuevo reporte'}
            </Text>

            <ScrollView style={styles.modalScrollView}>
              {/* Fecha, Hora y Ubicación organizados/resaltados */}
              {Platform.OS === 'web' ? (
                <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                  {/* Fecha */}
                  <View style={{ flex: 1 }}>
                    <Pressable style={[styles.geoBadgeLarge, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                      disabled>
                      <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.geoBadgeTitle}>Fecha</Text>
                        <Text style={styles.geoBadgeSubtitle}>{form.fecha ? niceDate(form.fecha) : '—'}</Text>
                      </View>
                    </Pressable>
                  </View>
                  {/* Hora */}
                  <View style={{ flex: 1 }}>
                    <Pressable style={[styles.geoBadgeLarge, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                      disabled>
                      <Ionicons name="time-outline" size={18} color="#2563EB" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.geoBadgeTitle}>Hora</Text>
                        <Text style={styles.geoBadgeSubtitle}>{form.hora_modal || '—'}</Text>
                      </View>
                    </Pressable>
                  </View>
                  {/* Ubicación */}
                  <View style={{ flex: 2 }}>
                    <Pressable
                      onPress={() => captureGeolocation()}
                      style={[
                        styles.geoBadgeLarge,
                        geoStatus === 'loading' ? styles.geoBadgeLoading : undefined,
                        { flexDirection: 'row', alignItems: 'center', gap: 10 }
                      ]}
                    >
                      <Ionicons name="navigate-outline" size={18} color="#2563EB" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.geoBadgeTitle}>
                          {geoStatus === 'loading' ? 'Obteniendo ubicación...' : 'Ubicación actual'}
                        </Text>
                        <Text style={styles.geoBadgeSubtitle}>
                          {form.geo_address
                            ? form.geo_address
                            : geoStatus === 'denied'
                            ? 'Permiso denegado'
                            : geoStatus === 'error'
                            ? 'Error al obtener la ubicación'
                            : 'Toca para actualizar'}
                          {form.geo_lat && form.geo_lng
                            ? `  ·  (${form.geo_lat.toFixed(6)}, ${form.geo_lng.toFixed(6)})`
                            : ''}
                        </Text>
                      </View>
                      <Ionicons name="refresh-outline" size={18} color="#2563EB" />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
                    {/* Fecha */}
                    <View style={{ flex: 1 }}>
                      <Pressable style={[styles.geoBadgeLarge, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                        disabled>
                        <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.geoBadgeTitle}>Fecha</Text>
                          <Text style={styles.geoBadgeSubtitle}>{form.fecha ? niceDate(form.fecha) : '—'}</Text>
                        </View>
                      </Pressable>
                    </View>
                    {/* Hora */}
                    <View style={{ flex: 1 }}>
                      <Pressable style={[styles.geoBadgeLarge, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                        disabled>
                        <Ionicons name="time-outline" size={18} color="#2563EB" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.geoBadgeTitle}>Hora</Text>
                          <Text style={styles.geoBadgeSubtitle}>{form.hora_modal || '—'}</Text>
                        </View>
                      </Pressable>
                    </View>
                  </View>
                  {/* Ubicación */}
                  <Pressable
                    onPress={() => captureGeolocation()}
                    style={[
                      styles.geoBadgeLarge,
                      geoStatus === 'loading' ? styles.geoBadgeLoading : undefined,
                      { flexDirection: 'row', alignItems: 'center', gap: 10 }
                    ]}
                  >
                    <Ionicons name="navigate-outline" size={18} color="#2563EB" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.geoBadgeTitle}>
                        {geoStatus === 'loading' ? 'Obteniendo ubicación...' : 'Ubicación actual'}
                      </Text>
                      <Text style={styles.geoBadgeSubtitle}>
                        {form.geo_address
                          ? form.geo_address
                          : geoStatus === 'denied'
                          ? 'Permiso denegado'
                          : geoStatus === 'error'
                          ? 'Error al obtener la ubicación'
                          : 'Toca para actualizar'}
                        {form.geo_lat && form.geo_lng
                          ? `  ·  (${form.geo_lat.toFixed(6)}, ${form.geo_lng.toFixed(6)})`
                          : ''}
                      </Text>
                    </View>
                    <Ionicons name="refresh-outline" size={18} color="#2563EB" />
                  </Pressable>
                </>
              )}

              {/* Nombre instalador */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre del instalador</Text>
                <TextInput
                  value={form.nombre_instalador}
                  onChangeText={(t) => setFormField('nombre_instalador', t)}
                  style={styles.input}
                  placeholder="Ej. Juan Pérez"
                />
              </View>

              {/* Obra */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Obra</Text>
                <TextInput
                  value={form.obra}
                  onChangeText={(t) => setFormField('obra', t)}
                  style={styles.input}
                  placeholder="Nombre de la obra"
                />
              </View>

              {/* Dirección */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dirección</Text>
                <TextInput
                  value={form.direccion}
                  onChangeText={(t) => setFormField('direccion', t)}
                  style={styles.input}
                  placeholder="Calle, número, ciudad"
                />
              </View>

              {/* Descripción */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Descripción</Text>
                <TextInput
                  value={form.descripcion}
                  onChangeText={(t) => setFormField('descripcion', t)}
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Detalles del reporte"
                  multiline
                />
              </View>

              {/* Status */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Status</Text>
                <TextInput
                  value={form.status}
                  onChangeText={(t) => setFormField('status', t)}
                  style={styles.input}
                  placeholder="Ej. pendiente, en curso, finalizado"
                />
              </View>

              {/* Incidencia */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Incidencia</Text>
                <TextInput
                  value={form.incidencia}
                  onChangeText={(t) => setFormField('incidencia', t)}
                  style={styles.input}
                  placeholder="Ej. rotura vidrio, falta material"
                />
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <Pressable
                style={[styles.closeButton, { backgroundColor: '#6B7280' }]}
                onPress={() => setEditorVisible(false)}
                disabled={saving}
              >
                <Text style={styles.closeText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.closeButton}
                onPress={onSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.closeText}>{editingId ? 'Actualizar' : 'Guardar'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', fontSize: 16 },

  flatListWeb: { width: '100%', alignSelf: 'stretch', paddingHorizontal: 16 },
  flatListContentWeb: { paddingVertical: 16, paddingHorizontal: 8 },
  flatListMobile: {},

  cardWeb: {
    flex: 1,
    maxWidth: '25%',
    minWidth: 250,
    marginBottom: 16,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  card: {
    margin: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4, color: '#111827' },
  cardText: { color: '#111827', fontSize: 14, marginBottom: 2 },
  mainRowContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch', gap: 12 },
  leftColumn: { flex: 1, paddingRight: 8 },
  rightColumn: { alignItems: 'flex-end', justifyContent: 'center' },
  buttonContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  smallBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnInfo: { backgroundColor: '#2563EB' },
  btnDanger: { backgroundColor: '#DC2626' },

  connectionBannerText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  

  // Header filtros
  filtersRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  filterAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111827', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  filterActionText: { color: '#fff', fontWeight: '700' },
  addButton: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  addButtonText: { color: '#fff', fontWeight: '700' },

  // Date field
  dateFieldContainer: { flexDirection: 'column', flex: 0, minWidth: 210, gap: 6 },
  dateLabel: { color: '#374151', fontSize: 13, marginLeft: 2 },
  nativeDateButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff' },
  nativeDateText: { color: '#111827' },
  webDateInput: {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    border: '1px solid #D1D5DB',
    backgroundColor: '#fff',
    color: '#111827',
  } as any,

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 12 },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    maxHeight: '88%',
    ...(Platform.OS === 'web' ? { width: '50%', alignSelf: 'center' } : {}),
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#111827' },
  modalScrollView: { maxHeight: 520 },

  // Inputs
  inputGroup: { marginBottom: 12 },
  inputLabel: { color: '#374151', fontSize: 13, marginBottom: 6, marginLeft: 2 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', color: '#111827' },
  inputMultiline: { height: 90, textAlignVertical: 'top' },
  inputReadonly: { backgroundColor: '#F3F4F6', color: '#6B7280' },

  // Geo badge
  geoBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 }),
  },
  geoBadgeText: { color: '#1E3A8A', fontSize: 12 },

  geoBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 3px 12px rgba(0,0,0,0.13)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }),
  },
  geoBadgeLoading: { opacity: 0.6 },
  geoBadgeTitle: { color: '#1E40AF', fontWeight: '700', marginBottom: 2 },
  geoBadgeSubtitle: { color: '#1E3A8A', fontSize: 12, flexWrap: 'wrap', maxWidth: 520 },

  // Botones modal
  closeButton: { backgroundColor: '#2563EB', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  closeText: { color: '#fff', fontWeight: '700' },

  // Banners
  connectionBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#111827' },
  connectionBannerError: { backgroundColor: '#B91C1C' },
});
