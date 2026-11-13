#!/usr/bin/env bash
# Creates the StudyMate release signing key and android/keystore.properties.
# The password is typed here and never printed. BACK UP the .jks file and the
# password: without them you can never publish an update to installed apps.
set -euo pipefail

ANDROID_DIR="$(cd "$(dirname "$0")/.." && pwd)"
KEY_DIR="${STUDYMATE_KEY_DIR:-$HOME/.studymate-keys}"
KEYSTORE="$KEY_DIR/studymate-release.jks"
ALIAS="studymate"
PROPS="$ANDROID_DIR/keystore.properties"

if [[ -f "$KEYSTORE" ]]; then
  echo "A keystore already exists at $KEYSTORE — not overwriting it."
  exit 1
fi

read -r -s -p "Choose a keystore password (min 6 chars): " PW; echo
read -r -s -p "Repeat it: " PW2; echo
if [[ "$PW" != "$PW2" || ${#PW} -lt 6 ]]; then
  echo "Passwords don't match or are too short."; exit 1
fi

mkdir -p "$KEY_DIR"; chmod 700 "$KEY_DIR"
export PW
keytool -genkeypair -v -keystore "$KEYSTORE" -alias "$ALIAS" \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=StudyMate, O=StudyMate" \
  -storepass:env PW -keypass:env PW >/dev/null 2>&1 || {
    # Older keytool without :env support
    keytool -genkeypair -keystore "$KEYSTORE" -alias "$ALIAS" -keyalg RSA -keysize 4096 \
      -validity 10000 -dname "CN=StudyMate, O=StudyMate" -storepass "$PW" -keypass "$PW" >/dev/null
  }
chmod 600 "$KEYSTORE"

umask 077
cat > "$PROPS" <<PROPS
storeFile=$KEYSTORE
storePassword=$PW
keyAlias=$ALIAS
keyPassword=$PW
PROPS
unset PW PW2

echo "Created $KEYSTORE"
echo "Wrote $PROPS (gitignored)"
echo "Back up both the .jks file and your password somewhere safe now."
