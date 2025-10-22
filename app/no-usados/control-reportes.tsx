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

import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import { API_URL } from '../../config/constants';
import COLORS from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineMode } from '../../hooks/useOfflineMode';

// ✅ (Móvil nativo) Date Picker
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

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
  fecha: string; // ISO yyyy-mm-dd o ISO completa
  nombre_instalador: string; // “nombre del instalado” → estandarizo como instalador
  obra: string;
  direccion: string;
  descripcion: string;
  status: string;
  incidencia: string;
};

const isoDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const niceDate = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// Campo de fecha multiplataforma (web: <input type="date">, móvil: DateTimePickerAndroid)
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
        {/* Web: input nativo del navegador */}
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

  // Móvil / nativo
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
  });
  const [saving, setSaving] = useState(false);

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
        `${API_URL}/control-instaladores/read-reportes?${params.toString()}`,
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
    // carga inicial
    fetchReportes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refiltrar cuando cambie rango
  useEffect(() => {
    fetchReportes();
  }, [fetchReportes]);

  // Abrir/Reset editor
  const openCreate = () => {
    setEditingId(null);
    setForm({
      fecha: isoDate(new Date()),
      nombre_instalador: '',
      obra: '',
      direccion: '',
      descripcion: '',
      status: '',
      incidencia: '',
    });
    setEditorVisible(true);
  };

  const openEdit = (r: Reporte) => {
    setEditingId(r.id ?? null);
    setForm({
      fecha: r.fecha ? isoDate(new Date(r.fecha)) : isoDate(new Date()),
      nombre_instalador: r.nombre_instalador ?? '',
      obra: r.obra ?? '',
      direccion: r.direccion ?? '',
      descripcion: r.descripcion ?? '',
      status: r.status ?? '',
      incidencia: r.incidencia ?? '',
    });
    setEditorVisible(true);
  };

  const onDelete = async (id?: number) => {
    if (!id) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/control-instaladores/delete-reportes`, {
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
        ? `${API_URL}/control-instaladores/update-reportes`
        : `${API_URL}/control-instaladores/create-reportes`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

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
  const setFormField = (k: keyof Reporte, v: string) =>
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
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="file-tray-outline" size={56} color="#9CA3AF" />
          <Text style={styles.cardText}>Sin resultados para el rango seleccionado.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
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
              {/* Fecha (usa datefield web/nativo) */}
              <DateField
                label="Fecha"
                value={form.fecha ? new Date(form.fecha) : null}
                onChange={(d) => setFormField('fecha', isoDate(d))}
              />

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
  // --- Unificados, sin duplicados ---
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
  card: { margin: 8, padding: 16, borderRadius: 12, elevation: 3, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4, color: '#111827' },
  cardText: { color: '#111827', fontSize: 14, marginBottom: 2 },
  mainRowContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch', gap: 12 },
  leftColumn: { flex: 1, paddingRight: 8 },
  rightColumn: { alignItems: 'flex-end', justifyContent: 'center' },
  buttonContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  smallBtnText: { color: '#fff', fontWeight: '600' },
  btnInfo: { backgroundColor: '#4F46E5' },
  btnDanger: { backgroundColor: '#DC2626' },
  connectionBanner: { backgroundColor: '#2196F3', paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  connectionBannerError: { backgroundColor: '#f44336' },
  connectionBannerText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  filterAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  filterActionText: { color: '#fff', fontWeight: '700' },
  addButton: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 12 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '90%', maxWidth: 780, maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: COLORS.primary, textAlign: 'center' },
  modalScrollView: { backgroundColor: '#fff' },
  closeButton: { marginTop: 12, backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4, minWidth: 120, alignItems: 'center' },
  closeText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  inputGroup: { marginBottom: 10 },
  inputLabel: { fontWeight: '700', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },
  dateFieldContainer: { minWidth: 180 },
  dateLabel: { fontWeight: '700', color: '#374151', marginBottom: 6 },
  nativeDateButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  nativeDateText: { color: '#111827', fontWeight: '600' },
  webDateInput: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#111827',
    backgroundColor: '#fff',
  }
});
