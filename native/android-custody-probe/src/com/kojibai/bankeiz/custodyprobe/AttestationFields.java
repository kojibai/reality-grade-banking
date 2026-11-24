package com.kojibai.bankeiz.custodyprobe;

import java.util.Arrays;

/** Reads bounded diagnostics from Android's signed KeyDescription extension. */
record AttestationFields(
        int attestationSecurityLevel,
        int keySecurityLevel,
        byte[] challenge,
        Integer softwareUsageCount,
        Integer hardwareUsageCount,
        boolean hardwareRollbackResistance,
        Boolean hardwareDeviceLocked,
        Integer hardwareVerifiedBootState
) {
    static final String OID = "1.3.6.1.4.1.11129.2.1.17";

    static AttestationFields read(byte[] extension) {
        var wrapper = new Der(extension);
        var description = new Der(wrapper.read(0x04).contents());
        wrapper.requireEnd();
        var fields = new Der(description.read(0x30).contents());
        description.requireEnd();

        fields.read(0x02).number();
        int attestationLevel = fields.read(0x0a).number();
        fields.read(0x02).number();
        int keyLevel = fields.read(0x0a).number();
        byte[] challenge = fields.read(0x04).contents();
        fields.read(0x04);
        var software = Authorizations.read(fields.read(0x30).contents());
        var hardware = Authorizations.read(fields.read(0x30).contents());
        fields.requireEnd();

        var boot = hardware.verifiedBoot();
        return new AttestationFields(attestationLevel, keyLevel, challenge,
                software.usageCount(), hardware.usageCount(), hardware.rollbackResistance(),
                boot == null ? null : boot.deviceLocked(), boot == null ? null : boot.state());
    }

    private record VerifiedBoot(boolean deviceLocked, int state) {
        static VerifiedBoot read(byte[] contents) {
            var wrapper = new Der(contents);
            var fields = new Der(wrapper.read(0x30).contents());
            wrapper.requireEnd();
            fields.read(0x04);
            byte[] locked = fields.read(0x01).contents();
            if (locked.length != 1 || (locked[0] != 0 && locked[0] != (byte) 0xff)) throw invalid();
            int state = fields.read(0x0a).number();
            if (state > 3) throw invalid();
            if (fields.hasNext()) fields.read(0x04);
            fields.requireEnd();
            return new VerifiedBoot(locked[0] != 0, state);
        }
    }

    private record Authorizations(Integer usageCount, boolean rollbackResistance, VerifiedBoot verifiedBoot) {
        static Authorizations read(byte[] contents) {
            var list = new Der(contents);
            Integer count = null;
            boolean rollback = false;
            VerifiedBoot boot = null;
            while (list.hasNext()) {
                var field = list.read();
                switch (field.tag()) {
                    case 303 -> {
                        if (field.type() != 0xbf || rollback) throw invalid();
                        var value = new Der(field.contents());
                        if (value.read(0x05).contents().length != 0) throw invalid();
                        value.requireEnd();
                        rollback = true;
                    }
                    case 405 -> {
                        if (field.type() != 0xbf || count != null) throw invalid();
                        var value = new Der(field.contents());
                        count = value.read(0x02).number();
                        value.requireEnd();
                    }
                    case 704 -> {
                        if (field.type() != 0xbf || boot != null) throw invalid();
                        boot = VerifiedBoot.read(field.contents());
                    }
                    default -> { }
                }
            }
            return new Authorizations(count, rollback, boot);
        }
    }

    private record Value(int type, int tag, byte[] contents) {
        int number() {
            if (contents.length == 0 || contents.length > 4 || (contents[0] & 0x80) != 0) {
                throw invalid();
            }
            int result = 0;
            for (byte value : contents) result = (result << 8) | (value & 0xff);
            if (contents.length > 1 && contents[0] == 0 && (contents[1] & 0x80) == 0) {
                throw invalid();
            }
            return result;
        }
    }

    private static final class Der {
        private final byte[] data;
        private int offset;

        Der(byte[] data) {
            if (data == null || data.length > 65_536) throw invalid();
            this.data = data;
        }

        boolean hasNext() {
            return offset < data.length;
        }

        void requireEnd() {
            if (hasNext()) throw invalid();
        }

        Value read(int type) {
            Value field = read();
            if (field.type() != type) throw invalid();
            return field;
        }

        Value read() {
            int type = next();
            int tag = type & 0x1f;
            if (tag == 31) {
                tag = 0;
                int part;
                if (!hasNext() || (data[offset] & 0x7f) == 0) throw invalid();
                do {
                    if (tag > 0x00ffffff) throw invalid();
                    part = next();
                    tag = (tag << 7) | (part & 0x7f);
                } while ((part & 0x80) != 0);
                if (tag < 31) throw invalid();
            }

            int length = next();
            if ((length & 0x80) != 0) {
                int octets = length & 0x7f;
                if (octets == 0 || octets > 3) throw invalid();
                if (!hasNext() || data[offset] == 0) throw invalid();
                length = 0;
                for (int i = 0; i < octets; i++) length = (length << 8) | next();
                if (length < 128) throw invalid();
            }
            if (length > data.length - offset) throw invalid();
            byte[] contents = Arrays.copyOfRange(data, offset, offset + length);
            offset += length;
            return new Value(type, tag, contents);
        }

        private int next() {
            if (!hasNext()) throw invalid();
            return data[offset++] & 0xff;
        }
    }

    private static IllegalArgumentException invalid() {
        return new IllegalArgumentException("Unexpected Android key-attestation extension.");
    }
}
