// Script para corregir el campo tieneSubmodulos en AsyncStorage
// Ejecutar este script una vez para migrar datos antiguos

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CustomModule {
  id: string;
  nombre: string;
  tieneSubmodulos?: boolean;
  submodulos?: CustomModule[];
  [key: string]: any;
}

// Función recursiva para corregir tieneSubmodulos
const corregirTieneSubmodulos = (modulos: CustomModule[]): CustomModule[] => {
  return modulos.map(modulo => {
    // Determinar si tiene submódulos basándose en el array
    const tieneSubmodulosReal = !!(modulo.submodulos && modulo.submodulos.length > 0);
    
    // Si tiene submódulos, corregir recursivamente también
    const submodulosCorregidos = modulo.submodulos 
      ? corregirTieneSubmodulos(modulo.submodulos)
      : undefined;
    
    return {
      ...modulo,
      tieneSubmodulos: tieneSubmodulosReal,
      submodulos: submodulosCorregidos
    };
  });
};

export const migrarModulos = async (): Promise<void> => {
  try {
    console.log('🔧 Iniciando migración de módulos...');
    
    const modulosJSON = await AsyncStorage.getItem('customModules');
    
    if (!modulosJSON) {
      console.log('⚠️ No hay módulos en AsyncStorage');
      return;
    }
    
    const modulos: CustomModule[] = JSON.parse(modulosJSON);
    console.log('📊 Módulos encontrados:', modulos.length);
    
    // Mostrar estructura antes
    console.log('\n📋 ANTES de la migración:');
    modulos.forEach((m, idx) => {
      console.log(`  ${idx + 1}. ${m.nombre}`);
      console.log(`     tieneSubmodulos: ${m.tieneSubmodulos}`);
      console.log(`     submodulos.length: ${m.submodulos?.length || 0}`);
      if (m.submodulos) {
        m.submodulos.forEach((sub, subIdx) => {
          console.log(`    ${subIdx + 1}. ${sub.nombre}`);
          console.log(`       tieneSubmodulos: ${sub.tieneSubmodulos}`);
          console.log(`       submodulos.length: ${sub.submodulos?.length || 0}`);
        });
      }
    });
    
    // Corregir
    const modulosCorregidos = corregirTieneSubmodulos(modulos);
    
    // Mostrar estructura después
    console.log('\n📋 DESPUÉS de la migración:');
    modulosCorregidos.forEach((m, idx) => {
      console.log(`  ${idx + 1}. ${m.nombre}`);
      console.log(`     tieneSubmodulos: ${m.tieneSubmodulos}`);
      console.log(`     submodulos.length: ${m.submodulos?.length || 0}`);
      if (m.submodulos) {
        m.submodulos.forEach((sub, subIdx) => {
          console.log(`    ${subIdx + 1}. ${sub.nombre}`);
          console.log(`       tieneSubmodulos: ${sub.tieneSubmodulos}`);
          console.log(`       submodulos.length: ${sub.submodulos?.length || 0}`);
        });
      }
    });
    
    // Guardar
    await AsyncStorage.setItem('customModules', JSON.stringify(modulosCorregidos));
    console.log('\n✅ Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
  }
};

// Para limpiar completamente el AsyncStorage (usar con cuidado)
export const limpiarModulos = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('customModules');
    console.log('✅ AsyncStorage limpiado');
  } catch (error) {
    console.error('❌ Error al limpiar:', error);
  }
};
