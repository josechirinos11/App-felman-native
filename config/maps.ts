// Google Maps API configuration
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
  process.env.GOOGLE_MAPS_API_KEY || 
  'AIzaSyAEWw8B6utUMKBNmeou8EAovnWRGLxldGs'; // Tu API key existente

// Función para obtener la API key con fallbacks
export const getGoogleMapsApiKey = () => {
  return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    GOOGLE_MAPS_API_KEY || 
    'AIzaSyAEWw8B6utUMKBNmeou8EAovnWRGLxldGs';
};
