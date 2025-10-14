// app/modulos/agregarModulo.tsx - VERSIÓN MEJORADA
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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
  // Nuevos campos para conexión
  tipoConexion: 'api' | 'directa';
  dbConfig?: {
    tipo: 'mysql' | 'postgresql' | 'sqlserver' | 'oracle';
    host: string;
    port: number;
    database: string;
    usuario: string;
    password: string;
  };
  // Control de acceso por roles
  rolesPermitidos: string[];
  // Configuración de visualización
  configuracionVista?: {
    columnasVisibles?: string[];
    ordenColumnas?: string[];
    formatoColumnas?: { [key: string]: string };
  };
}

// Lista de iconos disponibles
const iconosDisponibles: { name: IconName; label: string }[] = [
  { name: 'apps-outline', label: 'Apps' },
  { name: 'bar-chart-outline', label: 'Gráficos' },
  { name: 'briefcase-outline', label: 'Maletín' },
  { name: 'calculator-outline', label: 'Calculadora' },
  { name: 'calendar-outline', label: 'Calendario' },
  { name: 'cart-outline', label: 'Carrito' },
  { name: 'clipboard-outline', label: 'Portapapeles' },
  { name: 'cloud-outline', label: 'Nube' },
  { name: 'construct-outline', label: 'Construcción' },
  { name: 'cube-outline', label: 'Cubo' },
  { name: 'document-text-outline', label: 'Documento' },
  { name: 'folder-outline', label: 'Carpeta' },
  { name: 'grid-outline', label: 'Cuadrícula' },
  { name: 'hammer-outline', label: 'Martillo' },
  { name: 'layers-outline', label: 'Capas' },
  { name: 'list-outline', label: 'Lista' },
  { name: 'map-outline', label: 'Mapa' },
  { name: 'pie-chart-outline', label: 'Gráfico circular' },
  { name: 'reader-outline', label: 'Lector' },
  { name: 'server-outline', label: 'Servidor' },
  { name: 'stats-chart-outline', label: 'Estadísticas' },
  { name: 'storefront-outline', label: 'Tienda' },
  { name: 'telescope-outline', label: 'Telescopio' },
  { name: 'terminal-outline', label: 'Terminal' },
  { name: 'trending-up-outline', label: 'Tendencia' },
];

// Lista de roles disponibles (esto debería venir del backend)
const rolesDisponibles = [
  'Administrador',
  'Gerente',
  'Supervisor',
  'Operario',
  'Logística',
  'Almacén',
  'Ventas',
  'Comercial',
  'Todos',
];

