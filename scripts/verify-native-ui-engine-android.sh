#!/bin/sh
# JDK 21 and Android SDK 36. Optional first argument selects a running emulator.
set -eu
repo=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
plugin="$repo/packages/capacitor-native-ui/android"
"$plugin/gradlew" -p "$plugin" :testDebugUnitTest :assembleRelease
if [ "${1:-}" ]; then
  export ANDROID_SERIAL="$1"
  "$plugin/gradlew" -p "$plugin" -PnativeUIEngineIntegrationTest :connectedDebugAndroidTest
fi
