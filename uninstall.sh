#!/bin/bash
set -euo pipefail

EXT_UUID="textsnap@cruvss.github.io"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"

gnome-extensions disable "$EXT_UUID" 2>/dev/null || true

if [ -d "$EXT_DIR" ]; then
    rm -rf "$EXT_DIR"
fi

echo "Extension uninstalled. Please log out and back in."
