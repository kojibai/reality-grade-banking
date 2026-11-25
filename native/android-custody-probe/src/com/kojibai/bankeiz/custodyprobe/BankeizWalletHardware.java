package com.kojibai.bankeiz.custodyprobe;

import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.security.keystore.StrongBoxUnavailableException;
import java.nio.charset.StandardCharsets;
import java.security.cert.Certificate;
import java.util.Base64;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/** Called only by the Bankeiz app's verified browser session. */
public final class BankeizWalletHardware {
    private static final Pattern SLOT_DIGEST = Pattern.compile("[a-f0-9]{64}");
    private static final Pattern SIGNING_PAYLOAD = Pattern.compile(
            "(receiz\\.account-financial\\.wallet-android-assertion\\.v1"
                    + "|receiz\\.offline-note\\.irreversible-consumption\\.v1"
                    + "|receiz\\.offline-note\\.android-activation\\.v1"
                    + "|receiz\\.offline-reserve\\.android-consumption\\.v1):[a-f0-9]{64}");

    private BankeizWalletHardware() {}

    public static boolean available() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S;
    }

    public static synchronized JSONArray enroll(Context context, String slotDigest) throws Exception {
        if (!available()) throw new IllegalStateException("Hardware custody unavailable.");
        String alias = alias(slotDigest);
        byte[] challenge = new byte[32];
        for (int index = 0; index < challenge.length; index++) {
            challenge[index] = (byte) Integer.parseInt(slotDigest.substring(2 * index, 2 * index + 2), 16);
        }
        boolean preferStrongBox = context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_STRONGBOX_KEYSTORE);
        var enrollment = WalletKeyProvider.enroll(selection(context, alias), preferStrongBox, (fallback, strongBox) -> {
            AndroidCustodyKey.Enrollment key;
            try {
                key = AndroidCustodyKey.enroll(context, keyAlias(alias, fallback), challenge, strongBox);
            } catch (StrongBoxUnavailableException cause) {
                throw new WalletKeyProvider.HardwareUnavailable(cause);
            }
            if (!key.reportsHardwareSingleUse()) {
                throw new WalletKeyProvider.HardwareUnavailable("The device did not attest hardware single use.");
            }
            return key;
        });
        var chain = new JSONArray();
        for (Certificate certificate : enrollment.chain()) chain.put(encoded(certificate.getEncoded()));
        return chain;
    }

    public static synchronized JSONObject sign(Context context, String slotDigest, String payload) throws Exception {
        if (!available() || !SIGNING_PAYLOAD.matcher(payload).matches()) {
            throw new IllegalArgumentException("The hardware request is invalid.");
        }
        String alias = alias(slotDigest);
        String selected = keyAlias(alias, WalletKeyProvider.usesFallback(selection(context, alias)));
        var signature = AndroidCustodyKey.consumeRetained(context, selected, payload.getBytes(StandardCharsets.US_ASCII));
        return new JSONObject().put("signatureB64u", encoded(signature.receiz()));
    }

    private static AndroidSignatureStorage selection(Context context, String alias) throws Exception {
        return new AndroidSignatureStorage(context, "provider:" + alias);
    }

    private static String keyAlias(String alias, boolean fallback) {
        return fallback ? alias + ".tee" : alias;
    }

    private static String alias(String digest) {
        if (!SLOT_DIGEST.matcher(digest).matches()) throw new IllegalArgumentException("Invalid enrollment slot.");
        return "bankeiz.wallet.v1." + digest;
    }

    private static String encoded(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
