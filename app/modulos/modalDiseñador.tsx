// app/modulos/modalDiseñador.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Importar el tipo DiseñoConfig si existe, si no, crearlo en types/DiseñoConfig.ts y usarlo aquí
import type { DiseñoConfig } from '../../types/DiseñoConfig';


// Copiamos la definición de IconName para evitar importaciones circulares complejas
type IconName = React.ComponentProps<typeof Ionicons>['name'];


// Definimos los props que recibirá el modal
interface ModalDiseñadorProps {
  visible: boolean;
  onClose: () => void;
  configInicial?: DiseñoConfig;
  columnasDisponibles: string[]; // Columnas de los datos para seleccionar
  onGuardar: (config: DiseñoConfig) => Promise<void> | void;
}


// Configuración por defecto para un módulo nuevo
const defaultConfig: DiseñoConfig = {
  vistaTipo: 'list',
  filtros: [],
  busquedaHabilitada: false,
  camposBusqueda: [],
  modales: [],
  botonesAccion: [],
  renderItemConfig: {
    campoTitulo: '',
    campoSubtitulo: '',
    campoBadge: '',
  },
  responsive: { webCols: 3, mobileCols: 1 },
  pollingEnabled: false,
  estadisticasHabilitadas: false,
};

const ModalDiseñador: React.FC<ModalDiseñadorProps> = ({
  visible,
  onClose,
  configInicial,
  columnasDisponibles,
  onGuardar,
}) => {
  // Estado local para editar la configuración
  const [localConfig, setLocalConfig] = useState<DiseñoConfig>(
    configInicial || defaultConfig,
  );

  // Sincronizar estado local cuando se abre el modal
  useEffect(() => {
    if (visible) {
      setLocalConfig(configInicial || defaultConfig);
    }
  }, [configInicial, visible]);

  // Handler para guardar (ahora espera el guardado y maneja errores)
  const handleGuardar = async () => {
    if (localConfig.vistaTipo === 'list' && !localConfig.renderItemConfig.campoTitulo) {
      Alert.alert('Error', 'Debe seleccionar un "Campo Título" para la vista de lista.');
      return;
    }
    // Normalizar los modales para que todos los campos requeridos sean string y no undefined
    const modalesNormalizados = (localConfig.modales || []).map((modal) => {
      const base = {
        id: modal.id || '',
        titulo: modal.titulo ?? '',
        trigger: (modal.trigger ?? 'itemClick') as 'itemClick' | `boton_${string}`,
        contenido: (modal.contenido ?? 'detalle') as 'detalle' | 'subLista' | 'estadisticas',
        campos: Array.isArray(modal.campos) ? modal.campos : [],
      };
      // Solo agregar botonesAnidados si existe en el modal
      if ('botonesAnidados' in modal) {
        return { ...base, botonesAnidados: (modal as any).botonesAnidados };
      }
      return base;
    });
    const configNormalizada = {
      ...localConfig,
      modales: modalesNormalizados,
    };
    try {
      await onGuardar(configNormalizada);
      onClose();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    }
  };

  // ----- Handlers para sub-formularios -----

  // Handler genérico para actualizar campos
  const handleChange = (campo: keyof DiseñoConfig, valor: any) => {
    setLocalConfig((prev) => ({ ...prev, [campo]: valor }));
  };

  // Handler para campos anidados (ej: responsive.webCols)
  const handleNestedChange = (
    campoPrincipal: keyof DiseñoConfig,
    campoAnidado: string,
    valor: any,
  ) => {
    setLocalConfig((prev: any) => ({
      ...prev,
      [campoPrincipal]: {
        ...prev[campoPrincipal],
        [campoAnidado]: valor,
      },
    }));
  };

  // ----- Renderizado de Secciones del Diseñador -----

  const renderSectionHeader = (titulo: string) => (
    <Text style={styles.sectionTitle}>{titulo}</Text>
  );

  const renderTextInput = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    placeholder = '',
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
      />
    </View>
  );

  const renderSwitch = (label: string, value: boolean, onValueChange: (val: boolean) => void) => (
    <View style={styles.switchGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );

  // ----- Sección: Vista Principal -----
  const renderVistaPrincipal = () => (
    <View style={styles.section}>
      {renderSectionHeader('Vista Principal')}
      <Text style={styles.inputLabel}>Tipo de Vista</Text>
      <View style={styles.pickerContainer}>
        {(['list', 'grid', 'table'] as const).map((tipo) => (
          <TouchableOpacity
            key={tipo}
            style={[
              styles.pickerButton,
              localConfig.vistaTipo === tipo && styles.pickerButtonActive,
            ]}
            onPress={() => handleChange('vistaTipo', tipo)}
          >
            <Text
              style={[
                styles.pickerButtonText,
                localConfig.vistaTipo === tipo && styles.pickerButtonTextActive,
              ]}
            >
              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {localConfig.vistaTipo === 'grid' && (
        <>
          {renderTextInput('Columnas (Móvil)', String(localConfig.responsive.mobileCols), (val) =>
            handleNestedChange('responsive', 'mobileCols', Number(val) || 1),
          )}
          {renderTextInput('Columnas (Web)', String(localConfig.responsive.webCols), (val) =>
            handleNestedChange('responsive', 'webCols', Number(val) || 3),
          )}
        </>
      )}

      <Text style={styles.inputLabel}>Configuración de Item</Text>
      {renderTextInput('Campo Título', localConfig.renderItemConfig.campoTitulo, (val) =>
        handleNestedChange('renderItemConfig', 'campoTitulo', val),
        'Ej: NoPedido (requerido)',
      )}
      {renderTextInput('Campo Subtítulo', localConfig.renderItemConfig.campoSubtitulo || '', (val) =>
        handleNestedChange('renderItemConfig', 'campoSubtitulo', val),
        'Ej: Cliente (opcional)',
      )}
      {renderTextInput('Campo Badge/Estado', localConfig.renderItemConfig.campoBadge || '', (val) =>
        handleNestedChange('renderItemConfig', 'campoBadge', val),
        'Ej: Estado (opcional)',
      )}
    </View>
  );

  // ----- Sección: Búsqueda y Filtros -----
  const renderBusquedaFiltros = () => (
    <View style={styles.section}>
      {renderSectionHeader('Búsqueda y Filtros')}
      {renderSwitch('Habilitar Búsqueda', localConfig.busquedaHabilitada, (val) =>
        handleChange('busquedaHabilitada', val),
      )}
      {localConfig.busquedaHabilitada && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Campos de Búsqueda (separados por coma)</Text>
          <TextInput
            style={styles.input}
            value={localConfig.camposBusqueda.join(', ')}
            onChangeText={(val) => handleChange('camposBusqueda', val.split(',').map(s => s.trim()))}
            placeholder="Ej: NoPedido, Cliente, RefCliente"
          />
        </View>
      )}
      <Text style={[styles.inputLabel, { marginTop: 12 }]}>Filtros Rápidos</Text>
      {localConfig.filtros.map((filtro, index) => (
        <View key={filtro.id} style={styles.dynamicItem}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Label (Ej: Fabricado)"
            value={filtro.label}
            onChangeText={(val) => {
              const nuevosFiltros = [...localConfig.filtros];
              nuevosFiltros[index].label = val;
              handleChange('filtros', nuevosFiltros);
            }}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginHorizontal: 4 }]}
            placeholder="Campo (Ej: Estado)"
            value={filtro.campo}
            onChangeText={(val) => {
              const nuevosFiltros = [...localConfig.filtros];
              nuevosFiltros[index].campo = val;
              handleChange('filtros', nuevosFiltros);
            }}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Valor (Ej: Fabricado)"
            value={filtro.valor}
            onChangeText={(val) => {
              const nuevosFiltros = [...localConfig.filtros];
              nuevosFiltros[index].valor = val;
              handleChange('filtros', nuevosFiltros);
            }}
          />
          <TouchableOpacity onPress={() => {
            const nuevosFiltros = localConfig.filtros.filter((_, i) => i !== index);
            handleChange('filtros', nuevosFiltros);
          }}>
            <Ionicons name="trash-outline" size={22} color="#dc2626" style={{ paddingLeft: 8 }} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          const nuevosFiltros = [
            ...localConfig.filtros,
            { id: `filtro_${Date.now()}`, label: '', campo: '', valor: '' },
          ];
          handleChange('filtros', nuevosFiltros);
        }}
      >
        <Text style={styles.addButtonText}>+ Añadir Filtro</Text>
      </TouchableOpacity>
    </View>
  );

  // ----- Sección: Acciones y Modales -----
  const renderAccionesModales = () => (
    <View style={styles.section}>
      {renderSectionHeader('Acciones y Modales')}
      
      {/* Botones de Acción */}
      <Text style={[styles.inputLabel, { marginTop: 12 }]}>Botones de Acción (Header/Item)</Text>
      {localConfig.botonesAccion.map((boton, index) => (
        <View key={boton.id} style={styles.dynamicItem}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Label"
            value={boton.label}
            onChangeText={(val) => {
              const nuevosBotones = [...localConfig.botonesAccion];
              nuevosBotones[index].label = val;
              handleChange('botonesAccion', nuevosBotones);
            }}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginHorizontal: 4 }]}
            placeholder="Icono (Ionicons)"
            value={boton.icono}
            onChangeText={(val) => {
              const nuevosBotones = [...localConfig.botonesAccion];
              nuevosBotones[index].icono = val as IconName;
              handleChange('botonesAccion', nuevosBotones);
            }}
          />
          <TouchableOpacity onPress={() => {
            const nuevosBotones = localConfig.botonesAccion.filter((_, i) => i !== index);
            handleChange('botonesAccion', nuevosBotones);
          }}>
            <Ionicons name="trash-outline" size={22} color="#dc2626" style={{ paddingLeft: 8 }} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          const nuevosBotones = [
            ...localConfig.botonesAccion,
            { id: `boton_${Date.now()}`, label: '', icono: 'alert-circle-outline', posicion: 'header', accion: 'refresh' },
          ];
          handleChange('botonesAccion', nuevosBotones);
        }}
      >
        <Text style={styles.addButtonText}>+ Añadir Botón de Acción</Text>
      </TouchableOpacity>

      {/* Definición de Modales */}
      <Text style={[styles.inputLabel, { marginTop: 12 }]}>Definición de Modales</Text>
      {localConfig.modales.map((modal, index) => (
        <View key={modal.id} style={styles.dynamicItemComplex}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={styles.dynamicItemTitle}>{modal.id || 'Nuevo Modal'}</Text>
            <TouchableOpacity onPress={() => {
              const nuevosModales = localConfig.modales.filter((_, i) => i !== index);
              handleChange('modales', nuevosModales);
            }}>
              <Ionicons name="trash-outline" size={22} color="#dc2626" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="ID (ej: modalDetalle)"
            value={modal.id}
            onChangeText={(val) => {
              const nuevosModales = [...localConfig.modales];
              nuevosModales[index].id = val;
              handleChange('modales', nuevosModales);
            }}
          />
          <TextInput
            style={styles.input}
            placeholder="Título (ej: Detalle Pedido)"
            value={modal.titulo}
            onChangeText={(val) => {
              const nuevosModales = [...localConfig.modales];
              nuevosModales[index].titulo = val;
              handleChange('modales', nuevosModales);
            }}
          />
          <Text style={styles.inputLabel}>Trigger (Cómo se abre)</Text>
          <View style={styles.pickerContainer}>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                modal.trigger === 'itemClick' && styles.pickerButtonActive,
              ]}
              onPress={() => {
                const nuevosModales = [...localConfig.modales];
                nuevosModales[index].trigger = 'itemClick';
                handleChange('modales', nuevosModales);
              }}
            >
              <Text style={[styles.pickerButtonText, modal.trigger === 'itemClick' && styles.pickerButtonTextActive]}>
                Click en Item
              </Text>
            </TouchableOpacity>
            {/* Aquí se podrían listar botones de acción para asignar */}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Campos a mostrar (ej: Cliente,Estado)"
            value={modal.campos.join(', ')}
            onChangeText={(val) => {
              const nuevosModales = [...localConfig.modales];
              nuevosModales[index].campos = val.split(',').map(s => s.trim());
              handleChange('modales', nuevosModales);
            }}
          />
        </View>
      ))}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          const nuevosModales = [
            ...localConfig.modales,
            { id: `modal_${Date.now()}`, titulo: '', trigger: 'itemClick', contenido: 'detalle', campos: [] },
          ];
          handleChange('modales', nuevosModales);
        }}
      >
        <Text style={styles.addButtonText}>+ Añadir Modal</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide">
      <SafeAreaView style={styles.modalContainer}>
        {/* Cabecera del Modal */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderText}>Diseñador de Módulo</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-outline" size={32} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Contenido del Diseñador */}
        <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 100 }}>
          {renderVistaPrincipal()}
          {renderBusquedaFiltros()}
          {renderAccionesModales()}
          
          <View style={styles.section}>
            {renderSectionHeader('Columnas Disponibles (Info)')}
            <Text style={styles.columnInfo}>
              {columnasDisponibles.length > 0 
                ? `Tus datos tienen estas columnas: ${columnasDisponibles.join(', ')}`
                : 'Carga datos en el módulo para ver las columnas disponibles.'
              }
            </Text>
          </View>
        </ScrollView>

        {/* Footer con botones de Guardar/Cancelar */}
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.footerButton, styles.footerButtonCancel]}
            onPress={onClose}
          >
            <Text style={styles.footerButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerButton, styles.footerButtonSave]}
            onPress={handleGuardar}
          >
            <Text style={[styles.footerButtonText, { color: '#fff' }]}>Guardar Cambios</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default ModalDiseñador;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f4f7fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  modalHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1976d2',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    borderBottomWidth: 2,
    borderBottomColor: '#1976d2',
    paddingBottom: 8,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 14,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pickerContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    overflow: 'hidden',
    marginBottom: 12,
  },
  pickerButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  pickerButtonActive: {
    backgroundColor: '#1976d2',
  },
  pickerButtonText: {
    fontWeight: '600',
    color: '#333',
  },
  pickerButtonTextActive: {
    color: '#fff',
  },
  dynamicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 8,
  },
  dynamicItemComplex: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
  },
  dynamicItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1976d2',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  addButtonText: {
    color: '#1976d2',
    fontWeight: '600',
  },
  columnInfo: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    padding: 12,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  footerButtonCancel: {
    backgroundColor: '#e0e0e0',
  },
  footerButtonSave: {
    backgroundColor: '#1976d2',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
});