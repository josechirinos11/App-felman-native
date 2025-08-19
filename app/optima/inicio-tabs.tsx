import { Redirect } from 'expo-router';

export default function MoncadaTabRedirect() {
  return <Redirect href="/(tabs)" />; // o '/moncada/control-pedidos'
}