export default function AgregarModuloScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mostrarSelectorIcono, setMostrarSelectorIcono] = useState(false);
  const [mostrarSelectorRoles, setMostrarSelectorRoles] = useState(false);

  // Estados básicos del formulario
  const [nombreModulo, setNombreModulo] = useState('');
  const [iconoSeleccionado, setIconoSeleccionado] = useState<IconName>('apps-outline');
  const [consultaSQL, setConsultaSQL] = useState('');
  
  // Tipo de conexión
  const [tipoConexion, setTipoConexion] = useState<'api' | 'directa'>('api');
  
  // Configuración API
  const [apiRestUrl, setApiRestUrl] = useState('');
  
  // Configuración de BD directa
  const [tipoDB, setTipoDB] = useState<'mysql' | 'postgresql' | 'sqlserver' | 'oracle'>('mysql');
  const [hostDB, setHostDB] = useState('');
  const [portDB, setPortDB] = useState('3306');
  const [nombreDB, setNombreDB] = useState('');
  const [usuarioDB, setUsuarioDB] = useState('');
  const [passwordDB, setPasswordDB] = useState('');
  
  // Control de acceso
  const [rolesSeleccionados, setRolesSeleccionados] = useState<string[]>(['Todos']);

  // Cargar rol del usuario actual
  useEffect(() => {
    cargarRolUsuario();
  }, []);

  const cargarRolUsuario = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        console.log('👤 Usuario actual:', user);
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error);
    }
  };

  // Validar formulario
  const validarFormulario = (): boolean => {
    if (!nombreModulo.trim()) {
      Alert.alert('Error', 'El nombre del módulo es obligatorio');
      return false;
    }
    if (!consultaSQL.trim()) {
      Alert.alert('Error', 'La consulta SQL es obligatoria');
      return false;
    }
    
    if (tipoConexion === 'api') {
      if (!apiRestUrl.trim()) {
        Alert.alert('Error', 'La URL de la API REST es obligatoria');
        return false;
      }
      try {
        new URL(apiRestUrl);
      } catch (e) {
        Alert.alert('Error', 'La URL de la API REST no tiene un formato válido');
        return false;
      }
    } else {
      if (!hostDB.trim() || !nombreDB.trim() || !usuarioDB.trim()) {
        Alert.alert('Error', 'Todos los campos de conexión a BD son obligatorios');
        return false;
      }
    }
    
    if (rolesSeleccionados.length === 0) {
      Alert.alert('Error', 'Debes seleccionar al menos un rol con acceso');
      return false;
    }
    
    return true;
  };

  // Guardar módulo
  const guardarModulo = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      const moduleId = `module_${Date.now()}`;
      
      const nuevoModulo: CustomModule = {
        id: moduleId,
        nombre: nombreModulo.trim(),
        icono: iconoSeleccionado,
        consultaSQL: consultaSQL.trim(),
        apiRestUrl: tipoConexion === 'api' ? apiRestUrl.trim() : '',
        fechaCreacion: new Date().toISOString(),
        tipoConexion,
        rolesPermitidos: rolesSeleccionados,
      };

      // Agregar configuración de BD si es conexión directa
      if (tipoConexion === 'directa') {
        nuevoModulo.dbConfig = {
          tipo: tipoDB,
          host: hostDB.trim(),
          port: parseInt(portDB),
          database: nombreDB.trim(),
          usuario: usuarioDB.trim(),
          password: passwordDB, // En producción, esto debería estar encriptado
        };
      }

      // Recuperar módulos existentes
      const modulosJSON = await AsyncStorage.getItem('customModules');
      let modulos: CustomModule[] = modulosJSON ? JSON.parse(modulosJSON) : [];
      
      modulos.push(nuevoModulo);
      await AsyncStorage.setItem('customModules', JSON.stringify(modulos));

      console.log('✅ Módulo guardado:', nuevoModulo.id);

      Alert.alert(
        'Éxito',
        'El módulo ha sido creado correctamente',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('❌ Error al guardar módulo:', error);
      Alert.alert('Error', 'No se pudo guardar el módulo');
    } finally {
      setLoading(false);
    }
  };

  // Toggle de rol
  const toggleRol = (rol: string) => {
    if (rol === 'Todos') {
      setRolesSeleccionados(['Todos']);
    } else {
      let nuevosRoles = [...rolesSeleccionados];
      
      // Remover "Todos" si se selecciona otro rol
      nuevosRoles = nuevosRoles.filter(r => r !== 'Todos');
      
      if (nuevosRoles.includes(rol)) {
        nuevosRoles = nuevosRoles.filter(r => r !== rol);
      } else {
        nuevosRoles.push(rol);
      }
      
      // Si no hay ninguno, poner "Todos"
      if (nuevosRoles.length === 0) {
        nuevosRoles = ['Todos'];
      }
      
      setRolesSeleccionados(nuevosRoles);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back-outline" size={24} color="#2e78b7" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Agregar Módulo</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Formulario */}
        <ScrollView style={styles.scrollView}>
          <View style={styles.formContainer}>
            
            {/* Nombre del Módulo */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información Básica</Text>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Nombre del Módulo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Control de Inventario"
                  value={nombreModulo}
                  onChangeText={setNombreModulo}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Icono */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Icono *</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setMostrarSelectorIcono(true)}
                >
                  <View style={styles.selectorContent}>
                    <Ionicons name={iconoSeleccionado} size={24} color="#2e78b7" />
                    <Text style={styles.selectorText}>
                      {iconosDisponibles.find(i => i.name === iconoSeleccionado)?.label}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down-outline" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Control de Acceso */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Control de Acceso</Text>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Roles con Acceso *</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setMostrarSelectorRoles(true)}
                >
                  <Text style={styles.selectorText}>
                    {rolesSeleccionados.join(', ')}
                  </Text>
                  <Ionicons name="chevron-down-outline" size={20} color="#9ca3af" />
                </TouchableOpacity>
                <Text style={styles.helpText}>
                  Solo los usuarios con estos roles verán este módulo
                </Text>
              </View>
            </View>

            {/* Tipo de Conexión */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Configuración de Conexión</Text>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Tipo de Conexión *</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => setTipoConexion('api')}
                  >
                    <Ionicons
                      name={tipoConexion === 'api' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color="#2e78b7"
                    />
                    <Text style={styles.radioText}>API REST (Recomendado)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => setTipoConexion('directa')}
                  >
                    <Ionicons
                      name={tipoConexion === 'directa' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color="#2e78b7"
                    />
                    <Text style={styles.radioText}>Conexión Directa a BD</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Configuración API */}
              {tipoConexion === 'api' && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>URL de la API REST *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://api.empresa.com/ejecutar-consulta"
                    value={apiRestUrl}
                    onChangeText={setApiRestUrl}
                    keyboardType="url"
                    autoCapitalize="none"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text style={styles.helpText}>
                    URL del endpoint que ejecutará la consulta SQL
                  </Text>
                </View>
              )}

              {/* Configuración BD Directa */}
              {tipoConexion === 'directa' && (
                <>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Tipo de Base de Datos *</Text>
                    <View style={styles.radioGroup}>
                      {['mysql', 'postgresql', 'sqlserver', 'oracle'].map((tipo) => (
                        <TouchableOpacity
                          key={tipo}
                          style={styles.radioOption}
                          onPress={() => setTipoDB(tipo as any)}
                        >
                          <Ionicons
                            name={tipoDB === tipo ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color="#2e78b7"
                          />
                          <Text style={styles.radioText}>{tipo.toUpperCase()}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Host / Servidor *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="localhost o 192.168.1.100"
                      value={hostDB}
                      onChangeText={setHostDB}
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Puerto *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="3306"
                      value={portDB}
                      onChangeText={setPortDB}
                      keyboardType="number-pad"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Nombre de la Base de Datos *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="mi_base_datos"
                      value={nombreDB}
                      onChangeText={setNombreDB}
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Usuario *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="usuario_bd"
                      value={usuarioDB}
                      onChangeText={setUsuarioDB}
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Contraseña *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      value={passwordDB}
                      onChangeText={setPasswordDB}
                      secureTextEntry
                      placeholderTextColor="#9ca3af"
                    />
                    <Text style={styles.helpText}>
                      ⚠️ La contraseña se guardará de forma local
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Consulta SQL */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Consulta SQL</Text>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Consulta SQL *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="SELECT * FROM tabla WHERE condicion"
                  value={consultaSQL}
                  onChangeText={setConsultaSQL}
                  multiline
                  numberOfLines={6}
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.helpText}>
                  Solo se permiten consultas SELECT por seguridad
                </Text>
              </View>
            </View>

            {/* Botones */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => router.back()}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={guardarModulo}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar Módulo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Modal: Selector de Iconos */}
        <Modal
          visible={mostrarSelectorIcono}
          transparent
          animationType="slide"
          onRequestClose={() => setMostrarSelectorIcono(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seleccionar Icono</Text>
                <TouchableOpacity onPress={() => setMostrarSelectorIcono(false)}>
                  <Ionicons name="close-outline" size={24} color="#4a5568" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalList}>
                {iconosDisponibles.map((icono) => (
                  <TouchableOpacity
                    key={icono.name}
                    style={[
                      styles.modalOption,
                      iconoSeleccionado === icono.name && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      setIconoSeleccionado(icono.name);
                      setMostrarSelectorIcono(false);
                    }}
                  >
                    <Ionicons name={icono.name} size={24} color="#2e78b7" />
                    <Text style={styles.modalOptionText}>{icono.label}</Text>
                    {iconoSeleccionado === icono.name && (
                      <Ionicons name="checkmark-circle" size={20} color="#2e78b7" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Selector de Roles */}
        <Modal
          visible={mostrarSelectorRoles}
          transparent
          animationType="slide"
          onRequestClose={() => setMostrarSelectorRoles(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seleccionar Roles</Text>
                <TouchableOpacity onPress={() => setMostrarSelectorRoles(false)}>
                  <Ionicons name="close-outline" size={24} color="#4a5568" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalList}>
                {rolesDisponibles.map((rol) => (
                  <TouchableOpacity
                    key={rol}
                    style={[
                      styles.modalOption,
                      rolesSeleccionados.includes(rol) && styles.modalOptionSelected,
                    ]}
                    onPress={() => toggleRol(rol)}
                  >
                    <View style={styles.checkbox}>
                      {rolesSeleccionados.includes(rol) && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.modalOptionText}>{rol}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setMostrarSelectorRoles(false)}
                >
                  <Text style={styles.modalButtonText}>Listo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2e78b7',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#2e78b7',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  selector: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectorText: {
    fontSize: 14,
    color: '#1f2937',
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  radioText: {
    fontSize: 14,
    color: '#1f2937',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
  },
  saveButton: {
    backgroundColor: '#2e78b7',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalList: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  modalOptionSelected: {
    backgroundColor: '#e3eafc',
  },
  modalOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#2e78b7',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e78b7',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalButton: {
    backgroundColor: '#2e78b7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
