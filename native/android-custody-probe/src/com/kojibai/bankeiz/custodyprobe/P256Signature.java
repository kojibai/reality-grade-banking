package com.kojibai.bankeiz.custodyprobe;

/** Converts Android Keystore's DER signature into Receiz's fixed-width P-256 signature. */
final class P256Signature {
    private static final int SCALAR_BYTES = 32;

    static byte[] fromDer(byte[] der) {
        if (der.length < 8 || der.length > 72 || der[0] != 0x30 || der[1] != der.length - 2) {
            throw invalid();
        }

        byte[] fixedWidth = new byte[2 * SCALAR_BYTES];
        int afterR = copyScalar(der, 2, fixedWidth, 0);
        int afterS = copyScalar(der, afterR, fixedWidth, SCALAR_BYTES);
        if (afterS != der.length) throw invalid();
        return fixedWidth;
    }

    private static int copyScalar(byte[] der, int offset, byte[] destination, int start) {
        if (der.length - offset < 3 || der[offset] != 0x02) throw invalid();
        int length = Byte.toUnsignedInt(der[offset + 1]);
        int value = offset + 2;
        if (length == 0 || length > SCALAR_BYTES + 1 || length > der.length - value) throw invalid();
        int end = value + length;
        if (der[value] < 0) throw invalid();
        if (der[value] == 0) {
            if (length == 1 || der[value + 1] >= 0) throw invalid();
            value++;
            length--;
        }
        if (length > SCALAR_BYTES) throw invalid();
        System.arraycopy(der, value, destination, start + SCALAR_BYTES - length, length);
        return end;
    }

    private static IllegalArgumentException invalid() {
        return new IllegalArgumentException("Invalid DER P-256 signature.");
    }
}
