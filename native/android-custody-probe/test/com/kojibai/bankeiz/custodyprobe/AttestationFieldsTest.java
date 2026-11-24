package com.kojibai.bankeiz.custodyprobe;

import java.io.ByteArrayOutputStream;
import java.util.Arrays;

public final class AttestationFieldsTest {
    private static final byte[] CHALLENGE = new byte[32];
    private static final byte[] ONE_USE = new byte[] {
        (byte) 0xbf, (byte) 0x83, 0x15, 0x03, 0x02, 0x01, 0x01
    };
    private static final byte[] ROLLBACK = new byte[] {
        (byte) 0xbf, (byte) 0x82, 0x2f, 0x02, 0x05, 0x00
    };
    private static final byte[] VERIFIED_BOOT = new byte[] {
        (byte) 0xbf, (byte) 0x85, 0x40, 0x0e, 0x30, 0x0c, 0x04, 0x01, 0x11,
        0x01, 0x01, (byte) 0xff, 0x0a, 0x01, 0x00, 0x04, 0x01, 0x22
    };

    public static void main(String[] args) {
        byte[] hardware = description(new byte[0], join(ONE_USE, ROLLBACK, VERIFIED_BOOT));
        var fields = AttestationFields.read(hardware);
        require(fields.attestationSecurityLevel() == 2);
        require(fields.keySecurityLevel() == 2);
        require(Arrays.equals(fields.challenge(), CHALLENGE));
        require(fields.softwareUsageCount() == null);
        require(Integer.valueOf(1).equals(fields.hardwareUsageCount()));
        require(fields.hardwareRollbackResistance());
        require(Boolean.TRUE.equals(fields.hardwareDeviceLocked()));
        require(Integer.valueOf(0).equals(fields.hardwareVerifiedBootState()));

        var software = AttestationFields.read(description(ONE_USE, new byte[0]));
        require(Integer.valueOf(1).equals(software.softwareUsageCount()));
        require(software.hardwareUsageCount() == null);
        require(!software.hardwareRollbackResistance());
        require(software.hardwareDeviceLocked() == null);

        var countOnly = AttestationFields.read(description(new byte[0], ONE_USE));
        require(Integer.valueOf(1).equals(countOnly.hardwareUsageCount()));
        require(!countOnly.hardwareRollbackResistance());

        reject(description(new byte[0], join(ONE_USE, ONE_USE)));
        reject(description(new byte[0], join(ROLLBACK, ROLLBACK)));
        reject(description(new byte[0], join(VERIFIED_BOOT, VERIFIED_BOOT)));
        reject(Arrays.copyOf(hardware, hardware.length - 1));
        reject(join(hardware, new byte[] {0x00}));
        reject(description(new byte[0], new byte[] {
            (byte) 0xbf, (byte) 0x83, 0x15, 0x04, 0x02, 0x02, 0x00, 0x01
        }));
        System.out.println("3 valid and 6 malformed Android attestation fixtures passed");
    }

    private static byte[] description(byte[] software, byte[] hardware) {
        return value(0x04, value(0x30, join(
                value(0x02, new byte[] {4}), value(0x0a, new byte[] {2}),
                value(0x02, new byte[] {4}), value(0x0a, new byte[] {2}),
                value(0x04, CHALLENGE), value(0x04, new byte[0]),
                value(0x30, software), value(0x30, hardware)
        )));
    }

    private static byte[] value(int tag, byte[] content) {
        require(content.length < 128);
        return join(new byte[] {(byte) tag, (byte) content.length}, content);
    }

    private static byte[] join(byte[]... parts) {
        var buffer = new ByteArrayOutputStream();
        for (byte[] part : parts) buffer.writeBytes(part);
        return buffer.toByteArray();
    }

    private static void reject(byte[] contents) {
        try {
            AttestationFields.read(contents);
            throw new AssertionError("Malformed attestation extension accepted.");
        } catch (IllegalArgumentException expected) {
            // Malformed input must yield no hardware observation.
        }
    }

    private static void require(boolean condition) {
        if (!condition) throw new AssertionError();
    }
}
