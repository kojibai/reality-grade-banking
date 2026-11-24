package com.kojibai.bankeiz.custodyprobe;

import java.security.MessageDigest;
import java.util.Arrays;

/** Retains the enrollment intent before Android can create a credential. */
final class OneUseKeyEnrollment {
    @FunctionalInterface
    interface KeyOperation<T> {
        T run() throws Exception;
    }

    static <T> T open(OneUseSignatureJournal.Storage storage, byte[] challenge, boolean strongBox,
            KeyOperation<T> read, KeyOperation<T> generate) throws Exception {
        if (challenge.length != 32) throw new IllegalArgumentException("A 32-byte enrollment challenge is required.");
        byte[] expected = Arrays.copyOf(challenge, challenge.length + 1);
        expected[challenge.length] = (byte) (strongBox ? 1 : 0);

        byte[] retained = storage.read();
        if (retained != null) {
            if (!MessageDigest.isEqual(expected, retained)) {
                throw new IllegalStateException("The key was enrolled for a different request.");
            }
            T existing = read.run();
            if (existing == null) throw new IllegalStateException("The retained enrollment key is unavailable.");
            return existing;
        }
        if (read.run() != null) throw new IllegalStateException("The key alias already exists.");
        storage.retain(expected);
        return generate.run();
    }
}
