import Ionicons from '@expo/vector-icons/Ionicons';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Definir tipo para los usuarios
type Usuario = {
  nombre: string;
  dni: string | null;
  correo: string | null;
  contraseña: string | null;
  rol: string;
};

// Componente para mostrar cada usuario
const UsuarioItem = ({ item }: { item: Usuario }) => {
  // Color según el rol del usuario
  const getRolColor = (rol: string) => {
    switch (rol.toLowerCase()) {
      case 'administrador':
        return '#2196f3';
      case 'usuario':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  return (
    <View style={styles.pedidoItem}>
      <View style={styles.pedidoHeader}>
        <Text style={styles.pedidoNumero}>{item.nombre}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getRolColor(item.rol) }]}>
          <Text style={styles.statusText}>{item.rol}</Text>
        </View>
      </View>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="eye-outline" size={20} color="#2e78b7" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="pencil-outline" size={20} color="#2e78b7" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ControlUsuariosScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_API_URL;
        console.log('Base URL:', baseUrl); // Para debug
        
        if (!baseUrl) {
          throw new Error('EXPO_PUBLIC_API_URL no está definida en el archivo .env');
        }
        
        const url = `${baseUrl}/test`;
        console.log('Llamando a URL:', url); // Para debug
          const response = await axios.get(url);
        console.log('Datos recibidos:', response.data); // Para debug
        
        // Extraer el array de usuarios de testResult
        if (response.data && response.data.testResult) {
          setUsuarios(response.data.testResult);
        } else {
          console.error('La respuesta no tiene el formato esperado:', response.data);
          setUsuarios([]);
        }
      } catch (error) {
        console.error('Error al obtener usuarios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  // Filtrar usuarios basado en la búsqueda
  const filteredUsuarios = usuarios.filter(
    (usuario) =>
      usuario.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      usuario.rol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Control de Usuarios</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o rol..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredUsuarios}
          renderItem={({ item }) => <UsuarioItem item={item} />}
          keyExtractor={(item) => item.nombre}
          contentContainerStyle={styles.listContainer}
        />

        <TouchableOpacity style={styles.fab}>
          <Ionicons name="add" size={24} color="#2e78b7" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    padding: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e78b7',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: '#2e78b7',
  },
  listContainer: {
    padding: 16,
  },
  pedidoItem: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pedidoNumero: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e78b7',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  clienteText: {
    fontSize: 16,
    marginBottom: 4,
    color: '#4a5568',
  },
  fechaText: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: 10,
    marginLeft: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
});