// components/ModalHeader.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  if (!visible) return null;

  return (
    <SafeAreaView style={styles.overlaySafe} pointerEvents="box-none">
      <ScrollView
        contentContainerStyle={styles.card}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.modalTitle}>Usuario</Text>
        <Text style={styles.modalUser}>{userName}</Text>
        <Text style={styles.modalRole}>{role}</Text>

        <View style={{ width: '100%' }}>
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

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cerrar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ✅ ocupa toda la pantalla respetando zonas seguras y posiciona arriba/izquierda
  overlaySafe: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-start', // arriba
    alignItems: 'flex-start',     // izquierda
    paddingLeft: 10,              // margen desde el borde izquierdo
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    minWidth: 240,
    maxWidth: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    flexShrink: 1,
    alignItems: 'flex-start',
  },
  modalTitle: { fontWeight: 'bold', fontSize: 15, marginBottom: 6, color: COLORS.primary },
  modalUser: { fontSize: 16, fontWeight: '700', marginBottom: 2, color: COLORS.text },
  modalRole: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
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
