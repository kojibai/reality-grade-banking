package com.kojibai.bankeiz.custodyprobe;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public final class WalletKeyProviderTest {
    public static void main(String[] args) throws Exception {
        var selection = new MemoryStorage();
        var attempts = new ArrayList<String>();
        var original = WalletKeyProvider.enroll(selection, true, (fallback, strongBox) -> {
            attempts.add(fallback + ":" + strongBox);
            return "original";
        });
        if (!original.equals("original") || !attempts.equals(List.of("false:true")) || WalletKeyProvider.usesFallback(selection)) {
            throw new AssertionError("The supported StrongBox key was changed.");
        }

        attempts.clear();
        var fallbackKey = WalletKeyProvider.enroll(selection, true, (fallback, strongBox) -> {
            attempts.add(fallback + ":" + strongBox);
            if (strongBox) throw new WalletKeyProvider.HardwareUnavailable("StrongBox unavailable");
            if (!fallback || !WalletKeyProvider.usesFallback(selection)) {
                throw new AssertionError("The provider was not saved before creating the fallback key.");
            }
            return "tee";
        });
        var reopenedKey = WalletKeyProvider.enroll(selection, true, (fallback, strongBox) -> {
            attempts.add(fallback + ":" + strongBox);
            return "tee";
        });
        if (!fallbackKey.equals(reopenedKey) || !attempts.equals(List.of("false:true", "true:false", "true:false"))) {
            throw new AssertionError("Reopening changed the selected provider.");
        }

        var unavailable = new MemoryStorage();
        try {
            WalletKeyProvider.enroll(unavailable, true, (fallback, strongBox) -> {
                if (fallback) throw new AssertionError("An ambiguous failure selected a second key.");
                throw new IOException("An interrupted enrollment");
            });
            throw new AssertionError("An interrupted enrollment was treated as successful.");
        } catch (IOException expected) {}
        if (WalletKeyProvider.usesFallback(unavailable)) throw new AssertionError("An interruption changed the provider.");
        var defaultKey = WalletKeyProvider.enroll(unavailable, false, (fallback, strongBox) -> {
            if (fallback || strongBox) throw new AssertionError("The default hardware path was skipped.");
            return "default";
        });
        if (!defaultKey.equals("default")) throw new AssertionError("The default provider did not enroll.");
        unavailable.retain(new byte[]{2});
        try {
            WalletKeyProvider.usesFallback(unavailable);
            throw new AssertionError("An invalid provider marker was accepted.");
        } catch (IllegalStateException expected) {}

        System.out.println("StrongBox, verified alternate hardware, cold reopen and interrupted enrollment passed");
    }

    private static final class MemoryStorage implements OneUseSignatureJournal.Storage {
        private byte[] retained;

        public byte[] read() {
            return retained == null ? null : retained.clone();
        }

        public void retain(byte[] bytes) {
            retained = bytes.clone();
        }
    }
}
