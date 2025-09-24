// components/ModalHeader.tsx

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Animated, Dimensions, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import COLORS from '../constants/Colors';


type ModalHeaderProps = {
  visible: boolean;
  onClose: () => void;
  userName: string;
  role: string;
};

type SubMenu = { label: string; route: string; icon?: string };

// MenúItems de Moncada (de app/moncada/index.tsx)
const moncadaMenuItems = [
  
  { id: 2, title: 'Terminales', icon: 'location-outline', route: '/moncada/control-terminales' },
  { id: 2, title: 'Tiempo real', icon: 'time-outline', route: '/moncada/control-tiempo-real' },
  { id: 3, title: 'Control Pedidos', icon: 'cube-outline', route: '/moncada/control-pedidos' },
  { id: 4, title: 'Control de Incidencias', icon: 'alert-circle-outline', route: '/moncada/control-incidencias' },
  { id: 5, title: 'Entregas Diarias', icon: 'calendar-outline', route: '/moncada/control-entregas-diarias' },
];

// MenúItems de Optima (de app/optima/index.tsx)
const optimaMenuItems = [
  
  { id: 2, title: 'Control Terminales', icon: 'clipboard-outline', route: 'optima/piezas-maquina' },
  { id: 3, title: 'Terminales Almassera', icon: 'desktop-outline', route: 'optima/control-terminales-almassera' },
];

// MenúItems de Logistica (de app/logistica/index.tsx)
const logisticaMenuItems = [
 
  { id: 1, title: 'Asignación Vehículo–Chofer', icon: 'swap-horizontal-outline', route: '/logistica/asignacion-vehiculo' },
  { id: 2, title: 'Optimización de Carga', icon: 'cube-outline', route: '/logistica/optimizacion-carga' },
  { id: 3, title: 'Planificación de Rutas', icon: 'map-outline', route: '/logistica/planificacion-rutas' },
  { id: 4, title: 'Despacho y Salidas', icon: 'send-outline', route: '/logistica/despacho-salidas' },
  { id: 5, title: 'Seguimiento Web', icon: 'desktop-outline', route: '/logistica/seguimiento-web' },
  { id: 11, title: 'Seguimiento Móvil', icon: 'phone-portrait-outline', route: '/logistica/seguimiento-movil' },
  { id: 6, title: 'Integración y Gestión', icon: 'list-outline', route: '/logistica/integracion-gestion' },
  { id: 7, title: 'Incidencias y Reentregas', icon: 'alert-circle-outline', route: '/logistica/incidencias' },
  { id: 8, title: 'Catálogo de Vehículos', icon: 'car-outline', route: '/logistica/vehiculos' },
  { id: 9, title: 'Conductores', icon: 'person-outline', route: '/logistica/conductores' },
];

// MenúItems de Almacen (de app/almacen/index.tsx)
const almacenMenuItems = [
 
  { id: 2, title: 'Gestión de Artículos',  icon: 'clipboard-outline',         route: '/almacen/Articulos' },
  { id: 3, title: 'Categorías y Grupos',   icon: 'cube-outline',              route: '/almacen/Categorias' },
  { id: 4, title: 'Ubicaciones',           icon: 'barcode-outline',           route: '/almacen/Ubicaciones' },
  { id: 5, title: 'Entradas de Almacén',   icon: 'document-text-outline',     route: '/almacen/Entradas' },
  { id: 6, title: 'Salidas y Despacho',    icon: 'list-outline',              route: '/almacen/Salidas' },
  { id: 7, title: 'Transferencias Internas', icon: 'swap-horizontal-outline', route: '/almacen/Transferencias' },
  { id: 8, title: 'Ajustes de Inventario', icon: 'construct-outline',         route: '/almacen/Ajustes' },
  { id: 9, title: 'Reportes y Analítica',  icon: 'stats-chart-outline',       route: '/almacen/Reportes' },
  { id: 10, title: 'Configuraciones',      icon: 'construct-outline',         route: '/almacen/Configuracion' },
];

