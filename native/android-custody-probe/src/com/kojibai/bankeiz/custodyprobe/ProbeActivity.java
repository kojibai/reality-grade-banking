package com.kojibai.bankeiz.custodyprobe;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.StrongBoxUnavailableException;
import android.util.AtomicFile;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

public final class ProbeActivity extends Activity {
    private static final String PROCESS_INSTANCE = UUID.randomUUID().toString();
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private Button enroll;
    private Button send;
    private Button restore;
    private Button share;
    private TextView status;
    private JSONObject report;
    private String message = "";
    private boolean busy;
    private boolean storageUnavailable;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        try {
            report = new JSONObject(new String(reportFile().readFully(), StandardCharsets.UTF_8));
        } catch (FileNotFoundException fresh) {
            // This installation has no diagnostic.
        } catch (Exception invalid) {
            storageUnavailable = true;
            message = "The saved diagnostic could not be read.";
        }

        ScrollView scroll = new ScrollView(this);
        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        int padding = Math.round(24 * getResources().getDisplayMetrics().density);
        page.setPadding(padding, padding, padding, padding);
        scroll.addView(page);
        scroll.setOnApplyWindowInsetsListener((view, insets) -> {
            var safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            return WindowInsets.CONSUMED;
        });

        TextView title = new TextView(this);
        title.setTextSize(26);
        title.setText("Offline custody test");
        page.addView(title);
        TextView detail = new TextView(this);
        detail.setText("Check whether Android hardware limits a test key to one offline use. The test uses no Bankeiz account or funds.");
        page.addView(detail);

