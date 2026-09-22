#!/bin/bash
set -euo pipefail

EXT_UUID="textsnap@cruvss.github.io"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DEST_DIR="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"

if ! command -v tesseract &>/dev/null; then
    echo "Installing dependencies..."
    sudo dnf install -y tesseract tesseract-langpack-eng glib2-devel
fi

echo "Installing extension to $EXT_DEST_DIR..."
mkdir -p "$EXT_DEST_DIR/schemas"

cp "$REPO_DIR/metadata.json" "$EXT_DEST_DIR/"
cp "$REPO_DIR/extension.js" "$EXT_DEST_DIR/"
cp "$REPO_DIR/capture.js" "$EXT_DEST_DIR/"
cp "$REPO_DIR/ocr.js" "$EXT_DEST_DIR/"
cp "$REPO_DIR/prefs.js" "$EXT_DEST_DIR/"
cp "$REPO_DIR/schemas/"*.xml "$EXT_DEST_DIR/schemas/"

echo "Compiling schemas..."
glib-compile-schemas "$EXT_DEST_DIR/schemas/"

echo "Enabling extension..."
gnome-extensions enable "$EXT_UUID" 2>/dev/null || true

echo "Done! Please log out and back in to load the extension."
