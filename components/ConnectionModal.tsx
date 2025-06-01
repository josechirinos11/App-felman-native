import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { checkServerAvailability, getDiagnosticInfo } from '../hooks/useServerCheck';

interface ConnectionModalProps {
  isVisible: boolean;
  onRetry: () => void;
  onContinue: () => void;
}

export default function ConnectionModal({ isVisible, onRetry, onContinue }: ConnectionModalProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);
  const [checkAttempts, setCheckAttempts] = useState(0);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  
  useEffect(() => {
    if (isVisible && checkAttempts < 3) {
      checkConnection();
    }
  }, [isVisible]);
  const checkConnection = async () => {
    try {
      setIsChecking(true);
      setCheckAttempts(prev => prev + 1);
      
      console.log('🔍 Verificando conexión a internet...');
      
      // Comprobar conexión a internet con múltiples fuentes
      const sources = ['https://www.google.com', 'https://www.cloudflare.com', 'https://www.microsoft.com'];
      let internetConnected = false;
      
      for (const source of sources) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(source, { 
            method: 'HEAD',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.status < 400) {
            internetConnected = true;
            console.log(`✅ Conexión a internet verificada con ${source}`);
            break;
          }
        } catch (e) {
          console.log(`❌ No se pudo conectar a ${source}: ${(e as Error).message}`);
        }
      }
      
      setIsConnected(internetConnected);
      
      // Si hay internet, comprobar servidor usando nuestra función mejorada
      if (internetConnected) {
        try {
          // Forzar comprobación cuando se hace explícitamente
          const serverAvailable = await checkServerAvailability(true);
          setServerReachable(serverAvailable);
          
          // Obtener información de diagnóstico
          const info = await getDiagnosticInfo();
          setDiagnosticInfo(info);
        } catch (serverError) {
          console.log('Error al conectar con el servidor:', serverError);
          setServerReachable(false);
        }
      } else {
        setServerReachable(false);
      }
    } catch (error) {
      console.log('Error al comprobar la conexión:', error);
      setIsConnected(false);
      setServerReachable(false);
    } finally {
      setIsChecking(false);
    }
  };
  
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Estado de la conexión</Text>
          
          {isChecking ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2e78b7" />
              <Text style={styles.loadingText}>Comprobando conexión...</Text>
            </View>
          ) : (
            <>
              <View style={styles.statusContainer}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Internet:</Text>
                  <View style={styles.statusValue}>
                    {isConnected === null ? (
                      <Text>Desconocido</Text>
                    ) : isConnected ? (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        <Text style={{color: '#4CAF50', marginLeft: 5}}>Conectado</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={20} color="#F44336" />
                        <Text style={{color: '#F44336', marginLeft: 5}}>Sin conexión</Text>
                      </>
                    )}
                  </View>
                </View>
                
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Servidor:</Text>
                  <View style={styles.statusValue}>
                    {serverReachable === null ? (
                      <Text>Verificando...</Text>
                    ) : serverReachable ? (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        <Text style={{color: '#4CAF50', marginLeft: 5}}>Disponible</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={20} color="#F44336" />
                        <Text style={{color: '#F44336', marginLeft: 5}}>No disponible</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
              
              {!isConnected || !serverReachable ? (
                <View style={styles.messageContainer}>
                  <Text style={styles.messageText}>
                    {!isConnected 
                      ? "No hay conexión a Internet. Verifique su conexión Wi-Fi o datos móviles." 
                      : "No se puede conectar al servidor. El servidor puede estar en mantenimiento o experimentando problemas."}
                  </Text>
                </View>
              ) : null}
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.button, styles.retryButton]}
                  onPress={checkAttempts >= 3 ? onContinue : onRetry}
                >
                  <Text style={styles.buttonText}>
                    {checkAttempts >= 3 ? "Continuar sin conexión" : "Reintentar"}
                  </Text>
                </TouchableOpacity>
                
                {serverReachable && (
                  <TouchableOpacity 
                    style={[styles.button, styles.continueButton]}
                    onPress={onContinue}
                  >
                    <Text style={styles.buttonText}>Continuar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2e78b7',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  statusContainer: {
    width: '100%',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB74D',
    width: '100%',
  },
  messageText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#5c6bc0',
    flex: 1,
    marginRight: 8,
  },
  continueButton: {
    backgroundColor: '#2e78b7',
    flex: 1,
    marginLeft: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
});
