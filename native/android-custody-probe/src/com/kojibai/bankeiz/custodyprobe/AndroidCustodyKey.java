package com.kojibai.bankeiz.custodyprobe;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.security.spec.ECGenParameterSpec;
import java.util.Arrays;

/** Native Keystore operations. Admission of a wallet operation belongs to Receiz. */
final class AndroidCustodyKey {
    private static final String PROVIDER = "AndroidKeyStore";
    private static final String SIGNATURE_ALGORITHM = "SHA256withECDSA";

    record Enrollment(Certificate[] chain, AttestationFields attestation) {
        boolean reportsHardwareSingleUse() {
            return hardwareLevel(attestation.keySecurityLevel())
                    && attestation.attestationSecurityLevel() == attestation.keySecurityLevel()
                    && Integer.valueOf(1).equals(attestation.hardwareUsageCount())
                    && attestation.softwareUsageCount() == null;
        }

        private static boolean hardwareLevel(int level) {
            return level == 1 || level == 2;
        }
    }

    record ConsumptionSignature(byte[] der, byte[] receiz) {}

    static synchronized Enrollment enroll(Context context, String alias, byte[] challenge, boolean strongBox) throws Exception {
        byte[] exactChallenge = challenge.clone();
        var storage = new AndroidSignatureStorage(context, "enrollment:" + alias);
        return OneUseKeyEnrollment.open(storage, exactChallenge, strongBox,
                () -> readEnrollment(alias, exactChallenge), () -> generate(alias, exactChallenge, strongBox));
    }

    private static Enrollment generate(String alias, byte[] challenge, boolean strongBox) throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, PROVIDER);
        generator.initialize(new KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN)
                .setAlgorithmParameterSpec(new ECGenParameterSpec("secp256r1"))
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setAttestationChallenge(challenge)
                .setMaxUsageCount(1)
                .setIsStrongBoxBacked(strongBox)
                .build());
        generator.generateKeyPair();

        var enrollment = readEnrollment(alias, challenge);
        if (enrollment == null) throw new IllegalStateException("Android did not retain the key enrollment.");
        return enrollment;
    }

    private static Enrollment readEnrollment(String alias, byte[] challenge) throws Exception {
        KeyStore keys = load();
        if (!keys.containsAlias(alias)) return null;
        Certificate[] chain = keys.getCertificateChain(alias);
        if (chain == null || chain.length < 2 || !(chain[0] instanceof X509Certificate leaf)) {
            throw new IllegalStateException("Android did not provide a key-attestation chain.");
        }
        var fields = AttestationFields.read(leaf.getExtensionValue(AttestationFields.OID));
        if (!Arrays.equals(challenge, fields.challenge())) {
            throw new IllegalStateException("The attestation did not bind the enrollment challenge.");
        }
        return new Enrollment(chain, fields);
    }

    static KeyStore load() throws Exception {
        KeyStore keys = KeyStore.getInstance(PROVIDER);
        keys.load(null);
        return keys;
    }

    static synchronized ConsumptionSignature consumeRetained(Context context, String alias, byte[] payload) throws Exception {
        byte[] signature = OneUseSignatureJournal.sign(new AndroidSignatureStorage(context, alias), payload,
                bytes -> consume(load(), alias, bytes).der());
        return new ConsumptionSignature(signature, P256Signature.fromDer(signature));
    }

    static ConsumptionSignature consume(KeyStore keys, String alias, byte[] payload) throws Exception {
        var key = (PrivateKey) keys.getKey(alias, null);
        if (key == null) throw new IllegalStateException("The test key is unavailable.");
        Signature signer = Signature.getInstance(SIGNATURE_ALGORITHM);
        signer.initSign(key);
        signer.update(payload);
        byte[] signature = signer.sign();
        return new ConsumptionSignature(signature, P256Signature.fromDer(signature));
    }
}
