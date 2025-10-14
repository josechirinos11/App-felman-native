// utils/modulosManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

type IconName = string;

export interface CustomModule {
  id: string;
  nombre: string;
  icono: IconName;
  consultaSQL: string;
  apiRestUrl: string;
  fechaCreacion: string;
}

const STORAGE_KEY = 'customModules';

/**
 * Obtiene todos los módulos personalizados guardados
 */
export const obtenerModulos = async (): Promise<CustomModule[]> => {
  try {
    const modulosJSON = await AsyncStorage.getItem(STORAGE_KEY);
    if (modulosJSON) {
      const modulos: CustomModule[] = JSON.parse(modulosJSON);
      return modulos;
    }
    return [];
  } catch (error) {
    console.error('❌ Error al obtener módulos:', error);
    return [];
  }
};

/**
 * Obtiene un módulo específico por su ID
 */
export const obtenerModuloPorId = async (id: string): Promise<CustomModule | null> => {
  try {
    const modulos = await obtenerModulos();
    const modulo = modulos.find(m => m.id === id);
    return modulo || null;
  } catch (error) {
    console.error('❌ Error al obtener módulo por ID:', error);
    return null;
  }
};

/**
 * Guarda un nuevo módulo
 */
export const guardarModulo = async (modulo: Omit<CustomModule, 'id' | 'fechaCreacion'>): Promise<CustomModule> => {
  try {
    const nuevoModulo: CustomModule = {
      id: `module_${Date.now()}`,
      ...modulo,
      fechaCreacion: new Date().toISOString(),
    };

    const modulosExistentes = await obtenerModulos();
    modulosExistentes.push(nuevoModulo);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(modulosExistentes));
    console.log('✅ Módulo guardado:', nuevoModulo.id);
    
    return nuevoModulo;
  } catch (error) {
    console.error('❌ Error al guardar módulo:', error);
    throw error;
  }
};

/**
 * Actualiza un módulo existente
 */
export const actualizarModulo = async (id: string, datosActualizados: Partial<Omit<CustomModule, 'id' | 'fechaCreacion'>>): Promise<boolean> => {
  try {
    const modulos = await obtenerModulos();
    const indice = modulos.findIndex(m => m.id === id);

    if (indice === -1) {
      console.warn('⚠️ Módulo no encontrado:', id);
      return false;
    }

    modulos[indice] = {
      ...modulos[indice],
      ...datosActualizados,
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(modulos));
    console.log('✅ Módulo actualizado:', id);
    
    return true;
  } catch (error) {
    console.error('❌ Error al actualizar módulo:', error);
    return false;
  }
};

/**
 * Elimina un módulo por su ID
 */
export const eliminarModulo = async (id: string): Promise<boolean> => {
  try {
    const modulos = await obtenerModulos();
    const modulosFiltrados = modulos.filter(m => m.id !== id);

    if (modulos.length === modulosFiltrados.length) {
      console.warn('⚠️ Módulo no encontrado para eliminar:', id);
      return false;
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(modulosFiltrados));
    console.log('✅ Módulo eliminado:', id);
    
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar módulo:', error);
    return false;
  }
};

/**
 * Elimina todos los módulos personalizados
 */
export const eliminarTodosLosModulos = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('✅ Todos los módulos eliminados');
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar todos los módulos:', error);
    return false;
  }
};

/**
 * Exporta los módulos a un formato JSON
 */
export const exportarModulos = async (): Promise<string> => {
  try {
    const modulos = await obtenerModulos();
    return JSON.stringify(modulos, null, 2);
  } catch (error) {
    console.error('❌ Error al exportar módulos:', error);
    throw error;
  }
};

/**
 * Importa módulos desde un JSON
 */
export const importarModulos = async (jsonModulos: string, reemplazar: boolean = false): Promise<number> => {
  try {
    const modulosImportados: CustomModule[] = JSON.parse(jsonModulos);

    if (!Array.isArray(modulosImportados)) {
      throw new Error('El formato de importación no es válido');
    }

    let modulosFinales: CustomModule[];

    if (reemplazar) {
      // Reemplazar todos los módulos
      modulosFinales = modulosImportados;
    } else {
      // Agregar a los existentes
      const modulosExistentes = await obtenerModulos();
      modulosFinales = [...modulosExistentes, ...modulosImportados];
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(modulosFinales));
    console.log('✅ Módulos importados:', modulosImportados.length);
    
    return modulosImportados.length;
  } catch (error) {
    console.error('❌ Error al importar módulos:', error);
    throw error;
  }
};

/**
 * Obtiene estadísticas de los módulos
 */
export const obtenerEstadisticas = async (): Promise<{
  total: number;
  porApi: Record<string, number>;
  porIcono: Record<string, number>;
}> => {
  try {
    const modulos = await obtenerModulos();
    
    const porApi: Record<string, number> = {};
    const porIcono: Record<string, number> = {};

    modulos.forEach(modulo => {
      // Contar por dominio de API
      try {
        const url = new URL(modulo.apiRestUrl);
        const dominio = url.hostname;
        porApi[dominio] = (porApi[dominio] || 0) + 1;
      } catch (e) {
        porApi['URL inválida'] = (porApi['URL inválida'] || 0) + 1;
      }

      // Contar por icono
      porIcono[modulo.icono] = (porIcono[modulo.icono] || 0) + 1;
    });

    return {
      total: modulos.length,
      porApi,
      porIcono,
    };
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    return {
      total: 0,
      porApi: {},
      porIcono: {},
    };
  }
};

/**
 * Valida la estructura de un módulo
 */
export const validarModulo = (modulo: any): boolean => {
  if (!modulo || typeof modulo !== 'object') {
    return false;
  }

  const camposRequeridos = ['nombre', 'icono', 'consultaSQL', 'apiRestUrl'];
  
  for (const campo of camposRequeridos) {
    if (!modulo[campo] || typeof modulo[campo] !== 'string' || !modulo[campo].trim()) {
      return false;
    }
  }

  // Validar formato de URL
  try {
    new URL(modulo.apiRestUrl);
  } catch (e) {
    return false;
  }

  return true;
};

/**
 * Busca módulos por nombre
 */
export const buscarModulos = async (termino: string): Promise<CustomModule[]> => {
  try {
    const modulos = await obtenerModulos();
    const terminoLower = termino.toLowerCase();
    
    return modulos.filter(modulo => 
      modulo.nombre.toLowerCase().includes(terminoLower)
    );
  } catch (error) {
    console.error('❌ Error al buscar módulos:', error);
    return [];
  }
};
