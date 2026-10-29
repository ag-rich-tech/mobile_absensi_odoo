package com.mobileabsensi.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

/**
 * Penjadwal heartbeat live tracking tahap 2 (Android saja).
 *
 * Satu-satunya sumber kebenaran penjadwalan: SharedPreferences di bawah.
 * Alarm bersifat one-shot: tiap kali {@link HeartbeatReceiver} berbunyi,
 * ia LANGSUNG menjadwalkan ulang alarm berikutnya sebelum bekerja, supaya
 * satu kegagalan lokasi/jaringan tidak pernah memutus rantai.
 *
 * Izin exact alarm (Android 12+, API 31): bila
 * {@link AlarmManager#canScheduleExactAlarms()} false (user mencabut lewat
 * Settings > Aplikasi > Ali Attendance > Alarm & pengingat), dipakai
 * setAndAllowWhileIdle (inexact): alarm tetap jalan tapi bisa bergeser,
 * terutama saat Doze. Tidak pernah crash karena izin ini.
 *
 * Alarm TIDAK bertahan dari: Force Stop via Settings (sistem menghapus
 * semua alarm + receiver tidak jalan sampai app dibuka lagi), dan reboot
 * (dipulihkan {@link HeartbeatBootReceiver} bila flag aktif tersimpan).
 */
public final class HeartbeatScheduler {

    private HeartbeatScheduler() {
    }

    static final String PREFS_NAME = "heartbeat_prefs";
    static final String KEY_ACTIVE = "active";
    static final String KEY_TOKEN = "token";
    static final String KEY_BASE_URL = "base_url";
    static final String KEY_INTERVAL_MS = "interval_ms";
    static final String KEY_CLIENT_UUID = "client_uuid";
    static final String KEY_NEXT_FIRE_MS = "next_fire_ms";

    static final String ACTION_ALARM = "com.mobileabsensi.app.HEARTBEAT_ALARM";

    /** Interval default: 1 jam, sama dengan timer foreground Dashboard. */
    static final long DEFAULT_INTERVAL_MS = 3600000L;

    private static final int REQUEST_CODE = 0x4842;

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static PendingIntent alarmIntent(Context context) {
        Intent intent = new Intent(context, HeartbeatReceiver.class);
        intent.setAction(ACTION_ALARM);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags);
    }

    /** Simpan konfigurasi + tandai aktif (dipanggil plugin start()). */
    static void saveConfig(Context context, String token, String baseUrl,
                           long intervalMs, String clientUuid) {
        prefs(context).edit()
                .putBoolean(KEY_ACTIVE, true)
                .putString(KEY_TOKEN, token)
                .putString(KEY_BASE_URL, baseUrl)
                .putLong(KEY_INTERVAL_MS, intervalMs)
                .putString(KEY_CLIENT_UUID, clientUuid)
                .apply();
    }

    static boolean isActive(Context context) {
        return prefs(context).getBoolean(KEY_ACTIVE, false);
    }

    static String getToken(Context context) {
        return prefs(context).getString(KEY_TOKEN, null);
    }

    static String getBaseUrl(Context context) {
        return prefs(context).getString(KEY_BASE_URL, null);
    }

    static long getIntervalMs(Context context) {
        long v = prefs(context).getLong(KEY_INTERVAL_MS, DEFAULT_INTERVAL_MS);
        return v > 0 ? v : DEFAULT_INTERVAL_MS;
    }

    static String getClientUuid(Context context) {
        return prefs(context).getString(KEY_CLIENT_UUID, null);
    }

    static long getNextFireMs(Context context) {
        return prefs(context).getLong(KEY_NEXT_FIRE_MS, 0L);
    }

    static void setClientUuid(Context context, String clientUuid) {
        prefs(context).edit().putString(KEY_CLIENT_UUID, clientUuid).apply();
    }

    /** Jadwalkan alarm berikutnya = sekarang + interval tersimpan. */
    static void scheduleNext(Context context) {
        scheduleNext(context, getIntervalMs(context));
    }

    /** Jadwalkan alarm berikutnya = sekarang + intervalMs. */
    static void scheduleNext(Context context, long intervalMs) {
        AlarmManager alarmManager =
                (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }
        long triggerAt = System.currentTimeMillis() + intervalMs;
        PendingIntent pendingIntent = alarmIntent(context);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                && !alarmManager.canScheduleExactAlarms()) {
            // Fallback inexact: tetap jalan, bisa bergeser (terutama Doze).
            alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        } else {
            alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        }
        prefs(context).edit().putLong(KEY_NEXT_FIRE_MS, triggerAt).apply();
    }

    /** Batalkan alarm berikutnya (tanpa menghapus konfigurasi). */
    static void cancelAlarm(Context context) {
        AlarmManager alarmManager =
                (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            alarmManager.cancel(alarmIntent(context));
        }
        prefs(context).edit().putLong(KEY_NEXT_FIRE_MS, 0L).apply();
    }

    /**
     * Hentikan total: batalkan alarm + hapus flag aktif + hapus token
     * tersimpan (dipanggil plugin stop() dan saat server menjawab 401 /
     * NOT_CHECKED_IN — token mati atau sesi berakhir tidak boleh
     * meninggalkan alarm zombie yang mengirim tiap jam).
     */
    static void cancelAndClear(Context context) {
        cancelAlarm(context);
        prefs(context).edit()
                .putBoolean(KEY_ACTIVE, false)
                .remove(KEY_TOKEN)
                .putLong(KEY_NEXT_FIRE_MS, 0L)
                .apply();
    }
}
