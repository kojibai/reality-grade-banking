#!/usr/bin/env bash
set -euo pipefail

apk=${1:?Provide the signed Bankeiz release APK}
output=${2:?Provide a new directory for the website files}
expected_signer=${3:?Provide the official release certificate SHA-256 fingerprint}
build_tools="${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK}/build-tools/36.0.0"
here=$(cd "$(dirname "$0")" && pwd)

if [[ -e "$output" || -L "$output" ]]; then
    printf '%s\n' 'Use a new directory to stage the Android release.' >&2
    exit 1
fi

staging=$(mktemp -d "${output}.XXXXXX")
trap 'rm -rf -- "$staging"' EXIT
mkdir "$staging/.well-known" "$staging/downloads"
snapshot="$staging/release.apk"
cp "$apk" "$snapshot"
"$here/assetlinks-from-apk.sh" "$snapshot" > "$staging/.well-known/assetlinks.json"
"$build_tools/aapt2" dump badging "$snapshot" > "$staging/badging.txt"

version=$(python3 - "$staging" "$here/../../package.json" "$expected_signer" <<'PY'
import json
from pathlib import Path
import re
import sys

staging = Path(sys.argv[1])
version = json.loads(Path(sys.argv[2]).read_text())["version"]
expected = sys.argv[3].replace(":", "").lower()
statement, = json.loads((staging / ".well-known/assetlinks.json").read_text())
actual, = statement["target"]["sha256_cert_fingerprints"]
if not re.fullmatch(r"[0-9a-f]{64}", expected) or actual.replace(":", "").lower() != expected:
    raise SystemExit("The APK signer does not match the official Bankeiz release certificate.")

badging = (staging / "badging.txt").read_text()
if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version):
    raise SystemExit("The Bankeiz release version must have three numeric parts.")
major, minor, patch = map(int, version.split("."))
match = re.search(r"^package: .* versionCode='([0-9]+)' versionName='([^']+)'", badging, re.M)
if not match or match.groups() != (str(major * 10_000 + minor * 100 + patch), version):
    raise SystemExit("The APK version does not match this Bankeiz release.")
if re.search(r"^application-debuggable\b", badging, re.M):
    raise SystemExit("The Android release APK must have debugging disabled.")
print(version)
PY
)

filename="Bankeiz-$version.apk"
mv "$snapshot" "$staging/downloads/$filename"
rm "$staging/badging.txt"
(
    cd "$staging/downloads"
    shasum -a 256 "$filename" > SHA256SUMS
    python3 - "$version" "$filename" <<'PYTHON'
import json
from pathlib import Path
import sys

version, filename = sys.argv[1:]
manifest = {
    "schema": "bankeiz.android-release.v1",
    "version": version,
    "apkPath": "/downloads/" + filename,
    "sha256": Path("SHA256SUMS").read_text().split()[0],
    "bytes": Path(filename).stat().st_size,
}
Path("android-release.json").write_text(json.dumps(manifest, indent=2) + "\n")
PYTHON
)
mv -n "$staging" "$output"
