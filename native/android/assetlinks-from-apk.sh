#!/usr/bin/env bash
set -euo pipefail

apk=${1:?Provide the signed Bankeiz release APK}
sdk_root=${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK}
build_tools="$sdk_root/build-tools/36.0.0"

package=$("$build_tools/aapt2" dump packagename "$apk")
if [[ "$package" != com.kojibai.bankeiz ]]; then
    printf '%s\n' 'Digital Asset Links require the Bankeiz release package.' >&2
    exit 1
fi
certificate=$("$build_tools/apksigner" verify --print-certs "$apk")

python3 - "$package" "$certificate" <<'PY'
import json
import re
import sys

package, certificate = sys.argv[1:]
fingerprints = re.findall(r"^Signer #\d+ certificate SHA-256 digest: ([a-fA-F0-9]{64})$", certificate, re.M)
if len(fingerprints) != 1:
    raise SystemExit("Expected one verified release signer.")
fingerprint = fingerprints[0].upper()
print(json.dumps([{
    "relation": ["delegate_permission/common.handle_all_urls", "delegate_permission/common.use_as_origin"],
    "target": {
        "namespace": "android_app",
        "package_name": package,
        "sha256_cert_fingerprints": [":".join(fingerprint[i:i + 2] for i in range(0, 64, 2))],
    },
}], indent=2))
PY
