// Constantes de configuración para la aplicación

// URL del servidor API
// Esta URL se utilizará como fallback si la variable de entorno no está definida
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://85.59.105.234:3000';


export const MAP_STYLE_URL = 'https://demotiles.maplibre.org/style.json'; // cámbialo por tu estilo
export const WS_URL = ''; // wss://tu-servidor-realtime (si no hay, queda vacío y usa polling)


// Otras constantes que podrían ser útiles en el futuro
export const APP_VERSION = '1.0.0';
export const DEFAULT_TIMEOUT = 10000; // 10 segundos
