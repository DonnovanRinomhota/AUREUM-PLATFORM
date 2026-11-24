package com.aureum.backoffice;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/* Offline start: with no internet, let the web view open pages from its saved copy instead of failing.
   Online it behaves exactly as before. */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyCacheMode();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyCacheMode();
    }

    private void applyCacheMode() {
        try {
            WebView web = getBridge().getWebView();
            if (web == null) return;
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo info = cm == null ? null : cm.getActiveNetworkInfo();
            boolean online = info != null && info.isConnected();
            web.getSettings().setCacheMode(online ? WebSettings.LOAD_DEFAULT : WebSettings.LOAD_CACHE_ELSE_NETWORK);
        } catch (Exception ignored) { }
    }
}
