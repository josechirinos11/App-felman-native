// app/modulos/index-modulo-principal.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface CustomModule {
  id: string;
  nombre: string;
  icono: IconName;
  consultaSQL: string;
  apiRestUrl: string;
  fechaCreacion: string;
  tieneSubmodulos?: boolean;
  submodulos?: CustomModule[];
}

interface MenuItem {
  id: string;
  title: string;
  icon: IconName;
  route: string;
}

export default function IndexModuloPrincipalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const moduloId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [moduloPrincipal, setModuloPrincipal] = useState<CustomModule | null>(null);
  const [submodulos, setSubmodulos] = useState<MenuItem[]>([]);

  // Cargar módulo principal y sus submódulos
  useFocusEffect(
    useCallback(() => {
      cargarModuloPrincipal();
    }, [moduloId])
  );

  const cargarModuloPrincipal = async () => {
    try {
      setLoading(true);
      const modulosJSON = await AsyncStorage.getItem('customModules');
      
      if (modulosJSON) {
        const modulos: CustomModule[] = JSON.parse(modulosJSON);
        const modulo = modulos.find(m => m.id === moduloId);
        
        if (modulo) {
          setModuloPrincipal(modulo);
          
          // Cargar submódulos si existen
          if (modulo.submodulos && modulo.submodulos.length > 0) {
            const menuItems: MenuItem[] = modulo.submodulos.map(sub => ({
              id: sub.id,
              title: sub.nombre,
              icon: sub.icono,
              route: `/modulos/${sub.id}`,
            }));
            setSubmodulos(menuItems);
            console.log('✅ Submódulos cargados:', menuItems.length);
          } else {
            setSubmodulos([]);
          }
        } else {
          Alert.alert('Error', 'Módulo no encontrado');
          router.back();
        }
      }
    } catch (error) {
      console.error('❌ Error al cargar módulo principal:', error);
      Alert.alert('Error', 'No se pudo cargar el módulo');
    } finally {
      setLoading(false);
    }
  };

  const handleAgregarSubmodulo = () => {
    // Navegar a agregar módulo con el ID del módulo padre
    router.push(`/modulos/agregarModulo?parentId=${moduloId}` as any);
  };

  const handleConfigurar = () => {
    // Navegar a configuración del módulo principal
    router.push(`/modulos/configurarModulo?id=${moduloId}` as any);
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2e78b7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back-outline" size={24} color="#2e78b7" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons 
              name={moduloPrincipal?.icono || 'folder-outline'} 
              size={24} 
              color="#2e78b7" 
            />
            <Text style={styles.headerTitle}>{moduloPrincipal?.nombre || 'Módulo'}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Información del módulo */}
        <View style={styles.moduleInfo}>
          <View style={styles.moduleInfoCard}>
            <Ionicons name="file-tray-outline" size={32} color="#2e78b7" />
            <Text style={styles.moduleInfoTitle}>Módulo Principal</Text>
            <Text style={styles.moduleInfoDescription}>
              Organiza tus submódulos relacionados en un solo lugar
            </Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="albums-outline" size={20} color="#6b7280" />
                <Text style={styles.statText}>
                  {submodulos.length} {submodulos.length === 1 ? 'Submódulo' : 'Submódulos'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Panel principal con submódulos */}
        <View style={styles.mainPanel}>
          {submodulos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No hay submódulos aún</Text>
              <Text style={styles.emptyDescription}>
                Presiona el botón "+" para agregar tu primer submódulo
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView}>
              <View style={styles.menuGrid}>
                {Array.from({ length: Math.ceil(submodulos.length / 2) }).map((_, rowIndex) => (
                  <View key={rowIndex} style={styles.menuRow}>
                    {submodulos.slice(rowIndex * 2, rowIndex * 2 + 2).map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.menuItem}
                        onPress={() => router.push(item.route as any)}
                      >
                        <Ionicons name={item.icon} size={32} color="#2e78b7" />
                        <Text style={styles.menuText}>{item.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Botón de agregar submódulo fijo arriba del botón de configuraciones */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAgregarSubmodulo}
        >
          <Ionicons name="add-outline" size={24} color="#1976d2" />
        </TouchableOpacity>

        {/* Botón de configuraciones fijo abajo a la derecha */}
        <TouchableOpacity
          style={styles.configButton}
          onPress={handleConfigurar}
        >
          <Ionicons name="settings-outline" size={24} color="#1976d2" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  moduleInfo: {
    backgroundColor: '#f3f4f6',
    padding: 16,
  },
  moduleInfoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  moduleInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
  },
  moduleInfoDescription: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  mainPanel: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
    paddingTop: 16,
  },
  menuGrid: {
    padding: 10,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#4a5568',
  },
  addButton: {
    position: 'absolute',
    bottom: 86,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e3eafc',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  configButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e3eafc',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
