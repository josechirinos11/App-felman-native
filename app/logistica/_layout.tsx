// app/logistica/_layout.tsx
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

export default function LogisticaTabLayout() {
  const colorScheme = useColorScheme();
  const { logout } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2e78b7',
        tabBarStyle: { backgroundColor: '#000000ff', paddingBottom: 5 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Panel',
          tabBarIcon: ({ color }) => <TabBarIcon name="grid-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="asignacion-vehiculo"
        options={{
          href: null,
          title: 'Asignación',
          tabBarIcon: ({ color }) => <TabBarIcon name="swap-horizontal-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="optimizacion-carga"
        options={{
           href: null,
          title: 'Optimización',
          tabBarIcon: ({ color }) => <TabBarIcon name="cube-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="planificacion-rutas"
        options={{
          title: 'Rutas',
          tabBarIcon: ({ color }) => <TabBarIcon name="map-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="despacho-salidas"
        options={{
          href: null,
          title: 'Despacho',
          tabBarIcon: ({ color }) => <TabBarIcon name="send-outline" color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="switch-vista-web-movil"
        options={{
          title: 'Seguimiento',
          tabBarIcon: ({ color }) => <TabBarIcon name="location-outline" color={color} />,
        }}
      />

      {/* Ocultar las vistas de seguimiento originales */}
      <Tabs.Screen
        name="seguimiento-web"
        options={{
          href: null,
          title: 'Seguimiento Web',
          tabBarIcon: ({ color }) => <TabBarIcon name="location-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="seguimiento-movil"
        options={{
          href: null,
          title: 'Seguimiento Móvil',
          tabBarIcon: ({ color }) => <TabBarIcon name="location-outline" color={color} />,
        }}
      />

      <Tabs.Screen
        name="integracion-gestion"
        options={{
            href: null,
          title: 'Integración',
          tabBarIcon: ({ color }) => <TabBarIcon name="list-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="incidencias"
        options={{
           href: null,
          title: 'Incidencias',
          tabBarIcon: ({ color }) => <TabBarIcon name="alert-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="vehiculos"
        options={{
          title: 'Vehículos',
          tabBarIcon: ({ color }) => <TabBarIcon name="car-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="conductores"
        options={{
          title: 'Conductores',
          tabBarIcon: ({ color }) => <TabBarIcon name="person-outline" color={color} />,
        }}
      />

      {/* Ocultar tabs viejas */}

    </Tabs>
  );
}
