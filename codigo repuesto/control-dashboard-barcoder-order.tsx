import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../config/constants';

type Row = Record<string, any>;
type ApiResp = {
  items: Row[];
  page: number; pageSize: number; total: number;
  from: string; to: string; usedFrom?: string; usedTo?: string;
  mode?: 'Pedido' | 'Entrega';
  orderBy: string; orderDir: 'ASC' | 'DESC';
  agg: { piezas: number; piezasLinea: number; piezasDet: number };
};

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const prettyDate = (v?: any) => { const d = new Date(String(v)); return isNaN(d.getTime()) ? String(v ?? '—') : d.toLocaleDateString(); };

export default function ControlDashboardBarcoderOrder() {
  const [from, setFrom] = useState(() => { const t = new Date(); const d30 = new Date(t); d30.setDate(d30.getDate() - 30); return fmt(d30); });
  const [to, setTo] = useState(() => fmt(new Date()));
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [agg, setAgg] = useState<{ piezas: number; piezasLinea: number; piezasDet: number }>({ piezas: 0, piezasLinea: 0, piezasDet: 0 });
  const [usedFrom, setUsedFrom] = useState<string | undefined>();
  const [usedTo, setUsedTo] = useState<string | undefined>();
  const [mode, setMode] = useState<'Pedido' | 'Entrega' | undefined>();
  const isSmallDevice = Dimensions.get('window').width < 500;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);

  const ENDPOINT = `${API_URL}/control-optima/barcoder-order`;

  const fetchPage = useCallback(async (pageToLoad: number, replace = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const url = `${ENDPOINT}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=${pageToLoad}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data: ApiResp = await res.json();
      if (!res.ok) throw new Error((data as any)?.message || `HTTP ${res.status}`);

      setTotal(data.total || 0);
      setAgg(data.agg || { piezas: 0, piezasLinea: 0, piezasDet: 0 });
      setPage(data.page || pageToLoad);
      setUsedFrom(data.usedFrom); setUsedTo(data.usedTo); setMode(data.mode);

      const newItems = Array.isArray(data.items) ? data.items : [];
      setRows(prev => replace ? newItems : [...prev, ...newItems]);
      setReachedEnd(newItems.length < pageSize);
    } catch (e) {
      console.error('[barcoder-order] error:', e);
      if (replace) { setRows([]); setTotal(0); setAgg({ piezas: 0, piezasLinea: 0, piezasDet: 0 }); setUsedFrom(undefined); setUsedTo(undefined); setMode(undefined); }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [from, to, search, pageSize, ENDPOINT, loading]);

  const applyFilters = () => { setPage(1); setReachedEnd(false); setRefreshing(true); fetchPage(1, true); };
  useEffect(() => { applyFilters(); }, []);

  const onEndReached = () => { if (!loading && !reachedEnd) fetchPage(page + 1, false); };
  const onRefresh = () => applyFilters();

  const AlertRange = () => {
    if (!usedFrom || !usedTo) return null;
    const userAsked = `${from} → ${to}`;
    const used = `${String(usedFrom).slice(0, 10)} → ${String(usedTo).slice(0, 10)}`;
    if (userAsked === used) return null;
    return (
      <View style={styles.notice}>
        <Ionicons name="information-circle-outline" size={18} />
        <Text style={styles.noticeText}>
          Sin datos en el rango solicitado. Mostrando: {used} (por {mode ?? 'FechaPedido'})
        </Text>
      </View>
    );
  };

  const headerMetrics = useMemo(() => (
    <View style={styles.headerRow}>
      <View style={styles.kpi}><Ionicons name="analytics-outline" size={18} /><Text style={styles.kpiText}>Items: {rows.length} / {total}</Text></View>
      <View style={styles.kpi}><Ionicons name="cube-outline" size={18} /><Text style={styles.kpiText}>Piezas: {agg.piezas}</Text></View>
      <View style={styles.kpi}><Ionicons name="pricetag-outline" size={18} /><Text style={styles.kpiText}>Piezas Línea: {agg.piezasLinea}</Text></View>
      <View style={styles.kpi}><Ionicons name="list-outline" size={18} /><Text style={styles.kpiText}>Piezas Det: {agg.piezasDet}</Text></View>
    </View>
  ), [rows.length, total, agg]);

  const renderItem = ({ item }: { item: Row }) => (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.title}>{item.RazonSocial ?? '—'}</Text>
        <Text style={styles.badge}>Pedido {item.Pedido ?? '—'}</Text>
      </View>
      <Text style={styles.sub}>{item.Direccion ?? ''} {item.Localidad ?? ''} {item.Prov ?? ''} {item.CP ?? ''}</Text>
      <Text>EstadoProd: {item.EstadoProd} | EstadoLinea: {item.EstadoLinea} | EstadoLinDet: {item.EstadoLinDet ?? '—'}</Text>
      <Text>Fechas: Pedido {prettyDate(item.FechaPedido)} / Entrega {prettyDate(item.FechaEntrega)}</Text>
      <Text>Tot Piezas: {item.TotPiezas ?? '—'} (Hechas: {item.TotPiezasHechas ?? '—'}) | #Pos: {item.TotNumPos ?? '—'}</Text>
      <Text>Línea {item.Linea ?? '—'}: {item.DescrLinea ?? '—'} | {item.MedX ?? '—'}×{item.MedY ?? '—'}</Text>
      <Text>Det: {item.CodDetPadre ?? '—'} → {item.CodDet ?? '—'} ({item.DescDet ?? '—'}) | Pzs: {item.PiezasDet ?? '—'} (Hechas: {item.PiezasHechasDet ?? '—'})</Text>
      <Text>Bill: {item.NumBill ?? '—'} | Inv: {item.NumInv ?? '—'} | Caballete: {item.Caballete ?? '—'}</Text>
    </View>
  );

  const refresh = React.useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setReachedEnd(false);
    fetchPage(1, true);
  }, [fetchPage]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Dashboard Pedidos (Order)' }} />



      {/* Filtros */}
      {isSmallDevice ? (
        <View style={[styles.filters, { flexDirection: 'column', gap: 4 }]}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Desde</Text>
              <TextInput value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" style={styles.input} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Hasta</Text>
              <TextInput value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" style={styles.input} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Buscar</Text>
              <TextInput value={search} onChangeText={setSearch} placeholder="pedido, usuario, centro..." style={styles.input} />
            </View>
            <Pressable style={[styles.btn, { alignSelf: 'flex-end' }]} onPress={applyFilters}>
              <Ionicons name="search-outline" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.filters}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Desde</Text>
            <TextInput value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" style={styles.input} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hasta</Text>
            <TextInput value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" style={styles.input} />
          </View>
          <View style={[styles.inputGroup, { flex: 1.4 }]}>
            <Text style={styles.label}>Buscar</Text>
            <TextInput value={search} onChangeText={setSearch} placeholder="pedido, usuario, centro..." style={styles.input} />
          </View>
          <Pressable style={styles.btn} onPress={applyFilters}>
            <Ionicons name="search-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>Aplicar</Text>
          </Pressable>
        </View>
      )}

      <AlertRange />
      {headerMetrics}

      <FlatList
        data={rows}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        onEndReachedThreshold={0.4}
        onEndReached={onEndReached}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListFooterComponent={loading ? <ActivityIndicator style={{ paddingVertical: 12 }} /> : reachedEnd ? <Text style={styles.endText}>No hay más resultados</Text> : null}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Sin resultados en el rango seleccionado.</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  filters: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, backgroundColor: '#fff' },
  inputGroup: { width: 140 }, label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, height: 38 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2e78b7', paddingHorizontal: 12, height: 38, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '700' },

  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, margin: 10, padding: 10, backgroundColor: '#eff6ff', borderRadius: 10, borderColor: '#bfdbfe', borderWidth: 1 },
  noticeText: { color: '#1e3a8a' },

  headerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#f8fafc' },
  kpi: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderColor: '#e5e7eb', borderWidth: 1 },
  kpiText: { fontWeight: '600', color: '#374151' },

  card: { marginHorizontal: 10, marginVertical: 6, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '700', color: '#2e78b7' },
  badge: { backgroundColor: '#eff6ff', color: '#1d4ed8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  sub: { color: '#6b7280', marginBottom: 4 },

  empty: { textAlign: 'center', color: '#6b7280', marginTop: 20 },
  endText: { textAlign: 'center', color: '#9ca3af', paddingVertical: 12 },
});
