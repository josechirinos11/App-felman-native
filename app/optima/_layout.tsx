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
      {/* Inicio / Panel */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Panel Almassera',
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

      {/* ====== NUEVAS VISTAS ====== */}
    
      <Tabs.Screen
        name="piezas-maquina"
        options={{
          title: 'Terminales',
          tabBarIcon: ({ color }) => <TabBarIcon name="analytics-outline" color={color} />,
        }}
      />
     

      {/* Ajustes (si lo activas en el futuro) */}
      {/*
      <Tabs.Screen
        name="configuracion"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <TabBarIcon name="settings-outline" color={color} />,
        }}
      />
      */}
    </Tabs>
  );
}
