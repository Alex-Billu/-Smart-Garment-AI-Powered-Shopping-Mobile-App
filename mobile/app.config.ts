import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Smart Garment',
  slug: 'smart-garment-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './src/assets/icon.png',
  userInterfaceStyle: 'automatic',
  // @ts-expect-error: splash is still supported at runtime in SDK 57 via Expo config resolver
  splash: {
    image: './src/assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#6366f1',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.smartgarment.mobile',
    buildNumber: '1',
    infoPlist: {
      NSCameraUsageDescription: 'Smart Garment needs camera access to take product photos.',
      NSPhotoLibraryUsageDescription: 'Smart Garment needs photo library access to upload product images.',
      NSFaceIDUsageDescription: 'Smart Garment uses Face ID to securely unlock your account.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './src/assets/adaptive-icon.png',
      backgroundColor: '#6366f1',
    },
    package: 'com.smartgarment.mobile',
    versionCode: 1,
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
      'VIBRATE',
      'RECEIVE_BOOT_COMPLETED',
    ],
  },
  web: {
    favicon: './src/assets/favicon.png',
    bundler: 'metro',
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:5000/api/v1',
    socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://10.0.2.2:5000',
    imageBaseUrl: process.env.EXPO_PUBLIC_IMAGE_URL ?? 'http://10.0.2.2:5000/static/images',
  },
  plugins: [
    'expo-router',
    [
      'expo-notifications',
      {
        icon: './src/assets/notification-icon.png',
        color: '#6366f1',
        androidMode: 'default',
        androidCollapsedTitle: 'Smart Garment',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Smart Garment needs access to your photos to upload product images.',
        cameraPermission: 'Smart Garment needs camera access to take product photos.',
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Smart Garment uses Face ID to securely authenticate you.',
      },
    ],
    'expo-secure-store',
  ],
  scheme: 'smart-garment',
  experiments: {
    typedRoutes: true,
  },
});
