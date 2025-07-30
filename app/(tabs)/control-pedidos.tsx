import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../config/constants';
import { useOfflineMode } from '../../hooks/useOfflineMode';

// Tipos
type Lote = {
  ['Num. manual']: string;
  Fabricado: number | null;
  ['% Comp.']: number | null;
  Cargado: number;
};
type Linea = { Módulo: string };
type Fabricacion = { Módulo: string; [key: string]: string | number | undefined };

export default function ControlTerminalesScreen() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLote, setSelectedLote] = useState<string | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [details, setDetails] = useState<Fabricacion[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Conexión offline
  const { serverReachable } = useOfflineMode();

  // Obtener rol de usuario
  useEffect(() => {
    AsyncStorage.getItem('userData')
      .then(str => {
        if (str) {
          const user = JSON.parse(str);
          setUserRole(user.rol || user.role || null);
        }
      })
      .catch(console.error);
  }, []);

  // Carga inicial de lotes
  useEffect(() => {
    fetch(`${API_URL}/control-terminales/lotes`)
      .then(res => res.json())
      .then((json: Lote[]) => setLotes(json))
      .catch(console.error)
      .finally(() => setLoadingLotes(false));
  }, []);

  // Filtrar lotes según búsqueda avanzada
  const filteredLotes = lotes.filter(item => {
    const q = searchQuery.trim().toLowerCase();
    // Filtrar por Num. manual
    if (item['Num. manual'].toLowerCase().includes(q)) return true;
    // Condicional para Fabricado exacto
    if (/^[<>]?\d+$/.test(q)) {
      const num = parseInt(q.replace(/[<>]/g, ''), 10);
      if (q.startsWith('>') && (item.Fabricado ?? 0) > num) return true;
      if (q.startsWith('<') && (item.Fabricado ?? 0) < num) return true;
      if (!q.startsWith('>') && !q.startsWith('<') && (item.Fabricado ?? 0) === num) return true;
    }
    // Condicional para % Comp. con operadores
    if (/^[<>]?\d+(?:\.\d+)?$/.test(q)) {
      const isPercent = item['% Comp.'] != null;
      const value = parseFloat(q.replace(/[<>]/g, ''));
      if (q.startsWith('>') && (item['% Comp.'] ?? 0) > value) return true;
      if (q.startsWith('<') && (item['% Comp.'] ?? 0) < value) return true;
      if (!q.startsWith('>') && !q.startsWith('<') && (item['% Comp.'] ?? 0) === value) return true;
    }
    return false;
  });

  // Abrir modal y cargar módulos
  const openModal = (numManual: string) => {
    setSelectedLote(numManual);
    setModalVisible(true);
    setModules([]);
    setSelectedModule(null);
    setLoadingModules(true);
    fetch(
      `${API_URL}/control-terminales/loteslineas?num_manual=${encodeURIComponent(
        numManual
      )}`
    )
      .then(res => res.json())
      .then((rows: Linea[]) => {
        const uniques = Array.from(new Set(rows.map(r => r.Módulo)));
        setModules(uniques);
      })
      .catch(console.error)
      .finally(() => setLoadingModules(false));
  };

  // Cargar detalles de módulo
  const loadDetails = (mod: string) => {
    if (!selectedLote) return;
    setSelectedModule(mod);
    setLoadingDetails(true);
    fetch(
      `${API_URL}/control-terminales/lotesfabricaciones?num_manual=${encodeURIComponent(
        selectedLote
      )}&modulo=${encodeURIComponent(mod)}`
    )
      .then(res => res.json())
      .then((json: Fabricacion[]) => setDetails(json))
      .catch(console.error)
      .finally(() => setLoadingDetails(false));
  };

  // Si no tiene rol admin/developer/administrador bloquea acceso
  if (userRole !== 'admin' && userRole !== 'developer' && userRole !== 'administrador') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          No tiene credenciales para ver esta información
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header con conexión y contador */}
      <View style={styles.header}>
        <Ionicons
          name={serverReachable ? 'wifi' : 'wifi-outline'}
          size={20}
          color={serverReachable ? '#4CAF50' : '#F44336'}
        />
        <Text
          style={[
            styles.statusText,
            serverReachable ? styles.connected : styles.disconnected,
          ]}
        >
          {serverReachable ? 'Conectado' : 'Sin conexión'}
        </Text>
        <Ionicons name="layers" size={20} color="#2e78b7" />
        <Text style={styles.statusText}>{filteredLotes.length} lotes</Text>
      </View>

      {/* Filtro de búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#757575" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por Num. manual / Fabricado / % Comp."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Lista de lotes */}
      {loadingLotes ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filteredLotes}
          keyExtractor={(item, idx) => `${item['Num. manual']}-${idx}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => openModal(item['Num. manual'])}
            >
              <Text style={styles.cardTitle}>{item['Num. manual']}</Text>
              <Text>Fabricado: {item.Fabricado}</Text>
              <Text>% Comp.: {item['% Comp.']}</Text>
              <Text>Cargado: {item.Cargado}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Módulos de {selectedLote}</Text>

            {loadingModules ? (
              <ActivityIndicator />
            ) : selectedModule ? (
              loadingDetails ? (
                <ActivityIndicator />
              ) : (
                <FlatList
                  data={details}
                  keyExtractor={(item, idx) => `${selectedModule}-${idx}`}
                  renderItem={({ item }) => (
                    <View style={styles.detailCard}>
                      {Object.entries(item).map(([key, val]) => (
                        <Text key={key} style={styles.detailText}>
                          {key}: {val}
                        </Text>
                      ))}
                    </View>
                  )}
                />
              )
            ) : (
              <FlatList
                data={modules}
                keyExtractor={(mod, idx) => `${mod}-${idx}`}
                renderItem={({ item: mod }) => (
                  <TouchableOpacity
                    style={styles.cardSmall}
                    onPress={() => loadDetails(mod)}
                  >
                    <Text style={styles.cardTitleSmall}>{mod}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <Pressable
              style={styles.closeButton}
              onPress={() => {
                if (selectedModule) setSelectedModule(null);
                else setModalVisible(false);
              }}
            >
              <Text style={styles.closeText}>
                {selectedModule ? 'Volver' : 'Cerrar'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  statusText: { marginHorizontal: 6, fontSize: 16, fontWeight: 'bold' },
  connected: { color: '#4CAF50' },
  disconnected: { color: '#F44336' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8,
  },
  card: { backgroundColor: '#fff', margin: 8, padding: 16, borderRadius: 12, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '80%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#2e78b7', textAlign: 'center' },
  cardSmall: { backgroundColor: '#eef6fb', padding: 12, borderRadius: 8, marginVertical: 4 },
  cardTitleSmall: { color: '#2e78b7', fontWeight: 'bold' },
  closeButton: { marginTop: 12, backgroundColor: '#2e78b7', padding: 10, borderRadius: 8 },
  closeText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  detailCard: { backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8, marginVertical: 4 },
  detailText: { fontSize: 14, color: '#333' },
});