type MenuSection = {
  title: string;
  route?: string;
  subMenus?: SubMenu[];
  menuItems?: { id: number; title: string; route: string; icon?: string }[];
};

const MENU: MenuSection[] = [
  {
    title: 'INICIO',
    route: '/(tabs)',
  },
  {
    title: 'Almassera (Óptima)',
    menuItems: optimaMenuItems,
    subMenus: [
      { label: 'Control Terminales', route: 'optima/piezas-maquina', icon: 'clipboard-outline' },
      { label: 'Terminales Almassera', route: 'optima/control-terminales-almassera', icon: 'desktop-outline' },
    ],
  },
  {
    title: 'Moncada',
    menuItems: moncadaMenuItems,
    subMenus: [
      { label: 'Terminales', route: '/moncada/control-terminales', icon: 'location-outline' },
      { label: 'Tiempo real', route: '/moncada/control-tiempo-real', icon: 'time-outline' },
      { label: 'Control Pedidos', route: '/moncada/control-pedidos', icon: 'cube-outline' },
      { label: 'Control de Incidencias', route: '/moncada/control-incidencias', icon: 'alert-circle-outline' },
      { label: 'Entregas Diarias', route: '/moncada/control-entregas-diarias', icon: 'calendar-outline' },
    ],
  },
  {
    title: 'Logística',
    menuItems: logisticaMenuItems,
    subMenus: [
      { label: 'Asignación Vehículo–Chofer', route: '/logistica/asignacion-vehiculo', icon: 'swap-horizontal-outline' },
      { label: 'Optimización de Carga', route: '/logistica/optimizacion-carga', icon: 'cube-outline' },
      { label: 'Planificación de Rutas', route: '/logistica/planificacion-rutas', icon: 'map-outline' },
      { label: 'Despacho y Salidas', route: '/logistica/despacho-salidas', icon: 'send-outline' },
      { label: 'Seguimiento Web', route: '/logistica/seguimiento-web', icon: 'desktop-outline' },
      { label: 'Seguimiento Móvil', route: '/logistica/seguimiento-movil', icon: 'phone-portrait-outline' },
      { label: 'Integración y Gestión', route: '/logistica/integracion-gestion', icon: 'list-outline' },
      { label: 'Incidencias y Reentregas', route: '/logistica/incidencias', icon: 'alert-circle-outline' },
      { label: 'Catálogo de Vehículos', route: '/logistica/vehiculos', icon: 'car-outline' },
      { label: 'Conductores', route: '/logistica/conductores', icon: 'person-outline' },
    ],
  },
  {
    title: 'Almacén',
    menuItems: almacenMenuItems,
    subMenus: [
      { label: 'Gestión de Artículos', route: '/almacen/Articulos', icon: 'clipboard-outline' },
      { label: 'Categorías y Grupos', route: '/almacen/Categorias', icon: 'cube-outline' },
      { label: 'Ubicaciones', route: '/almacen/Ubicaciones', icon: 'barcode-outline' },
      { label: 'Entradas de Almacén', route: '/almacen/Entradas', icon: 'document-text-outline' },
      { label: 'Salidas y Despacho', route: '/almacen/Salidas', icon: 'list-outline' },
      { label: 'Transferencias Internas', route: '/almacen/Transferencias', icon: 'swap-horizontal-outline' },
      { label: 'Ajustes de Inventario', route: '/almacen/Ajustes', icon: 'construct-outline' },
      { label: 'Reportes y Analítica', route: '/almacen/Reportes', icon: 'stats-chart-outline' },
      { label: 'Configuraciones', route: '/almacen/Configuracion', icon: 'construct-outline' },
    ],
  },
];


