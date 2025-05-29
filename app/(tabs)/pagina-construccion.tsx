import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Esta configuración oculta la página del menú de pestañas
export const unstable_settings = {
  // Ocultar esta ruta de la barra de pestañas
  isHidden: true,
};

export default function PaginaEnConstruccionScreen() {
  const params = useLocalSearchParams();
  const [title, setTitle] = useState<string>('Página en Construcción');
  const [icon, setIcon] = useState<string>('construct-outline');

  // Obtener el título e ícono de los parámetros de la URL si están disponibles
  useEffect(() => {
    if (params.title) {
      setTitle(params.title as string);
    }
    if (params.icon) {
      setIcon(params.icon as string);
    }
  }, [params]);
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.constructionContainer}>
            <View style={styles.iconBackground}>
              <Ionicons name={icon as any} size={80} color="#ffffff" style={styles.constructionIcon} />
            </View>
            <Text style={styles.constructionTitle}>¡Estamos trabajando en ello!</Text>
            <Text style={styles.constructionText}>
              Esta sección está actualmente en desarrollo y estará disponible próximamente.
            </Text>
            <View style={styles.separator} />
            <Text style={styles.constructionSubtext}>
              Gracias por su paciencia mientras mejoramos la aplicación.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e78b7',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  constructionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  iconBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#2e78b7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  constructionIcon: {
    marginBottom: 0,
  },
  constructionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2e78b7',
    marginBottom: 16,
    textAlign: 'center',
  },
  constructionText: {
    fontSize: 16,
    color: '#4a5568',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    width: '80%',
    marginVertical: 20,
  },
  constructionSubtext: {
    fontSize: 14,
    color: '#718096',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
