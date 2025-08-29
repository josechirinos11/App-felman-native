// metro.config.js
import { getDefaultConfig } from 'expo/metro-config.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Para obtener __dirname en ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configurar las extensiones de archivos
config.resolver.assetExts.push('svg');

// Configurar las plataformas soportadas
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// Configurar resolución de módulos para evitar conflictos web/native
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Excluir react-native-maps del bundle web
if (process.env.EXPO_PUBLIC_PLATFORM === 'web' || process.platform === 'web') {
  config.resolver.blockList = [
    /node_modules\/react-native-maps\/.*/,
  ];
}

// Configurar transformer para manejar importaciones dinámicas
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    keep_classnames: true,
    mangle: {
      keep_classnames: true,
    },
  },
  // Optimizaciones para producción
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Configuración específica para desarrollo web
if (process.env.NODE_ENV === 'development') {
  config.server = {
    ...config.server,
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Prevenir carga de react-native-maps en web durante desarrollo
        if (req.url && req.url.includes('react-native-maps') && req.headers['user-agent'] && req.headers['user-agent'].includes('Mozilla')) {
          res.status(404).end();
          return;
        }
        return middleware(req, res, next);
      };
    },
  };
}

export default config;