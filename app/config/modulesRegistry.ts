import { Ionicons } from '@expo/vector-icons';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface ModuleDefinition {
  id: string;
  title: string;
  icon: IconName;
  route: string;
  description?: string;
}

// REGISTRO CENTRAL DE MÓDULOS NATIVOS
// Aquí se definen todos los módulos que existen físicamente en la app.
// La visibilidad de estos módulos dependerá de la suscripción de la empresa.
export const NATIVE_MODULES_REGISTRY: Record<string, ModuleDefinition> = {
  'moncada_core': {
    id: 'moncada_core',
    title: 'Moncada',
    icon: 'construct-outline',
    route: '/moncada',
    description: 'Módulo de gestión para Moncada'
  },
  'optima_core': {
    id: 'optima_core',
    title: 'Almassera', // Antes "Optima"
    icon: 'business-outline',
    route: '/optima',
    description: 'Gestión de planta Almassera'
  },
  'almacen_general': {
    id: 'almacen_general',
    title: 'Almacén',
    icon: 'cube-outline',
    route: '/almacen',
    description: 'Gestión de inventario general'
  },
  'logistica_general': {
    id: 'logistica_general',
    title: 'Logística',
    icon: 'map-outline',
    route: '/logistica',
    description: 'Rutas y entregas'
  },
  'instaladores_general': {
    id: 'instaladores_general',
    title: 'Instaladores',
    icon: 'build-outline',
    route: '/instaladores',
    description: 'Portal para instaladores externos'
  }
};

// Función auxiliar para obtener módulos por lista de IDs
export const getModulesByIds = (ids: string[]): ModuleDefinition[] => {
  return ids
    .map(id => NATIVE_MODULES_REGISTRY[id])
    .filter(module => module !== undefined);
};
