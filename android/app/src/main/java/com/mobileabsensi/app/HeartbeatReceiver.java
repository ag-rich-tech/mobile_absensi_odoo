package com.mobileabsensi.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.BatteryManager;
import android.os.Build;
import android.os.PowerManager;

import androidx.core.content.ContextCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Penerima alarm heartbeat live tracking tahap 2 (Android saja).
 *
 * Alur tiap bunyi alarm (semuanya di thread latar + wake lock, tidak
 * pernah di main thread, tidak pernah melempar):
 *   1. Bila flag aktif tidak tersimpan -> berhenti (tidak dijadwalkan
 *      ulang). Ini pengaman bila alarm yatim masih tersisa.
 *   2. Jadwalkan ulang alarm berikutnya SEBELUM bekerja, supaya
 *      kegagalan lokasi/jaringan di bawah tidak memutus rantai.
 *   3. Ambil lokasi (Fused, akurasi tinggi, timeout 20 dtk; fallback
 *      lastLocation 5 dtk; tanpa lokasi -> lewati kirim, rantai tetap).
 *   4. Kirim POST ke endpoint yang SAMA dengan jalur JS
 *      ({baseUrl}/tracking/ping, header Bearer, body JSON yang sama
 *      persis: latitude, longitude, accuracy_m, battery_level,
 *      mock_detected, client_uuid). Server memberi stempel waktu
 *      sendiri (create_date) — native TIDAK mengirim field waktu, jadi
 *      tidak ada risiko salah zona seperti insiden ping_time dulu.
 *   5. Bila server menjawab 401 (token mati) atau NOT_CHECKED_IN
 *      (sesi berakhir / auto-check-out) -> hentikan rantai total
 *      (batal + hapus token). App akan memulai ulang saat clock-in
 *      berikutnya; alarm zombie tiap jam dicegah.
 *
 * Batasan jujur: receiver ini TIDAK jalan sesudah Force Stop via
 * Settings (sistem menghapus alarm) dan TIDAK jalan saat reboot sampai
 * {@link HeartbeatBootReceiver} menjadwalkan ulang.
 */
public class HeartbeatReceiver extends BroadcastReceiver {

    private static final long LOCATION_TIMEOUT_MS = 20000L;
    private static final long LAST_LOCATION_TIMEOUT_MS = 5000L;
    private static final long WAKE_LOCK_TIMEOUT_MS = 60000L;

