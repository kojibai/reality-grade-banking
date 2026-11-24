package com.kojibai.bankeiz.custodyprobe;

import java.io.IOException;
import java.util.Arrays;

public final class OneUseSignatureJournalTest {
    private static final byte[] SIGNATURE = {0x30, 6, 2, 1, 1, 2, 1, 1};

    public static void main(String[] args) throws Exception {
        byte[] original = {1};
        MemoryStorage storage = new MemoryStorage();
        byte[] signed = OneUseSignatureJournal.sign(storage, original, payload -> {
            if (!Arrays.equals(payload, original) || storage.read().length != 32) throw new AssertionError();
            return SIGNATURE;
        });
        if (!Arrays.equals(signed, SIGNATURE)) throw new AssertionError();
        MemoryStorage reopened = new MemoryStorage();
        reopened.retain(storage.read());
        byte[] retained = OneUseSignatureJournal.sign(reopened, original, ignored -> {
            throw new AssertionError("A retained operation tried to sign twice.");
        });
        if (!Arrays.equals(signed, retained)) throw new AssertionError();
        try {
            OneUseSignatureJournal.sign(reopened, new byte[] {2}, ignored -> {
                throw new AssertionError("A different payload reached the used key.");
            });
            throw new AssertionError();
        } catch (IllegalStateException expected) {
            // Exact same payload required for recovery.
        }

        MemoryStorage interrupted = new MemoryStorage();
        try {
            OneUseSignatureJournal.sign(interrupted, original, ignored -> {
                throw new IOException("Provider response lost after start.");
            });
            throw new AssertionError();
        } catch (IOException expected) {
            // Native key status could be unknown.
        }
        MemoryStorage restored = new MemoryStorage();
        restored.retain(interrupted.read());
        try {
            OneUseSignatureJournal.sign(restored, original, ignored -> {
                throw new AssertionError("An interrupted operation called the key again.");
            });
            throw new AssertionError();
        } catch (IllegalStateException expected) {
            // Preserve the indeterminate attempt.
        }
        System.out.println("Native signature retention, replay, different payload, and interrupted recovery passed");
    }

    private static final class MemoryStorage implements OneUseSignatureJournal.Storage {
        private byte[] record;

        public byte[] read() {
            return record == null ? null : record.clone();
        }

        public void retain(byte[] bytes) {
            record = bytes.clone();
        }
    }
}
