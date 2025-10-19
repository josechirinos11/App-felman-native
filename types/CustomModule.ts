
import type Ionicons from '@expo/vector-icons/Ionicons';
import type { DiseñoConfig } from './DiseñoConfig';
export type IconName = React.ComponentProps<typeof Ionicons>["name"];

export interface DBConfig {
  tipo: 'MySQL' | 'PostgreSQL' | 'SQL Server' | 'MongoDB';
  host: string;
  puerto: string;
  database: string;
  usuario: string;
  password: string;
}

export interface CustomModule {
  id: string;
  nombre: string;
  icono: IconName;
  consultaSQL: string;
  tipoConexion?: 'api' | 'db';
  apiRestUrl: string;
  dbConfig?: DBConfig;
  rolesPermitidos?: string[];
  configuracionVista?: any;
  fechaCreacion: string;
  usaConsultasMultiples?: boolean;
  consultasSQL?: any[];
  queryIdPrincipal?: string;
  tieneSubmodulos?: boolean;
  submodulos?: CustomModule[];
  diseñoConfig?: DiseñoConfig;
}

export interface DataRow {
  [key: string]: any;
}