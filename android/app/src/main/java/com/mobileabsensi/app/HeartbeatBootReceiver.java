package com.mobileabsensi.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Pemulih jadwal heartbeat sesudah reboot / update aplikasi.
 *
 * AlarmManager MENGHAPUS semua alarm saat reboot dan saat APK di-update.
 * Receiver ini menjadwalkan ulang HANYA bila flag aktif tersimpan
 * (user sedang dalam sesi yang seharusnya dilacak); tanpa flag aktif,
 * tidak ada alarm yang dibuat — tidak ada ping zombie sesudah reboot
 * untuk user yang sudah check-out.
 *
 * Tidak melakukan kerja lokasi/jaringan apa pun di sini.
 */
public class HeartbeatBootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            if (intent == null || intent.getAction() == null) {
                return;
            }
            String action = intent.getAction();
            boolean isBoot = Intent.ACTION_BOOT_COMPLETED.equals(action);
            boolean isReplaced = Intent.ACTION_MY_PACKAGE_REPLACED.equals(action);
            if (!isBoot && !isReplaced) {
                return;
            }
            if (HeartbeatScheduler.isActive(context)) {
                HeartbeatScheduler.scheduleNext(context);
            }
        } catch (Exception ignored) {
            // Tidak boleh crash saat boot.
        }
    }
}
