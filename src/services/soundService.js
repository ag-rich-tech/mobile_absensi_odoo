/**
 * soundService.js - Layanan Pemutar Audio Alert Presensi Mobile
 * Memutar suara konfirmasi audio ketika absen masuk dan absen pulang berhasil:
 * - Absen Masuk: /sounds/checkin-success.mp3
 * - Absen Pulang: /sounds/checkout-success.mp3
 */

const getSoundUrl = (fileName) => {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}sounds/${fileName}`;
};

const SOUND_FILES = {
  masuk: 'checkin-success.mp3',
  pulang: 'checkout-success.mp3',
};

// Cache Audio instance untuk zero-latency playback
const audioPool = {};

export const preloadAttendanceSounds = () => {
  if (typeof window === 'undefined') return;
  try {
    Object.entries(SOUND_FILES).forEach(([key, filename]) => {
      const audio = new Audio(getSoundUrl(filename));
      audio.preload = 'auto';
      audioPool[key] = audio;
    });
  } catch (e) {
    console.warn('[SoundService] Preload audio dilewati/gagal:', e);
  }
};

export const playAttendanceSound = (type = 'masuk') => {
  if (typeof window === 'undefined') return;

  const normalizedType = (type === 'pulang' || type === 'keluar' || type === 'checkout') ? 'pulang' : 'masuk';
  const filename = SOUND_FILES[normalizedType];
  const soundUrl = getSoundUrl(filename);

  try {
    // 1. Coba gunakan cached audio atau buat instance baru
    let audio = audioPool[normalizedType];
    if (!audio) {
      audio = new Audio(soundUrl);
      audioPool[normalizedType] = audio;
    }

    audio.currentTime = 0;
    audio.volume = 1.0;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn(`[SoundService] Autoplay policy atau audio ${normalizedType} terhambat:`, err);
        // Fallback: buat instance baru seketika
        try {
          const freshAudio = new Audio(soundUrl);
          freshAudio.volume = 1.0;
          freshAudio.play().catch(() => {});
        } catch (_) {}
      });
    }

    // 2. Berikan getaran haptic konfirmasi jika didukung smartphone
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([120, 60, 120]);
    }
  } catch (err) {
    console.warn('[SoundService] Exception saat memutar suara presensi:', err);
  }
};

export default {
  playAttendanceSound,
  preloadAttendanceSounds,
};
