import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConexionDiagnostic from '../../components/ConexionDiagnostic';
import { useAuth } from '../../hooks/useAuth';


type ConfigItem = {
  id: string;
  title: string;
  description: string;
  type: 'toggle' | 'select' | 'button';
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value?: boolean;
  options?: string[];
  action?: () => void;
};

export default function ConfiguracionScreen() {
   const router = useRouter();
  const { logout } = useAuth();
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  
  const [configItems, setConfigItems] = useState<ConfigItem[]>([
    {
      id: '1',
      title: 'Notificaciones',
      description: 'Recibir alertas sobre nuevos pedidos e incidencias',
      type: 'toggle',
      icon: 'notifications-outline',
      value: true,
    },
    {
      id: '2',
      title: 'Sincronización automática',
      description: 'Sincronizar datos automáticamente cuando hay conexión',
      type: 'toggle',
      icon: 'sync-outline',
      value: true,
    },
    {
      id: '3',
      title: 'Tema',
      description: 'Seleccionar apariencia de la aplicación',
      type: 'select',
      icon: 'color-palette-outline',
      options: ['Claro', 'Oscuro', 'Sistema'],
    },
    {
      id: '4',
      title: 'Idioma',
      description: 'Cambiar el idioma de la aplicación',
      type: 'select',
      icon: 'language-outline',
      options: ['Español', 'Inglés'],
    },
    {
      id: '5',
      title: 'Borrar caché',
      description: 'Eliminar datos temporales de la aplicación',
      type: 'button',
      icon: 'trash-outline',
      action: () => Alert.alert('Caché eliminada', 'Los datos temporales han sido eliminados correctamente.'),
    },
    {      id: '6',
      title: 'Cerrar sesión',
      description: 'Salir de la cuenta actual',
      type: 'button',
      icon: 'log-out-outline',
      action: () => Alert.alert(
        'Cerrar sesión',
        '¿Está seguro que desea cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🚪 Cerrando sesión...');
                // Limpiar datos de AsyncStorage
                await AsyncStorage.multiRemove([
                  'token',
                  'userData',
                  'departamentos',
                  'configuracion',
                  'cache'
                ]);
                
                // Llamar a la función logout que actualiza el estado de autenticación
                await logout();
                
                console.log('✅ Sesión cerrada correctamente');
                // No necesitamos hacer la redirección manual ya que
                // el _layout.tsx detectará el cambio en authenticated
                // y redirigirá automáticamente a login
                router.push('/login');
              } catch (error) {
                console.error('Error al cerrar sesión:', error);
                Alert.alert(
                  'Error',
                  'Hubo un problema al cerrar la sesión. Por favor, intente nuevamente.'
                );
              }
            }
          }
        ]
      ),
    },
    {
      id: '7',
      title: 'Diagnóstico de conexión',
      description: 'Verificar el estado de la conectividad con el servidor',
      type: 'button',
      icon: 'wifi-outline',
      action: () => setShowDiagnostic(!showDiagnostic),
    },
  ]);

  const toggleSwitch = (id: string) => {
    setConfigItems(items =>
      items.map(item =>
        item.id === id ? { ...item, value: !item.value } : item
      )
    );
  };

  const renderConfigItem = (item: ConfigItem) => {
    return (
      <View key={item.id} style={styles.configItem}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon} size={24} color="#2e78b7" />
        </View>
        <View style={styles.configContent}>
          <Text style={styles.configTitle}>{item.title}</Text>
          <Text style={styles.configDescription}>{item.description}</Text>

          {item.type === 'toggle' && (
            <Switch
              style={styles.configControl}
              trackColor={{ false: '#e0e0e0', true: '#81b0ff' }}
              thumbColor={item.value ? '#2e78b7' : '#f4f3f4'}
              ios_backgroundColor="#e0e0e0"
              onValueChange={() => toggleSwitch(item.id)}
              value={item.value}
            />
          )}

          {item.type === 'select' && (
            <TouchableOpacity 
              style={styles.configControl}
              onPress={() => Alert.alert(`Seleccionar ${item.title}`, 'Esta funcionalidad se implementará próximamente')}
            >
              <Text style={styles.optionText}>{item.options?.[0]}</Text>
              <Ionicons name="chevron-forward" size={20} color="#757575" />
            </TouchableOpacity>
          )}

          {item.type === 'button' && (
            <TouchableOpacity 
              style={styles.configControl}
              onPress={item.action}
            >
              <Ionicons name="chevron-forward" size={20} color="#757575" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
     
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Configuración</Text>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuración general</Text>
            {configItems.slice(0, 4).map(renderConfigItem)}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cuenta</Text>
            {configItems.slice(4).map(renderConfigItem)}
          </View>

          <View style={styles.appInfo}>
            <Text style={styles.appVersion}>Versión {Application.nativeApplicationVersion}</Text>
            <Text style={styles.appName}>App Felman</Text>
          </View>
        </ScrollView>

        {showDiagnostic && (
          <View style={styles.diagnosticContainer}>
            <ConexionDiagnostic />
            <TouchableOpacity 
              style={styles.closeDiagnostic}
              onPress={() => setShowDiagnostic(false)}
            >
              <Ionicons name="close-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
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
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 16,
    marginHorizontal: 16,
    color: '#2e78b7',
  },
  configItem: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  iconContainer: {
    marginRight: 16,
    justifyContent: 'center',
    width: 32,
    height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  configContent: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    width: '70%',
    color: '#4a5568',
  },
  configDescription: {
    fontSize: 14,
    color: '#718096',
    width: '70%',
  },
  configControl: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionText: {
    marginRight: 8,
    color: '#2e78b7',
    fontWeight: '500',
  },
  appInfo: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 24,
    backgroundColor: '#f3f4f6',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  appVersion: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 4,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e78b7',
  },  diagnosticContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 10,
    paddingTop: 100, // Baja el contenido aproximadamente un quinto hacia abajo
  },  closeDiagnostic: {
    position: 'absolute',
    top: 60, // Ajustado para que esté visible con el nuevo padding
    right: 16,
    backgroundColor: '#2e78b7',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});