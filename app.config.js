module.exports = {
  name: "Felman",
  slug: "appNativeFelman",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/felmalogo.png",
  scheme: "appnativefelman",
  userInterfaceStyle: "automatic",
  
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.felman.appfelmannative",
    config: {
      googleMapsApiKey: "AIzaSyAEWw8B6utUMKBNmeou8EAovnWRGLxldGs"
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "Esta aplicación necesita acceder a tu ubicación para mostrarte información relevante en el mapa.",
      NSLocationAlwaysAndWhenInUseUsageDescription: "Esta aplicación necesita acceder a tu ubicación en segundo plano para proporcionar seguimiento continuo.",
      UIBackgroundModes: ["location"]
    }
  },
  
  android: {
    package: "com.felman.appfelmannative",
    icon: "./assets/images/felmalogo.png",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE"
    ],
    config: {
      googleMaps: {
        apiKey: "AIzaSyAEWw8B6utUMKBNmeou8EAovnWRGLxldGs"
      }
    },
    edgeToEdgeEnabled: true
  },
  
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
    config: {
      apiKey: "AIzaSyAtdufUHs9jULLbARMm38OLQH6Y0D049QU"
    }
  },
  
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff"
      }
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "Permitir a Felman acceder a tu ubicación.",
        isAndroidBackgroundLocationEnabled: true
      }
    ],
    // Plugin para configuración de Gradle
    ["expo-build-properties", {
      android: {
        compileSdkVersion: 35,
        targetSdkVersion: 34,
        buildToolsVersion: "35.0.0",
        ndkVersion: "26.1.10909125",
        enableProguardInReleaseBuilds: true,
        enableShrinkResourcesInReleaseBuilds: true,
        minSdkVersion: 24,
        // Optimizaciones adicionales para producción
        enablePngCrunchInReleaseBuilds: true,
        enableBundleCompression: true
      }
    }]
  ],
  
  experiments: {
    typedRoutes: true
  },
  
  extra: {
    router: {},
    eas: {
      projectId: "d9cc1079-ff52-4783-861c-f5242470ab58"
    },
    googleMapsApiKey: "AIzaSyAEWw8B6utUMKBNmeou8EAovnWRGLxldGs",
    
    // Configuración de API con fallback
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
      criticalEndpoints: ['/auth', '/control-access'],
      allowOfflineMode: true
    }
  }
};