export default function ModalHeader({ visible, onClose, userName, role }: ModalHeaderProps) {
  const screenWidth = Dimensions.get('window').width;
  const router = useRouter();
  const anim = React.useRef(new Animated.Value(0)).current;
  const backdropAnim = React.useRef(new Animated.Value(0)).current;
  // Panel width: 70% en móvil, 320px por defecto en desktop
  const defaultPanelWidth = screenWidth < 600 ? Math.round(screenWidth * 0.7) : 320;
  const [panelWidth, setPanelWidth] = React.useState(defaultPanelWidth);
  const isWeb = Platform.OS === 'web';
  const isMobile = !isWeb && screenWidth < 600;
  const [subMenuVisible, setSubMenuVisible] = React.useState<number | null>(null);
    const subMenuAnim = React.useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
      if (subMenuVisible !== null) {
        Animated.timing(subMenuAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      } else {
        Animated.timing(subMenuAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      }
    }, [subMenuVisible]);

  React.useEffect(() => {
    if (visible) {
      Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }).start(() => {
        Animated.timing(backdropAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      });
    } else {
      Animated.timing(backdropAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start();
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, anim, backdropAnim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-(panelWidth + 20), 0],
  });
  const backdropOpacity = backdropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.25],
  });

  if (!visible) return null;

  const handleCloseWithAnimation = () => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  return (
    <SafeAreaView style={styles.overlaySafe} pointerEvents="box-none">
      <View style={styles.sidePanelContainer}>
        <Animated.View
          style={[styles.sidePanel, { width: panelWidth, maxWidth: 420, minWidth: 220, transform: [{ translateX }] }, isMobile && styles.sidePanelMobile]}
          onLayout={(e) => {
            // Mantener el ancho responsivo
            const w = e.nativeEvent.layout.width || panelWidth;
            if (w && w !== panelWidth) setPanelWidth(w);
          }}
        >
          <View style={[styles.headerRowLogo, isMobile && styles.headerRowLogoMobile]}>
            <Image source={require('../assets/images/logo.png')} style={[styles.logoImg, isMobile && styles.logoImgMobile]} resizeMode="contain" />
            <View style={[styles.userInfoContainer, isMobile && styles.userInfoContainerMobile]}>
              <Text style={styles.modalUser}>{userName}</Text>
              <Text style={styles.modalRole}>{role}</Text>
            </View>
            <Pressable onPress={handleCloseWithAnimation} style={styles.iconBtn}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </Pressable>
          </View>

          <View style={{ flex: 1, justifyContent: 'flex-start', position: 'relative' }}>
            {subMenuVisible === null ? (
              <>
                <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
                  {/* Menú principal */}
                  <View style={{ width: '100%', marginTop: 18 }}>
                    {MENU.map((section, idx) => (
                      <Pressable
                        key={section.title}
                        style={styles.menuTitleBtn}
                        onPress={() => {
                          if (section.title === 'INICIO' && section.route) {
                            onClose();
                            router.push(section.route as any);
                          } else {
                            setSubMenuVisible(idx);
                          }
                        }}
                      >
                        <Text style={styles.menuTitleText}>{section.title}</Text>
                        {section.title === 'INICIO' ? (
                          <Ionicons name="home-outline" size={18} color={COLORS.primary} />
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                {/* Configuración fijo abajo */}
                <View style={styles.configBottomContainer}>
                  <Pressable
                    style={styles.configBtn}
                    onPress={() => {
                      onClose();
                      router.push('/(tabs)/configuracion');
                    }}
                  >
                    <Ionicons name="settings-outline" size={18} color="#1976d2" />
                    <Text style={styles.configBtnText}>Configuraciones</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Animated.View style={{ flex: 1, position: 'absolute', width: '100%', height: '100%', backgroundColor: '#fff', zIndex: 300, left: 0, top: 0, transform: [{ translateX: subMenuAnim.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] }) }] }}>
                <View style={styles.headerRowLogo}>
                  <Pressable onPress={() => {
                    Animated.timing(subMenuAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
                      setSubMenuVisible(null);
                    });
                  }} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
                  </Pressable>
                  <View style={styles.userInfoContainer}>
                    <Text style={styles.subMenuTitle}>{MENU[subMenuVisible].title}</Text>
                  </View>
                </View>
                <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
                  <View style={{ width: '100%', marginTop: 8 }}>
                    {MENU[subMenuVisible].menuItems && MENU[subMenuVisible].menuItems.map((item) => (
                      <Pressable
                        key={item.id}
                        style={styles.subMenuBtn}
                        onPress={() => {
                          setSubMenuVisible(null);
                          onClose();
                          router.push(item.route as any);
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
                          <Text style={styles.subMenuBtnTextBlue}>{item.title}</Text>
                        </View>
                      </Pressable>
                    ))}
                    {MENU[subMenuVisible].subMenus && MENU[subMenuVisible].subMenus!.map((item) => (
                      <Pressable
                        key={item.label}
                        style={styles.subMenuBtn}
                        onPress={() => {
                          setSubMenuVisible(null);
                          onClose();
                          router.push(item.route as any);
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {item.icon ? <Ionicons name={item.icon as any} size={20} color={COLORS.primary} /> : null}
                          <Text style={styles.subMenuBtnTextBlue}>{item.label}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                {/* Configuración fijo abajo */}
                <View style={styles.configBottomContainer}>
                  <Pressable
                    style={styles.configBtn}
                    onPress={() => {
                      onClose();
                      router.push('/(tabs)/configuracion');
                    }}
                  >
                    <Ionicons name="settings-outline" size={18} color="#1976d2" />
                    <Text style={styles.configBtnText}>Configuraciones</Text>
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </View>

      {/* Backdrop animado */}
      <Animated.View style={[styles.backdrop, { left: panelWidth, opacity: backdropOpacity }]} pointerEvents={visible ? 'auto' : 'none'}>
        <Pressable style={{ flex: 1 }} onPress={handleCloseWithAnimation} />
      </Animated.View>

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  backBtn: {
    padding: 6,
    marginRight: 2,
  },
  headerRowLogo: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 6,
    marginBottom: 10,
  },
  logoImg: {
    width: 70,
    height: 40,
    marginRight: 8,
  },
  userInfoContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    gap: 0,
  },
  configBottomContainer: {
    width: '100%',
    paddingBottom: 10,
    position: 'absolute',
    left: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 10,
    borderBottomRightRadius: 12,
    borderTopWidth: 1,
    borderTopColor: '#e6e6e6',
    alignItems: 'center',
  },
  overlaySafe: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  sidePanelContainer: {
    height: '100%',
    width: 'auto',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  sidePanel: {
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 200,
    borderRightWidth: 1,
    borderRightColor: '#e6e6e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  cardContent: {
    alignItems: 'flex-start',
    paddingBottom: 40,
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 100,
  },
  modalTitle: { fontWeight: 'bold', fontSize: 15, marginBottom: 6, color: COLORS.primary },
  modalUser: { fontSize: 16, fontWeight: '700', marginBottom: 2, color: COLORS.text },
  modalRole: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  headerRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 6 },
  iconBtn: { padding: 6 },
  configBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#e3eafc', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12, marginBottom: 10,
    width: '100%', justifyContent: 'center',
  },
  configBtnText: { marginLeft: 8, color: '#1976d2', fontWeight: '600', fontSize: 14 },
  closeBtn: { alignSelf: 'center', marginTop: 2, padding: 8, width: '100%' },
  closeBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  menuTitleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f5f7fa', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8,
    width: '100%',
  },
  menuTitleText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  subMenuBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.18)', zIndex: 100,
  },
  subMenuDropdown: {
  position: 'absolute',
  left: 24,
  minWidth: 220,
  maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 200,
  },
  subMenuDropdownMobile: {
    left: 12,
    minWidth: 160,
    maxWidth: 260,
    paddingHorizontal: 8,
  },
  headerRowLogoMobile: {
    paddingRight: 4,
  },
  logoImgMobile: {
    width: 48,
    height: 28,
  },
  userInfoContainerMobile: {
    alignItems: 'flex-start',
    marginRight: 4,
  },
  sidePanelMobile: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  subMenuScroll: {
    maxHeight: 320,
    minHeight: 0,
  },
  subMenuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'left',
    paddingLeft: 4,
  },
  subMenuList: {
    width: '100%',
    flexDirection: 'column',
    gap: 2,
  },
  subMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
    width: '100%',
  },
  subMenuBtnTextBlue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976d2',
  },
});
