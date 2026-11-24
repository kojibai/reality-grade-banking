package com.kojibai.bankeiz;

import java.net.URI;
import java.net.URISyntaxException;

final class BankeizLaunchUrl {
    static final String HOST = "bankeiz.com";
    private static final String HOME = "https://" + HOST + "/";

    private static final String ANDROID_HOME = HOME + "app/android-launch";

    static String resolve(String value, boolean refreshHome) {
        if (value == null) return refreshHome ? ANDROID_HOME : HOME;
        try {
            URI uri = new URI(value);
            if ("https".equalsIgnoreCase(uri.getScheme()) && HOST.equalsIgnoreCase(uri.getHost())
                    && uri.getRawUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443)) {
                return uri.toASCIIString();
            }
        } catch (URISyntaxException ignored) {
            // A malformed intent opens the bank's home route.
        }
        return HOME;
    }
}
