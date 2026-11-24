# Android custody diagnostic

This app tests a dedicated Android Keystore P-256 key with a one-use limit. It uses synthetic test payloads and creates no Bankeiz account, payment, custody certificate, or release signing key.

## Build and run

Install a JDK 17 or newer and Android SDK platform 36, build-tools 36.0.0, and platform-tools. Set `ANDROID_HOME` to that SDK.

```sh
native/android-custody-probe/build-probe.sh /tmp/bankeiz-android-apk
"$ANDROID_HOME/platform-tools/adb" install /tmp/bankeiz-android-apk/bankeiz-android-custody-test.apk
```

Open Bankeiz Custody Test on a physical Android 12 or later phone. Enroll a test key while connected. The app reads the signed KeyDescription fields and shows the reported hardware use limit separately from the rollback-resistance flag. Turn on airplane mode and switch off Wi-Fi, then sign once. Force-stop and reopen the app while still offline. Check the saved pre-payment snapshot, which tries to sign a different recipient using the same key. Share the diagnostic evidence through a trusted channel and check that it contains the original attestation chain, enrollment challenge, and first signed test payload.

## Evidence required for production

The diagnostic decodes attestation fields for display. Release qualification must independently validate the device’s certificate chain, signer and application binding, challenge, hardware-enforced constraints, and verified boot. An unavailable key after a single sign establishes only the observed behavior for that test. Hardware-enforced consumption, replay refusal, and interrupted-write recovery must be qualified under the exact Receiz custody contract.

Receiz SDK 129.5.0 currently admits WebAuthn evidence through its attested receiving custody verifier. The Android path needs an SDK adapter that verifies native evidence and binds each irreversible consumption to the existing source, recipient, and successor. It must use the existing preparation and continuation rules for financed value and preserve the original proof across process restart. Repeated offline sends require a verified supply of receiving custody keys that is available while disconnected. The adapter must account for fresh commitments, interrupted receipt retention, and retry without reusing a consumed input.

The device test for release uses supported phones, no internet, test balances, the actual Bankeiz payment entry point, and canonical Receiz proofs. Complete send → receive → send again, reopen the successor, restore an older application wallet snapshot, and verify that it cannot spend the same input again. Repeat with a browser-unqualified Android phone that passes native qualification and a phone that fails the native check. The diagnostic APK has a separate test application identity and a local signing key. The publishable APK needs its own release identity and signing pipeline.
