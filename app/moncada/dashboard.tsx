
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import { API_URL } from '../../config/constants';
import COLORS from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineMode } from '../../hooks/useOfflineMode';

const { width } = Dimensions.get('window');

// Detectar plataforma web o tablet
const isWeb = Platform.OS === 'web';
const isTablet = width >= 768; // Tablets generalmente tienen ancho >= 768px
const isTableView = isWeb || isTablet;

// --- Data Types Based on User's JSON ---

type Alerta = {
  NoPedido: string;
  Compromiso: string;
  PedidoKey: string;
  EnFabricacion: number;
  TotalModulos: number;
  ModulosRestantes: number;
  UltimoInicio: string | null;
  Estado: string;
};

type PedidoProcesar = {
  IdPedido: number;
  NoPedido: string;
  Seccion: string;
  Cliente: string;
  RefCliente: string;
  EstadoPedido: string;
  Compromiso: string;
};

type DashboardItem = {
  Serie: string;
  Numero: number;
  OperarioNombre: string;
  CodigoTarea: string;
  NumeroManual: string;
  Modulo: string;
  Cliente?: string;
  TotalModulos: number;
  ModulosRestantes: number;
};


export default function DashboardScreen() {
  const [pedidos, setPedidos] = useState<PedidoProcesar[]>([]);
  const [dashboardPvc, setDashboardPvc] = useState<DashboardItem[]>([]);
  const [dashboardAluminio, setDashboardAluminio] = useState<DashboardItem[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(1);
  const [dashboardTab, setDashboardTab] = useState(0);
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const [token, setToken] = useState<string | null>(null);
  const { authenticated } = useAuth();
  const { serverReachable, isCheckingConnection } = useOfflineMode();
  const [userData, setUserData] = useState<{ nombre?: string; rol?: string; name?: string; role?: string } | null>(null);
  const [userModalVisible, setUserModalVisible] = useState(false);

  useEffect(() => {
    const getToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);
      
      // Cargar datos de usuario
      const rawUser = await AsyncStorage.getItem('userData');
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser);
        setUserData(parsedUser);
      }
    };
    getToken();
  }, [authenticated]);

  const fetchData = useCallback(async (authToken: string) => {
    // setLoading(true) should only be for the initial load.
    // For background refreshes, we don't want a loading indicator.
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      };

      const fetchWithAuth = async (url: string) => {
        const response = await fetch(url, { headers });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error from ${url}: Status ${response.status} | Response: ${errorText}`);
        }
        return response.json();
      };

      const [pedidosRes, pvcRes, aluminioRes, alertasRes] = await Promise.all([
        fetchWithAuth(`${API_URL}/control-terminales/lista_pepdidos_a_procesar`),
        fetchWithAuth(`${API_URL}/control-terminales/dashboard_pvc`),
        fetchWithAuth(`${API_URL}/control-terminales/dashboard_aluminio`),
        fetchWithAuth(`${API_URL}/control-terminales/alerta2`)
      ]);

      console.log('🔍 URL PVC:', `${API_URL}/control-terminales/dashboard_pvc`);
      console.log('🔍 URL Aluminio:', `${API_URL}/control-terminales/dashboard_aluminio`);

      // --- Smart Update Logic ---

      // Update Pedidos
      setPedidos(prevPedidos => {
        const existingIds = new Set(prevPedidos.map(p => p.IdPedido));
        const newItems = (Array.isArray(pedidosRes) ? pedidosRes : []).filter(p => !existingIds.has(p.IdPedido));
        return newItems.length > 0 ? [...prevPedidos, ...newItems] : prevPedidos;
      });

      // Update Dashboard PVC
      console.log('📊 Dashboard PVC Response:', pvcRes);
      console.log('📊 Dashboard PVC - Total items:', Array.isArray(pvcRes) ? pvcRes.length : 0);
      if (Array.isArray(pvcRes) && pvcRes.length > 0) {
        console.log('📊 Dashboard PVC - Primer item COMPLETO:', JSON.stringify(pvcRes[0], null, 2));
        console.log('📊 Dashboard PVC - Cliente del primer item:', pvcRes[0].Cliente);
        console.log('📊 Dashboard PVC - Keys del primer item:', Object.keys(pvcRes[0]));
      }
      setDashboardPvc(Array.isArray(pvcRes) ? pvcRes : []);
      
      // Update Dashboard Aluminio
      console.log('📊 Dashboard Aluminio Response:', aluminioRes);
      console.log('📊 Dashboard Aluminio - Total items:', Array.isArray(aluminioRes) ? aluminioRes.length : 0);
      setDashboardAluminio(Array.isArray(aluminioRes) ? aluminioRes : []);

      // Update Alertas
      setAlertas(prevAlertas => {
        const existingKeys = new Set(prevAlertas.map(a => a.PedidoKey));
        const newItems = (Array.isArray(alertasRes) ? alertasRes : []).filter(a => !existingKeys.has(a.PedidoKey));
        return newItems.length > 0 ? [...prevAlertas, ...newItems] : prevAlertas;
      });


    } catch (error: any) {
      console.error("Error fetching data:", error.message);
      // Only set error if it's a new one to avoid overwriting user-dismissed errors
      setErrorMessage(prev => prev === error.message ? prev : error.message);
    } finally {
        // Only stop loading on the first fetch
        if (loading) {
            setLoading(false);
        }
    }
  }, [loading]);

  useEffect(() => {
    if (token) {
      // Initial fetch
      fetchData(token);
      
      // Set up interval for subsequent fetches
      const interval = setInterval(() => {
        console.log('Refreshing data...');
        fetchData(token);
      }, 3000); // User's interval

      // Cleanup interval on unmount
      return () => clearInterval(interval);
    } else if (!loading) { 
        setLoading(false);
        setErrorMessage("Authentication token not found. Please log in again.");
    }
  }, [token, fetchData, loading]);

  const changeTab = (tabIndex: number) => {
    Animated.timing(slideAnim, {
      toValue: -width * tabIndex,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setActiveTab(tabIndex);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  
  // --- Render Functions for each Tab ---

  const renderPedidos = () => (
    <View style={{...styles.tableContainer, width: width}}>
      <Text style={styles.tableTitle}>Pedidos a Procesar</Text>
      
      {/* Encabezados para vista de tabla (Web/Tablet) */}
      {isTableView && (
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderText, { width: 40 }]}>#</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>PEDIDO</Text>
          <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>SECCIÓN</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>CLIENTE</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>REFERENCIA</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>ESTADO</Text>
          <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>COMPROMISO</Text>
        </View>
      )}
      
      <FlatList
        data={pedidos.filter(p => p.Seccion === 'PVC' || p.Seccion === 'ALUMINIO')}
        keyExtractor={(item) => item.IdPedido.toString()}
        renderItem={({ item, index }) => (
          isTableView ? (
            // Vista de tabla para Web/Tablet
            <View style={styles.tableRow}>
              <Text style={[styles.tableCellText, { width: 40 }]}>{index + 1}</Text>
              <Text style={[styles.tableCellText, styles.tableCellBold, { flex: 1 }]}>{item.NoPedido}</Text>
              <Text style={[styles.tableCellText, { flex: 0.8 }]}>{item.Seccion}</Text>
              <Text style={[styles.tableCellText, { flex: 1.5 }]} numberOfLines={1}>{item.Cliente}</Text>
              <Text style={[styles.tableCellText, { flex: 1 }]} numberOfLines={1}>{item.RefCliente}</Text>
              <Text style={[styles.tableCellText, { flex: 1 }]}>{item.EstadoPedido}</Text>
              <Text style={[styles.tableCellText, { flex: 0.8 }]}>{formatDate(item.Compromiso)}</Text>
            </View>
          ) : (
            // Vista de tarjetas para Móvil
            <View style={styles.pedidoCard}>
              {/* Número de posición */}
              <View style={styles.positionBadge}>
                <Text style={styles.positionBadgeText}>{index + 1}</Text>
              </View>
              
              {/* Primera línea: No Pedido, Sección y Cliente */}
              <View style={styles.pedidoRowFirst}>
                <View style={styles.pedidoNoPedidoContainer}>
                  <Text style={styles.labelText}>PEDIDO</Text>
                  <Text style={styles.pedidoNoPedidoText}>{item.NoPedido}</Text>
                </View>
                <View style={styles.pedidoSeccionContainer}>
                  <Text style={styles.labelText}>SECCIÓN</Text>
                  <Text style={styles.pedidoSeccionText}>{item.Seccion}</Text>
                </View>
                <View style={styles.pedidoClienteContainer}>
                  <Text style={styles.labelText}>CLIENTE</Text>
                  <Text style={styles.pedidoClienteTextValue} numberOfLines={2}>{item.Cliente}</Text>
                </View>
              </View>
              
              {/* Segunda línea: Referencia, Estado y Compromiso */}
              <View style={styles.pedidoRowSecond}>
                <View style={styles.pedidoReferenciaContainer}>
                  <Text style={styles.labelText}>REFERENCIA</Text>
                  <Text style={styles.pedidoReferenciaText} numberOfLines={1}>{item.RefCliente}</Text>
                </View>
                <View style={styles.pedidoEstadoContainer}>
                  <Text style={styles.labelText}>ESTADO</Text>
                  <Text style={styles.pedidoEstadoText}>{item.EstadoPedido}</Text>
                </View>
                <View style={styles.pedidoCompromisoContainer}>
                  <Text style={styles.labelText}>COMPROMISO</Text>
                  <Text style={styles.pedidoCompromisoText}>{formatDate(item.Compromiso)}</Text>
                </View>
              </View>
            </View>
          )
        )}
      />
    </View>
  );

  const renderDashboard = () => {
    const dataToShow = dashboardTab === 0 ? dashboardPvc : dashboardAluminio;
    console.log('🎨 Renderizando Dashboard - Tab:', dashboardTab === 0 ? 'PVC' : 'Aluminio');
    console.log('🎨 Datos a mostrar:', dataToShow.length, 'items');
    if (dataToShow.length > 0) {
      console.log('🎨 Primer item a renderizar:', dataToShow[0]);
    }
    
    return (
    <View style={{...styles.tableContainer, width: width}}>
        <View style={styles.dashboardTabContainer}>
            <TouchableOpacity
                style={[styles.dashboardTab, dashboardTab === 0 && styles.dashboardTabActive]}
                onPress={() => setDashboardTab(0)}
            >
                <Text style={styles.dashboardTabText}>PVC</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.dashboardTab, dashboardTab === 1 && styles.dashboardTabActive]}
                onPress={() => setDashboardTab(1)}
            >
                <Text style={styles.dashboardTabText}>Aluminio</Text>
            </TouchableOpacity>
        </View>
        
        {/* Encabezados para vista de tabla (Web/Tablet) */}
        {isTableView && (
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, { width: 40 }]}>#</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>CLIENTE</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>TERMINAL</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>OPERARIO</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>PEDIDO</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.6 }]}>MÓDULO</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.7 }]}>TOTAL/FALTAN</Text>
          </View>
        )}
        
        <FlatList
          data={dataToShow}
          keyExtractor={(item, index) => `${item.NumeroManual}-${item.Modulo}-${index}`}
          renderItem={({ item, index }) => (
            isTableView ? (
              // Vista de tabla para Web/Tablet
              <View style={styles.tableRow}>
                <Text style={[styles.tableCellText, { width: 40 }]}>{index + 1}</Text>
                <Text style={[styles.tableCellText, { flex: 1.2 }]} numberOfLines={1}>{item.Cliente || 'N/A'}</Text>
                <Text style={[styles.tableCellText, { flex: 0.8 }]}>{item.CodigoTarea}</Text>
                <Text style={[styles.tableCellText, { flex: 1 }]} numberOfLines={1}>{item.OperarioNombre}</Text>
                <Text style={[styles.tableCellText, styles.tableCellBold, { flex: 1 }]}>{item.NumeroManual}</Text>
                <Text style={[styles.tableCellText, styles.tableCellModulo, { flex: 0.6 }]}>{item.Modulo}</Text>
                <Text style={[styles.tableCellText, { flex: 0.7 }]}>{item.TotalModulos} / {item.ModulosRestantes}</Text>
              </View>
            ) : (
              // Vista de tarjetas para Móvil
              <View style={styles.dashboardCard}>
                {/* Número de posición */}
                <View style={styles.positionBadge}>
                  <Text style={styles.positionBadgeText}>{index + 1}</Text>
                </View>
              
              {/* Primera línea: Cliente, Terminal y Operario */}
              <View style={styles.dashboardRowFirst}>
                <View style={styles.clienteContainer}>
                  <Text style={styles.labelText}>CLIENTE</Text>
                  <Text style={styles.clienteText} numberOfLines={2}>{item.Cliente || 'N/A'}</Text>
                </View>
                <View style={styles.terminalContainer}>
                  <Text style={styles.labelText}>TERMINAL</Text>
                  <Text style={styles.terminalText}>{item.CodigoTarea}</Text>
                </View>
                <View style={styles.operarioContainer}>
                  <Text style={styles.labelText}>OPERARIO</Text>
                  <Text style={styles.operarioText} numberOfLines={2}>{item.OperarioNombre}</Text>
                </View>
              </View>
              
              {/* Segunda línea: Pedido, Módulo y Total/Faltan */}
              <View style={styles.dashboardRowSecond}>
                <View style={styles.pedidoContainer}>
                  <Text style={styles.labelText}>PEDIDO</Text>
                  <Text style={styles.pedidoText}>{item.NumeroManual}</Text>
                </View>
                <View style={styles.moduloContainer}>
                  <Text style={styles.labelText}>MÓDULO</Text>
                  <Text style={styles.moduloTextCard}>{item.Modulo}</Text>
                </View>
                <View style={styles.estadoContainer}>
                  <Text style={styles.labelText}>TOTAL / FALTAN</Text>
                  <View style={styles.estadoValues}>
                    <Text style={styles.estadoText}>{item.TotalModulos}</Text>
                    <Text style={styles.estadoTextSeparator}>/</Text>
                    <Text style={styles.estadoText}>{item.ModulosRestantes}</Text>
                  </View>
                </View>
              </View>
            </View>
            )
          )}
        />
    </View>
    );
  };

  const renderAlertas = () => (
    <View style={{...styles.tableContainer, width: width}}>
        <Text style={styles.tableTitle}>Alertas</Text>
        
        {/* Encabezados para vista de tabla (Web/Tablet) */}
        {isTableView && (
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, { width: 40 }]}>#</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>PEDIDO</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>ESTADO</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.7 }]}>EN FAB.</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>COMPROMISO</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.7 }]}>TOTAL MÓD.</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.7 }]}>RESTANTES</Text>
          </View>
        )}
        
        <FlatList
            data={alertas}
            keyExtractor={(item) => item.PedidoKey}
            renderItem={({ item, index }) => (
              isTableView ? (
                // Vista de tabla para Web/Tablet
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { width: 40 }]}>{index + 1}</Text>
                  <Text style={[styles.tableCellText, styles.tableCellBold, { flex: 1 }]}>{item.NoPedido}</Text>
                  <Text style={[styles.tableCellText, { flex: 1.5 }]} numberOfLines={1}>{item.Estado}</Text>
                  <Text style={[styles.tableCellText, { flex: 0.7 }]}>{item.EnFabricacion}</Text>
                  <Text style={[styles.tableCellText, { flex: 1 }]}>{formatDate(item.Compromiso)}</Text>
                  <Text style={[styles.tableCellText, { flex: 0.7 }]}>{item.TotalModulos}</Text>
                  <Text style={[styles.tableCellText, { flex: 0.7 }]}>{item.ModulosRestantes}</Text>
                </View>
              ) : (
                // Vista de tarjetas para Móvil
                <View style={styles.alertaCardNew}>
                    {/* Número de posición */}
                    <View style={styles.positionBadge}>
                        <Text style={styles.positionBadgeText}>{index + 1}</Text>
                    </View>
                    
                    {/* Primera línea: NoPedido, Estado y EnFabricacion */}
                    <View style={styles.alertaRowFirst}>
                        <View style={styles.alertaNoPedidoContainer}>
                            <Text style={styles.labelText}>PEDIDO</Text>
                            <Text style={styles.alertaNoPedidoText} numberOfLines={1}>{item.NoPedido}</Text>
                        </View>
                        <View style={styles.alertaEstadoContainer}>
                            <Text style={styles.labelText}>ESTADO</Text>
                            <Text style={styles.alertaEstadoTextNew} numberOfLines={2}>{item.Estado}</Text>
                        </View>
                        <View style={styles.alertaFabricacionContainer}>
                            <Text style={styles.labelText}>EN FAB.</Text>
                            <Text style={styles.alertaFabricacionText}>{item.EnFabricacion}</Text>
                        </View>
                    </View>
                    
                    {/* Segunda línea: Compromiso, Total Módulos y Módulos Restantes */}
                    <View style={styles.alertaRowSecond}>
                        <View style={styles.alertaCompromisoContainer}>
                            <Text style={styles.labelText}>COMPROMISO</Text>
                            <Text style={styles.alertaCompromisoTextNew}>{formatDate(item.Compromiso)}</Text>
                        </View>
                        <View style={styles.alertaTotalModulosContainer}>
                            <Text style={styles.labelText}>TOTAL MÓD.</Text>
                            <Text style={styles.alertaTotalModulosText}>{item.TotalModulos}</Text>
                        </View>
                        <View style={styles.alertaRestantesContainer}>
                            <Text style={styles.labelText}>RESTANTES</Text>
                            <Text style={styles.alertaRestantesText}>{item.ModulosRestantes}</Text>
                        </View>
                    </View>
                </View>
              )
            )}
        />
    </View>
  );

  // --- Main Component Return ---

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        titleOverride="Dashboard Moncada" 
        serverReachableOverride={serverReachable ?? undefined}
        userNameProp={userData?.nombre || userData?.name || '—'}
        roleProp={userData?.rol || userData?.role || '—'}
        onUserPress={({ userName, role }) => {
          setUserModalVisible(true);
        }}
      />
      
      <ModalHeader
        visible={userModalVisible}
        onClose={() => setUserModalVisible(false)}
        userName={userData?.nombre || userData?.name || '—'}
        role={userData?.rol || userData?.role || '—'}
      />
      
      {/* Banner de estado de conexión */}
      {isCheckingConnection && (
        <View style={styles.connectionBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.connectionBannerText}>Verificando conexión...</Text>
        </View>
      )}
      {serverReachable === false && !isCheckingConnection && (
        <View style={[styles.connectionBanner, styles.connectionBannerError]}>
          <Ionicons name="cloud-offline-outline" size={20} color="#fff" />
          <Text style={styles.connectionBannerText}>Sin conexión al servidor</Text>
        </View>
      )}
      
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, activeTab === 0 && styles.tabItemActive]} onPress={() => changeTab(0)}>
          <Text style={styles.tabText}>Pedidos</Text>
          {pedidos.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pedidos.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 1 && styles.tabItemActive]} onPress={() => changeTab(1)}>
          <Text style={styles.tabText}>Dashboard</Text>
          {/* Badge para PVC - arriba a la izquierda */}
          {dashboardPvc.length > 0 && (
            <View style={styles.tabBadgeLeft}>
              <Text style={styles.tabBadgeText}>{dashboardPvc.length}</Text>
            </View>
          )}
          {/* Badge para Aluminio - arriba a la derecha */}
          {dashboardAluminio.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{dashboardAluminio.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 2 && styles.tabItemActive]} onPress={() => changeTab(2)}>
          <Text style={styles.tabText}>Alerta</Text>
          {alertas.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{alertas.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading && !errorMessage ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" />
      ) : errorMessage ? (
        <ScrollView style={styles.errorContainer}>
            <Text style={styles.errorTitle}>An Error Occurred</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
        </ScrollView>
      ) : (
        <Animated.View style={[styles.contentContainer, { transform: [{ translateX: slideAnim }] }]}>
          {renderPedidos()}
          {renderDashboard()}
          {renderAlertas()}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tabItem: { 
    padding: 10, 
    borderRadius: 5,
    position: 'relative',
  },
  tabItemActive: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { color: '#333', fontWeight: 'bold', fontSize: 14 },
  tabBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeLeft: {
    position: 'absolute',
    top: -2,
    left: -2,
    backgroundColor: '#ff9800',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    width: width * 3,
  },
  tableContainer: { flex: 1, padding: 10 },
  tableTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  cardSubtitle: { fontSize: 14, fontWeight: 'normal', color: '#666' },
  cardRow: { fontSize: 14, color: '#555', marginBottom: 4 },
  cardValue: { fontWeight: '600', color: '#000' },
  dashboardTabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  dashboardTab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  dashboardTabActive: { backgroundColor: COLORS.primary },
  dashboardTabText: { fontWeight: 'bold', color: '#fff' },
  
  // Estilos para el badge de posición
  positionBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#555',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    zIndex: 10,
    elevation: 3,
  },
  positionBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // Estilos para el dashboard en 2 líneas
  dashboardCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  dashboardRowFirst: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dashboardRowSecond: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clienteContainer: {
    flex: 1,
    marginRight: 5,
    padding: 5,
  },
  terminalContainer: {
    flex: 0.8,
    backgroundColor: '#ffebee',
    padding: 5,
    alignItems: 'center',
  },
  operarioContainer: {
    flex: 1,
    backgroundColor: '#fff5f5',
    padding: 5,
  },
  pedidoContainer: {
    flex: 1,
    marginRight: 5,
  },
  moduloContainer: {
    flex: 0.6,
    backgroundColor: '#fff3e0',
    padding: 5,
    alignItems: 'center',
  },
  estadoContainer: {
    flex: 0.8,
    alignItems: 'center',
    backgroundColor: '#fffbf0',
    padding: 5,
  },
  labelText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  clienteText: {
    fontSize: 11,
    color: '#000',
    fontWeight: '500',
  },
  terminalText: {
    fontSize: 11,
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  operarioText: {
    fontSize: 11,
    color: '#000',
    fontWeight: '500',
  },
  pedidoText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  moduloTextCard: {
    fontSize: 13,
    color: '#d32f2f',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  estadoValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estadoText: {
    fontSize: 14,
    color: '#000',
    fontWeight: 'bold',
  },
  estadoTextSeparator: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 3,
  },
  
  // Estilos para vista de Pedidos
  pedidoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  pedidoRowFirst: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pedidoRowSecond: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pedidoNoPedidoContainer: {
    flex: 1,
    marginRight: 5,
    padding: 5,
  },
  pedidoSeccionContainer: {
    flex: 0.7,
    marginHorizontal: 5,
    padding: 5,
    alignItems: 'center',
  },
  pedidoClienteContainer: {
    flex: 1.2,
    marginLeft: 5,
    padding: 5,
  },
  pedidoReferenciaContainer: {
    flex: 1,
    marginRight: 5,
    padding: 5,
  },
  pedidoEstadoContainer: {
    flex: 0.8,
    marginHorizontal: 5,
    padding: 5,
    alignItems: 'center',
  },
  pedidoCompromisoContainer: {
    flex: 0.8,
    marginLeft: 5,
    padding: 5,
    alignItems: 'center',
  },
  pedidoNoPedidoText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  pedidoSeccionText: {
    fontSize: 11,
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pedidoClienteTextValue: {
    fontSize: 11,
    color: '#000',
    fontWeight: '500',
  },
  pedidoReferenciaText: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
  },
  pedidoEstadoText: {
    fontSize: 11,
    color: '#000',
    fontWeight: '500',
    textAlign: 'center',
  },
  pedidoCompromisoText: {
    fontSize: 11,
    color: '#000',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Estilos para vista de Alertas
  alertaCardNew: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  alertaRowFirst: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  alertaRowSecond: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alertaNoPedidoContainer: {
    flex: 1,
    marginRight: 5,
    padding: 5,
  },
  alertaEstadoContainer: {
    flex: 1.2,
    marginHorizontal: 5,
    padding: 5,
  },
  alertaFabricacionContainer: {
    flex: 0.6,
    marginLeft: 5,
    padding: 5,
    alignItems: 'center',
  },
  alertaCompromisoContainer: {
    flex: 1,
    marginRight: 5,
    padding: 5,
  },
  alertaTotalModulosContainer: {
    flex: 0.7,
    marginHorizontal: 5,
    padding: 5,
    alignItems: 'center',
  },
  alertaRestantesContainer: {
    flex: 0.7,
    marginLeft: 5,
    padding: 5,
    alignItems: 'center',
  },
  alertaNoPedidoText: {
    fontSize: 12,
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  alertaEstadoTextNew: {
    fontSize: 10,
    color: '#000',
    fontWeight: '500',
  },
  alertaFabricacionText: {
    fontSize: 12,
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  alertaCompromisoTextNew: {
    fontSize: 11,
    color: '#000',
    fontWeight: '500',
  },
  alertaTotalModulosText: {
    fontSize: 11,
    color: '#000',
    fontWeight: '500',
    textAlign: 'center',
  },
  alertaRestantesText: {
    fontSize: 11,
    color: '#000',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Estilos para vista de tabla (Web/Tablet)
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  tableHeaderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
    minHeight: 50,
  },
  tableCellText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  tableCellBold: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  tableCellModulo: {
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  
  alertaCard: { backgroundColor: '#fff0f0', borderColor: '#ffc0c0', borderWidth: 1 },
  alertaText: { color: '#c0392b', fontWeight: 'bold', marginBottom: 4 },
  errorContainer: { padding: 20, flex: 1, backgroundColor: '#fff' },
  errorTitle: { fontSize: 22, fontWeight: 'bold', color: '#c0392b', marginBottom: 15 },
  errorMessage: { fontSize: 14, color: '#333', fontFamily: 'monospace' },
  
  // Estilos para banners de conexión
  connectionBanner: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  connectionBannerError: {
    backgroundColor: '#f44336',
  },
  connectionBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
