#!/usr/bin/env bash
set -euo pipefail

# Signed + notarized macOS release. Requires Xcode CLI tools and a paid Apple Developer account.
#
# Code signing (pick one):
#   • CSC_NAME="Developer ID Application: Your Name (XXXXXXXXXX)"  — certificate in login keychain
#   • CSC_LINK=/path/to/cert.p12  and  CSC_KEY_PASSWORD=…
#
# Notarization (pick one; App Store Connect API key is recommended):
#   • APPLE_API_KEY=/path/to/AuthKey_XXXXXX.p8  APPLE_API_KEY_ID=…  APPLE_API_ISSUER=uuid
#   • APPLE_ID=…  APPLE_APP_SPECIFIC_PASSWORD=…  APPLE_TEAM_ID=…
#   • APPLE_KEYCHAIN_PROFILE=notarytool-profile  [APPLE_KEYCHAIN=…]

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

err() { printf '%s\n' "$*" >&2; }

if [[ "$(uname -s)" != "Darwin" ]]; then
  err "Run this script on macOS."
  exit 1
fi

if ! xcode-select -p &>/dev/null; then
  err "Install Xcode Command Line Tools: xcode-select --install"
  exit 1
fi

if [[ -z "${CSC_NAME:-}" && -z "${CSC_LINK:-}" ]]; then
  err "Set CSC_NAME (e.g. Developer ID Application: …) or CSC_LINK (path to .p12) for code signing."
  exit 1
fi

if [[ -n "${CSC_LINK:-}" && -z "${CSC_KEY_PASSWORD:-}" ]]; then
  err "CSC_LINK is set; also set CSC_KEY_PASSWORD for the .p12 file."
  exit 1
fi

have_api_key=0
if [[ -n "${APPLE_API_KEY:-}" || -n "${APPLE_API_KEY_ID:-}" || -n "${APPLE_API_ISSUER:-}" ]]; then
  have_api_key=1
  if [[ -z "${APPLE_API_KEY:-}" || -z "${APPLE_API_KEY_ID:-}" || -z "${APPLE_API_ISSUER:-}" ]]; then
    err "For API key notarization, set all of: APPLE_API_KEY, APPLE_API_KEY_ID, APPLE_API_ISSUER"
    exit 1
  fi
fi

have_apple_id=0
if [[ -n "${APPLE_ID:-}" || -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" || -n "${APPLE_TEAM_ID:-}" ]]; then
  have_apple_id=1
  if [[ -z "${APPLE_ID:-}" || -z "${APPLE_APP_SPECIFIC_PASSWORD:-}" || -z "${APPLE_TEAM_ID:-}" ]]; then
    err "For Apple ID notarization, set all of: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID"
    exit 1
  fi
fi

have_keychain_profile=0
if [[ -n "${APPLE_KEYCHAIN_PROFILE:-}" ]]; then
  have_keychain_profile=1
fi

if [[ "$have_api_key" -eq 0 && "$have_apple_id" -eq 0 && "$have_keychain_profile" -eq 0 ]]; then
  err "Set notarization credentials (API key, Apple ID + app-specific password, or APPLE_KEYCHAIN_PROFILE)."
  exit 1
fi

npx tsc
npx vite build
npx electron-builder --mac --publish never
