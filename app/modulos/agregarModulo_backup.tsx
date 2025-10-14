// app/modulos/agregarModulo.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
  // Nuevos campos para conexión directa
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

// Lista de iconos disponibles para seleccionar
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

export default function AgregarModuloScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mostrarSelectorIcono, setMostrarSelectorIcono] = useState(false);

  // Estados del formulario
  const [nombreModulo, setNombreModulo] = useState('');
  const [iconoSeleccionado, setIconoSeleccionado] = useState<IconName>('apps-outline');
  const [consultaSQL, setConsultaSQL] = useState('');
  const [apiRestUrl, setApiRestUrl] = useState('');

  // Función para validar el formulario
  const validarFormulario = (): boolean => {
    if (!nombreModulo.trim()) {
      Alert.alert('Error', 'El nombre del módulo es obligatorio');
      return false;
    }
    if (!consultaSQL.trim()) {
      Alert.alert('Error', 'La consulta SQL es obligatoria');
      return false;
    }
    if (!apiRestUrl.trim()) {
      Alert.alert('Error', 'La URL de la API REST es obligatoria');
      return false;
    }
    // Validar formato básico de URL
    try {
      new URL(apiRestUrl);
    } catch (e) {
      Alert.alert('Error', 'La URL de la API REST no tiene un formato válido');
      return false;
    }
    return true;
  };

  // Función para guardar el módulo
  const guardarModulo = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      // Generar ID único para el módulo
      const moduleId = `module_${Date.now()}`;
      
      // Crear objeto del módulo
      const nuevoModulo: CustomModule = {
        id: moduleId,
        nombre: nombreModulo.trim(),
        icono: iconoSeleccionado,
        consultaSQL: consultaSQL.trim(),
        apiRestUrl: apiRestUrl.trim(),
        fechaCreacion: new Date().toISOString(),
        tipoConexion: 'api', // Por defecto usar API REST
        rolesPermitidos: ['Todos'], // Por defecto acceso para todos
      };

      // Recuperar módulos existentes
      const modulosGuardadosJSON = await AsyncStorage.getItem('customModules');
      let modulosExistentes: CustomModule[] = [];
      
      if (modulosGuardadosJSON) {
        modulosExistentes = JSON.parse(modulosGuardadosJSON);
      }

      // Agregar el nuevo módulo
      modulosExistentes.push(nuevoModulo);

      // Guardar en AsyncStorage
      await AsyncStorage.setItem('customModules', JSON.stringify(modulosExistentes));

      console.log('✅ Módulo guardado exitosamente:', nuevoModulo);

      Alert.alert(
        'Éxito',
        'El módulo ha sido creado correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              // Volver a la pantalla principal
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error al guardar el módulo:', error);
      Alert.alert('Error', 'No se pudo guardar el módulo. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para seleccionar un icono
  const seleccionarIcono = (iconName: IconName) => {
    setIconoSeleccionado(iconName);
    setMostrarSelectorIcono(false);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {/* Encabezado */}
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
            {/* Campo: Nombre del Módulo */}
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

            {/* Campo: Icono */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Icono *</Text>
              <TouchableOpacity
                style={styles.iconSelector}
                onPress={() => setMostrarSelectorIcono(true)}
              >
                <View style={styles.iconPreview}>
                  <Ionicons name={iconoSeleccionado} size={24} color="#2e78b7" />
                  <Text style={styles.iconLabel}>
                    {iconosDisponibles.find(i => i.name === iconoSeleccionado)?.label || 'Seleccionar icono'}
                  </Text>
                </View>
                <Ionicons name="chevron-down-outline" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Campo: Consulta SQL */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Consulta SQL *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="SELECT * FROM tabla WHERE..."
                value={consultaSQL}
                onChangeText={setConsultaSQL}
                multiline
                numberOfLines={4}
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.helpText}>
                Esta consulta se enviará al backend para obtener los datos
              </Text>
            </View>

            {/* Campo: URL API REST */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Dirección API REST *</Text>
              <TextInput
                style={styles.input}
                placeholder="https://api.ejemplo.com/endpoint"
                value={apiRestUrl}
                onChangeText={setApiRestUrl}
                keyboardType="url"
                autoCapitalize="none"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.helpText}>
                URL completa del endpoint donde se ejecutará la consulta
              </Text>
            </View>

            {/* Botones de acción */}
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

        {/* Modal: Selector de Icono */}
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

              <ScrollView style={styles.iconList}>
                {iconosDisponibles.map((icono) => (
                  <TouchableOpacity
                    key={icono.name}
                    style={[
                      styles.iconOption,
                      iconoSeleccionado === icono.name && styles.iconOptionSelected,
                    ]}
                    onPress={() => seleccionarIcono(icono.name)}
                  >
                    <Ionicons name={icono.name} size={24} color="#2e78b7" />
                    <Text style={styles.iconOptionText}>{icono.label}</Text>
                    {iconoSeleccionado === icono.name && (
                      <Ionicons name="checkmark-circle" size={20} color="#2e78b7" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
    flexDirection: 'column',
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
  fieldContainer: {
    marginBottom: 24,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  iconSelector: {
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
  iconPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconLabel: {
    fontSize: 14,
    color: '#1f2937',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: 20,
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
  iconList: {
    paddingHorizontal: 20,
  },
  iconOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  iconOptionSelected: {
    backgroundColor: '#e3eafc',
  },
  iconOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
});
