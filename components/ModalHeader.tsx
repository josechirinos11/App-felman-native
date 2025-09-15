// components/ModalHeader.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ NUEVO
import COLORS from '../constants/Colors';

type ModalHeaderProps = {
  visible: boolean;
  onClose: () => void;
  userName: string;
  role: string;
};

export default function ModalHeader({ visible, onClose, userName, role }: ModalHeaderProps) {
  const router = useRouter();
  const anim = React.useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = visible
  const [panelWidth, setPanelWidth] = React.useState(320);

  React.useEffect(() => {
    if (visible) {
      // slide in
      Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    }
  }, [visible, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-(panelWidth + 20), 0],
  });

  if (!visible) return null;

  const handleCloseWithAnimation = () => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  return (
    <SafeAreaView style={styles.overlaySafe} pointerEvents="box-none">
      {/* Side panel */}
      <View style={styles.sidePanelContainer}>
        <Animated.View
          style={[styles.sidePanel, { transform: [{ translateX }] }]}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width || panelWidth;
            if (w && w !== panelWidth) setPanelWidth(w);
          }}
        >
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Usuario</Text>
            <Pressable onPress={handleCloseWithAnimation} style={styles.iconBtn}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalUser}>{userName}</Text>
            <Text style={styles.modalRole}>{role}</Text>

            <View style={{ width: '100%', marginTop: 12 }}>
              <Pressable
                style={styles.configBtn}
                onPress={() => {
                  onClose();
                  router.push('/(tabs)/configuracion'); // ✅ usa una ruta real
                }}
              >
                <Ionicons name="settings-outline" size={18} color="#1976d2" />
                <Text style={styles.configBtnText}>Configuraciones</Text>
              </Pressable>

              <Pressable style={styles.closeBtn} onPress={handleCloseWithAnimation}>
                <Text style={styles.closeBtnText}>Cerrar</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </View>

  {/* Backdrop: ocupa el resto de la pantalla y cierra al pulsar; empieza justo después del panel */}
  <Pressable style={[styles.backdrop, { left: panelWidth }]} onPress={handleCloseWithAnimation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ✅ ocupa toda la pantalla respetando zonas seguras y posiciona arriba/izquierda
  overlaySafe: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start', // arriba
    alignItems: 'flex-start',     // izquierda
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
    minWidth: 260,
    maxWidth: 420,
    width: 'auto',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  zIndex: 200,
  borderRightWidth: 1,
  borderRightColor: '#e6e6e6',
    // shadow
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
    backgroundColor: 'rgba(0,0,0,0.25)'
  ,
  zIndex: 100
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
});
