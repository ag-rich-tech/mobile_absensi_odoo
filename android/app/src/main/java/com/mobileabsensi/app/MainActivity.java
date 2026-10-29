package com.mobileabsensi.app;

import android.os.Bundle;
import android.os.StrictMode;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Allow all thread policies untuk network I/O
        StrictMode.ThreadPolicy policy = new StrictMode.ThreadPolicy.Builder()
                .permitAll()
                .build();
        StrictMode.setThreadPolicy(policy);

        registerPlugin(FakeGpsPlugin.class);
        registerPlugin(PermissionPlugin.class);
        registerPlugin(HeartbeatPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

