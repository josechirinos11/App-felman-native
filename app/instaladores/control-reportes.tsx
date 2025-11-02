// app/control/control-reportes.tsx
// comentario 31/10/2025 actualizacion
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  equipo_montador?: string;
  obra: string;
  cliente?: string;
  direccion: string;
  tipo_trabajo?: string;
  descripcion: string;
  status: string;
  incidencia: string;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_address?: string | null;   // calle/dirección humana
  hora_inicio?: string;
  hora_fin?: string;
  unidades?: number;
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

  // Estado para usuarios obtenidos del backend
  const [usuarios, setUsuarios] = useState<Array<{
    nombre: string;
    rol: string;
    grupo_instaladores: 'Alfa' | 'Bravo' | 'Beta' | 'Felman';
    telefono?: string | null;
  }>>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // Fetch usuarios al montar
  useEffect(() => {
    const fetchUsuarios = async () => {
      setLoadingUsuarios(true);
      try {
        const res = await fetch(`${API_URL}/control-almacen/control-instaladores/obtenerinformacionUsuario`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        // Acepta {data:[...]} o lista directa
        const data = Array.isArray(json) ? json : (json?.data ?? []);
        setUsuarios(data);
        // Opcional: log para depuración
        // console.log('[CONTROL-REPORTES] Usuarios:', data);
      } catch (e) {
        setUsuarios([]);
        // console.log('Error obteniendo usuarios:', e);
      } finally {
        setLoadingUsuarios(false);
      }
    };
    fetchUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Filtro de fechas: semana actual (lunes a domingo)
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Si es domingo, retrocede 6 días
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const getSunday = (d: Date) => {
    const monday = getMonday(d);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  };
  const [desde, setDesde] = useState<Date | null>(() => getMonday(new Date()));
  const [hasta, setHasta] = useState<Date | null>(() => getSunday(new Date()));

  // Datos
  const [items, setItems] = useState<Reporte[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Filtrado local de fechas y por usuario/rol
  const filteredItems = useMemo(() => {
    // Primero filtrar por fechas
    let filtered = items;
    if (desde || hasta) {
      filtered = filtered.filter((item) => {
        const itemDate = item.fecha?.slice(0, 10); // yyyy-mm-dd
        const desdeStr = desde ? isoDate(desde) : null;
        const hastaStr = hasta ? isoDate(hasta) : null;
        if (desdeStr && itemDate < desdeStr) return false;
        if (hastaStr && itemDate > hastaStr) return false;
        return true;
      });
    }

    // Filtrar por usuario autenticado si es instalador
    const role = (userData?.rol || userData?.role || '').toLowerCase();
    if (role === 'instalador') {
      const nombre = (userData?.nombre || userData?.name || '').toString().trim().toLowerCase();
      filtered = filtered.filter((item) =>
        (item.nombre_instalador || '').toString().trim().toLowerCase() === nombre
      );
    }
    // Si es supervisor, administrador, admin o developer ve todos
    // (ya está filtrado por fechas)
    return filtered;
  }, [items, desde, hasta, userData]);

  // Modal usuario / header
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = React.useState({ userName: '', role: '' });

  // Modal crear/editar
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Reporte>({
    fecha: isoDate(new Date()),
    nombre_instalador: '',
    equipo_montador: '',
    obra: '',
    cliente: '',
    direccion: '',
    tipo_trabajo: '',
    descripcion: '',
    status: '',
    incidencia: '',
    geo_lat: null,
    geo_lng: null,
    geo_address: null,
    hora_inicio: '',
    hora_fin: '',
    unidades: undefined,
  });
  const [saving, setSaving] = useState(false);
  // Estado para deshabilitar nombre_instalador y equipo_montador si se autocompletan
  const [lockNombreEquipo, setLockNombreEquipo] = useState(false);
  // Estado para deshabilitar dirección si se autocompleta por geolocalización
  const [lockDireccion, setLockDireccion] = useState(false);

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
  const allowed = ['admin', 'developer', 'administrador', 'supervisor', 'instalador'].includes(normalizedRole);

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

    console.log('[CONTROL-REPORTES] Respuesta backend (raw):', JSON.stringify(json));

    let data: Reporte[] = Array.isArray(json) ? json : (json?.data ?? []);
    // Convertir geo_lat, geo_lng Y normalizar fecha a solo yyyy-mm-dd
    data = data.map((item) => ({
      ...item,
      // CAMBIO CRÍTICO: Normalizar la fecha del backend a solo yyyy-mm-dd
      fecha: item.fecha ? new Date(item.fecha).toISOString().slice(0, 10) : item.fecha,
      geo_lat: item.geo_lat != null ? Number(item.geo_lat) : null,
      geo_lng: item.geo_lng != null ? Number(item.geo_lng) : null,
    }));
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
  const openCreate = async () => {
    const now = new Date();
    let nombre_instalador = '';
    let equipo_montador = '';
    let lock = false;
    // Buscar coincidencia de usuario autenticado en la lista de usuarios
    if (userData && usuarios && usuarios.length > 0) {
      // Normalizar nombre para comparar
      const nombreAuth = (userData.nombre || userData.name || '').toString().trim().toLowerCase();
      const usuarioEncontrado = usuarios.find(u => (u.nombre || '').toString().trim().toLowerCase() === nombreAuth);
      if (usuarioEncontrado) {
        nombre_instalador = usuarioEncontrado.nombre;
        equipo_montador = usuarioEncontrado.grupo_instaladores;
        lock = true;
      }
    }
    setEditingId(null);
    // Intentar capturar geolocalización y autocompletar dirección si es posible
    let direccionGeo = '';
    let lockDir = false;
    try {
      // WEB sin https -> no se puede pedir GPS (igual que seguimiento-web)
      const canGeo = canUseWebGeo();
      if (canGeo) {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          const address = await reverseAddressFromCoords(lat, lng);
          if (address && address.trim() !== '') {
            direccionGeo = address;
            lockDir = true;
          }
        }
      }
    } catch { }
    setForm({
      fecha: isoDate(now),
      nombre_instalador,
      equipo_montador,
      obra: '',
      direccion: direccionGeo,
      descripcion: '',
      status: '',
      incidencia: '',
      geo_lat: null,
      geo_lng: null,
      geo_address: null,
      hora_inicio: isoTime(now), // hora fija al abrir modal (hora de inicio)
      hora_fin: '',
      unidades: undefined,
    });
    setLockNombreEquipo(lock);
    setLockDireccion(lockDir);
    setEditorVisible(true);
    // Capturar ubicación al abrir (para mantener la lógica previa, pero ya se usó arriba)
    captureGeolocation(); // reutiliza lógica de seguimiento móvil/web 
  };

  // Abrir/Reset editor (EDITAR)
  const openEdit = (r: Reporte) => {
    const now = new Date();
    setEditingId(r.id ?? null);
    setForm({
      fecha: r.fecha ? isoDate(new Date(r.fecha)) : isoDate(now),
      nombre_instalador: r.nombre_instalador ?? '',
      equipo_montador: r.equipo_montador ?? '',
      obra: r.obra ?? '',
      cliente: r.cliente ?? '',
      direccion: r.direccion ?? '',
      tipo_trabajo: r.tipo_trabajo ?? '',
      descripcion: r.descripcion ?? '',
      status: r.status ?? '',
      incidencia: r.incidencia ?? '',
      geo_lat: r.geo_lat ?? null,
      geo_lng: r.geo_lng ?? null,
      geo_address: r.geo_address ?? null,
      hora_inicio: r.hora_inicio ?? isoTime(now),
      hora_fin: r.hora_fin ?? '',
      unidades: r.unidades,
    });
    setEditorVisible(true);
    // Ya no se solicita geolocalización al editar
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
    // Validación de campos obligatorios
    const requiredFields: { key: keyof Reporte; label: string }[] = [
      { key: 'fecha', label: 'Fecha' },
      { key: 'nombre_instalador', label: 'Nombre del instalador' },
      { key: 'obra', label: 'Obra' },
      { key: 'direccion', label: 'Dirección' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'status', label: 'Status' },
      { key: 'unidades', label: 'Unidades' },
      { key: 'cliente', label: 'Cliente' },
      { key: 'tipo_trabajo', label: 'Tipo de trabajo' },
      { key: 'equipo_montador', label: 'Equipo montador' },
    ];
    const missing = requiredFields.filter(f => !form[f.key] || (typeof form[f.key] === 'string' && (form[f.key] as string).trim() === ''));
    if (missing.length > 0) {
      Alert.alert(
        'Campos obligatorios',
        `Por favor complete los siguientes campos:\n- ${missing.map(f => f.label).join('\n- ')}`
      );
      return;
    }
    try {
      setSaving(true);
      // Asegurar que incidencia tenga valor por defecto
      const incidenciaValue = form.incidencia && form.incidencia.trim() !== '' ? form.incidencia : 'sin incidencia';
      const payload: Reporte & { id?: number } = {
        ...(editingId ? { id: editingId } : {}),
        ...form,
        incidencia: incidenciaValue,
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

  // Cerrar salida: actualiza hora_fin
  const cerrarSalida = async (item: Reporte) => {
    if (!item.id) return;
    try {
      setSaving(true);
      const now = new Date();
      const hora_fin = isoTime(now);
      // Asegurar que fecha esté en formato YYYY-MM-DD
      const payload = {
        ...item,
        fecha: item.fecha ? item.fecha.slice(0, 10) : undefined,
        hora_fin,
      };
      console.log('[CONTROL-REPORTES] Payload cerrarSalida:', JSON.stringify(payload));
      const url = `${API_URL}/control-almacen/control-instaladores/update-reportes`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const resText = await res.text();
      console.log('[CONTROL-REPORTES] Cerrar salida:', res.status, resText);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchReportes();
    } catch (e: any) {
      console.log('cerrarSalida error:', e?.message ?? e);
    } finally {
      setSaving(false);
    }
  };

  const headerCount = useMemo(() => items.length, [items]);

  // Cargando auth/storage o usuarios
  if (authLoading || loadingBoot || loadingUsuarios) {
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

  // Ejemplo de uso: mostrar cantidad de usuarios obtenidos (puedes eliminar esto si no lo necesitas)
  // console.log('Usuarios obtenidos:', usuarios.length);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        titleOverride="Control de Reportes (Instaladores)"
        count={headerCount}
        userNameProp={userData?.nombre || userData?.name || '—'}
        roleProp={userData?.rol || userData?.role || '—'}
        {...(typeof serverReachable === 'boolean' ? { serverReachableOverride: serverReachable } : {})}
        onUserPress={({ userName, role }) => {
          setModalUser({ userName, role });
          setUserModalVisible(true);
        }}
        onRefresh={fetchReportes}
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
      {Platform.OS === 'web' ? (
        <View style={styles.filtersRowWeb}>
          <DateField label="Desde" value={desde} onChange={setDesde} />
          <DateField label="Hasta" value={hasta} onChange={setHasta} />
          <TouchableOpacity style={styles.filterActionWeb} onPress={fetchReportes}>
            <Ionicons name="funnel-outline" size={18} color="#fff" />
            <Text style={styles.filterActionText}>Filtrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={openCreate}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Agregar reporte</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.filtersRowMobile}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <DateField label="Desde" value={desde} onChange={setDesde} />
            <DateField label="Hasta" value={hasta} onChange={setHasta} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            <TouchableOpacity style={styles.filterAction} onPress={fetchReportes}>
              <Ionicons name="funnel-outline" size={18} color="#fff" />
              <Text style={styles.filterActionText}>Filtrar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={openCreate}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Agregar reporte</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
              {/* Primer renglón: info a la izquierda, mapa a la derecha */}
              {Platform.OS === 'web' ? (
                <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12 }}>
                  <View style={{ flex: 2, paddingRight: 8 }}>
                    <Text style={[styles.cardTitle, { color: '#111827' }]}>{item.obra || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Fecha: {item.fecha ? niceDate(item.fecha) : 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Instalador: {item.nombre_instalador || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Equipo montador: {item.equipo_montador || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Cliente: {item.cliente || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Dirección: {item.direccion || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Tipo de trabajo: {item.tipo_trabajo || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Status: {item.status || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Unidades: {typeof item.unidades === 'number' ? item.unidades : 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Incidencia: {item.incidencia && item.incidencia.trim() !== '' ? item.incidencia : 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Descripción: {item.descripcion || 'Sin Información'}</Text>
                    {/* <Text style={[styles.cardText, { color: '#111827' }]}>Hora salida: {item.hora_modal_final || 'Sin Información'}</Text> */}
                    <Text style={[styles.cardText, { color: '#111827' }]}>Hora inicio: {item.hora_inicio || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Hora fin: {item.hora_fin || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#1E40AF', fontStyle: 'italic' }]}>Calle: {item.geo_address || 'Sin Información'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 140, maxWidth: 220, justifyContent: 'center', alignItems: 'center' }}>
                    <MiniMap
                      lat={typeof item.geo_lat === 'number' && isFinite(item.geo_lat) ? item.geo_lat : 0}
                      lng={typeof item.geo_lng === 'number' && isFinite(item.geo_lng) ? item.geo_lng : 0}
                    />
                    {!(Number.isFinite(item.geo_lat) && Number.isFinite(item.geo_lng)) && (
                      <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                        No se ubican las coordenadas, intentar más tarde
                      </Text>
                    )}
                  </View>
                </View>
              ) : (
                <>
                  {/* Primer renglón: toda la información */}
                  <View style={{ marginBottom: 8 }}>
                    <Text style={[styles.cardTitle, { color: '#111827' }]}>{item.obra || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Fecha: {item.fecha ? niceDate(item.fecha) : 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Instalador: {item.nombre_instalador || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Equipo montador: {item.equipo_montador || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Cliente: {item.cliente || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Dirección: {item.direccion || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Tipo de trabajo: {item.tipo_trabajo || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Status: {item.status || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Unidades: {typeof item.unidades === 'number' ? item.unidades : 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Incidencia: {item.incidencia && item.incidencia.trim() !== '' ? item.incidencia : 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Descripción: {item.descripcion || 'Sin Información'}</Text>
                    {/* <Text style={[styles.cardText, { color: '#111827' }]}>Hora salida: {item.hora_modal_final || 'Sin Información'}</Text> */}
                    <Text style={[styles.cardText, { color: '#111827' }]}>Hora inicio: {item.hora_inicio || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#111827' }]}>Hora fin: {item.hora_fin || 'Sin Información'}</Text>
                    <Text style={[styles.cardText, { color: '#1E40AF', fontStyle: 'italic' }]}>Calle: {item.geo_address || 'Sin Información'}</Text>
                    {/* Latitud y Longitud eliminados del listado */}
                  </View>
                  {/* Segundo renglón: mapa rectangular más ancho que alto */}
                  <View style={{ width: '100%', aspectRatio: 2.5, minHeight: 80, maxHeight: 160, marginBottom: 8, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' }}>
                    <MiniMap
                      lat={typeof item.geo_lat === 'number' && isFinite(item.geo_lat) ? item.geo_lat : 0}
                      lng={typeof item.geo_lng === 'number' && isFinite(item.geo_lng) ? item.geo_lng : 0}
                    />
                    {!(Number.isFinite(item.geo_lat) && Number.isFinite(item.geo_lng)) && (
                      <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                        No se ubican las coordenadas, intentar más tarde
                      </Text>
                    )}
                  </View>
                </>
              )}
              {/* Segundo renglón: botones editar y eliminar */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.smallBtn, styles.btnInfo]}
                  onPress={() => openEdit(item)}
                >
                  <Ionicons name="create-outline" size={16} color="#374151" />
                  <Text style={[styles.smallBtnText, { color: '#374151' }]}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.smallBtn,
                    { backgroundColor: '#D1D5DB' },
                    (saving || (item.hora_fin && item.hora_fin !== '' && item.hora_fin !== 'Sin Información')) && styles.btnDisabled
                  ]}
                  onPress={() => cerrarSalida(item)}
                  disabled={
                    !!saving ||
                    (!!item.hora_fin && item.hora_fin !== '' && item.hora_fin !== 'Sin Información')
                  }
                >
                  <Ionicons name="exit-outline" size={16} color={
                    (saving || (item.hora_fin && item.hora_fin !== '' && item.hora_fin !== 'Sin Información'))
                      ? '#9CA3AF'
                      : '#374151'
                  } />
                  <Text style={[styles.smallBtnText, {
                    color:
                      (saving || (item.hora_fin && item.hora_fin !== '' && item.hora_fin !== 'Sin Información'))
                        ? '#9CA3AF'
                        : '#374151'
                  }]}>Cerrar salida</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, styles.btnDanger]}
                  onPress={() => {
                    const allowedRoles = ['admin', 'developer', 'administrador', 'supervisor'];
                    const userRole = (userData?.rol || userData?.role || '').toLowerCase();
                    if (allowedRoles.includes(userRole)) {
                      onDelete(item.id);
                    } else {
                      Alert.alert(
                        'Sin permiso',
                        'No puedes eliminar este registro. Habla con tu supervisor.'
                      );
                    }
                  }}
                  disabled={saving}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.smallBtnText}>Eliminar</Text>
                </TouchableOpacity>
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
                  {/* Hora inicio */}
                  <View style={{ flex: 1 }}>
                    <Pressable style={[styles.geoBadgeLarge, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                      disabled>
                      <Ionicons name="time-outline" size={18} color="#2563EB" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.geoBadgeTitle}>Hora inicio</Text>
                        <Text style={styles.geoBadgeSubtitle}>{form.hora_inicio || '—'}</Text>
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
                    {/* Hora inicio */}
                    <View style={{ flex: 1 }}>
                      <Pressable style={[styles.geoBadgeLarge, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                        disabled>
                        <Ionicons name="time-outline" size={18} color="#2563EB" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.geoBadgeTitle}>Hora inicio</Text>
                          <Text style={styles.geoBadgeSubtitle}>{form.hora_inicio || '—'}</Text>
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

              {/* Nombre instalador (Picker) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: '#111827' }]}>Nombre del instalador</Text>
                <View style={[styles.input, { padding: 0, opacity: lockNombreEquipo ? 0.6 : 1 }]}>
                  <Picker
                    selectedValue={form.nombre_instalador}
                    onValueChange={(v) => {
                      setFormField('nombre_instalador', v);
                      // Buscar el grupo correspondiente y setearlo automáticamente
                      const usuario = usuarios.find(u => u.nombre === v);
                      if (usuario) {
                        setFormField('equipo_montador', usuario.grupo_instaladores);
                      }
                      setLockNombreEquipo(false); // Si el usuario cambia manualmente, desbloquear
                    }}
                    enabled={!lockNombreEquipo}
                    style={{ color: '#111827' }}
                  >
                    <Picker.Item label="Seleccione..." value="" color="#111827" />
                    {usuarios.map((u, idx) => (
                      <Picker.Item key={u.nombre + idx} label={u.nombre} value={u.nombre} color="#111827" />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Equipo montador (Picker de grupo_instaladores) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: '#111827' }]}>Equipo montador</Text>
                <View style={[styles.input, { padding: 0, opacity: lockNombreEquipo ? 0.6 : 1 }]}>
                  <Picker
                    selectedValue={form.equipo_montador}
                    onValueChange={(v) => setFormField('equipo_montador', v)}
                    enabled={!lockNombreEquipo}
                    style={{ color: '#111827' }}
                  >
                    <Picker.Item label="Seleccione..." value="" color="#111827" />
                    {/* Mostrar solo grupos únicos */}
                    {[...new Set(usuarios.map(u => u.grupo_instaladores))].map((grupo, idx) => (
                      <Picker.Item key={grupo + idx} label={grupo} value={grupo} color="#111827" />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Obra */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: '#111827' }]}>Obra</Text>
                <TextInput
                  value={form.obra}
                  onChangeText={(t) => setFormField('obra', t)}
                  style={styles.input}
                  placeholder="Nombre de la obra"
                />
              </View>

              {/* Cliente */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: '#111827' }]}>Cliente</Text>
                <TextInput
                  value={form.cliente}
                  onChangeText={(t) => setFormField('cliente', t)}
                  style={styles.input}
                  placeholder="Nombre del cliente"
                />
              </View>

              {/* Dirección */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: '#111827' }]}>Dirección</Text>
                <TextInput
                  value={form.direccion}
                  onChangeText={(t) => setFormField('direccion', t)}
                  style={[styles.input, lockDireccion && styles.inputReadonly]}
                  placeholder="Calle, número, ciudad"
                  editable={!lockDireccion}
                />
              </View>

              {/* Tipo de trabajo */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: '#111827' }]}>Tipo de trabajo</Text>
                <View style={[styles.input, { padding: 0 }]}>
                  <Picker
                    selectedValue={form.tipo_trabajo}
                    onValueChange={(v) => setFormField('tipo_trabajo', v)}
                    style={{ color: '#111827' }}
                  >
                    <Picker.Item label="Seleccione..." value="" color="#111827" />
                    <Picker.Item label="Obra nueva" value="Obra nueva" color="#111827" />
                    <Picker.Item label="Reforma" value="Reforma" color="#111827" />
                    <Picker.Item label="Particular" value="Particular" color="#111827" />
                    <Picker.Item label="Reparación" value="Reparación" color="#111827" />
                    <Picker.Item label="Medición" value="Medición" color="#111827" />
                    <Picker.Item label="Ajuste" value="Ajuste" color="#111827" />
                    <Picker.Item label="Instalación" value="Instalación" color="#111827" />
                    <Picker.Item label="Incidencia" value="Incidencia" color="#111827" />
                  </Picker>
                </View>
              </View>

              {/* Incidencia solo si tipo_trabajo es Incidencia */}
              {form.tipo_trabajo === 'Incidencia' && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: '#111827' }]}>Incidencia</Text>
                  <TextInput
                    value={form.incidencia}
                    onChangeText={(t) => setFormField('incidencia', t)}
                    style={styles.input}
                    placeholder="Describa la incidencia"
                  />
                </View>
              )}

              {/* Descripción */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: '#111827' }]}>Descripción</Text>
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
                <Text style={[styles.inputLabel, { color: '#111827' }]}>Status</Text>
                <TextInput
                  value={form.status}
                  onChangeText={(t) => setFormField('status', t)}
                  style={styles.input}
                  placeholder="Ej. pendiente, en curso, finalizado"
                />
              </View>

              {/* Unidades */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: '#111827' }]}>Unidades</Text>
                <TextInput
                  value={form.unidades?.toString() || ''}
                  onChangeText={(t) => setFormField('unidades', t.replace(/\D/g, ''))}
                  style={styles.input}
                  placeholder="Cantidad de unidades"
                  keyboardType="numeric"
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
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#E5E7EB' },
  smallBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnInfo: { backgroundColor: '#D1D5DB' }, // gris claro
  btnDisabled: { backgroundColor: 'rgba(229,231,235,0.4)' }, // gris claro/transparente
  btnDanger: { backgroundColor: '#DC2626' },

  connectionBannerText: { color: '#fff', fontSize: 14, fontWeight: '500' },


  // Header filtros
  // Filtros (responsive)
  filtersRowWeb: { flexDirection: 'row', alignItems: 'flex-end', gap: 24, paddingHorizontal: 12, paddingVertical: 10 },
  filtersRowMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 0, paddingHorizontal: 12, paddingVertical: 10 },
  filterAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111827', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  filterActionWeb: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#111827', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, marginRight: 8 },
  filterActionText: { color: '#fff', fontWeight: '700' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
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
