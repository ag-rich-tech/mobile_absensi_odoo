package com.mobileabsensi.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Plugin Capacitor lokal "Heartbeat" (Android saja, tahap 2 live tracking).
 *
 * Didaftarkan eksplisit di MainActivity (template ini TIDAK memakai
 * auto-registrasi untuk plugin lokal — lihat FakeGpsPlugin /
 * PermissionPlugin yang didaftarkan dengan cara yang sama).
 *
 * Kontrak JS (lihat src/services/heartbeat.js):
 *   start({ token, baseUrl, intervalMs, clientUuid })
 *     -> { started: true, active: true, intervalMs, nextFireAtMs }
 *   stop() -> { started: false, active: false }
 *   status() -> { active, intervalMs, nextFireAtMs }
 *
 * - token: Bearer token login user (disimpan di SharedPreferences
 *   privat app; DIHAPUS saat stop() dan saat server menjawab 401).
 * - baseUrl: root API, mis. https://odoo18.hiddenlab.me/ag_rest_api/v1
 *   (native menambahkan "/tracking/ping" sendiri).
 * - intervalMs: bila kosong / <= 0, default 3600000 (1 jam).
 * - clientUuid: bila kosong, native membuat format DEV- + UUID dan
 *   menyimpannya (format sama dengan getOrCreateDeviceId() di JS).
 *
 * Plugin ini HANYA menjadwalkan; kerja lokasi + kirim dilakukan
 * {@link HeartbeatReceiver} di luar WebView, sehingga tetap jalan saat
 * app diminimize / di-swipe (selama OS tidak membunuhnya — lihat batas
 * di docs/live-tracking-heartbeat-stage2.md).
 */
@CapacitorPlugin(name = "Heartbeat")
public class HeartbeatPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        String token = call.getString("token");
        String baseUrl = call.getString("baseUrl");
        String clientUuid = call.getString("clientUuid");
        Integer interval = call.getInt("intervalMs");
        if (token == null || token.isEmpty() || baseUrl == null || baseUrl.isEmpty()) {
            call.reject("token dan baseUrl wajib diisi.");
            return;
        }
        long intervalMs = (interval != null && interval > 0)
                ? interval.longValue() : HeartbeatScheduler.DEFAULT_INTERVAL_MS;
        // Normalisasi: buang garis miring akhir supaya gabungan URL stabil.
        while (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        HeartbeatScheduler.saveConfig(
                getContext(), token, baseUrl, intervalMs, clientUuid);
        HeartbeatScheduler.scheduleNext(getContext(), intervalMs);
        JSObject ret = new JSObject();
        ret.put("started", true);
        ret.put("active", true);
        ret.put("intervalMs", intervalMs);
        ret.put("nextFireAtMs", HeartbeatScheduler.getNextFireMs(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        HeartbeatScheduler.cancelAndClear(getContext());
        JSObject ret = new JSObject();
        ret.put("started", false);
        ret.put("active", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("active", HeartbeatScheduler.isActive(getContext()));
        ret.put("intervalMs", HeartbeatScheduler.getIntervalMs(getContext()));
        ret.put("nextFireAtMs", HeartbeatScheduler.getNextFireMs(getContext()));
        call.resolve(ret);
    }
}
