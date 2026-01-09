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
    tabBarStyle: { 
      backgroundColor: '#000000ff',     // <-- tu color deseado aquí
      paddingBottom: 5 ,
          display: 'none', // Oculta la barra de pestañas
    },
        headerShown: false, // Oculta el header en todas las pestañas
      }}>
      {/* Inicio de App */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Panel Moncada',
          tabBarIcon: ({ color }) => <TabBarIcon name="grid-outline" color={color} />,
          headerShown: false,
          headerTitle: '',
          headerTransparent: true,
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

      {/* Las dos vistas iniciales */}
      <Tabs.Screen
        name="control-terminales"
        options={{
          title: 'Terminales',
          tabBarIcon: ({ color }) => <TabBarIcon name="desktop-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="control-pedidos"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color }) => <TabBarIcon name="cube-outline" color={color} />,
        }}
      />

      {/* Las tres vistas nuevas de Dashboard */}
      <Tabs.Screen
        name="control-incidencias"
        options={{
          title: 'Incidencias',
          tabBarIcon: ({ color }) => <TabBarIcon name="alert-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="control-entregas-diarias"
        options={{
          title: 'Entregas Diarias',
          tabBarIcon: ({ color }) => <TabBarIcon name="list-outline" color={color} />,
        }}
      />
  

      {/* (Opcional) Ajustes propios de Óptima si los quieres luego */}
      {/* <Tabs.Screen
        name="configuracion"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <TabBarIcon name="settings-outline" color={color} />,
        }}
      /> */}
    </Tabs>
  );
}
