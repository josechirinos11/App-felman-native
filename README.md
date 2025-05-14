# App Felman - Versión React Native

Esta es la versión móvil de la aplicación Felman, desarrollada con React Native y Expo.

## Características

- **Inicio**: Panel de control principal con acceso a todos los módulos
- **Control de Pedidos**: Gestión completa de pedidos de clientes
- **Control de Entregas**: Seguimiento y administración de entregas
- **Control de Incidencias**: Gestión de problemas y resolución de casos
- **Configuración**: Personalización de la aplicación

## Requisitos

- Node.js 18 o superior
- NPM o Yarn
- Expo CLI
- Android Studio (para desarrollo en Android)
- Xcode (para desarrollo en iOS, solo macOS)

## Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd appNativeFelman
```

2. Instalar dependencias:
```bash
npm install
# o
yarn install
```

3. Iniciar la aplicación:
```bash
npx expo start
```

## Estructura del Proyecto

```
appNativeFelman/
├── app/                  # Código de la aplicación
│   ├── (tabs)/           # Páginas principales (pestañas)
│   ├── _layout.tsx       # Configuración de navegación principal
│   └── ...
├── assets/               # Imágenes, fuentes y recursos estáticos
├── components/           # Componentes reutilizables
├── constants/            # Constantes y temas
├── hooks/                # Hooks personalizados
└── ...
```

## Desarrollo

Para añadir nuevas funcionalidades, sigue estos pasos:

1. Crea nuevos componentes en la carpeta `components/`
2. Implementa nuevas pantallas en la carpeta `app/(tabs)/` o `app/` según corresponda
3. Ejecuta la aplicación con `npx expo start` para probar los cambios

## Licencia

Todos los derechos reservados
