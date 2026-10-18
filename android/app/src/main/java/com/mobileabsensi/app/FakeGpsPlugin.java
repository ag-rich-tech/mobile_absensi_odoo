package com.mobileabsensi.app;

import android.app.AppOpsManager;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

@CapacitorPlugin(name = "FakeGpsDetector")
public class FakeGpsPlugin extends Plugin {

    private static final String[] KNOWN_FAKE_GPS_PACKAGES = {
        "com.lexa.fakegps",
        "com.lexa.fakegpsdonate",
        "com.rosteam.gpsemulator",
        "com.incorporateapps.fakegps.fre",
        "com.incorporateapps.fakegps",
        "com.fakegps.mock",
        "com.gsmartstudio.fakegps",
        "com.theappninjas.fakegpsjoystick",
        "com.theappninjas.gpsjoystick",
        "com.fly.gps",
        "com.lkr.mockgps",
        "com.marlon.floating.fake.location",
        "com.marlove.fackgps",
        "com.ninja.fakelocation",
        "com.mock.gps",
        "com.location.fakelocator",
        "ru.gavrikov.mocklocations"
    };

    @PluginMethod
    public void checkFakeGps(PluginCall call) {
        Context context = getContext();
        boolean isFake = false;
        boolean isMockLocation = false;
        boolean isAppInstalled = false;
        boolean isMockSettingEnabled = false;
        String detectedAppName = "";
        String reason = "";

        // 1. Cek aplikasi Fake GPS terpasang (Package Check)
        PackageManager pm = context.getPackageManager();
        for (String pkg : KNOWN_FAKE_GPS_PACKAGES) {
            try {
                pm.getPackageInfo(pkg, PackageManager.GET_ACTIVITIES);
                isAppInstalled = true;
                detectedAppName = pkg;
                isFake = true;
                reason = "Aplikasi pemalsu lokasi (" + pkg + ") terpasang di perangkat.";
                break;
            } catch (Exception ignored) {
            }
        }

        // 2. Cek AppOpsManager untuk mock location (Android 6.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                AppOpsManager opsManager = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
                if (opsManager != null) {
                    List<ApplicationInfo> packages = pm.getInstalledApplications(PackageManager.GET_META_DATA);
                    for (ApplicationInfo appInfo : packages) {
                        if ((appInfo.flags & ApplicationInfo.FLAG_SYSTEM) == 0 && !appInfo.packageName.equals(context.getPackageName())) {
                            int mode = opsManager.checkOpNoThrow(
                                AppOpsManager.OPSTR_MOCK_LOCATION,
                                appInfo.uid,
                                appInfo.packageName
                            );
                            if (mode == AppOpsManager.MODE_ALLOWED) {
                                isMockSettingEnabled = true;
                                isFake = true;
                                if (reason.isEmpty()) {
                                    reason = "Aplikasi mock location aktif di Opsi Pengembang: " + appInfo.packageName;
                                }
                                break;
                            }
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        } else {
            // Android < 6.0 cek ALLOW_MOCK_LOCATION
            try {
                String mockSetting = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ALLOW_MOCK_LOCATION);
                if (mockSetting != null && !mockSetting.equals("0")) {
                    isMockSettingEnabled = true;
                    isFake = true;
                    if (reason.isEmpty()) {
                        reason = "Pengaturan Mock Location aktif pada perangkat.";
                    }
                }
            } catch (Exception ignored) {
            }
        }

        // 3. Cek Lokasi Terakhir dari LocationManager
        LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        Location lastGps = null;
        Location lastNet = null;

        if (lm != null) {
            try {
                if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    lastGps = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                    lastNet = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                }
            } catch (SecurityException ignored) {
            }
        }

        if (lastGps != null && checkIsMockLocation(lastGps)) {
            isMockLocation = true;
            isFake = true;
            if (reason.isEmpty()) {
                reason = "Sinyal GPS terdeteksi dimanipulasi oleh Mock Provider (isMock=true).";
            }
        } else if (lastNet != null && checkIsMockLocation(lastNet)) {
            isMockLocation = true;
            isFake = true;
            if (reason.isEmpty()) {
                reason = "Sinyal Jaringan terdeteksi dimanipulasi oleh Mock Provider.";
            }
        }

        JSObject ret = new JSObject();
        ret.put("isFakeGps", isFake);
        ret.put("isMockLocation", isMockLocation);
        ret.put("isAppInstalled", isAppInstalled);
        ret.put("detectedAppName", detectedAppName);
        ret.put("isMockSettingEnabled", isMockSettingEnabled);
        ret.put("reason", reason);

        if (lastGps != null) {
            ret.put("latitude", lastGps.getLatitude());
            ret.put("longitude", lastGps.getLongitude());
            ret.put("accuracy", lastGps.getAccuracy());
        } else if (lastNet != null) {
            ret.put("latitude", lastNet.getLatitude());
            ret.put("longitude", lastNet.getLongitude());
            ret.put("accuracy", lastNet.getAccuracy());
        }

        call.resolve(ret);
    }

    private boolean checkIsMockLocation(Location location) {
        if (location == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return location.isMock();
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
            return location.isFromMockProvider();
        }
        return false;
    }
}
