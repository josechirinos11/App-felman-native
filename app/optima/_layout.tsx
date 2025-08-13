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
        tabBarStyle: { paddingBottom: 5 },
        headerShown: false,
      }}
    >
      {/* Inicio de Óptima */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
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
          tabBarIcon: ({ color }) => <TabBarIcon name="clipboard-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="control-operarios"
        options={{
          title: 'Operarios',
          tabBarIcon: ({ color }) => <TabBarIcon name="cube-outline" color={color} />,
        }}
      />

      {/* Las tres vistas nuevas de Dashboard */}
      <Tabs.Screen
        name="control-dashboard-barcoder"
        options={{
          title: 'Barcoder',
          tabBarIcon: ({ color }) => <TabBarIcon name="analytics-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="control-dashboard-barcoder-det"
        options={{
          title: 'Barcoder Det',
          tabBarIcon: ({ color }) => <TabBarIcon name="list-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="control-dashboard-barcoder-order"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color }) => <TabBarIcon name="receipt-outline" color={color} />,
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