    @Override
    public void onReceive(Context context, Intent intent) {
        final BroadcastReceiver.PendingResult pendingResult = goAsync();
        PowerManager powerManager =
                (PowerManager) context.getSystemService(Context.POWER_MANAGER);
        PowerManager.WakeLock wakeLock = null;
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK, "AliAttendance:Heartbeat");
            try {
                wakeLock.acquire(WAKE_LOCK_TIMEOUT_MS);
            } catch (Exception ignored) {
                wakeLock = null;
            }
        }
        final PowerManager.WakeLock heldLock = wakeLock;
        final Context appContext = context.getApplicationContext();
        new Thread(() -> {
            try {
                runHeartbeat(appContext);
            } catch (Exception ignored) {
                // Tidak boleh crash / menghentikan rantai.
            } finally {
                try {
                    if (heldLock != null && heldLock.isHeld()) {
                        heldLock.release();
                    }
                } catch (Exception ignored) {
                }
                try {
                    pendingResult.finish();
                } catch (Exception ignored) {
                }
            }
        }).start();
    }

    private void runHeartbeat(Context context) {
        // 1. Pengaman alarm yatim: tanpa flag aktif, jangan jadwalkan ulang.
        if (!HeartbeatScheduler.isActive(context)) {
            return;
        }
        String token = HeartbeatScheduler.getToken(context);
        String baseUrl = HeartbeatScheduler.getBaseUrl(context);
        if (token == null || token.isEmpty() || baseUrl == null || baseUrl.isEmpty()) {
            HeartbeatScheduler.cancelAndClear(context);
            return;
        }
        // 2. Rantai dulu, kerja kemudian.
        HeartbeatScheduler.scheduleNext(context);

        // 3. Lokasi (butuh izin lokasi; tanpa izin -> lewati, rantai tetap).
        boolean hasFine = ContextCompat.checkSelfPermission(
                context, android.Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        boolean hasCoarse = ContextCompat.checkSelfPermission(
                context, android.Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        if (!hasFine && !hasCoarse) {
            return;
        }
        Location location = fetchLocation(context);
        if (location == null) {
            return;
        }
        // 4. Kirim replika payload JS.
        try {
            sendPing(context, token, baseUrl, location);
        } catch (Exception ignored) {
            // Jaringan gagal: rantai sudah dijadwalkan, coba lagi jam depan.
        }
    }

    /**
     * getCurrentLocation akurasi tinggi + timeout; fallback lastLocation.
     * Mengembalikan null bila keduanya gagal (tanpa melempar).
     */
    private Location fetchLocation(Context context) {
        try {
            FusedLocationProviderClient fused =
                    LocationServices.getFusedLocationProviderClient(context);
            final Location[] holder = new Location[1];
            final CountDownLatch latch = new CountDownLatch(1);
            CancellationTokenSource cts = new CancellationTokenSource();
            fused.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.getToken())
                    .addOnSuccessListener(location -> {
                        holder[0] = location;
                        latch.countDown();
                    })
                    .addOnFailureListener(e -> latch.countDown());
            boolean done;
            try {
                done = latch.await(LOCATION_TIMEOUT_MS, TimeUnit.MILLISECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                done = false;
            }
            if (!done) {
                try {
                    cts.cancel();
                } catch (Exception ignored) {
                }
            }
            if (holder[0] != null) {
                return holder[0];
            }
            final CountDownLatch latch2 = new CountDownLatch(1);
            fused.getLastLocation()
                    .addOnSuccessListener(location -> {
                        holder[0] = location;
                        latch2.countDown();
                    })
                    .addOnFailureListener(e -> latch2.countDown());
            try {
                latch2.await(LAST_LOCATION_TIMEOUT_MS, TimeUnit.MILLISECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return holder[0];
        } catch (Exception ignored) {
            return null;
        }
    }

    @SuppressWarnings("deprecation")
    private boolean isMockLocation(Location location) {
        // isMock() hanya API 31+; isFromMockProvider() bekerja di semua
        // API tapi deprecated sejak 31 (tetap fungsional, bukan dihapus).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return location.isMock();
        }
        return location.isFromMockProvider();
    }

    /** Baterai persen 0-100 dari BatteryManager, atau null bila tak terbaca. */
    private Integer readBatteryPercent(Context context) {
        try {
            Intent status = context.registerReceiver(
                    null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            if (status == null) {
                return null;
            }
            int level = status.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = status.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            if (level < 0 || scale <= 0) {
                return null;
            }
            return Math.round(level * 100f / scale);
        } catch (Exception ignored) {
            return null;
        }
    }

    private void sendPing(Context context, String token, String baseUrl,
                          Location location) throws Exception {
        String clientUuid = HeartbeatScheduler.getClientUuid(context);
        if (clientUuid == null || clientUuid.isEmpty()) {
            // Fallback format sama dengan JS (DEV- + UUID huruf besar).
            clientUuid = "DEV-" + UUID.randomUUID().toString().toUpperCase();
            HeartbeatScheduler.setClientUuid(context, clientUuid);
        }
        Integer battery = readBatteryPercent(context);

        JSONObject body = new JSONObject();
        body.put("latitude", location.getLatitude());
        body.put("longitude", location.getLongitude());
        body.put("accuracy_m", location.hasAccuracy() ? (double) location.getAccuracy() : 0);
        if (battery == null) {
            body.put("battery_level", JSONObject.NULL);
        } else {
            body.put("battery_level", battery.intValue());
        }
        body.put("mock_detected", isMockLocation(location));
        body.put("client_uuid", clientUuid);

        HttpURLConnection conn = null;
        try {
            URL url = new URL(baseUrl + "/tracking/ping");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(20000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload);
            }
            int code = conn.getResponseCode();
            String responseBody = readBody(conn);
            // Self-stop: token mati atau sesi berakhir -> jangan kirim
            // tiap jam selamanya; app memulai ulang saat clock-in lagi.
            if (code == 401 || (responseBody != null
                    && responseBody.contains("NOT_CHECKED_IN"))) {
                HeartbeatScheduler.cancelAndClear(context);
            }
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    /** Baca body respons (sukses maupun error) sebagai teks, atau null. */
    private String readBody(HttpURLConnection conn) {
        InputStream in = null;
        try {
            try {
                in = conn.getInputStream();
            } catch (Exception e) {
                in = conn.getErrorStream();
            }
            if (in == null) {
                return null;
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[1024];
            int n;
            while ((n = in.read(buf)) != -1) {
                out.write(buf, 0, n);
            }
            return out.toString(StandardCharsets.UTF_8.name());
        } catch (Exception ignored) {
            return null;
        } finally {
            if (in != null) {
                try {
                    in.close();
                } catch (Exception ignored) {
                }
            }
        }
    }
}
