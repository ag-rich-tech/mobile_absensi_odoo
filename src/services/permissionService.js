import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

/**
 * Request camera and media permissions on Android
 */
export async function requestCameraPermission() {
  try {
    // Try native camera first
    const photo = await Camera.getPhoto({
      quality: 50,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });
    return { granted: true, photo };
  } catch (error) {
    console.warn('Native camera permission denied:', error);
    // Fallback to web API
    return requestCameraPermissionWeb();
  }
}

/**
 * Fallback to web-based camera permission
 */
async function requestCameraPermissionWeb() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });
    stream.getTracks().forEach(track => track.stop());
    return { granted: true };
  } catch (error) {
    console.warn('Web camera permission denied:', error);
    return { granted: false, error: error.message };
  }
}

/**
 * Request GPS/location permission using Capacitor Geolocation
 */
export async function requestLocationPermission() {
  try {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    return { granted: true, coords: position.coords };
  } catch (error) {
    console.warn('Location permission denied:', error);
    // Fallback to web API
    return requestLocationPermissionWeb();
  }
}

/**
 * Fallback to web-based location permission
 */
async function requestLocationPermissionWeb() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ granted: false, error: 'Geolocation not supported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ granted: true, coords: position.coords }),
      (error) => resolve({ granted: false, error: error.message }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/**
 * Check if camera permission is granted
 */
export async function checkCameraPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { granted: false, error: 'getUserMedia not supported' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });
    stream.getTracks().forEach(track => track.stop());
    return { granted: true };
  } catch (error) {
    return { granted: false, error: error.message };
  }
}

/**
 * Check if location permission is granted
 */
export async function checkLocationPermission() {
  if (!navigator.geolocation) {
    return { granted: false, error: 'Geolocation not supported' };
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve({ granted: true }),
      (error) => resolve({ granted: false, error: error.message }),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

