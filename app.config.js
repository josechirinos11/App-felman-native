const fs = require('fs');
const path = require('path');

// Leer el archivo app.json existente
const appJsonPath = path.join(__dirname, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Configuración extendida
module.exports = {
  ...appJson.expo,
  // Asegurar que se incluye la version del app
  version: appJson.expo.version || "1.0.0",
  // Asegurar que el id de iOS está presente
  ios: {
    ...appJson.expo.ios,
    bundleIdentifier: "com.felman.appfelmannative",
  },  // Configuración para EAS Build
  extra: {
    ...appJson.expo.extra,
    eas: {
      ...((appJson.expo.extra || {}).eas || {}),
      projectId: "d9cc1079-ff52-4783-861c-f5242470ab58"
    },
    // Asegurar que la URL de la API esté disponible incluso si la variable de entorno no está definida
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://85.59.105.234:3000",
    // Configuración de red
    network: {
      timeouts: {
        default: 10000,
        short: 3000,
        long: 30000
      },
      retries: {
        default: 2,
        authentication: 3
      },
      // Lista de endpoints críticos que necesitan funcionar
      criticalEndpoints: ['/auth', '/control-access'],
      // Si true, permite operar algunas funcionalidades en modo offline
      allowOfflineMode: true    }
  },
  plugins: [
    ...(appJson.expo.plugins || []),
    // Agregar plugin para asegurar la correcta configuración de Gradle
    ["expo-build-properties", {
      "android": {
        "compileSdkVersion": 34,
        "targetSdkVersion": 34,
        "buildToolsVersion": "34.0.0",
        "enableProguardInReleaseBuilds": false,
        "enableShrinkResourcesInReleaseBuilds": false
      }
    }]
  ]
};
