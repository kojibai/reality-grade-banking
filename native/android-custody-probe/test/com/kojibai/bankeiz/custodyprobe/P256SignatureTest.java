package com.kojibai.bankeiz.custodyprobe;

import java.security.KeyPairGenerator;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;
import java.util.Arrays;

public final class P256SignatureTest {
    public static void main(String[] args) throws Exception {
        var generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        var pair = generator.generateKeyPair();
        var signer = Signature.getInstance("SHA256withECDSA");
        var verifier = Signature.getInstance("SHA256withECDSAinP1363Format");
        for (int i = 0; i < 64; i++) {
            byte[] input = {(byte) i};
            signer.initSign(pair.getPrivate());
            signer.update(input);
            byte[] encoded = signer.sign();
            var signature = P256Signature.fromDer(encoded);
            verifier.initVerify(pair.getPublic());
            verifier.update(input);
            if (signature.length != 64 || !verifier.verify(signature)) throw new AssertionError();
            reject(Arrays.copyOf(encoded, encoded.length - 1));
        }
        reject(new byte[] {0x30, 6, 2, 1, 0, 2, 1, 1});
        reject(new byte[] {0x30, 7, 2, 2, 0, 1, 2, 1, 1});
        reject(new byte[] {0x30, 6, 2, 1, (byte) 0x80, 2, 1, 1});
        System.out.println("64 independently verified P-256 conversions and 67 malformed encodings passed");
    }

    private static void reject(byte[] encoded) {
        try {
            P256Signature.fromDer(encoded);
            throw new AssertionError("Malformed signature accepted.");
        } catch (IllegalArgumentException expected) {
            // Invalid encodings must never become custody signatures.
        }
    }
}
