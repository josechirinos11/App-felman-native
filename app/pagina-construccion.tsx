import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PaginaEnConstruccionScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
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
          
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back-outline" size={20} color="#ffffff" />
            <Text style={styles.backButtonText}>Atrás</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
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
  },  constructionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    elevation: 3,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },  iconBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#2e78b7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    elevation: 4,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
  },  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e78b7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 30,
    elevation: 2,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
