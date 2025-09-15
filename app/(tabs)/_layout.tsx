import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { logout } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2e78b7',
        tabBarStyle: {
          backgroundColor: '#000000ff',     // <-- tu color deseado aquí
          paddingBottom: 5,
          display: 'none', // Oculta la barra de pestañas
        },
        headerShown: false, // Oculta el header en todas las pestañas
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null,
          title: 'Inicio',
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
          headerShown: false, // Solo muestra el header en la pantalla principal
          headerTitle: '', // No muestra título
          headerTransparent: true, // Header transparente
          headerRight: () => (
            <Ionicons
              name="log-out-outline"
              size={24}
              color="#2e78b7"
              style={{ marginRight: 15 }}
              onPress={logout}
            />
          ),
        }}
      />


      <Tabs.Screen
        name="moncada-tab"
        options={{
          title: 'Moncada',
          tabBarIcon: ({ color }) => <TabBarIcon name="location-outline" color={color} />,
          href: '/moncada', // abre fuera del grupo (tabs)
        }}
      />

      <Tabs.Screen
        name="almassera-tab"
        options={{
          title: 'Almassera',
          tabBarIcon: ({ color }) => <TabBarIcon name="business-outline" color={color} />,
          href: '/optima', // abre fuera del grupo (tabs)
        }}
      />

      <Tabs.Screen
        name="almacen-tab"
        options={{
          title: 'Almacén',
          tabBarIcon: ({ color }) => <TabBarIcon name="location-outline" color={color} />,
          href: '/almacen', // abre fuera del grupo (tabs)
        }}
      />
      
      <Tabs.Screen
        name="logistica-tab"
        options={{
          title: 'Logistica',
          tabBarIcon: ({ color }) => <TabBarIcon name="map-outline" color={color} />,
          href: '/logistica', // abre fuera del grupo (tabs)
        }}
      />

      <Tabs.Screen
        name="control-comerciales"
        options={{
          href: null,
          title: 'Comerciales',
          tabBarIcon: ({ color }) => <TabBarIcon name="cube-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="control-entregas-diarias"
        options={{
          href: null,
          title: 'Entregas',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="control-incidencias"
        options={{
          href: null,
          title: 'Incidencias',
          tabBarIcon: ({ color }) => <TabBarIcon name="alert-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="configuracion"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <TabBarIcon name="settings-outline" color={color} />,
        }}
      />

      <Tabs.Screen
        name="control-pedidos"
        options={{
          href: null,
          title: 'pedidos',
          tabBarIcon: ({ color }) => <TabBarIcon name="settings-outline" color={color} />,
        }}
      />




    </Tabs>
  );
}
