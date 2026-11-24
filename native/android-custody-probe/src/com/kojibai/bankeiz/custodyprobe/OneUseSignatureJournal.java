package com.kojibai.bankeiz.custodyprobe;

import java.security.MessageDigest;
import java.util.Arrays;

/** Retains the result of a key operation. Wallet source and qualification stay in Receiz. */
final class OneUseSignatureJournal {
    private static final int DIGEST_BYTES = 32;

    interface Storage {
        byte[] read() throws Exception;
        void retain(byte[] bytes) throws Exception;
    }

    interface Signer {
        byte[] sign(byte[] bytes) throws Exception;
    }

    static byte[] sign(Storage storage, byte[] payload, Signer signer) throws Exception {
        byte[] exactPayload = payload.clone();
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(exactPayload);
        byte[] existing = storage.read();
        if (existing != null) {
            if (existing.length < DIGEST_BYTES || !MessageDigest.isEqual(
                    digest, Arrays.copyOf(existing, DIGEST_BYTES))) {
                throw new IllegalStateException("A different operation already used this key.");
            }
            if (existing.length == DIGEST_BYTES) {
                throw new IllegalStateException("The previous key operation has no retained signature.");
            }
            byte[] retained = Arrays.copyOfRange(existing, DIGEST_BYTES, existing.length);
            P256Signature.fromDer(retained);
            return retained;
        }

        storage.retain(digest);
        byte[] signature = signer.sign(exactPayload);
        P256Signature.fromDer(signature);
        byte[] receipt = Arrays.copyOf(digest, DIGEST_BYTES + signature.length);
        System.arraycopy(signature, 0, receipt, DIGEST_BYTES, signature.length);
        storage.retain(receipt);
        return signature;
    }
}
