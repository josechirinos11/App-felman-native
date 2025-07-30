// app/almacen/_layout.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import Ajustes from './Ajustes';
import Articulos from './Articulos';
import Categorias from './Categorias';
import Configuracion from './Configuracion';
import Dashboard from './Dashboard';
import Entradas from './Entradas';
import Reportes from './Reportes';
import Salidas from './Salidas';
import Transferencias from './Transferencias';
import Ubicaciones from './Ubicaciones';

const Tab = createBottomTabNavigator();

export default function AlmacenLayout() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const storage = useAsyncStorage('userData');

  useEffect(() => {
    (async () => {
      const json = await storage.getItem();
      if (json) setUserRole(JSON.parse(json).rol);
    })();
  }, []);

  if (!['admin','developer','administrador'].includes(userRole || '')) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <Text>No tiene credenciales para ver esta sección</Text>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName = 'help-circle-outline';
          switch (route.name) {
            case 'Dashboard':      iconName = 'home-outline'; break;
            case 'Articulos':      iconName = 'pricetags-outline'; break;
            case 'Categorias':     iconName = 'layers-outline'; break;
            case 'Ubicaciones':    iconName = 'map-outline'; break;
            case 'Entradas':       iconName = 'download-outline'; break;
            case 'Salidas':        iconName = 'share-outline'; break;
            case 'Transferencias': iconName = 'swap-horizontal-outline'; break;
            case 'Ajustes':        iconName = 'settings-outline'; break;
            case 'Reportes':       iconName = 'bar-chart-outline'; break;
            case 'Configuracion':  iconName = 'construct-outline'; break;
          }
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard"      component={Dashboard} />
      <Tab.Screen name="Articulos"      component={Articulos} />
      <Tab.Screen name="Categorias"     component={Categorias} />
      <Tab.Screen name="Ubicaciones"    component={Ubicaciones} />
      <Tab.Screen name="Entradas"       component={Entradas} />
      <Tab.Screen name="Salidas"        component={Salidas} />
      <Tab.Screen name="Transferencias" component={Transferencias} />
      <Tab.Screen name="Ajustes"        component={Ajustes} />
      <Tab.Screen name="Reportes"       component={Reportes} />
      <Tab.Screen name="Configuracion"  component={Configuracion} />
    </Tab.Navigator>
  );
}
