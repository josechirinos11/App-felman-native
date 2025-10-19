// types/DiseñoConfig.ts
export type IconName = string; // Puedes mejorar esto importando el tipo real si lo necesitas

export type DiseñoConfig = {
  vistaTipo: 'list' | 'grid' | 'table';
  filtros: Array<{
    id: string;
    label: string;
    campo: string;
    valor: string;
  }>;
  busquedaHabilitada: boolean;
  camposBusqueda: string[];
  modosAgrupacion?: Array<{
    id: string;
    label: string;
    campo: string;
  }>;
  modales: Array<{
    id: string;
    titulo: string;
    trigger: 'itemClick' | `boton_${string}`;
    contenido: 'detalle' | 'subLista' | 'estadisticas';
    campos: string[];
    botonesAnidados?: Array<{
      id: string;
      label: string;
      accion: 'openModal' | 'fetchData';
      targetModalId?: string;
    }>;
  }>;
  botonesAccion: Array<{
    id: string;
    label: string;
    icono: IconName;
    posicion: 'header' | 'item';
    accion: 'refresh' | 'filter' | 'openModal';
    target?: string;
  }>;
  renderItemConfig: {
    campoTitulo: string;
    campoSubtitulo?: string;
    campoBadge?: string;
  };
  responsive: {
    webCols: number;
    mobileCols: number;
  };
  pollingEnabled?: boolean;
  estadisticasHabilitadas?: boolean;
};