package com.kojibai.bankeiz.custodyprobe;

import java.io.IOException;
import java.util.Arrays;

public final class OneUseKeyEnrollmentTest {
    private static final byte[] CHALLENGE = new byte[32];

    public static void main(String[] args) throws Exception {
        var storage = new MemoryStorage();
        var keys = new FakeKeyStore();
        var first = OneUseKeyEnrollment.open(storage, CHALLENGE, true, keys::read, keys::generate);
        var recovered = OneUseKeyEnrollment.open(storage, CHALLENGE, true, keys::read, keys::generate);
        if (first != recovered || keys.generated != 1) throw new AssertionError("Enrollment replaced a retained key.");

        byte[] other = CHALLENGE.clone();
        other[0] = 1;
        refuses(() -> OneUseKeyEnrollment.open(storage, other, true, keys::read, keys::generate));
        refuses(() -> OneUseKeyEnrollment.open(storage, CHALLENGE, false, keys::read, keys::generate));

        keys.certificate = null;
        refuses(() -> OneUseKeyEnrollment.open(storage, CHALLENGE, true, keys::read, keys::generate));
        if (keys.generated != 1) throw new AssertionError("An unavailable key was recreated.");

        var interrupted = new MemoryStorage();
        try {
            OneUseKeyEnrollment.open(interrupted, CHALLENGE, false, () -> null, () -> {
                throw new IOException("The provider was interrupted after enrollment began.");
            });
            throw new AssertionError("The provider interruption disappeared.");
        } catch (IOException expected) {}
        refuses(() -> OneUseKeyEnrollment.open(interrupted, CHALLENGE, false, () -> null, keys::generate));
        if (keys.generated != 1) throw new AssertionError("An ambiguous enrollment generated another key.");

        var occupied = new FakeKeyStore();
        occupied.generate();
        refuses(() -> OneUseKeyEnrollment.open(new MemoryStorage(), CHALLENGE, true, occupied::read, occupied::generate));
        if (occupied.generated != 1) throw new AssertionError("An unrelated key was overwritten.");

        System.out.println("Exact enrollment recovery, mismatched challenge, unavailable key and ambiguous retry passed");
    }

    private interface Operation {
        void run() throws Exception;
    }

    private static void refuses(Operation operation) throws Exception {
        try {
            operation.run();
        } catch (IllegalStateException expected) {
            return;
        }
        throw new AssertionError("A conflicting enrollment was accepted.");
    }

    private static final class MemoryStorage implements OneUseSignatureJournal.Storage {
        private byte[] record;

        public byte[] read() {
            return record == null ? null : record.clone();
        }

        public void retain(byte[] bytes) {
            record = Arrays.copyOf(bytes, bytes.length);
        }
    }

    private static final class FakeKeyStore {
        private Object certificate;
        private int generated;

        Object read() {
            return certificate;
        }

        Object generate() {
            generated++;
            certificate = new Object();
            return certificate;
        }
    }
}
