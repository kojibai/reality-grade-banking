package com.kojibai.bankeiz.custodyprobe;

/** Selects the provider before a fallback key can be created for a Wallet slot. */
final class WalletKeyProvider {
    private static final byte[] FALLBACK = {1};

    @FunctionalInterface
    interface Enrollment<T> {
        T open(boolean fallback, boolean strongBox) throws Exception;
    }

    static final class HardwareUnavailable extends Exception {
        HardwareUnavailable(String message) {
            super(message);
        }

        HardwareUnavailable(Throwable cause) {
            super(cause);
        }
    }

    private WalletKeyProvider() {}

    static boolean usesFallback(OneUseSignatureJournal.Storage selection) throws Exception {
        var retained = selection.read();
        if (retained == null) return false;
        if (retained.length != 1 || retained[0] != FALLBACK[0]) {
            throw new IllegalStateException("The retained Wallet key provider is invalid.");
        }
        return true;
    }

    static <T> T enroll(OneUseSignatureJournal.Storage selection, boolean preferStrongBox,
            Enrollment<T> enrollment) throws Exception {
        if (usesFallback(selection)) return enrollment.open(true, false);
        try {
            return enrollment.open(false, preferStrongBox);
        } catch (HardwareUnavailable failure) {
            if (!preferStrongBox) throw failure;
            // Only a definitive lack of hardware support can select another provider.
            // An interrupted or already-consumed enrollment keeps its original alias.
            selection.retain(FALLBACK.clone());
            return enrollment.open(true, false);
        }
    }
}
