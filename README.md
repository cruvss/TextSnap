# TextSnap

TextSnap is a native GNOME Shell extension for extracting text from screen selections using Tesseract OCR, inspired by Microsoft PowerToys Text Extractor.

## Requirements

- GNOME Shell 45 to 50 on Wayland
- Tesseract OCR (`tesseract` CLI)

## Installation

```bash
chmod +x setup.sh
./setup.sh
```

Log out and back into GNOME to activate the extension.

## Usage

1. Press `Super+Shift+T`.
2. Select a screen region.
3. Text is copied to the system clipboard and a notification appears.

## Configuration

Open the GNOME Extensions application and click the settings button for TextSnap.

- Shortcut: Change keybinding
- Language: Tesseract language code (e.g., `eng`, `deu`, `fra`, `eng+deu`)
- Page Segmentation: Tesseract layout analysis mode (default: `6`)
- Image Preprocessing: Grayscale, dark mode auto-inversion, and 2x scaling

## Uninstallation

```bash
chmod +x uninstall.sh
./uninstall.sh
```