        enroll = button(page, "Enroll test key", view -> run(this::enrollKey));
        send = button(page, "Sign offline test payment", view -> run(this::signPayment));
        restore = button(page, "Check restored snapshot", view -> run(this::tryRestoredSnapshot));
        share = button(page, "Share diagnostic evidence", view -> shareReport());
        status = new TextView(this);
        status.setTextIsSelectable(true);
        page.addView(status);
        setContentView(scroll);
        refresh();
    }

    @Override
    protected void onDestroy() {
        worker.shutdown();
        super.onDestroy();
    }

    private Button button(LinearLayout page, String label, View.OnClickListener action) {
        Button button = new Button(this);
        button.setText(label);
        button.setOnClickListener(action);
        page.addView(button);
        return button;
    }

    private void refresh() {
        String stage = report == null ? "" : report.optString("stage");
        enroll.setEnabled(!busy && !storageUnavailable && report == null);
        send.setText("signing".equals(stage) ? "Resume offline signature" : "Sign offline test payment");
        send.setEnabled(!busy && ("enrolled".equals(stage) || "signing".equals(stage)));
        restore.setEnabled(!busy && "sent".equals(stage));
        share.setEnabled(!busy && report != null);
        String step = switch (stage) {
            case "enrolled" -> "Turn on airplane mode and turn Wi-Fi off before signing the test payment.";
            case "unsupported" -> "This key did not report a hardware-enforced one-use limit.";
            case "sent" -> "Stay offline. Force-stop and reopen this app before checking the saved pre-payment snapshot.";
            case "complete" -> report.optString("outcome");
            case "signing" -> "Resume the same test payment while offline. The app will recover its retained signature if available.";
            case "restoring" -> "The restore test was interrupted. The saved evidence shows the operation that started.";
            default -> "Use an internet connection to enroll a fresh test key.";
        };
        String hardware = report == null ? "" : "\nHardware-enforced uses: "
                + report.optString("hardwareUsageCount", "Unreported")
                + "\nRollback resistance attested: "
                + (report.optBoolean("hardwareRollbackResistance") ? "Yes" : "Unreported")
                + "\nVerified boot and locked device: " + verifiedBootDescription(report);
        status.setText(step + hardware + (message.isEmpty() ? "" : "\n" + message));
    }

    private static String verifiedBootDescription(JSONObject evidence) {
        if (evidence.isNull("hardwareDeviceLocked") || evidence.isNull("hardwareVerifiedBootState")) {
            return "Unreported";
        }
        return evidence.optBoolean("hardwareDeviceLocked") && evidence.optInt("hardwareVerifiedBootState", -1) == 0
                ? "Yes"
                : "No";
    }

    private JSONObject enrollKey(JSONObject current) throws Exception {
        if (current != null) return current;
        if (!online()) throw new IllegalStateException("Connect to the internet to enroll.");
        String aliasBase = "bankeiz-probe-" + UUID.randomUUID();
        byte[] challenge = new byte[32];
        new SecureRandom().nextBytes(challenge);
        var selected = enrollPreferredHardware(aliasBase, challenge);
        String alias = selected.alias();
        var enrollment = selected.enrollment();
        var fields = enrollment.attestation();

        JSONArray encodedChain = new JSONArray();
        for (Certificate certificate : enrollment.chain()) encodedChain.put(encode(certificate.getEncoded()));

        JSONObject enrolled = new JSONObject()
                .put("schema", "bankeiz.android-key-custody-diagnostic.v1")
                .put("stage", enrollment.reportsHardwareSingleUse() ? "enrolled" : "unsupported")
                .put("deviceModel", Build.MODEL)
                .put("androidApi", Build.VERSION.SDK_INT)
                .put("reportsSingleUseFeature",
                        getPackageManager().hasSystemFeature(PackageManager.FEATURE_KEYSTORE_SINGLE_USE_KEY))
                .put("reportsLimitedUseFeature",
                        getPackageManager().hasSystemFeature(PackageManager.FEATURE_KEYSTORE_LIMITED_USE_KEY))
                .put("alias", alias)
                .put("challenge", encode(challenge))
                .put("certificateChain", encodedChain)
                .put("attestationSecurityLevel", fields.attestationSecurityLevel())
                .put("keySecurityLevel", fields.keySecurityLevel())
                .put("softwareUsageCount", nullable(fields.softwareUsageCount()))
                .put("hardwareUsageCount", nullable(fields.hardwareUsageCount()))
                .put("hardwareRollbackResistance", fields.hardwareRollbackResistance())
                .put("hardwareDeviceLocked", nullable(fields.hardwareDeviceLocked()))
                .put("hardwareVerifiedBootState", nullable(fields.hardwareVerifiedBootState()))
                .put("savedSnapshot", new JSONObject().put("alias", alias).put("testHead", UUID.randomUUID().toString()));
        save(enrolled);
        return enrolled;
    }

    private record ProbeKey(String alias, AndroidCustodyKey.Enrollment enrollment) {}

    private ProbeKey enrollPreferredHardware(String aliasBase, byte[] challenge) throws Exception {
        if (getPackageManager().hasSystemFeature(PackageManager.FEATURE_STRONGBOX_KEYSTORE)) {
            String alias = aliasBase + "-strongbox";
            try {
                var strongBox = AndroidCustodyKey.enroll(this, alias, challenge, true);
                if (strongBox.reportsHardwareSingleUse()) return new ProbeKey(alias, strongBox);
                AndroidCustodyKey.load().deleteEntry(alias);
            } catch (StrongBoxUnavailableException unavailable) {
                // The alternative uses its own alias and enrollment record.
            }
        }
        return new ProbeKey(aliasBase, AndroidCustodyKey.enroll(this, aliasBase, challenge, false));
    }

    private JSONObject signPayment(JSONObject current) throws Exception {
        requireOffline();
        String alias = current.getString("alias");
        byte[] payload = payload(current.getJSONObject("savedSnapshot"), "receiver-a");
        switch (current.getString("stage")) {
            case "enrolled" -> {
                current.put("stage", "signing").put("testPayload", encode(payload));
                save(current);
            }
            case "signing" -> {
                if (!encode(payload).equals(current.getString("testPayload"))) {
                    throw new IllegalStateException("The saved test payment differs from the original.");
                }
            }
            default -> { return current; }
        }

        var signature = AndroidCustodyKey.consumeRetained(this, alias, payload);
        byte[] cert = Base64.getDecoder().decode(current.getJSONArray("certificateChain").getString(0));
        var leaf = CertificateFactory.getInstance("X.509")
                .generateCertificate(new java.io.ByteArrayInputStream(cert));
        Signature verifier = Signature.getInstance("SHA256withECDSA");
        verifier.initVerify(leaf);
        verifier.update(payload);
        if (!verifier.verify(signature.der())) throw new IllegalStateException("The test signature did not verify.");
        requireOffline();
        current.put("stage", "sent")
                .put("testSignature", encode(signature.der()))
                .put("testSignatureP1363", encode(signature.receiz()))
                .put("sendProcess", PROCESS_INSTANCE);
        save(current);
        return current;
    }

    private JSONObject tryRestoredSnapshot(JSONObject current) throws Exception {
        requireOffline();
        if (!"sent".equals(current.getString("stage"))) return current;
        if (PROCESS_INSTANCE.equals(current.getString("sendProcess"))) {
            throw new IllegalStateException("Force-stop and reopen the app first.");
        }

        JSONObject snapshot = current.getJSONObject("savedSnapshot");
        String alias = snapshot.getString("alias");
        byte[] payload = payload(snapshot, "receiver-b");
        current.put("stage", "restoring").put("restorePayload", encode(payload));
        save(current);

        KeyStore keys = AndroidCustodyKey.load();
        if (!keys.containsAlias(alias)) {
            current.put("outcome", "Android Keystore reported the consumed key unavailable after reopening.");
        } else {
            try {
                var signature = AndroidCustodyKey.consume(keys, alias, payload);
                current.put("unexpectedSecondSignature", encode(signature.der()))
                        .put("outcome", "The restored snapshot could still sign. The device did not pass this test.");
            } catch (KeyPermanentlyInvalidatedException exhausted) {
                current.put("outcome", "Android Keystore refused to use the consumed key after reopening.");
            } catch (Exception unclassified) {
                current.put("outcome", "The second attempt returned an unclassified error. Review the evidence.")
                        .put("restoreErrorType", unclassified.getClass().getName());
            }
        }
        requireOffline();
        current.put("stage", "complete").put("restoreProcess", PROCESS_INSTANCE);
        save(current);
        return current;
    }

    private static byte[] payload(JSONObject snapshot, String recipient) throws Exception {
        return new JSONObject()
                .put("purpose", "bankeiz-custody-diagnostic-only")
                .put("predecessor", snapshot.getString("testHead"))
                .put("recipient", recipient)
                .toString().getBytes(StandardCharsets.UTF_8);
    }

    @SuppressWarnings("deprecation") // Check every connected network, including non-default paths.
    private boolean online() {
        ConnectivityManager manager = getSystemService(ConnectivityManager.class);
        for (var network : manager.getAllNetworks()) {
            var capabilities = manager.getNetworkCapabilities(network);
            if (capabilities != null
                    && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) return true;
        }
        return false;
    }

    private void requireOffline() {
        boolean airplaneMode = Settings.Global.getInt(getContentResolver(), Settings.Global.AIRPLANE_MODE_ON, 0) == 1;
        if (!airplaneMode || online()) {
            throw new IllegalStateException("Turn on airplane mode and switch off internet connections.");
        }
    }

    private static String encode(byte[] data) {
        return Base64.getEncoder().encodeToString(data);
    }

    private static Object nullable(Object value) {
        return value == null ? JSONObject.NULL : value;
    }

    private AtomicFile reportFile() {
        return new AtomicFile(new File(getFilesDir(), "bankeiz-custody-diagnostic.json"));
    }

    private void save(JSONObject updated) throws Exception {
        byte[] bytes = updated.toString(2).getBytes(StandardCharsets.UTF_8);
        AtomicFile file = reportFile();
        FileOutputStream output = file.startWrite();
        try {
            output.write(bytes);
            file.finishWrite(output);
        } catch (Exception failed) {
            file.failWrite(output);
            throw failed;
        }
    }

    private void shareReport() {
        if (report == null) return;
        Intent intent = new Intent(Intent.ACTION_SEND).setType("text/plain")
                .putExtra(Intent.EXTRA_TEXT, report.toString());
        startActivity(Intent.createChooser(intent, "Share diagnostic evidence"));
    }

    private void run(Operation operation) {
        if (busy || storageUnavailable) return;
        busy = true;
        message = "";
        refresh();
        JSONObject current = report;
        worker.execute(() -> {
            JSONObject next = current;
            String failure = "";
            try {
                next = operation.apply(current == null ? null : new JSONObject(current.toString()));
            } catch (Exception error) {
                failure = error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
                try {
                    next = new JSONObject(new String(reportFile().readFully(), StandardCharsets.UTF_8));
                } catch (Exception unavailable) {
                    // Preserve the last readable state.
                }
            }
            JSONObject result = next;
            String resultMessage = failure;
            runOnUiThread(() -> {
                report = result;
                message = resultMessage;
                busy = false;
                refresh();
            });
        });
    }

    @FunctionalInterface
    private interface Operation {
        JSONObject apply(JSONObject report) throws Exception;
    }
}
