// app/optima/vehiculos.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView as SafeAreaViewSA } from 'react-native-safe-area-context';

import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import { API_URL } from '../../config/constants';

type UserData = { nombre?: string; rol?: string; name?: string; role?: string };

type Vehiculo = {
  id: number | string;
  codigo?: string;             // código interno
  matricula?: string;
  centro?: string;
  activo?: boolean;
  largo_cm?: number; ancho_cm?: number; alto_cm?: number;
  capacidad_kg?: number; volumen_m3_calc?: number;
  tipo?: string;               // furgón / tráiler / rígido...
  notas?: string;
  [k: string]: any;
};

type CrudAction = 'crear'|'actualizar'|'eliminar'|'importar'|'exportar';

const ENDPOINTS = {
  list:     `${API_URL}/control-optima/vehiculos`,
  crear:    `${API_URL}/control-optima/vehiculos/crear`,
  actualizar:`${API_URL}/control-optima/vehiculos/actualizar`,
  eliminar: `${API_URL}/control-optima/vehiculos/eliminar`,
  importar: `${API_URL}/control-optima/vehiculos/importar`,
  exportar: `${API_URL}/control-optima/vehiculos/exportar`,
};

export default function VehiculosScreen() {
  const [userName, setUserName] = useState('—');
  const [userRole, setUserRole] = useState('—');
  const [userModalVisible, setUserModalVisible] = useState(false);

  const [query, setQuery] = useState('');
  const [centro, setCentro] = useState('');
  const [soloActivos, setSoloActivos] = useState<boolean | null>(null); // chip: Activos / Todos

  const [rows, setRows] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serverReachable, setServerReachable] = useState(true);
  const [loadPct, setLoadPct] = useState(0);
  const [crudModal, setCrudModal] = useState<null | CrudAction>(null);

  const inFlightAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem('userData');
        const u: UserData | null = s ? JSON.parse(s) : null;
        setUserName(u?.nombre || u?.name || '—');
        setUserRole(u?.rol || u?.role || '—');
      } catch {}
    })();
  }, []);

  const fetchAll = useCallback(async () => {
    try { inFlightAbort.current?.abort(); } catch {}
    const controller = new AbortController();
    inFlightAbort.current = controller;

    setLoading(true); setRefreshing(false); setLoadPct(10);

    try {
      const qs = [
        centro ? `centro=${encodeURIComponent(centro)}` : '',
        soloActivos === true ? 'activo=1' : '',
      ].filter(Boolean).join('&');
      const r = await fetch(ENDPOINTS.list + (qs ? `?${qs}` : ''), { signal: controller.signal });
      setLoadPct(60);
      
      let j;
      try {
        const text = await r.text();
        if (!text || text.trim().startsWith('<')) {
          throw new Error('Backend no disponible');
        }
        j = JSON.parse(text);
      } catch (parseError: any) {
        if (parseError?.message === 'Backend no disponible') {
          throw parseError;
        }
        throw new Error(`Respuesta inválida del servidor de vehículos`);
      }
      
      if (!r.ok) throw new Error(j?.message || `Vehículos HTTP ${r.status}`);
      setRows(Array.isArray(j) ? j : []);
      setServerReachable(true);
    } catch (e: any) {
      // Solo logear errores detallados si no es el error conocido de backend no disponible
      if (e?.message?.includes('Backend no disponible')) {
        console.log('[vehiculos] Backend no disponible - mostrando mensaje al usuario');
      } else {
        console.error('[vehiculos] fetchAll error:', e);
      }
      setRows([]); setServerReachable(false);
    } finally {
      setLoadPct(100); setTimeout(()=>setLoadPct(0),600);
      setLoading(false); setRefreshing(false);
    }
  }, [centro, soloActivos]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  const onRefresh = useCallback(() => fetchAll(), [fetchAll]);

  const q = query.trim().toUpperCase();
  const filtered = useMemo(() => {
    let arr = rows;
    if (q) {
      arr = arr.filter(v =>
        (v.codigo || '').toUpperCase().includes(q) ||
        (v.matricula || '').toUpperCase().includes(q) ||
        (v.centro || '').toUpperCase().includes(q) ||
        (v.tipo || '').toUpperCase().includes(q)
      );
    }
    return arr;
  }, [rows, q]);

  const postAction = async (url: string, payload: any) => {
    try {
      const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      
      let data;
      try {
        const text = await r.text();
        if (!text || text.trim().startsWith('<')) {
          throw new Error('Backend no disponible');
        }
        data = JSON.parse(text);
      } catch (parseError: any) {
        if (parseError?.message === 'Backend no disponible') {
          console.log('[POST action] Backend no disponible - endpoint no implementado');
          return { ok: false, data: null };
        }
        throw new Error(`Respuesta inválida del servidor`);
      }
      
      if (!r.ok) {
        console.error('POST action error:', data?.message || `HTTP ${r.status}`);
        return { ok: false, data };
      }
      return { ok: true, data };
    } catch (e: any) {
      // Solo logear errores detallados si no es el error conocido de backend no disponible
      if (e?.message?.includes('Backend no disponible')) {
        console.log('[POST action] Endpoint no implementado en el backend');
      } else {
        console.error('POST action exception:', e?.message || e);
      }
      return { ok: false, data: null };
    }
  };

  const actionCrear = async () => { setCrudModal('crear'); await postAction(ENDPOINTS.crear, { centro: centro || undefined }); };
  const actionActualizar = async () => { setCrudModal('actualizar'); await postAction(ENDPOINTS.actualizar, { ids: filtered.map(v=>v.id) }); };
  const actionEliminar = async () => { setCrudModal('eliminar'); await postAction(ENDPOINTS.eliminar, { ids: filtered.map(v=>v.id) }); };
  const actionImportar = async () => { setCrudModal('importar'); await postAction(ENDPOINTS.importar, { ejemplo:true }); };
  const actionExportar = async () => { setCrudModal('exportar'); await postAction(ENDPOINTS.exportar, { ids: filtered.map(v=>v.id) }); };

  const headerCount = filtered.length;

  return (
    <SafeAreaProvider>
      <SafeAreaViewSA edges={['top', 'bottom']} style={styles.container}>
        <AppHeader
          titleOverride="Catálogo de Vehículos"
          count={headerCount}
          userNameProp={userName}
          roleProp={userRole}
          serverReachableOverride={!!serverReachable}
          onRefresh={onRefresh}
          onUserPress={() => setUserModalVisible(true)}
        />
        <ModalHeader visible={userModalVisible} onClose={() => setUserModalVisible(false)} userName={userName} role={userRole} />

        {/* Filtros */}
        <View style={styles.filtersGrid}>
          <View style={styles.filterRow}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Centro (opcional)</Text>
              <TextInput value={centro} onChangeText={setCentro} placeholder="Ej: LAM310" style={styles.input} returnKeyType="search" onSubmitEditing={onRefresh}/>
            </View>
          </View>
          <View style={[styles.filterRow,{alignItems:'center'}]}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Buscar (código / matrícula / centro / tipo)</Text>
              <TextInput value={query} onChangeText={setQuery} placeholder="Ej: TR-01 · 1234-ABC · RÍGIDO" style={styles.input} returnKeyType="search"/>
            </View>
          </View>
          <View style={[styles.filterRow, {marginTop:2}]}>
            {(['Activos','Todos'] as const).map(opt => (
              <Pressable
                key={opt}
                onPress={() => setSoloActivos(opt==='Activos' ? (soloActivos===true? null : true) : null)}
                style={[styles.chip, (opt==='Activos' ? soloActivos===true : soloActivos===null) && styles.chipActive]}
              >
                <Text style={[styles.chipText, (opt==='Activos' ? soloActivos===true : soloActivos===null) && styles.chipTextActive]}>
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* CRUD - Acciones principales */}
          <Text style={styles.sectionLabel}>Acciones sobre vehículos:</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.create]} onPress={actionCrear}>
              <Ionicons name="add-circle-outline" size={20} />
              <Text style={styles.actionText}>Crear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.update]} onPress={actionActualizar}>
              <Ionicons name="create-outline" size={20} />
              <Text style={styles.actionText}>Actualizar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.delete]} onPress={actionEliminar}>
              <Ionicons name="trash-outline" size={20} />
              <Text style={styles.actionText}>Eliminar</Text>
            </TouchableOpacity>
          </View>

          {/* Acciones de importación/exportación */}
          <Text style={styles.sectionLabel}>Importar/Exportar:</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.read]} onPress={actionImportar}>
              <Ionicons name="cloud-download-outline" size={20} />
              <Text style={styles.actionText}>Importar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.read]} onPress={actionExportar}>
              <Ionicons name="cloud-upload-outline" size={20} />
              <Text style={styles.actionText}>Exportar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal placeholder */}
        <Modal visible={crudModal!==null} animationType="slide" onRequestClose={()=>setCrudModal(null)}>
          <View style={styles.fullModal}>
            <Ionicons
              name={
                crudModal==='crear'?'add-circle-outline':
                crudModal==='actualizar'?'create-outline':
                crudModal==='eliminar'?'trash-outline':
                crudModal==='importar'?'cloud-download-outline':
                'cloud-upload-outline'
              } size={72} color="#2e78b7"/>
            <Text style={styles.fullModalTitle}>
              {crudModal==='crear'?'Crear vehículo':
               crudModal==='actualizar'?'Actualizar vehículos':
               crudModal==='eliminar'?'Eliminar vehículos':
               crudModal==='importar'?'Importar catálogo':'Exportar catálogo'}
            </Text>
            <Text style={styles.fullModalText}>Página en construcción</Text>
            <Pressable onPress={()=>setCrudModal(null)} style={styles.closeFullBtn}>
              <Ionicons name="close" size={18} color="#fff"/><Text style={styles.closeFullBtnText}>Cerrar</Text>
            </Pressable>
          </View>
        </Modal>

        {/* Lista */}
        {loading ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator size="large"/>
            <Text style={styles.loadingText}>Cargando {Math.max(0, Math.min(100, Math.round(loadPct)))}%</Text>
            <View style={styles.progressBarOuter}>
              <View style={[styles.progressBarInner,{width:`${Math.max(0, Math.min(100, loadPct))}%`}]} />
            </View>
          </View>
        ) : !serverReachable ? (
          <View style={styles.errorPanel}>
            <Ionicons name="cloud-offline-outline" size={64} color="#dc3545" />
            <Text style={styles.errorTitle}>Sin conexión con el backend</Text>
            <Text style={styles.errorText}>
              No se pudo obtener información de vehículos.{'\n'}
              Verifique que el servidor backend esté funcionando.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Ionicons name="refresh-outline" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(it)=>String(it.id)}
            contentContainerStyle={{paddingHorizontal:10,paddingBottom:24}}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListHeaderComponent={<View style={styles.listHeader}><Text style={styles.listHeaderText}>Vehículos: <Text style={styles.bold}>{filtered.length}</Text></Text></View>}
            ListEmptyComponent={<Text style={styles.empty}>Sin vehículos para mostrar.</Text>}
            renderItem={({item})=>(
              <TouchableOpacity style={[styles.card, styles.cardShadow]}>
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{item.codigo || item.matricula || 'Vehículo'}</Text>
                  <Text style={styles.badge}>{item.activo===false?'INACTIVO':'ACTIVO'}</Text>
                </View>
                <Text style={styles.sub}>
                  {item.matricula ? `Mat: ${item.matricula} · ` : ''}{item.centro ? `Centro: ${item.centro} · ` : ''}
                  {item.tipo || '—'}
                </Text>
                <Text style={styles.sub}>
                  Dim (cm): {item.largo_cm ?? '—'}×{item.ancho_cm ?? '—'}×{item.alto_cm ?? '—'} · Vol: {item.volumen_m3_calc ?? '—'} m³ · Cap: {item.capacidad_kg ?? '—'} kg
                </Text>
                {item.notas ? <Text style={styles.notes}>Notas: {item.notas}</Text> : null}
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaViewSA>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container:{flex:1, backgroundColor:'#f3f4f6'},
  filtersGrid:{paddingHorizontal:12, paddingTop:10},
  filterRow:{flexDirection:'row', gap:10, marginBottom:10},
  inputGroup:{gap:6},
  label:{fontSize:12, color:'#4b5563'},
  input:{borderWidth:1, borderColor:'#e5e7eb', backgroundColor:'#fff', borderRadius:8, paddingHorizontal:12, height:40},

  chip:{backgroundColor:'#eef2ff', paddingHorizontal:10, paddingVertical:8, borderRadius:999, marginRight:8, borderWidth:1, borderColor:'#6366f133'},
  chipActive:{backgroundColor:'#2e78b7'},
  chipText:{color:'#374151', fontWeight:'600'},
  chipTextActive:{color:'#fff'},

  crudRow:{flexDirection:'row', gap:10, paddingHorizontal:12, marginBottom:8},
  crudBtn:{flex:1, height:44, borderRadius:10, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:8, borderWidth:1},
  crudText:{fontWeight:'600', color:'#374151'},

  // Nuevos estilos para mejor organización
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
  },
  actionText: {
    fontWeight: '600',
    color: '#374151',
    fontSize: 13,
  },
  create:{backgroundColor:'#ecfdf5', borderColor:'#10b98133'},
  read:{backgroundColor:'#eef2ff', borderColor:'#6366f133'},
  update:{backgroundColor:'#fff7ed', borderColor:'#f59e0b33'},
  delete:{backgroundColor:'#fef2f2', borderColor:'#ef444433'},

  fullModal:{flex:1, alignItems:'center', justifyContent:'center', gap:14, padding:24, backgroundColor:'#f8fafc'},
  fullModalTitle:{fontSize:20, fontWeight:'700', color:'#111827'},
  fullModalText:{fontSize:16, color:'#334155'},
  closeFullBtn:{marginTop:10, backgroundColor:'#2e78b7', paddingHorizontal:16, paddingVertical:10, borderRadius:10, flexDirection:'row', gap:8, alignItems:'center'},
  closeFullBtnText:{color:'#fff', fontWeight:'700'},

  listHeader:{paddingHorizontal:10, paddingVertical:6},
  listHeaderText:{color:'#334155'},
  bold:{fontWeight:'700'},
  empty:{textAlign:'center', color:'#6b7280', paddingVertical:24},
  card:{backgroundColor:'#fff', borderRadius:12, padding:14, marginBottom:10},
  cardShadow:{shadowColor:'#000', shadowOffset:{width:0, height:2}, shadowOpacity:0.08, shadowRadius:4, elevation:3},
  cardHead:{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6},
  title:{fontWeight:'700', color:'#111827'},
  sub:{color:'#475569'},
  badge:{paddingHorizontal:8, paddingVertical:2, borderRadius:999, backgroundColor:'#e5f3fb', color:'#0c4a6e', fontWeight:'700', overflow:'hidden'},
  notes:{marginTop:6, color:'#64748b'},

  loadingPanel:{padding:16, alignItems:'center', gap:10},
  loadingText:{color:'#334155'},
  progressBarOuter:{width:'92%', height:8, borderRadius:8, backgroundColor:'#e5e7eb'},
  progressBarInner:{height:8, borderRadius:8, backgroundColor:'#2e78b7'},

  // error panel
  errorPanel: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40,
    backgroundColor: '#f8f9fa'
  },
  errorTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#dc3545', 
    marginTop: 16, 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  errorText: { 
    fontSize: 14, 
    color: '#6c757d', 
    textAlign: 'center', 
    lineHeight: 20,
    marginBottom: 24 
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  flex1:{flex:1},
});
