package com.mobileabsensi.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.Map;

@CapacitorPlugin(name = "PermissionPlugin",
    permissions = {
        @Permission(alias = "camera", strings = {
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        }),
        @Permission(alias = "photos", strings = {
            Manifest.permission.READ_EXTERNAL_STORAGE
        }),
        @Permission(alias = "mediaImages", strings = {
            "android.permission.READ_MEDIA_IMAGES"
        }),
        @Permission(alias = "mediaVideo", strings = {
            "android.permission.READ_MEDIA_VIDEO"
        })
    }
)
public class PermissionPlugin extends Plugin {

    private static final String TAG = "PermissionPlugin";

    @PluginMethod
    public void requestCameraPermission(PluginCall call) {
        requestPermissions(call);
    }

    @PermissionCallback
    private void cameraPermissionResult(PluginCall call, Map<String, Boolean> grantResults) {
        if (call == null) {
            return;
        }

        boolean allGranted = true;
        for (boolean granted : grantResults.values()) {
            if (!granted) {
                allGranted = false;
                break;
            }
        }

        JSObject result = new JSObject();
        result.put("granted", allGranted);

        JSObject permissionResults = new JSObject();
        for (java.util.Map.Entry<String, Boolean> entry : grantResults.entrySet()) {
            permissionResults.put(entry.getKey(), entry.getValue());
        }
        result.put("permissions", permissionResults);

        call.resolve(result);
    }

    @PluginMethod
    public void requestMediaPermissions(PluginCall call) {
        java.util.List<String> permissionsToRequest = new java.util.ArrayList<>();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.READ_MEDIA_IMAGES);
            }
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_MEDIA_VIDEO) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.READ_MEDIA_VIDEO);
            }
        } else {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }

        if (permissionsToRequest.isEmpty()) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }

        requestPermissions(call);
    }

    @PermissionCallback
    private void mediaPermissionResult(PluginCall call, Map<String, Boolean> grantResults) {
        if (call == null) {
            return;
        }

        boolean allGranted = true;
        for (boolean granted : grantResults.values()) {
            if (!granted) {
                allGranted = false;
                break;
            }
        }

        JSObject result = new JSObject();
        result.put("granted", allGranted);

        JSObject permissionResults = new JSObject();
        for (java.util.Map.Entry<String, Boolean> entry : grantResults.entrySet()) {
            permissionResults.put(entry.getKey(), entry.getValue());
        }
        result.put("permissions", permissionResults);

        call.resolve(result);
    }

    @PluginMethod
    public void checkCameraPermission(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void checkMediaPermissions(PluginCall call) {
        boolean granted = true;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            granted &= ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_MEDIA_IMAGES) == PackageManager.PERMISSION_GRANTED;
            granted &= ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_MEDIA_VIDEO) == PackageManager.PERMISSION_GRANTED;
        } else {
            granted &= ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }

        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }
}



