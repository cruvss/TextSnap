#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

OUTPUT_NAME="textsnap@cruvss.github.io.shell-extension.zip"

echo "Packaging TextSnap for publication..."
gnome-extensions pack \
    --extra-source=capture.js \
    --extra-source=ocr.js \
    --force

echo "Successfully created: $REPO_DIR/$OUTPUT_NAME"
echo ""
echo "Archive contents:"
unzip -l "$OUTPUT_NAME"
