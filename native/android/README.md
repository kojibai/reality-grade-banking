# Bankeiz for Android

The app opens the Bankeiz wallet, assets, market, ledger, and public pages in a Trusted Web Activity when Android has verified the website association. The launcher opens the same Bankeiz URL in the browser while that association is unavailable. The adaptive launcher icon generates its mark from the canonical Bankeiz artwork and supports monochrome themed icons. The browser keeps custody of the Bankeiz origin and its held state. Bankeiz uses its existing account entry, Identity Record, service worker, proof verification, and offline payment flows.

The same APK includes the native Keystore code and the **Check this device** launcher shortcut. The check uses a dedicated one-use test key and can export its original attestation for verification. See [Android custody diagnostic](../android-custody-probe/README.md) for the device steps and the difference between an observed result and an admitted custody proof. Ordinary Bankeiz remains available on Android 8 or later. Android 12 or later is required for the native single-use test.

## Build the preview

Use JDK 17, Gradle 8.14.3, Android SDK platform 36, and build-tools 36.0.0. Set `ANDROID_HOME` to the SDK path.

```sh
gradle -p native/android --no-daemon :app:assembleDebug
"$ANDROID_HOME/platform-tools/adb" install native/android/app/build/outputs/apk/debug/app-debug.apk
```

The preview uses `com.kojibai.bankeiz.preview` and opens Bankeiz in a browser Custom Tab until a matching release identity is verified. Install the preview on a physical device and verify existing identity entry, held views after a cold offline start, and the native hardware check inside the same install.

## Release build and direct distribution

Install the Bankeiz Node dependencies so the release build can run the frozen account-entry check. Supply the persistent private release keystore through `BANKEIZ_ANDROID_KEYSTORE`, `BANKEIZ_ANDROID_KEY_ALIAS`, `BANKEIZ_ANDROID_STORE_PASSWORD`, and `BANKEIZ_ANDROID_KEY_PASSWORD`. Keep those values in the build environment.

```sh
gradle -p native/android --no-daemon :app:assembleRelease
native/android/stage-release.sh \
  native/android/app/build/outputs/apk/release/app-release.apk \
  /tmp/bankeiz-android-site \
  "$BANKEIZ_ANDROID_RELEASE_CERT_SHA256"
```

Set `BANKEIZ_ANDROID_RELEASE_CERT_SHA256` from the independently recorded fingerprint of the persistent signing certificate. Staging verifies the signed APK, its version and package identity, and the fingerprint before producing the versioned download, its SHA-256 checksum, the Android download manifest, and `.well-known/assetlinks.json`. After device verification, serve the staged download from Bankeiz and merge the generated statement into the site's existing Digital Asset Links, if any. Use the same app identity and signing key for updates.

Enrollment retains the exact challenge and hardware choice before asking Android Keystore to create the key. Reopening checks the original attested certificate and preserves the key alias. The native signer retains the exact operation digest before invoking Android Keystore. It saves the signature before returning it, and retries of the same operation read the saved signature. An interruption before the signature is saved leaves the attempt pending.

The Android Offline Cash candidate uses separate hardware keys for receiving and spending. Receiz verifies the enrollment and binds each one-use signature to the exact Wallet operation. The signed APK and Bankeiz website must both carry the matching Digital Asset Links association for the native message channel. Before enabling Android custody, run offline send, receive, resend and restore on supported devices and verify connection-required behavior on unsupported devices. The native diagnostic uses its own test key and synthetic test payloads.
