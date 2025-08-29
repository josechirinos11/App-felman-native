# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Google Maps ProGuard rules - CRÍTICO PARA FUNCIONAMIENTO
-keep class com.google.android.gms.maps.** { *; }
-keep interface com.google.android.gms.maps.** { *; }
-keep class com.google.android.gms.location.** { *; }
-keep interface com.google.android.gms.location.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep interface com.google.android.gms.common.** { *; }

# React Native Maps
-keep class com.airbnb.android.react.maps.** { *; }
-keep interface com.airbnb.android.react.maps.** { *; }

# Expo modules - CRÍTICO PARA PRODUCCIÓN
-keep class expo.modules.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# React Native Core
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# NetInfo
-keep class com.reactnativecommunity.netinfo.** { *; }

# Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# Screens
-keep class com.swmansion.rnscreens.** { *; }

# WebView
-keep class com.reactnativecommunity.webview.** { *; }

# Picker
-keep class com.reactnativecommunity.picker.** { *; }

# DateTime Picker
-keep class com.reactcommunity.rndatetimepicker.** { *; }

# Geolocation Service
-keep class com.agontuk.RNFusedLocation.** { *; }

# Add any project specific keep options here:
