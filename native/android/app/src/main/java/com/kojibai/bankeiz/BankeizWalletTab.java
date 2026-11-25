package com.kojibai.bankeiz;

import android.app.Activity;
import android.content.ComponentName;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsService;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import com.kojibai.bankeiz.custodyprobe.BankeizWalletHardware;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.json.JSONException;
import org.json.JSONObject;

/** The browser verifies both ends of this origin-bound message channel. */
final class BankeizWalletTab extends CustomTabsCallback {
    private static final String CHROME = "com.android.chrome";
    private static final Uri ORIGIN = Uri.parse("https://bankeiz.com");
    private static final String PROTOCOL = "bankeiz.android-wallet.v1";
    private static final int MAX_MESSAGE = 1024;

    private final Activity activity;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ThreadPoolExecutor hardware = new ThreadPoolExecutor(
            1, 1, 10, TimeUnit.SECONDS, new ArrayBlockingQueue<>(8));
    private CustomTabsServiceConnection connection;
    private CustomTabsSession session;
    private boolean validated;
    private boolean navigated;
    private boolean requested;
    private boolean ready;
    private long document;

    BankeizWalletTab(Activity activity) {
        this.activity = activity;
        hardware.allowCoreThreadTimeOut(true);
    }

    boolean launch(TrustedWebActivityIntentBuilder intent, Runnable fallback) {
        if (!BankeizWalletHardware.available() || !hasSystemChrome()) return false;
        connection = new CustomTabsServiceConnection() {
            @Override
            public void onCustomTabsServiceConnected(ComponentName provider, CustomTabsClient client) {
                if (connection != this || activity.isDestroyed() || activity.isFinishing()) return;
                try {
                    client.warmup(0);
                    session = client.newSession(BankeizWalletTab.this);
                    if (session != null) {
                        session.validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN, ORIGIN, null);
                        intent.build(session).launchTrustedWebActivity(activity);
                        return;
                    }
                } catch (RuntimeException | LinkageError unavailable) {
                    // The original app opening owns the fallback.
                }
                close();
                fallback.run();
            }

            @Override
            public void onServiceDisconnected(ComponentName provider) {
                close();
            }
        };
        try {
            if (CustomTabsClient.bindCustomTabsService(activity, CHROME, connection)) return true;
        } catch (RuntimeException unavailable) {
            // The original app opening owns the fallback.
        }
        connection = null;
        return false;
    }

    private boolean hasSystemChrome() {
        try {
            int flags = activity.getPackageManager().getApplicationInfo(CHROME, 0).flags;
            return (flags & (ApplicationInfo.FLAG_SYSTEM | ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) != 0;
        } catch (PackageManager.NameNotFoundException unavailable) {
            return false;
        }
    }

    @Override
    public void onRelationshipValidationResult(int relation, Uri origin, boolean successful, Bundle extras) {
        if (relation != CustomTabsService.RELATION_USE_AS_ORIGIN || !ORIGIN.equals(origin)) return;
        validated = successful;
        openChannel();
    }

    @Override
    public void onNavigationEvent(int event, Bundle extras) {
        if (event == NAVIGATION_STARTED) {
            document++;
            requested = ready = navigated = false;
        } else if (event == NAVIGATION_FINISHED) {
            navigated = true;
            openChannel();
        }
    }

    private void openChannel() {
        if (session == null || !validated || !navigated || requested) return;
        requested = session.requestPostMessageChannel(ORIGIN, ORIGIN, new Bundle());
    }

    @Override
    public void onMessageChannelReady(Bundle extras) {
        if (session == null || !validated || !requested || !navigated) return;
        ready = true;
        session.postMessage("{\"schema\":\"bankeiz.android-wallet.v1\",\"operation\":\"ready\"}", null);
    }

    @Override
    public void onPostMessage(String message, Bundle extras) {
        if (!ready || !validated || message.length() > MAX_MESSAGE) return;
        try {
            JSONObject request = new JSONObject(message);
            String id = request.getString("id");
            if (!PROTOCOL.equals(request.getString("schema")) || !id.matches("[a-z0-9-]{36}")) return;
            String operation = request.getString("operation");
            boolean sign = "sign".equals(operation);
            if (!sign && !"enroll".equals(operation)) return;
            if (request.length() != (sign ? 5 : 4)) return;
            String slot = request.getString("slotDigest");
            String payload = sign ? request.getString("payload") : null;
            if (!slot.matches("[a-f0-9]{64}")) return;
            long receivedAt = document;
            try {
                hardware.execute(() -> {
                    JSONObject response = new JSONObject();
                    try {
                        Object result = sign ? BankeizWalletHardware.sign(activity, slot, payload)
                                : BankeizWalletHardware.enroll(activity, slot);
                        response.put("result", result);
                    } catch (Exception unavailable) {
                        try { response.put("error", "hardware_custody_unavailable"); }
                        catch (JSONException impossible) { throw new IllegalStateException(impossible); }
                    }
                    main.post(() -> reply(id, receivedAt, response));
                });
            } catch (RejectedExecutionException busy) {
                reply(id, receivedAt, new JSONObject().put("error", "hardware_custody_busy"));
            }
        } catch (JSONException invalid) {
            // Ignore malformed or unrelated messages from the page.
        }
    }

    private void reply(String id, long receivedAt, JSONObject response) {
        if (session == null || !ready || !validated || receivedAt != document) return;
        try {
            response.put("schema", PROTOCOL).put("id", id);
            session.postMessage(response.toString(), null);
        } catch (JSONException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    void close() {
        if (connection != null) activity.unbindService(connection);
        session = null;
        connection = null;
        ready = false;
        hardware.shutdown();
    }
}
