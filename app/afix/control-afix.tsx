import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ActivityIndicator as RNActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';

interface Article {
  art: string;
  des: string;
  pvp1: number | string;
  stock?: string;
}

export default function ControlAfixScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Article[]>([]);
  const [searchType, setSearchType] = useState<'DESCRIPTION' | 'CODE'>('DESCRIPTION');

  // usuario (para el modal header)
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState({ userName: '', role: '' });

  const API_URL_SQL = "http://85.59.105.234:3000/control-afix/sql";

  useEffect(() => {
    (async () => {
      try {
        const rawUser = await AsyncStorage.getItem('userData');
        if (rawUser) {
            const parsedUser = JSON.parse(rawUser);
            setModalUser({
                userName: parsedUser.nombre || parsedUser.name || 'Sin nombre',
                role: parsedUser.rol || parsedUser.role || 'Sin rol',
            });
        }
      } catch (error) {
        console.log('Error cargando usuario', error);
      }
    })();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setData([]);

    try {
      // 1. Fetch Articles
      let sqlArt = "";
      if (searchType === 'DESCRIPTION') {
        // En PowerShell usa matches '*ROLLO*'
        sqlArt = `select art, des, pvp1 from art where des matches '*${searchQuery.toUpperCase()}*'`
      } else {
        // En PowerShell usa matches '0203*'
        // NOTA: El usuario pidió buscar por "020301" y que traiga coincidencias.
        sqlArt = `select art, des, pvp1 from art where art matches '${searchQuery}*'`
      }

      const bodyArt = {
        sql: sqlArt,
        first: searchType === 'DESCRIPTION' ? 5000 : 1000
      };

      const resArt = await fetch(API_URL_SQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyArt)
      });
      const jsonArt = await resArt.json();

      if (!jsonArt.rows || jsonArt.rows.length === 0) {
        Alert.alert("Info", "No se encontraron artículos.");
        setLoading(false);
        return;
      }

      // 2. Fetch Stock (Nueva consulta: Traemos el stock agrupado por artículo)
      const bodyStock = {
        sql: "select art, sum(can) from sart group by 1",
        first: 15000
      };

      const resStock = await fetch(API_URL_SQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyStock)
      });
      const jsonStock = await resStock.json();

      // 3. Process Stock into Map (Diccionario de stock)
      const stockMap: Record<string, string> = {};
      if (jsonStock.rows) {
        jsonStock.rows.forEach((row: any[]) => {
          // row[0] is art, row[1] is sum(can)
          stockMap[row[0]] = row[1] !== null ? row[1].toString() : "0";
        });
      }

      // 4. Merge Results
      // Buscamos en el diccionario. Si no existe, ponemos 0
      const results: Article[] = jsonArt.rows.map((row: any[]) => ({
        art: row[0],
        des: row[1],
        pvp1: row[2],
        stock: stockMap[row[0]] || "0"
      }));

      setData(results);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Error al consultar la API.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Article }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.codeText}>{item.art}</Text>
        <Text style={styles.stockLabel}>Stock: <Text style={styles.stockValue}>{item.stock}</Text></Text>
      </View>
      <Text style={styles.descText}>{item.des}</Text>
      <View style={styles.priceContainer}>
        <Text style={styles.priceText}>
            {typeof item.pvp1 === 'number' 
                ? `${item.pvp1.toFixed(2)}€` 
                : `${item.pvp1}€`}
        </Text>
      </View>
    </View>
  );

  return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
        <AppHeader 
            titleOverride="Consulta Afix" 
            onUserPress={() => setUserModalVisible(true)}
        />
        
        <View style={styles.filterContainer}>
            <View style={styles.tabsContainer}>
                <TouchableOpacity 
                    style={[styles.tabButton, searchType === 'DESCRIPTION' && styles.tabButtonActive]}
                    onPress={() => setSearchType('DESCRIPTION')}
                >
                    <Text style={[styles.tabText, searchType === 'DESCRIPTION' && styles.tabTextActive]}>Por Descripción</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabButton, searchType === 'CODE' && styles.tabButtonActive]}
                    onPress={() => setSearchType('CODE')}
                >
                    <Text style={[styles.tabText, searchType === 'CODE' && styles.tabTextActive]}>Por Código</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.inputWrapper}>
                <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    style={styles.input}
                    placeholder={searchType === 'DESCRIPTION' ? "Buscar descripción..." : "Buscar código..."}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    autoCapitalize="characters"
                />
              </View>
              <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                <Ionicons name="search" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
        </View>

        {loading ? (
             <View style={styles.centerContainer}>
                <RNActivityIndicator size="large" color="#2e78b7" />
                <Text style={styles.loadingText}>Buscando...</Text>
             </View>
        ) : (
            <FlatList
                data={data}
                keyExtractor={(item) => item.art}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="search" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>
                            {data.length === 0 ? "Realiza una búsqueda para ver resultados" : "Sin resultados"}
                        </Text>
                    </View>
                }
            />
        )}

        <ModalHeader
            visible={userModalVisible}
            onClose={() => setUserModalVisible(false)}
            userName={modalUser.userName}
            role={modalUser.role}
        />

        </SafeAreaView>
      </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    filterContainer: { 
        backgroundColor: '#fff', 
        borderBottomLeftRadius: 16, 
        borderBottomRightRadius: 16, 
        padding: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        zIndex: 10
    },
    tabsContainer: { 
        flexDirection: 'row', 
        marginBottom: 16, 
        backgroundColor: '#f0f2f5', 
        borderRadius: 8, 
        padding: 4 
    },
    tabButton: { 
        flex: 1, 
        paddingVertical: 10, 
        alignItems: 'center', 
        borderRadius: 6 
    },
    tabButtonActive: { 
        backgroundColor: '#fff', 
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1
    },
    tabText: { color: '#666', fontWeight: '500' },
    tabTextActive: { color: '#2e78b7', fontWeight: 'bold' },
    
    searchRow: { flexDirection: 'row', gap: 10 },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 50
    },
    searchIcon: { marginRight: 8 },
    input: { flex: 1, height: '100%', fontSize: 16, color: '#333' },
    searchButton: { 
        backgroundColor: '#2e78b7', 
        width: 50, 
        height: 50, 
        borderRadius: 8, 
        justifyContent: 'center', 
        alignItems: 'center',
        elevation: 2
    },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#666' },
    
    listContent: { padding: 16, paddingBottom: 40 },
    card: { 
        backgroundColor: '#fff', 
        padding: 16, 
        marginBottom: 12, 
        borderRadius: 12, 
        elevation: 2, 
        shadowColor: '#000', 
        shadowOffset: {width:0, height:1}, 
        shadowOpacity:0.05, 
        shadowRadius:2,
        borderLeftWidth: 4,
        borderLeftColor: '#2e78b7'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
    codeText: { fontWeight: 'bold', fontSize: 16, color: '#333' },
    stockLabel: { fontSize: 14, color: '#666' },
    stockValue: { fontWeight: 'bold', color: '#2e78b7', fontSize: 16 },
    descText: { fontSize: 15, color: '#555', marginBottom: 12, lineHeight: 22 },
    priceContainer: { alignSelf: 'flex-end', backgroundColor: '#e8f5e9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
    priceText: { fontSize: 16, color: '#2e7d32', fontWeight: 'bold' },
    
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
    emptyText: { marginTop: 16, color: '#999', fontSize: 16 }
});
