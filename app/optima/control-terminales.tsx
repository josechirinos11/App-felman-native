// app/optima/control-terminales.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator, FlatList, Modal, Pressable,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import { API_URL } from '../../config/constants';
import { useOfflineMode } from '../../hooks/useOfflineMode';


type Row = Record<string, any>;

const pick = (r: Row, keys: string[], fallback = '—') => {
    for (const k of keys) {
        const v = r?.[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
    }
    return fallback;
};

const prettyDate = (v?: any) => {
    if (!v) return '—';
    const s = String(v);
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString();
};

export default function ControlTerminales() {
    const { serverReachable } = useOfflineMode();
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');

    const [sqlVisible, setSqlVisible] = useState(false);
    const [sqlText, setSqlText] = useState('SELECT TOP 50 * FROM DASHBOARD_QALOG');
    const [sqlData, setSqlData] = useState<Row[] | null>(null);
    const [sqlLoading, setSqlLoading] = useState(false);
    const [sqlError, setSqlError] = useState<string | null>(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [selected, setSelected] = useState<Row | null>(null);

    const ENDPOINT = `${API_URL}/control-optima/DASHBOARD_QALOG`;

    const refresh = () => {
        setLoading(true);
        console.log('[Terminales] GET:', ENDPOINT);
        fetch(ENDPOINT)
            .then(async (r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const data = await r.json();
                return Array.isArray(data) ? data : [];
            })
            .then(setRows)
            .catch((e) => {
                console.error('[Terminales] error:', e);
                setRows([]);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { refresh(); }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return rows;
        return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(t));
    }, [rows, q]);

    const openModal = (item: Row) => {
        setSelected(item);
        setModalVisible(true);
    };

    const runSql = async () => {
        setSqlLoading(true);
        setSqlError(null);
        setSqlData(null);
        try {
            const res = await fetch(`${API_URL}/control-optima/sql`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: sqlText }), // SOLO SELECT
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Error SQL');
            setSqlData(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setSqlError(e.message);
        } finally {
            setSqlLoading(false);
        }
    };

    const renderCard = (r: Row) => {
        const user = pick(r, ['USERNAME', 'USERCREATE', 'LASTUSER', 'USER']);
        const when = pick(r, ['DATE_COMPL', 'DATECREATE', 'LASTDATE', 'DATA', 'DATE']);
        const terminal = pick(r, ['CLIENTNAME', 'CLIENT', 'TERMINAL', 'ID_COMMESSE', 'RIF']); // CLIENTNAME en Óptima
        const extra = pick(r, ['BARCODE', 'PROGR', 'RIGA', 'ID_QALOG'], '');
        return (
            <TouchableOpacity style={styles.card} onPress={() => openModal(r)}>
                <Text style={styles.title}>{user}</Text>
                <Text style={styles.sub}>Terminal: {terminal}</Text>
                <Text>Fecha/Hora: {prettyDate(when)}</Text>
                {!!extra && <Text>Extra: {extra}</Text>}
            </TouchableOpacity>
        );
    };



    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: 'Control Terminales' }} />

            {/* Header */}
            <View style={styles.header}>
            <AppHeader
                count={rows.length}          // o filtered.length, items.length, etc.
                onRefresh={refresh}          // opcional
            // serverReachableOverride={serverReachable} // sólo si NO usas useOfflineMode
            />

                <Pressable style={styles.iconBtn} onPress={() => setSqlVisible(true)}>
                    <Ionicons name="code-slash-outline" size={24} color="#2e78b7" />
                </Pressable>
            </View>

            {/* Búsqueda */}
            <View style={styles.search}>
                <Ionicons name="search-outline" size={20} color="#757575" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar en cualquier campo"
                    value={q}
                    onChangeText={setQ}
                />
            </View>

            {/* Aviso vacío */}
            {!loading && filtered.length === 0 && (
                <View style={{ padding: 12, marginHorizontal: 8, backgroundColor: '#FFFBEB', borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B' }}>
                    <Text style={{ color: '#92400E', fontWeight: '600' }}>
                        Sin datos en DASHBOARD_QALOG (o no coinciden con la búsqueda).
                    </Text>
                    <Text style={{ color: '#92400E' }}>
                        Verifica que {ENDPOINT} devuelva filas.
                    </Text>
                </View>
            )}

            {/* Lista */}
            {loading ? (
                <ActivityIndicator style={{ flex: 1 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(_, idx) => String(idx)}
                    renderItem={({ item }) => renderCard(item)}
                />
            )}

            {/* Modal Detalle */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Detalle del registro</Text>
                        <ScrollView style={{ maxHeight: '75%' }}>
                            {selected && Object.keys(selected).map((k) => (
                                <View key={k} style={styles.detailRow}>
                                    <Text style={styles.detailLeft}>{k}</Text>
                                    <Text style={styles.detailRight}>{String(selected[k])}</Text>
                                </View>
                            ))}
                        </ScrollView>
                        <Pressable style={styles.close} onPress={() => setModalVisible(false)}>
                            <Text style={styles.closeText}>Cerrar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* SQL Runner */}
            <Modal visible={sqlVisible} animationType="slide" onRequestClose={() => setSqlVisible(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#2e78b7', flex: 1 }}>SQL (Óptima)</Text>
                        <Pressable onPress={() => setSqlVisible(false)}><Ionicons name="close-circle" size={28} color="#2e78b7" /></Pressable>
                    </View>
                    <View style={{ padding: 12 }}>
                        <TextInput
                            style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 90 }}
                            multiline
                            value={sqlText}
                            onChangeText={setSqlText}
                            placeholder="SELECT TOP 50 * FROM DASHBOARD_QALOG"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <View style={{ flexDirection: 'row', marginTop: 10, gap: 10 }}>
                            <Pressable style={styles.btn} onPress={runSql} disabled={sqlLoading}>
                                <Text style={styles.btnText}>{sqlLoading ? 'Ejecutando...' : 'Ejecutar'}</Text>
                            </Pressable>
                            <Pressable style={[styles.btn, { backgroundColor: '#6b7280' }]} onPress={() => setSqlData(null)}>
                                <Text style={styles.btnText}>Limpiar</Text>
                            </Pressable>
                        </View>

                        {sqlError && <Text style={{ color: 'red', marginTop: 8 }}>{sqlError}</Text>}

                        {sqlData && (
                            <ScrollView style={{ marginTop: 12, maxHeight: '60%' }}>
                                {sqlData.length === 0 ? (
                                    <Text style={{ textAlign: 'center', color: '#666' }}>Sin resultados</Text>
                                ) : sqlData.map((row, i) => (
                                    <View key={i} style={styles.card}>
                                        <Text style={styles.title}>Fila {i + 1}</Text>
                                        {Object.keys(row).slice(0, 12).map((k) => (
                                            <Text key={k}><Text style={{ fontWeight: '600' }}>{k}:</Text> {String(row[k])}</Text>
                                        ))}
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', justifyContent: 'center' },
    status: { marginHorizontal: 6, fontSize: 16, fontWeight: 'bold' },
    ok: { color: '#4CAF50' }, bad: { color: '#F44336' },
    iconBtn: { marginLeft: 8, padding: 4 },

    search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 8, paddingHorizontal: 12, borderRadius: 8, elevation: 2 },
    searchInput: { flex: 1, height: 40, marginLeft: 8 },

    card: { margin: 8, padding: 16, borderRadius: 12, elevation: 3, backgroundColor: '#fff' },
    title: { fontSize: 16, fontWeight: '700', color: '#2e78b7' },
    sub: { color: '#666', marginBottom: 4 },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    modal: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '90%', maxHeight: '85%' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2e78b7', textAlign: 'center', marginBottom: 8 },

    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
    detailLeft: { width: '45%', fontWeight: '600', color: '#374151' },
    detailRight: { width: '55%', textAlign: 'right', color: '#111827' },

    close: { marginTop: 12, backgroundColor: '#2e78b7', padding: 10, borderRadius: 8 },
    closeText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },

    btn: { backgroundColor: '#2e78b7', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
    btnText: { color: '#fff', fontWeight: '700' },
});
