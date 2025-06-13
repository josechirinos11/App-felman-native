import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Componente para mostrar el estado de conectividad y diagnosticar problemas
 */
export default function ConexionDiagnostic() {
  const { 
    isConnected, 
    serverReachable, 
    isChecking,    apiUrl,
    checkConnectivity,
    showConnectionDetails 
  } = useNetworkStatus();
  
  // Estado adicional para mostrar resultados de ping
  const [pingResult, setPingResult] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');
    // Estados para el servidor Access
  const [accessServerReachable, setAccessServerReachable] = useState<boolean>(false);
  const [accessPingResult, setAccessPingResult] = useState<number | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState<boolean>(false);
  
  // Función para medir el tiempo de respuesta del servidor
  const pingServer = async () => {
    try {
      const startTime = Date.now();
      
      // Crear un AbortController para establecer un timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de timeout
        const response = await fetch(`${apiUrl}/`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      
      if (response.status < 400) {
        setPingResult(endTime - startTime);
      } else {
        setPingResult(null);
      }
    } catch (error) {
      console.log('Error al hacer ping al servidor:', error);      setPingResult(null);
    }
  };
  
  // Función para verificar el servidor Access
  const checkAccessServer = async () => {
    try {
      setIsCheckingAccess(true);
      console.log('🔍 Verificando servidor Access...');
      console.log(`🌐 URL completa: ${apiUrl}/test/test-access`);
      const startTime = Date.now();
      
      // Crear un AbortController para establecer un timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de timeout
      
      const response = await fetch(`${apiUrl}/test/test-access`, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`📊 Respuesta del servidor Access: ${response.status} en ${responseTime}ms`);
      
      if (response.ok) {
        // Intentar parsear la respuesta JSON
        try {
          const data = await response.json();
          console.log('📄 Datos de respuesta del servidor Access:', data);
          console.log('✅ Servidor Access disponible - Respuesta:', data.message);
          setAccessServerReachable(true);
          setAccessPingResult(responseTime);
        } catch (parseError) {
          console.log('⚠️ Error al parsear respuesta JSON:', parseError);
          console.log('✅ Servidor Access disponible (respuesta no JSON)');
          setAccessServerReachable(true);
          setAccessPingResult(responseTime);
        }
      } else {
        console.log(`❌ Servidor Access respondió con error: ${response.status}`);
        // Intentar leer el cuerpo del error
        try {
          const errorText = await response.text();
          console.log('📄 Cuerpo del error:', errorText);        } catch (e) {
          console.log('⚠️ No se pudo leer el cuerpo del error');
        }
        setAccessServerReachable(false);
        setAccessPingResult(null);
      }
    } catch (error) {
      console.log('❌ Error al verificar servidor Access:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('⏰ Timeout: No se pudo conectar al servidor Access en 8 segundos');
        } else {
          console.log('🔗 Error de conexión o red:', error.message);
        }
      } else {
        console.log('🔗 Error desconocido:', String(error));
      }
      setAccessServerReachable(false);
      setAccessPingResult(null);
    } finally {
      setIsCheckingAccess(false);
    }
  };

  // Función para comprobar todo
  const handleCheck = async () => {
    console.log('🔄 Iniciando verificación completa de conectividad...');
    await checkConnectivity();    await pingServer();
    await checkAccessServer();
    setLastChecked(new Date().toLocaleTimeString());
    console.log('✅ Verificación completa finalizada');
  };
  
  // Comprobar al cargar el componente
  useEffect(() => {
    handleCheck();
  }, []);

  // Debug: Log del estado actual
  useEffect(() => {
    console.log('📊 Estado actual del diagnóstico:');
    console.log(`   • Internet: ${isConnected}`);
    console.log(`   • Servidor Sicar2: ${serverReachable}`);
    console.log(`   • Servidor Access: ${accessServerReachable}`);
    console.log(`   • Verificando: ${isChecking}, ${isCheckingAccess}`);
  }, [isConnected, serverReachable, accessServerReachable, isChecking, isCheckingAccess]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Diagnóstico de Conexión</Text>
      
      {/* Estado de la conexión a Internet */}
      <View style={styles.statusRow}>
        <Text style={styles.label}>Conexión a Internet:</Text>
        {isChecking ? (
          <ActivityIndicator size="small" color="#2e78b7" />
        ) : (
          <View style={styles.statusIndicator}>
            <Ionicons 
              name={isConnected ? "checkmark-circle" : "close-circle"} 
              size={18} 
              color={isConnected ? "#4CAF50" : "#F44336"} 
            />
            <Text style={[
              styles.statusText, 
              { color: isConnected ? "#4CAF50" : "#F44336" }
            ]}>
              {isConnected ? "Conectado" : "Sin conexión"}
            </Text>
          </View>
        )}
      </View>
      
      {/* Estado de la conexión al servidor */}
      <View style={styles.statusRow}>
        <Text style={styles.label}>Servidor Sicar2:</Text>
        {isChecking ? (
          <ActivityIndicator size="small" color="#2e78b7" />        ) : (
          <View style={styles.statusIndicator}>
            <Ionicons 
              name={serverReachable ? "checkmark-circle" : "close-circle"}
              size={18} 
              color={serverReachable ? "#4CAF50" : "#F44336"} 
            />
            <Text style={[
              styles.statusText, 
              { color: serverReachable ? "#4CAF50" : "#F44336" }
            ]}>
              {serverReachable ? "Disponible" : "No disponible"}
            </Text>
          </View>
        )}
      </View>
      
      {/* Estado de la conexión al servidor Access */}
      <View style={styles.statusRow}>
        <Text style={styles.label}>Servidor Access:</Text>
        {isCheckingAccess ? (
          <ActivityIndicator size="small" color="#2e78b7" />
        ) : (
          <View style={styles.statusIndicator}>
            <Ionicons 
              name={accessServerReachable ? "checkmark-circle" : "close-circle"} 
              size={18} 
              color={accessServerReachable ? "#4CAF50" : "#F44336"} 
            />
            <Text style={[
              styles.statusText, 
              { color: accessServerReachable ? "#4CAF50" : "#F44336" }
            ]}>
              {accessServerReachable ? "Disponible" : "No disponible"}            </Text>
          </View>
        )}
      </View>

      {/* Tiempo de respuesta del servidor Sicar2 */}
      {pingResult !== null && (
        <View style={styles.statusRow}>
          <Text style={styles.label}>Tiempo de respuesta Sicar2:</Text>
          <Text style={styles.statusText}>{pingResult} ms</Text>
        </View>
      )}

      {/* Tiempo de respuesta del servidor Access */}
      {accessPingResult !== null && (
        <View style={styles.statusRow}>
          <Text style={styles.label}>Tiempo de respuesta Access:</Text>
          <Text style={styles.statusText}>{accessPingResult} ms</Text>
        </View>
      )}

      {/* Última comprobación */}
      {lastChecked && (
        <View style={styles.statusRow}>
          <Text style={styles.label}>Última comprobación:</Text>
          <Text style={styles.valueText}>{lastChecked}</Text>
        </View>
      )}
        {/* Sección de consejos cuando no hay conexión */}
      {(!isConnected || !serverReachable || !accessServerReachable) && (
        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>Consejos para resolver problemas de conexión:</Text>
          
          <View style={styles.tipItem}>
            <Ionicons name="wifi" size={18} color="#2e78b7" />
            <Text style={styles.tipText}>Verifique su conexión Wi-Fi o datos móviles</Text>
          </View>
          
          <View style={styles.tipItem}>
            <Ionicons name="time-outline" size={18} color="#2e78b7" />
            <Text style={styles.tipText}>Espere unos minutos e intente de nuevo</Text>
          </View>
          
          <View style={styles.tipItem}>
            <Ionicons name="server-outline" size={18} color="#2e78b7" />
            <Text style={styles.tipText}>Los servidores pueden estar en mantenimiento</Text>
          </View>
          {!accessServerReachable && (
            <View style={styles.tipItem}>
              <Ionicons name="library-outline" size={18} color="#2e78b7" />
              <Text style={styles.tipText}>Problemas específicos con la base de datos Access</Text>
            </View>
          )}
          <View style={styles.tipItem}>
            <Ionicons name="refresh" size={18} color="#2e78b7" />
            <Text style={styles.tipText}>Reinicie la aplicación</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="information-circle" size={18} color="#2e78b7" />
            <Text style={styles.tipText}>Si el problema persiste, contacte con el administrador</Text>
          </View>
        </View>
      )}

      {/* Botones de acción */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={handleCheck}
          disabled={isChecking}
        >
          <Ionicons name="refresh" size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>Comprobar conexión</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={showConnectionDetails}
        >
          <Ionicons name="information-circle" size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>Detalles</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    marginLeft: 6,
    fontWeight: '500',
  },
  valueText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',    backgroundColor: '#2e78b7',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginRight: 8,
  },
  
  secondaryButton: {
    backgroundColor: '#5c6bc0',
    marginRight: 0,
    marginLeft: 8,
  },
  
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  // Estilos para los consejos de solución de problemas
  tipContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2e78b7',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
    flex: 1,
  },
});
