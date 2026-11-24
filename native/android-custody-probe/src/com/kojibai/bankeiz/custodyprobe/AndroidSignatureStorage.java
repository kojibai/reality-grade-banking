package com.kojibai.bankeiz.custodyprobe;

import android.content.Context;
import android.util.AtomicFile;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;

final class AndroidSignatureStorage implements OneUseSignatureJournal.Storage {
    private final AtomicFile file;

    AndroidSignatureStorage(Context context, String alias) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(alias.getBytes(StandardCharsets.UTF_8));
        String name = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        file = new AtomicFile(new File(context.getNoBackupFilesDir(), "receiz-native-signature-v1/" + name));
    }

    @Override
    public byte[] read() throws IOException {
        try {
            return file.readFully();
        } catch (FileNotFoundException absent) {
            if (file.getBaseFile().exists()) throw absent;
            return null;
        }
    }

    @Override
    public void retain(byte[] bytes) throws IOException {
        var output = file.startWrite();
        try {
            output.write(bytes);
            output.getFD().sync();
        } catch (IOException failure) {
            file.failWrite(output);
            throw failure;
        }
        file.finishWrite(output);
        if (!Arrays.equals(bytes, read())) throw new IOException("The native signature record could not be retained.");
    }
}
