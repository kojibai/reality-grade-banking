package com.kojibai.bankeiz;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.verify.domain.DomainVerificationManager;
import android.content.pm.verify.domain.DomainVerificationUserState;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.widget.Button;
import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.trusted.ScreenOrientation;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import com.google.androidbrowserhelper.trusted.TwaLauncher;

public final class BankeizLauncherActivity extends Activity {
    private TwaLauncher launcher;
    private BankeizWalletTab walletTab;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        launch(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        launch(intent);
    }

    private void launch(Intent intent) {
        disposeLauncher();
        boolean freshHome = Intent.ACTION_MAIN.equals(intent.getAction())
                && intent.getData() == null && hasInternet();
        Uri url = Uri.parse(BankeizLaunchUrl.resolve(intent.getDataString(), freshHome));
        if (!verifiedAppLink()) {
            openInBrowser(url);
            return;
        }
        try {

            var launch = new TrustedWebActivityIntentBuilder(url)
                    .setScreenOrientation(ScreenOrientation.PORTRAIT_PRIMARY)
                    .setColorScheme(CustomTabsIntent.COLOR_SCHEME_SYSTEM)
                    .setDefaultColorSchemeParams(navigationColors(0xffffffff))
                    .setColorSchemeParams(CustomTabsIntent.COLOR_SCHEME_DARK, navigationColors(0xff192739));
            walletTab = new BankeizWalletTab(this);
            if (walletTab.launch(launch, () -> openInBrowser(url))) return;
            walletTab.close();
            walletTab = null;
            launcher = new TwaLauncher(this);
            launcher.launch(launch, null, null, this::finish,
                    (context, builder, provider, onFallbackLaunched) -> openInBrowser(url));
        } catch (RuntimeException | LinkageError cause) {
            Log.w("BankeizLauncher", "The trusted browser launch was unavailable.", cause);
            disposeLauncher();
            openInBrowser(url);
        }
    }

    private boolean hasInternet() {
        ConnectivityManager connectivity = getSystemService(ConnectivityManager.class);
        if (connectivity == null) return false;
        NetworkCapabilities capabilities = connectivity.getNetworkCapabilities(connectivity.getActiveNetwork());
        return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }

    private boolean verifiedAppLink() {
        if (!getResources().getBoolean(R.bool.bankeiz_verify_web_links)) return false;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        try {
            var manager = getSystemService(DomainVerificationManager.class);
            var state = manager == null ? null : manager.getDomainVerificationUserState(getPackageName());
            return state != null && Integer.valueOf(DomainVerificationUserState.DOMAIN_STATE_VERIFIED)
                    .equals(state.getHostToStateMap().get(BankeizLaunchUrl.HOST));
        } catch (PackageManager.NameNotFoundException | RuntimeException cause) {
            return false;
        }
    }

    private void openInBrowser(Uri url) {
        if (isFinishing() || isDestroyed()) return;
        try {
            String provider = CustomTabsClient.getPackageName(this, null);
            if (provider != null && !getPackageName().equals(provider)) {
                var tab = new CustomTabsIntent.Builder()
                        .setColorScheme(CustomTabsIntent.COLOR_SCHEME_SYSTEM)
                        .setDefaultColorSchemeParams(navigationColors(0xffffffff))
                        .setColorSchemeParams(CustomTabsIntent.COLOR_SCHEME_DARK, navigationColors(0xff192739))
                        .build();
                tab.intent.setPackage(provider);
                tab.launchUrl(this, url);
                finish();
                return;
            }
        } catch (RuntimeException | LinkageError cause) {
            Log.w("BankeizLauncher", "The browser tab was unavailable.", cause);
        }

        Intent browserLookup = new Intent(Intent.ACTION_VIEW, Uri.parse("https://example.invalid/"))
                .addCategory(Intent.CATEGORY_BROWSABLE);
        var browsers = getPackageManager().queryIntentActivities(browserLookup, PackageManager.MATCH_DEFAULT_ONLY);
        Intent destination = new Intent(Intent.ACTION_VIEW, url).addCategory(Intent.CATEGORY_BROWSABLE);
        for (var browser : browsers) {
            String candidate = browser.activityInfo.packageName;
            if (getPackageName().equals(candidate)) continue;
            try {
                startActivity(destination.setPackage(candidate));
                finish();
                return;
            } catch (ActivityNotFoundException | SecurityException cause) {
                Log.w("BankeizLauncher", "The selected browser could not open the bank.", cause);
            }
        }

        Button retry = new Button(this);
        retry.setText(R.string.bankeiz_open_wallet);
        retry.setOnClickListener(view -> openInBrowser(url));
        setContentView(retry);
    }

    private static CustomTabColorSchemeParams navigationColors(int surface) {
        return new CustomTabColorSchemeParams.Builder()
                .setNavigationBarColor(surface)
                .setNavigationBarDividerColor(surface)
                .build();
    }

    private void disposeLauncher() {
        if (walletTab != null) {
            walletTab.close();
            walletTab = null;
        }
        if (launcher == null) return;
        launcher.destroy();
        launcher = null;
    }

    @Override
    protected void onDestroy() {
        disposeLauncher();
        super.onDestroy();
    }
}
