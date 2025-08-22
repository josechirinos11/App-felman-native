// app/optima/_layout.tsx
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

export default function OptimaTabLayout() {
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
          title: 'Inicio',
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="asignacion-vehiculo"
        options={{
          title: 'Asignación',
          tabBarIcon: ({ color }) => <TabBarIcon name="swap-horizontal-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="optimizacion-carga"
        options={{
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
          title: 'Despacho',
          tabBarIcon: ({ color }) => <TabBarIcon name="send-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="seguimiento"
        options={{
          title: 'Seguimiento',
          tabBarIcon: ({ color }) => <TabBarIcon name="locate-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="integracion-gestion"
        options={{
          title: 'Integración',
          tabBarIcon: ({ color }) => <TabBarIcon name="list-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="incidencias"
        options={{
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
      <Tabs.Screen name="control-terminales" options={{ href: null }} />
      <Tabs.Screen name="control-operarios" options={{ href: null }} />
      <Tabs.Screen name="control-dashboard-barcoder" options={{ href: null }} />
      <Tabs.Screen name="control-dashboard-barcoder-det" options={{ href: null }} />
      <Tabs.Screen name="control-dashboard-barcoder-order" options={{ href: null }} />
    </Tabs>
  );
}
