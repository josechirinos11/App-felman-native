import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useOfflineMode } from '../../hooks/useOfflineMode';

const API_BASE = 'http://85.59.105.234:3000';

export default function Articulos() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({
    nombre: '', descripcion: '', precio_costo: '', precio_venta: '', 
    stock_minimo: '', stock_maximo: '', actualizado_por: ''
  });

  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === 'web' && width >= 800;
  const router = useRouter();

  // Conexión offline
  const { serverReachable } = useOfflineMode();

  useEffect(() => {
    fetch(`${API_BASE}/control-almacen/articulos`)
      .then(res => res.json())
      .then(json => json.status === 'ok' && setData(json.data))
      .catch(err => console.error('Fetch articulos error:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter(item =>
    item.nombre.toLowerCase().includes(query.toLowerCase()) ||
    (item.descripcion || '').toLowerCase().includes(query.toLowerCase())
  );

  const openModal = (item: any) => {
    setCurrentItem(item);
    setForm({
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
      precio_costo: String(item.precio_costo || ''),
      precio_venta: String(item.precio_venta || ''),
      stock_minimo: String(item.stock_minimo || ''),
      stock_maximo: String(item.stock_maximo || ''),
      actualizado_por: item.actualizado_por || 'admin', // Valor por defecto para actualizado_por
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const isUpdate = Boolean(currentItem?.id);
    const url = isUpdate
      ? `${API_BASE}/control-almacen/articulosactualizar/${currentItem.id}`
      : `${API_BASE}/control-almacen/articuloscrear`;
    const method = isUpdate ? 'PUT' : 'POST';
  
    console.log(`🚀 Enviando ${method} a ${url}`, form);
  
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      console.log('← Respuesta del servidor:', json);
  
      if (json.status !== 'ok') {
        throw new Error(json.message || 'Error desconocido');
      }
  
      if (isUpdate) {
        // Reemplaza sólo el artículo modificado
        setData(data.map(d =>
          d.id === currentItem.id
            ? { ...d, ...form }   // <-- CORRECTO: merge de d y form
            : d
        ));
      } else {
        // Añade el nuevo artículo (ideal devolver json.data con id real)
        setData([
          ...data,               // <-- CORRECTO: extiende el array anterior
          json.data || { ...form }
        ]);
      }
  
      setModalVisible(false);
    } catch (err: any) {
      console.error('❌ Error al guardar artículo:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const selected = selectedItem?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.card, selected && styles.cardSelected]}
        onPress={() => setSelectedItem(item)}
      >
        <Text style={styles.cardTitle}>{item.nombre}</Text>
        <View style={styles.cardContent}>
          <Text style={styles.cardText}>SKU: {item.sku}</Text>
          <Text style={styles.cardText}>Descripción: {item.descripcion}</Text>
          <Text style={styles.cardText}>Categoría ID: {item.categoria_id}</Text>
          <Text style={styles.cardText}>Ubicación ID: {item.ubicacion_id}</Text>
          <Text style={styles.cardText}>Costo: ${item.precio_costo}</Text>
          <Text style={styles.cardText}>Venta: ${item.precio_venta}</Text>
          <Text style={styles.cardText}>Stock Mínimo: {item.stock_minimo}</Text>
          <Text style={styles.cardText}>Stock Máximo: {item.stock_maximo}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      {/* Botón flotante de atrás */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#007AFF" />
      </TouchableOpacity>

      {/* Header con conexión y título */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.connectionStatus}>
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
          </View>
          <View style={styles.itemCount}>
            <Ionicons name="layers" size={20} color="#2e78b7" />
            <Text style={styles.statusText}>{filtered.length} artículos</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>Artículos</Text>
        </View>
      </View>

      <View style={[styles.toolbar, isWebLarge ? styles.toolbarWeb : styles.toolbarMobile]}>  
        <View style={styles.searchContainer}>  
          <Ionicons name="search-outline" size={20} color="#757575" style={styles.searchIcon} />  
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar artículos..."
            value={query}
            onChangeText={setQuery}
          />  
        </View>  
        { !isWebLarge && (
          <View style={styles.toolbarButtonsMobile}>
            <TouchableOpacity style={styles.addBtn} onPress={() => openModal({})}>
              <Text style={styles.addBtnText}>Agregar Artículo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.updateBtn, !selectedItem && styles.updateBtnDisabled]}
              onPress={() => selectedItem && openModal(selectedItem)}
              disabled={!selectedItem}
            >
              <Text style={styles.updateBtnText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        )}
        { isWebLarge && (
          <View style={styles.toolbarButtons}>
            <TouchableOpacity style={styles.addBtn} onPress={() => openModal({})}>
              <Text style={styles.addBtnText}>Agregar Artículo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.updateBtn, !selectedItem && styles.updateBtnDisabled]}
              onPress={() => selectedItem && openModal(selectedItem)}
              disabled={!selectedItem}
            >
              <Text style={styles.updateBtnText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        numColumns={isWebLarge ? 4 : 1}
        columnWrapperStyle={isWebLarge ? { justifyContent: 'space-between' } : undefined}
      />
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalHeader}>{currentItem?.id ? 'Actualizar Artículo' : 'Agregar Artículo'}</Text>
          {currentItem?.id && (
            <Text style={styles.modalNote}>
              Nota: Solo se pueden editar los campos mostrados. SKU, Categoría y Ubicación no se pueden modificar.
            </Text>
          )}
          <ScrollView>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre del Artículo</Text>
              <TextInput
                style={styles.input}
                value={form.nombre}
                onChangeText={text => setForm({ ...form, nombre: text })}
                placeholder="Ingrese el nombre del artículo"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={form.descripcion}
                onChangeText={text => setForm({ ...form, descripcion: text })}
                placeholder="Ingrese la descripción"
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Precio de Costo ($)</Text>
              <TextInput
                style={styles.input}
                value={form.precio_costo}
                onChangeText={text => setForm({ ...form, precio_costo: text })}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Precio de Venta ($)</Text>
              <TextInput
                style={styles.input}
                value={form.precio_venta}
                onChangeText={text => setForm({ ...form, precio_venta: text })}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Stock Mínimo</Text>
              <TextInput
                style={styles.input}
                value={form.stock_minimo}
                onChangeText={text => setForm({ ...form, stock_minimo: text })}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Stock Máximo</Text>
              <TextInput
                style={styles.input}
                value={form.stock_maximo}
                onChangeText={text => setForm({ ...form, stock_maximo: text })}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Actualizado Por</Text>
              <TextInput
                style={styles.input}
                value={form.actualizado_por}
                onChangeText={text => setForm({ ...form, actualizado_por: text })}
                placeholder="admin"
              />
            </View>
            <View style={styles.modalButtons}>
              <Button title="Cancelar" onPress={() => setModalVisible(false)} />
              <Button title="Guardar" onPress={handleSubmit} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 16,
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'ios' ? 80 : 70,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    
  },
  headerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: { marginHorizontal: 6, fontSize: 14, fontWeight: 'bold' },
  connected: { color: '#4CAF50' },
  disconnected: { color: '#F44336' },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#007AFF',
    textAlign: 'right',
  },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  toolbarMobile: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' },
  toolbarWeb: { flexDirection: 'row', alignItems: 'center' },
  toolbarButtons: { flexDirection: 'row', alignItems: 'center' },
  toolbarButtonsMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  addBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginRight: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '600' },
  updateBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginLeft: 4,
  },
  updateBtnDisabled: { opacity: 0.5 },
  updateBtnText: { color: '#333', fontWeight: '600' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 5,
    elevation: 5,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: '#2e78b7',
  },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, elevation: 4, flex: 1, margin: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4,
    borderWidth: Platform.OS === 'web' ? 1 : 0, borderColor: Platform.OS === 'web' ? '#ddd' : 'transparent',
  },
  cardSelected: { borderColor: '#007AFF', borderWidth: 2 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#007AFF', marginBottom: 8 },
  cardContent: { flex: 1, justifyContent: 'flex-start' },
  cardText: { fontSize: 14, color: '#555', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContainer: { flex: 1, padding: 16, backgroundColor: '#fff' },
  modalHeader: { fontSize: 22, fontWeight: '700', marginBottom: 12, color: '#007AFF' },
  modalNote: { fontSize: 14, color: '#666', marginBottom: 16, fontStyle: 'italic' },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, height: 40 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 }
});
