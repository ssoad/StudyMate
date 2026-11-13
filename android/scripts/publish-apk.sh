#!/usr/bin/env bash
# Builds the signed release APK and publishes it to the StudyMate server's
# download area (served at /downloads/studymate.apk and /downloads/android.json).
#
#   STUDYMATE_HOST=ssoad@10.0.0.206 ./scripts/publish-apk.sh
set -euo pipefail

ANDROID_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${STUDYMATE_HOST:-ssoad@10.0.0.206}"
REMOTE_DIR="${STUDYMATE_REMOTE_DIR:-study-mate/storage/downloads}"
cd "$ANDROID_DIR"

[[ -f keystore.properties ]] || { echo "keystore.properties missing: run scripts/create-release-key.sh first"; exit 1; }

./gradlew -q :app:assembleRelease
APK="app/build/outputs/apk/release/app-release.apk"
[[ -f "$APK" ]] || { echo "Release APK not found at $APK"; exit 1; }

# Refuse to publish an APK signed with a debug certificate.
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
APKSIGNER="$(ls -d "$SDK"/build-tools/*/apksigner 2>/dev/null | sort -V | tail -1)"
CERT="$("$APKSIGNER" verify --print-certs "$APK" | grep -m1 'certificate DN')"
echo "Signed by: $CERT"
if grep -qi "Android Debug" <<<"$CERT"; then echo "APK is debug-signed; not publishing."; exit 1; fi

VERSION_NAME="$(sed -n 's/.*versionName = "\(.*\)".*/\1/p' app/build.gradle.kts)"
VERSION_CODE="$(sed -n 's/.*versionCode = \([0-9]*\).*/\1/p' app/build.gradle.kts)"
SIZE="$(stat -f%z "$APK" 2>/dev/null || stat -c%s "$APK")"
SHA="$(shasum -a 256 "$APK" | cut -d' ' -f1)"
META="$(mktemp)"
cat > "$META" <<JSON
{"versionName":"$VERSION_NAME","versionCode":$VERSION_CODE,"sizeBytes":$SIZE,"sha256":"$SHA","updatedAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
JSON

ssh "$HOST" "mkdir -p $REMOTE_DIR"
# Upload under temporary names, then swap into place so downloads never see a half-written file.
scp -q "$APK" "$HOST:$REMOTE_DIR/studymate.apk.tmp"
scp -q "$META" "$HOST:$REMOTE_DIR/android.json.tmp"
ssh "$HOST" "cd $REMOTE_DIR && mv studymate.apk.tmp studymate.apk && mv android.json.tmp android.json"
rm -f "$META"
echo "Published StudyMate $VERSION_NAME ($VERSION_CODE), $SIZE bytes, sha256 $SHA"
