#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${1:-https://vrish1234.github.io/Group-of-Sangam/}"
OUT_FILE="${2:-docs/gyan-setu-live-qr.png}"

mkdir -p "$(dirname "$OUT_FILE")"
ENCODED_URL=$(python - <<'PY' "$TARGET_URL"
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=''))
PY
)

QR_API="https://quickchart.io/qr?text=${ENCODED_URL}&size=512&margin=2&ecLevel=M&format=png"

if curl -fsSL "$QR_API" -o "$OUT_FILE"; then
  echo "QR saved to: $OUT_FILE"
  echo "Target URL: $TARGET_URL"
else
  echo "Could not download QR image (network restriction)."
  echo "Use this URL in any browser to download QR manually:"
  echo "$QR_API"
fi
