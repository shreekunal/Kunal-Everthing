package com.kunal.os;

import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeBiometricPlugin.class);
        registerPlugin(HealthConnectPlugin.class);
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
        // Protect sensitive vault & personal information from Android App Switcher screenshots
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
        configureWebViewCache();
    }

    private static final String ALLOWED_HOST = "kunal-os.onrender.com";
    private static final String ALLOWED_SCHEME = "https";

    private boolean isAllowedAppUrl(android.net.Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        String host = uri.getHost();
        return ALLOWED_SCHEME.equalsIgnoreCase(scheme) && ALLOWED_HOST.equalsIgnoreCase(host);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && intent.getData() != null) {
            android.net.Uri data = intent.getData();
            if (isAllowedAppUrl(data)) {
                try {
                    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                    if (webView != null) {
                        webView.loadUrl(data.toString());
                    }
                } catch (Exception ignored) {
                }
            } else {
                android.util.Log.w("MainActivity", "Rejected unverified deep link URL: " + data);
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        configureWebViewCache();
        try {
            long lastSync = WidgetStorage.getLastUpdatedTime(this);
            long diffMs = System.currentTimeMillis() - lastSync;
            // Only trigger background fetch on resume if never synced or staler than 30 minutes
            if (lastSync <= 0 || diffMs > 30 * 60 * 1000L) {
                WidgetSyncManager.enqueueImmediateSync(this);
            }
        } catch (Exception ignored) {
        }
    }

    private void configureWebViewCache() {
        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);

                if (!isNetworkAvailable()) {
                    // Force load from offline cache when disconnected
                    settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
                } else {
                    // Standard caching with remote revalidation when connected
                    settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                }
            }
        } catch (Exception e) {
            // Safe fallback
        }
    }

    private boolean isNetworkAvailable() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                NetworkInfo netInfo = cm.getActiveNetworkInfo();
                return netInfo != null && netInfo.isConnected();
            }
        } catch (Exception e) {
            // Default to true on error
        }
        return true;
    }
}
