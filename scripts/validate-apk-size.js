#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Función para convertir bytes a MB
function bytesToMB(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2);
}

// Función para encontrar y validar APK
function validateAPK() {
    const apkPaths = [
        path.join(__dirname, '../android/app/build/outputs/apk/release/app-release.apk'),
        path.join(__dirname, '../android/app/build/outputs/apk/release/app-arm64-v8a-release.apk'),
        path.join(__dirname, '../android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk'),
        path.join(__dirname, '../android/app/build/outputs/apk/release/app-universal-release.apk')
    ];

    console.log('🔍 VALIDACIÓN DE APK DE PRODUCCIÓN\n');
    console.log('═'.repeat(50));
    
    let foundAPKs = [];
    
    apkPaths.forEach(apkPath => {
        if (fs.existsSync(apkPath)) {
            const stats = fs.statSync(apkPath);
            const sizeInMB = bytesToMB(stats.size);
            const filename = path.basename(apkPath);
            
            foundAPKs.push({
                filename,
                sizeInMB: parseFloat(sizeInMB),
                path: apkPath
            });
            
            console.log(`✅ ${filename}`);
            console.log(`   Tamaño: ${sizeInMB} MB`);
            console.log(`   Ruta: ${apkPath}`);
            console.log('');
        }
    });
    
    if (foundAPKs.length === 0) {
        console.log('❌ No se encontraron APKs en las rutas esperadas');
        console.log('💡 Ejecuta: npm run build:android:production');
        return;
    }
    
    // Análisis de tamaños
    console.log('📊 ANÁLISIS DE TAMAÑOS:\n');
    
    foundAPKs.forEach(apk => {
        let status = '';
        let recommendation = '';
        
        if (apk.sizeInMB < 50) {
            status = '⚠️  POSIBLE PROBLEMA';
            recommendation = 'APK muy pequeña, puede faltar contenido';
        } else if (apk.sizeInMB >= 50 && apk.sizeInMB <= 100) {
            status = '✅ TAMAÑO NORMAL';
            recommendation = 'Tamaño apropiado para app de producción';
        } else if (apk.sizeInMB > 100) {
            status = '⚡ APK GRANDE';
            recommendation = 'Considera optimizaciones adicionales';
        }
        
        console.log(`${apk.filename}: ${status}`);
        console.log(`└─ ${recommendation}\n`);
    });
    
    // Comparación con el problema anterior
    const mainAPK = foundAPKs.find(apk => apk.filename.includes('universal') || apk.filename === 'app-release.apk') || foundAPKs[0];
    
    if (mainAPK) {
        console.log('🎯 COMPARACIÓN CON PROBLEMA ANTERIOR:\n');
        console.log(`APK actual: ${mainAPK.sizeInMB} MB`);
        console.log(`APK anterior (problemática): 41 MB`);
        console.log(`APK objetivo: ~80 MB`);
        
        if (mainAPK.sizeInMB > 60) {
            console.log('✅ PROBLEMA RESUELTO: APK tiene tamaño apropiado');
        } else {
            console.log('⚠️  PROBLEMA PERSISTE: APK sigue siendo pequeña');
        }
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log('📝 Para builds futuros usa:');
    console.log('   • Desarrollo: npm run build:android:dev');
    console.log('   • Producción: npm run build:android:production');
    console.log('   • EAS Build: eas build --platform android --profile production-apk');
}

validateAPK();
