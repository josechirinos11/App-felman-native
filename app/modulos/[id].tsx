// app/modulos/[id].tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Modal as RNModal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ✅ Imports para AppHeader y ModalHeader
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
// ✅ Importar el nuevo componente Diseñador desde su propio archivo
import { useAuth } from '../../hooks/useAuth';
import ModalDiseñador from './modalDiseñador';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Importar el tipo unificado de DiseñoConfig

import type { CustomModule, DataRow } from '../../types/CustomModule';
import type { DiseñoConfig } from '../../types/DiseñoConfig';

import { buscarModuloRecursivo } from './index-modulo-principal';

interface ConfiguracionVista {
  columnasVisibles: string[];
  ordenColumnas: string[];
  registrosPorPagina: number;
}

interface QuerySQL {
  id: string;
  sql: string;
  params?: any[];
  stopOnEmpty?: boolean;
}


// Función para actualizar recursivamente el diseñoConfig de un módulo por id
function actualizarModuloRecursivo(modulosArr: CustomModule[], id: string, nuevoConfig: DiseñoConfig): boolean {
  for (let i = 0; i < modulosArr.length; i++) {
    if (modulosArr[i].id === id) {
      modulosArr[i] = {
        ...modulosArr[i],
        diseñoConfig: nuevoConfig,
      };
      return true;
    }
    if (modulosArr[i].submodulos && modulosArr[i].submodulos!.length > 0) {
      const actualizado = actualizarModuloRecursivo(modulosArr[i].submodulos!, id, nuevoConfig);
      if (actualizado) {
        modulosArr[i] = { ...modulosArr[i], submodulos: [...modulosArr[i].submodulos!] };
        return true;
      }
    }
  }
  return false;
}

export default function ModuloDetalleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [modulo, setModulo] = useState<CustomModule | null>(null);
  const [datos, setDatos] = useState<DataRow[]>([]);
  const [columnas, setColumnas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diseñoModalVisible, setDiseñoModalVisible] = useState(false); // Estado para modal diseñador
  const [filtroActual, setFiltroActual] = useState<string>('TODOS');
  const [busquedaQuery, setBusquedaQuery] = useState<string>('');
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState<DataRow | null>(null);

  const { authenticated, usuario } = useAuth();
  const [userModalVisible, setUserModalVisible] = useState(false);

  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const cols = modulo?.diseñoConfig?.responsive?.webCols || 2;

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Pantalla en foco - Recargando módulo:', id);
      cargarModulo();
    }, [id]),
  );

  useEffect(() => {
    if (modulo && !modulo.tieneSubmodulos) {
      const tieneSQLConfigurada = modulo.consultaSQL && modulo.consultaSQL.trim() !== '';
      const tieneAPIConfigurada = modulo.apiRestUrl && modulo.apiRestUrl.trim() !== '';
      const tieneConsultasMultiples = modulo.usaConsultasMultiples && modulo.consultasSQL && modulo.consultasSQL.length > 0;

      if (tieneSQLConfigurada || tieneAPIConfigurada || tieneConsultasMultiples) {
        cargarDatos();
      } else {
        console.log('⚠️ Módulo sin configuración SQL/API - No se cargan datos');
        setLoading(false);
        setError('Este módulo aún no tiene configurada una consulta SQL o URL de API. Por favor, configúralo desde el botón de configuración.');
      }
    } else if (modulo && modulo.tieneSubmodulos) {
      console.log('✅ Módulo con submódulos - No requiere cargar datos');
      setLoading(false);
    }
  }, [modulo]);

  // ✅ Función para guardar la configuración del diseñador
  const guardarDiseñoConfig = async (nuevaConfig: DiseñoConfig) => {
    if (!modulo) return;
    // Normaliza la config para asegurar que los campos requeridos no sean undefined
    const configNormalizada: DiseñoConfig = {
      ...nuevaConfig,
      modales: (nuevaConfig.modales || []).map((modal) => ({
        ...modal,
        titulo: modal.titulo ?? '',
        trigger: modal.trigger ?? 'itemClick',
        contenido: modal.contenido ?? 'detalle',
        campos: modal.campos ?? [],
        botonesAnidados: modal.botonesAnidados?.map(boton => ({
          ...boton,
          label: boton.label ?? '',
          accion: boton.accion ?? 'openModal',
        })),
      })),
    };
    try {
      const modulosJSON = await AsyncStorage.getItem('customModules');
      if (modulosJSON) {
        let modulos: CustomModule[] = JSON.parse(modulosJSON);

        // Actualizar recursivamente
        const actualizado = actualizarModuloRecursivo(modulos, id, configNormalizada);

        if (actualizado) {
          await AsyncStorage.setItem('customModules', JSON.stringify(modulos));
          // Actualizar estado local para reflejar cambios
          setModulo((prevModulo) => (prevModulo ? { ...prevModulo, diseñoConfig: configNormalizada } : null));
          console.log('✅ Configuración de diseño guardada y actualizada.');
          // Opcional: Recargar datos si la nueva config lo requiere
          // cargarDatos();
        } else {
          console.error('❌ No se pudo encontrar el módulo para actualizar la configuración.');
        }
      }
    } catch (e) {
      console.error('❌ Error al guardar la configuración de diseño:', e);
    }
  };

  const cargarModulo = async () => {
    try {
      console.log('🔍 Cargando módulo con ID:', id);
      const modulosJSON = await AsyncStorage.getItem('customModules');
      console.log('📦 Módulos en storage:', modulosJSON ? 'Encontrados' : 'No encontrados');

      if (modulosJSON) {
        const modulos: CustomModule[] = JSON.parse(modulosJSON);
        console.log('📊 Total de módulos:', modulos.length);

        const moduloEncontrado = buscarModuloRecursivo(modulos, id);

        if (moduloEncontrado) {
          console.log('✅ Módulo encontrado:', moduloEncontrado.nombre);

          // ✅ Verificación de consistencia
          const tieneSubmodulosReal = !!(moduloEncontrado.submodulos && moduloEncontrado.submodulos.length > 0);
          if (tieneSubmodulosReal !== moduloEncontrado.tieneSubmodulos) {
            console.warn('⚠️ INCONSISTENCIA DETECTADA: Corrigiendo en memoria...');
            moduloEncontrado.tieneSubmodulos = tieneSubmodulosReal;
          }

          setModulo(moduloEncontrado);
        } else {
          console.error('❌ Módulo no encontrado con ID:', id);
          setError('Módulo no encontrado');
        }
      } else {
        console.warn('⚠️ No hay módulos guardados en AsyncStorage');
        setError('No hay módulos guardados');
      }
    } catch (err) {
      console.error('❌ Error al cargar módulo:', err);
      setError('Error al cargar el módulo');
    }
  };

  const cargarDatos = async () => {
    if (!modulo) return;

    setLoading(true);
    setError(null);

    try {
      let response;
      let requestBody: any;

      if (modulo.tipoConexion === 'api') {
        // ... (Lógica de fetch API)
        // const json = await response.json();
        // setDatos(json);
        // if (json.length > 0) setColumnas(Object.keys(json[0]));
        
        // Simulación de datos para demostración
        const simData = [
          { NoPedido: 'P-1001', Cliente: 'Cliente A', Estado: 'Fabricado', Seccion: 'ALUMINIO' },
          { NoPedido: 'P-1002', Cliente: 'Cliente B', Estado: 'En Cola', Seccion: 'PVC' },
          { NoPedido: 'P-1003', Cliente: 'Cliente C', Estado: 'En Fabricacion', Seccion: 'ALUMINIO' },
        ];
        setDatos(simData);
        setColumnas(simData.length > 0 ? Object.keys(simData[0]) : []);

      } // ... (más lógica para db si aplica)
    } catch (err) {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  // Render dinámico basado en diseñoConfig
  const renderVistaDinamica = () => {
    const config = modulo?.diseñoConfig;
    if (!config) {
      // Renderizado por defecto si no hay config
      return (
        <Text style={styles.errorText}>
          Este módulo no tiene una configuración de diseño. Ábrela con el botón de ajustes ⚙️.
        </Text>
      );
    }

    // Filtrar datos según búsqueda y filtro
    let datosFiltrados = datos.filter(item => {
      // Aplicar filtro rápido
      if (filtroActual !== 'TODOS') {
        const filtroActivo = config.filtros.find(f => f.label === filtroActual);
        if (filtroActivo) {
          if (item[filtroActivo.campo] !== filtroActivo.valor) {
            return false;
          }
        }
      }
      
      // Aplicar búsqueda
      if (busquedaQuery && config.camposBusqueda.length > 0) {
        const queryLower = busquedaQuery.toLowerCase();
        return config.camposBusqueda.some(campo => 
          String(item[campo]).toLowerCase().includes(queryLower)
        );
      }
      return true;
    });

    // Acción al hacer clic en un item
    const handleItemClick = (item: DataRow) => {
      const itemClickModal = config.modales.find(m => m.trigger === 'itemClick');
      if (itemClickModal) {
        console.log(`Abriendo modal [${itemClickModal.id}] por itemClick`);
        setItemSeleccionado(item);
        setModalDetalleVisible(true); // Asumimos que solo hay un modal de detalle por ahora
      } else {
        console.log('No hay acción "itemClick" configurada en los modales.');
      }
    };

    // Render según tipo de vista
    switch (config.vistaTipo) {
      case 'grid':
        return (
          <FlatList
            data={datosFiltrados}
            numColumns={isWeb ? config.responsive.webCols : config.responsive.mobileCols}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleItemClick(item)}>
                <View style={styles.dataCard}>
                  <Text style={styles.dataCardTitle}>{item[config.renderItemConfig.campoTitulo]}</Text>
                  {config.renderItemConfig.campoSubtitulo && <Text>{item[config.renderItemConfig.campoSubtitulo]}</Text>}
                  {config.renderItemConfig.campoBadge && <Text>{item[config.renderItemConfig.campoBadge]}</Text>}
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) => index.toString()}
            style={{ flex: 1 }}
          />
        );
      case 'table':
        return <Text>Vista de Tabla (No implementada)</Text>;
      default:
        // 'list' por defecto
        return (
          <FlatList
            data={datosFiltrados}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleItemClick(item)} style={styles.dataCard}>
                <View>
                  <Text style={styles.dataCardTitle}>{item[config.renderItemConfig.campoTitulo]}</Text>
                  {config.renderItemConfig.campoSubtitulo && <Text style={styles.dataCardSubtitle}>{item[config.renderItemConfig.campoSubtitulo]}</Text>}
                </View>
                {config.renderItemConfig.campoBadge && <Text style={styles.dataCardBadge}>{item[config.renderItemConfig.campoBadge]}</Text>}
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) => index.toString()}
            style={{ flex: 1 }}
          />
        );
    }
  };

  // Modal detalle ejemplo (configurable)
  const renderModalDetalle = () => {
    const config = modulo?.diseñoConfig;
    const itemClickModal = config?.modales.find(m => m.trigger === 'itemClick');
    
    if (!itemClickModal || !itemSeleccionado) return null;
    
    return (
      <RNModal visible={modalDetalleVisible} onRequestClose={() => setModalDetalleVisible(false)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{itemClickModal.titulo}</Text>
            
            {itemClickModal.contenido === 'detalle' && (
              itemClickModal.campos.map(campo => (
                <View key={campo} style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>{campo}:</Text>
                  <Text style={styles.modalDetailValue}>{itemSeleccionado[campo]}</Text>
                </View>
              ))
            )}

            {/* Renderizar botones anidados */}
            {itemClickModal.botonesAnidados?.map(boton => (
              <TouchableOpacity key={boton.id} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>{boton.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#666'}]} onPress={() => setModalDetalleVisible(false)}>
              <Text style={styles.modalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </RNModal>
    );
  };

  // Render filtros si habilitados
  const renderFiltros = () => {
    const config = modulo?.diseñoConfig;
    if (!config?.filtros?.length) return null;
    
    // Añadir "TODOS"
    const filtrosConTodos = [
      { id: 'todos', label: 'TODOS', campo: '', valor: '' },
      ...config.filtros
    ];

    return (
      <View style={styles.filterContainer}>
        {filtrosConTodos.map(f => (
          <TouchableOpacity 
            key={f.id} 
            style={[styles.filterChip, filtroActual === f.label && styles.filterChipActive]}
            onPress={() => setFiltroActual(f.label)}
          >
            <Text style={[styles.filterChipText, filtroActual === f.label && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render búsqueda si habilitada
  const renderBusqueda = () => {
    const config = modulo?.diseñoConfig;
    if (!config?.busquedaHabilitada) return null;
    
    const placeholder = config.camposBusqueda.length 
      ? `Buscar por ${config.camposBusqueda.slice(0, 2).join(', ')}...`
      : 'Buscar...';

    return (
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#757575" />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          value={busquedaQuery}
          onChangeText={setBusquedaQuery}
        />
      </View>
    );
  };
  
  // Render botones de acción
  const renderBotonesAccion = (posicion: 'header' | 'item') => {
    const config = modulo?.diseñoConfig;
    if (!config?.botonesAccion?.length) return null;
    
    return config.botonesAccion
      .filter(b => b.posicion === posicion)
      .map(boton => (
        <TouchableOpacity key={boton.id} style={styles.actionButton} onPress={() => console.log(`Acción: ${boton.accion}`)}>
          <Ionicons name={(boton.icono as IconName) || 'alert-circle'} size={20} color="#1976d2" />
          <Text style={styles.actionButtonText}>{boton.label}</Text>
        </TouchableOpacity>
      ));
  };


  if (loading && !modulo) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2e78b7" />
      </View>
    );
  }

  if (error && !modulo) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e53e3e" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        titleOverride={modulo?.nombre}
        count={datos.length}
        userNameProp={usuario?.nombre || usuario?.name || '—'}
        roleProp={usuario?.rol || usuario?.role || '—'}
        serverReachableOverride={!!authenticated}
        onRefresh={cargarDatos}
        onUserPress={() => setUserModalVisible(true)}
      />

      {/* Renderizar botones de header (se muestran fuera del componente AppHeader porque AppHeader no acepta children) */}
      <View style={styles.headerActions}>
        {renderBotonesAccion('header')}
      </View>

      <ModalHeader
        visible={userModalVisible}
        onClose={() => setUserModalVisible(false)}
        userName={usuario?.nombre || usuario?.name || '—'}
        role={usuario?.rol || usuario?.role || '—'}
      />

      <View style={styles.content}>
        {/* Búsqueda y filtros */}
        {renderBusqueda()}
        {renderFiltros()}

        {/* Vista dinámica */}
        {loading ? <ActivityIndicator size="large" /> : renderVistaDinamica()}

        {/* Modal detalle */}
        {renderModalDetalle()}
      </View>

      {/* Botón de agregar submódulo (si aplica) */}
      {modulo?.tieneSubmodulos && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push(`/modulos/agregarModulo?parentId=${id}` as any)}
        >
          <Ionicons name="add-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Botón de configuración de conexión */}
      <TouchableOpacity
        style={[styles.configButton, { bottom: 90, backgroundColor: '#1976d2' }]}
        onPress={() => {
          // Navegar a la pantalla de configuración del módulo
          router.push({ pathname: '/modulos/configurarModulo', params: { id: id as string } } as any);
        }}
      >
        <Ionicons name="server-outline" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Botón de configuración del diseñador */}
      <TouchableOpacity
        style={styles.configButton}
        onPress={() => setDiseñoModalVisible(true)}
      >
        <Ionicons name="settings-outline" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal Diseñador */}
      <ModalDiseñador
        visible={diseñoModalVisible}
        onClose={() => setDiseñoModalVisible(false)}
        // @ts-ignore
        configInicial={modulo?.diseñoConfig}
        columnasDisponibles={columnas}
        onGuardar={guardarDiseñoConfig}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fa',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#e53e3e',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: Platform.OS === 'web' ? 16 : 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  actionButtonText: {
    color: '#1976d2',
    fontWeight: '600',
    fontSize: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  filterChip: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipActive: {
    backgroundColor: '#1976d2',
  },
  filterChipText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 8,
    paddingHorizontal: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8,
    fontSize: 14,
  },
  dataCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    margin: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  dataCardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  dataCardBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: '#1976d2',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  configButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#f57c00',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976d2',
    marginBottom: 16,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalDetailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  modalDetailValue: {
    fontSize: 14,
    color: '#333',
  },
  modalButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  modalButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
});