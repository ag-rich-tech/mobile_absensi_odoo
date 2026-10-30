import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let modelLoadingPromise = null;

/**
 * Muat model AI dari direktori /models (Local/Offline)
 * Menggunakan Tiny Model (<7 MB total) agar sangat ringan dan cepat di HP.
 */
export async function loadFaceModels() {
  if (modelsLoaded) return true;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      modelsLoaded = true;
      return true;
    } catch (error) {
      console.error('Gagal memuat model face recognition:', error);
      modelsLoaded = false;
      modelLoadingPromise = null;
      throw error;
    }
  })();

  return modelLoadingPromise;
}


/**
 * Opsi detektor TinyFaceDetector dengan resolusi optimal 224px
 * Hemat daya baterai dan ramah CPU mobile
 */
export function getDetectorOptions() {
  return new faceapi.TinyFaceDetectorOptions({
    inputSize: 320, // 320px memberikan titik landmark mata yang jauh lebih presisi
    scoreThreshold: 0.45
  });
}

/**
 * Deteksi wajah tunggal lengkap dengan 68 landmark dan 128D descriptor
 */
export async function detectSingleFaceWithDescriptor(inputElement) {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  const options = getDetectorOptions();
  const detection = await faceapi
    .detectSingleFace(inputElement, options)
    .withFaceLandmarks(true)
    .withFaceDescriptor();

  return detection;
}

/**
 * Hitung jarak geometris antara 2 titik koordinat
 */
function dist(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Hitung Eye Aspect Ratio (EAR) untuk deteksi mata terbuka/tertutup
 */
export function calculateEAR(eyePoints) {
  if (!eyePoints || eyePoints.length < 6) return 0.3;
  // eyePoints: [p0, p1, p2, p3, p4, p5]
  const dVertical1 = dist(eyePoints[1], eyePoints[5]);
  const dVertical2 = dist(eyePoints[2], eyePoints[4]);
  const dHorizontal = dist(eyePoints[0], eyePoints[3]);

  if (dHorizontal === 0) return 0.3;
  return (dVertical1 + dVertical2) / (2.0 * dHorizontal);
}

/**
 * Periksa rasio kedipan kedua mata dari 68 landmarks secara adaptif
 * Ambang batas disesuaikan agar responsif di berbagai bentuk mata & kondisi pencahayaan
 */
export function checkBlink(landmarks, baselineEAR = 0.30) {
  if (!landmarks) return { isClosed: false, ear: 0.3, leftEAR: 0.3, rightEAR: 0.3 };

  // Titik mata kiri (36-41) dan mata kanan (42-47)
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  const earLeft = calculateEAR(leftEye);
  const earRight = calculateEAR(rightEye);
  const avgEAR = (earLeft + earRight) / 2.0;

  // Kriteria mata tertutup:
  // 1. Nilai EAR rata-rata < 0.26, ATAU
  // 2. Salah satu mata < 0.22 (misal kedipan sedikit miring/winking), ATAU
  // 3. Terjadi penurunan rasio > 20% dibanding baseline mata terbuka
  const isClosed = avgEAR < 0.26 || earLeft < 0.22 || earRight < 0.22 || (baselineEAR > 0 && avgEAR < baselineEAR * 0.80);

  return {
    isClosed,
    ear: Number(avgEAR.toFixed(3)),
    leftEAR: Number(earLeft.toFixed(3)),
    rightEAR: Number(earRight.toFixed(3))
  };
}

// Normalisasi satu descriptor ke array angka, atau null bila tak bisa
// dipakai (R-A4 audit 5): string JSON di-parse dulu — Object.values
// atas string menghasilkan array karakter yang membuat euclideanDistance
// mengembalikan NaN (UI menampilkan "NaN%").
function toDescriptorArray(desc) {
  if (Array.isArray(desc)) return desc;
  if (typeof desc === 'string') {
    try {
      const parsed = JSON.parse(desc.trim());
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  if (desc && typeof desc === 'object') {
    const vals = Object.values(desc);
    return vals.length && vals.every((v) => typeof v === 'number' && Number.isFinite(v)) ? vals : null;
  }
  return null;
}

/**
 * Hitung Euclidean Distance antara 2 vektor deskriptor wajah.
 * Gagal normalisasi / panjang tak sama / hasil tak finite -> null
 * (bukan NaN); pemanggil (verifyFaceMatch) mengubahnya jadi gagal
 * pencocokan yang bersih.
 */
export function computeDistance(desc1, desc2) {
  if (!desc1 || !desc2) return 1.0;
  const arr1 = toDescriptorArray(desc1);
  const arr2 = toDescriptorArray(desc2);
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return null;
  try {
    const d = faceapi.euclideanDistance(arr1, arr2);
    return Number.isFinite(d) ? d : null;
  } catch {
    return null;
  }
}

/**
 * Verifikasi apakah wajah cocok dengan master descriptor
 * Threshold standar: 0.55 (Nilai jarak < 0.55 dianggap cocok)
 */
export function verifyFaceMatch(liveDescriptor, masterDescriptor, threshold = 0.55) {
  if (!liveDescriptor || !masterDescriptor) {
    return { isMatch: false, distance: 1.0, similarityScore: 0 };
  }

  const distance = computeDistance(liveDescriptor, masterDescriptor);
  // Gagal parse / gagal hitung -> gagal pencocokan yang bersih
  // (isMatch false, skor 0), BUKAN "Wajah tidak sesuai (NaN%)".
  if (distance == null) {
    return { isMatch: false, distance: 1.0, similarityScore: 0 };
  }
  const isMatch = distance <= threshold;

  // Estimasi persentase kemiripan (0 - 100%)
  const similarityScore = Math.max(0, Math.min(100, Math.round((1 - distance / 0.75) * 100)));

  return {
    isMatch,
    distance: Number(distance.toFixed(4)),
    similarityScore
  };
}

export default {
  loadFaceModels,
  detectSingleFaceWithDescriptor,
  checkBlink,
  computeDistance,
  verifyFaceMatch
};
