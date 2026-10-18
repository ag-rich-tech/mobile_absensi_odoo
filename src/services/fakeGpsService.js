import { Capacitor, registerPlugin } from '@capacitor/core';

// Registrasi native plugin FakeGpsDetector yang dibuat di Android
const FakeGpsDetector = registerPlugin('FakeGpsDetector');

/**
 * Memeriksa apakah perangkat menggunakan Fake GPS / Mock Location
 * @param {Object} browserCoords Koordinat yang diperoleh dari navigator.geolocation
 * @returns {Promise<{isFake: boolean, reason: string, isNative: boolean, details: Object}>}
 */
export async function checkFakeGps(browserCoords = null) {
  const isNative = Capacitor.isNativePlatform();

  // 1. Pemeriksaan Native Android melalui FakeGpsPlugin
  if (isNative) {
    try {
      const result = await FakeGpsDetector.checkFakeGps();
      if (result && result.isFakeGps) {
        return {
          isFake: true,
          reason: result.reason || 'Terdeteksi penggunaan Fake GPS atau Mock Location pada perangkat.',
          isNative: true,
          details: result,
        };
      }

      // Jika native plugin menyatakan aman
      return {
        isFake: false,
        reason: 'GPS asli terverifikasi.',
        isNative: true,
        details: result || {},
      };
    } catch (err) {
      console.warn('Native FakeGpsDetector error, fallback to heuristics:', err);
    }
  }

  // 2. Pemeriksaan Tambahan / Heuristik Browser & Web Fallback
  if (browserCoords) {
    // Akurasi 0 meter atau nilai negatif adalah indikator kuat sinyal artifisial mock provider
    if (typeof browserCoords.accuracy === 'number' && browserCoords.accuracy === 0) {
      return {
        isFake: true,
        reason: 'Akurasi sinyal GPS tidak wajar (0m). Terindikasi injeksi koordinat tiruan.',
        isNative: false,
        details: { accuracy: browserCoords.accuracy },
      };
    }

    // Koordinat persis (0, 0)
    if (browserCoords.latitude === 0 && browserCoords.longitude === 0) {
      return {
        isFake: true,
        reason: 'Koordinat GPS berada pada posisi default null (0,0).',
        isNative: false,
        details: browserCoords,
      };
    }
  }

  return {
    isFake: false,
    reason: 'Sinyal GPS normal dan terverifikasi.',
    isNative,
    details: {},
  };
}

export default {
  checkFakeGps,
};
