package com.kojibai.bankeiz;

public final class BankeizLaunchUrlTest {
    public static void main(String[] args) {
        String home = "https://bankeiz.com/";
        String current = "https://bankeiz.com/app/android-launch";
        String link = "https://bankeiz.com/?to=merchant&amount=12.00#account/send";
        if (!BankeizLaunchUrl.resolve(null, false).equals(home)
                || !BankeizLaunchUrl.resolve(null, true).equals(current)
                || !BankeizLaunchUrl.resolve(link, true).equals(link)
                || !BankeizLaunchUrl.resolve(link, false).equals(link)) {
            throw new AssertionError("The Bankeiz home route or deep link was lost.");
        }
        for (String input : new String[]{
                "https://bankeiz.com.evil.invalid/", "http://bankeiz.com/", "https://other@bankeiz.com/",
                "https://bankeiz.com:9443/", "https://bankeiz.com\\@evil.invalid/", "javascript:alert(1)",
                "/?to=merchant", "https://bankeiz.com/%xx"
        }) {
            if (!BankeizLaunchUrl.resolve(input, true).equals(home)) {
                throw new AssertionError("The app launcher accepted a URL outside Bankeiz.");
            }
        }
        System.out.println("Bankeiz launcher preserves held-route inputs and rejects foreign origins.");
    }
}
