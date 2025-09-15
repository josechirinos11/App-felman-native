Checks and steps to build APK / AAB

This project requires specific Android SDK/NDK versions and a release keystore for production builds.

1) NDK
- Required NDK version: 26.1.10909125
- Local path (Windows): %LOCALAPPDATA%\\Android\\Sdk\\ndk\\26.1.10909125
- To install locally using sdkmanager:
  sdkmanager "ndk;26.1.10909125"

2) Environment variables for CI / EAS
- Set ANDROID_NDK_VERSION=26.1.10909125 in the build environment.
- Set ANDROID_SDK_ROOT to the Android SDK path in the build environment.

3) Keystore (release)
- Create a keystore if you don't have one (example):
  keytool -genkey -v -keystore release.keystore -alias app_felman -keyalg RSA -keysize 2048 -validity 10000
- Place the keystore file in `android/app/` or configure EAS credentials (recommended for production).

4) Local build (Windows PowerShell - example):
  cd android; .\\gradlew clean; .\\gradlew assembleRelease

5) EAS build
- The repository now sets ANDROID_NDK_VERSION in `eas.json` build profiles. Ensure `ANDROID_SDK_ROOT` is configured in CI/EAS secrets or builder config.

6) Troubleshooting
- If you see C++ compile errors (std::regular / static_assert) on EAS, verify the builder actually uses NDK 26.1.10909125 and restart the build.
- Check logs in `error build eas.txt` for hints about mismatched NDK.
