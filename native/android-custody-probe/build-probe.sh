#!/usr/bin/env bash
set -euo pipefail

project_dir=$(cd -- "$(dirname -- "$0")" && pwd)
sdk_root=${ANDROID_HOME:?Set ANDROID_HOME to an Android SDK with API 36 and build-tools 36.0.0}
build_tools="$sdk_root/build-tools/36.0.0"
android_jar="$sdk_root/platforms/android-36/android.jar"
output_dir=${1:?Supply a directory for the diagnostic APK}
mkdir -p -- "$output_dir"
output_dir=$(cd -- "$output_dir" && pwd)
scratch=$(mktemp -d "$output_dir/.build.XXXXXX")
trap 'rm -rf -- "$scratch"' EXIT

mkdir -- "$scratch/classes" "$scratch/dex"
find "$project_dir/src" -name '*.java' -print0 |
    xargs -0 javac --release 17 -classpath "$android_jar" -d "$scratch/classes"
jar --create --file "$scratch/program.jar" -C "$scratch/classes" .
"$build_tools/d8" --min-api 31 --lib "$android_jar" --output "$scratch/dex" "$scratch/program.jar"
"$build_tools/aapt2" link -I "$android_jar" --manifest "$project_dir/AndroidManifest.xml" -o "$scratch/manifest.apk"
(cd "$scratch/dex" && zip -q "$scratch/manifest.apk" classes.dex)
"$build_tools/zipalign" -f 4 "$scratch/manifest.apk" "$scratch/aligned.apk"

# Keep an install-consistent signing identity for this local diagnostic only.
test_key="$output_dir/diagnostic-signing.p12"
if [[ ! -f "$test_key" ]]; then
    (umask 077; keytool -genkeypair -storetype PKCS12 -keystore "$test_key"         -storepass android -alias diagnostic -keyalg RSA -keysize 2048         -dname 'CN=Bankeiz Custody Diagnostic' -validity 3650)
fi
apk="$output_dir/bankeiz-android-custody-test.apk"
"$build_tools/apksigner" sign --ks "$test_key" --ks-key-alias diagnostic     --ks-pass pass:android --out "$apk" "$scratch/aligned.apk"
"$build_tools/apksigner" verify "$apk"
printf '%s\n' "$apk"
