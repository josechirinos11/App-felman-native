import { useState } from 'react';
import { StyleSheet, Text, View, Switch, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Application from 'expo-application';

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
    {
      id: '6',
      title: 'Cerrar sesión',
      description: 'Salir de la cuenta actual',
      type: 'button',
      icon: 'log-out-outline',
      action: () => Alert.alert('Cerrar sesión', '¿Está seguro que desea cerrar sesión?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', style: 'destructive' }
      ]),
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#2e78b7',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
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
    color: '#424242',
  },
  configItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    marginRight: 16,
    justifyContent: 'center',
  },
  configContent: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
    width: '70%',
  },
  configDescription: {
    fontSize: 14,
    color: '#757575',
    width: '70%',
  },
  configControl: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    marginRight: 8,
    color: '#2e78b7',
  },
  appInfo: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 24,
  },
  appVersion: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  appName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#424242',
  },
}); 