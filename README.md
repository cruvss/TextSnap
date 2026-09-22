# TextSnap

TextSnap is a high-performance, native GNOME Shell extension for instant screen text extraction (OCR), inspired by Microsoft PowerToys Text Extractor.

It integrates directly into GNOME Shell on Wayland, using GNOME's native area selection tool to crop and extract text straight to your clipboard.

---

## Features

- **Native GNOME Selection UI**: Leverages GNOME's built-in interactive area selector with corner/edge drag handles, magnifying loupe, and window snapping.
- **Silent & In-Memory Capture**: Captures screen buffers directly through the compositor into memory (`tmpfs`). Bypasses shutter audio, screen flashes, GNOME screenshot notifications, and image saves to `~/Pictures/Screenshots`.
- **Intelligent OCR Preprocessing**:
  - Automatically detects dark backgrounds (terminals, dark-mode editors) and inverts them to high-contrast black-on-white text.
  - 2× bilinear upscaling and grayscale conversion for optimal Tesseract recognition.
  - Automatic fallback to sparse/automatic page segmentation mode if initial recognition is empty.
- **Instant Clipboard Copy**: Automatically copies pure extracted text to the system clipboard and displays a notification with character and line counts.
- **Modern Libadwaita Preferences**: Full GUI settings dialog to customize shortcuts, Tesseract languages (including multilingual like `eng+fra`), Page Segmentation Modes (PSM), and preprocessing toggles.

---

## Compatibility & Requirements

- **Desktop**: GNOME Shell 45, 46, 47, 48, 49, and 50 (Wayland & X11)
- **OS**: Fedora Linux (tested on Fedora 44 with GNOME 50), Ubuntu, Arch Linux, and other modern distributions.
- **Dependencies**:
  - `tesseract` and language packs (e.g., `tesseract-langpack-eng`)
  - `glib2-devel` (for `glib-compile-schemas`)

---

## Installation

### Automated Setup (Fedora)

Clone the repository and run the setup script:

```bash
git clone https://github.com/cruvss/TextSnap-for-GNOME.git
cd TextSnap-for-GNOME
chmod +x setup.sh
./setup.sh
```

The script automatically installs required dependencies via `dnf`, installs the extension to `~/.local/share/gnome-shell/extensions/textsnap@cruvss.github.io`, compiles GSettings schemas, and enables the extension.

### Other Linux Distributions

1. **Install Tesseract and GLib development tools**:
   - **Ubuntu/Debian**:
     ```bash
     sudo apt install tesseract-ocr tesseract-ocr-eng libglib2.0-bin
     ```
   - **Arch Linux**:
     ```bash
     sudo pacman -S tesseract tesseract-data-eng glib2
     ```
2. **Install the extension**:
   ```bash
   mkdir -p ~/.local/share/gnome-shell/extensions/textsnap@cruvss.github.io/schemas
   cp metadata.json extension.js capture.js ocr.js prefs.js ~/.local/share/gnome-shell/extensions/textsnap@cruvss.github.io/
   cp schemas/*.xml ~/.local/share/gnome-shell/extensions/textsnap@cruvss.github.io/schemas/
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/textsnap@cruvss.github.io/schemas/
   gnome-extensions enable textsnap@cruvss.github.io
   ```

3. **Restart GNOME Shell**:
   - On **Wayland**: Log out and log back in.
   - On **X11**: Press `Alt + F2`, type `r`, and press `Enter`.

---

## Usage

1. Press <kbd>Super</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> (or your custom shortcut).
2. The native GNOME screenshot selector appears:
   - Drag to select any text area.
   - Use the corner and edge handles to adjust the selection.
   - Use the magnifying loupe for pixel-precise alignment.
3. Press <kbd>Enter</kbd> or click the capture button.
4. The extracted text is instantly copied to your clipboard, and a notification preview appears.

---

## Configuration

Open **GNOME Extensions** (or **Extension Manager**) and click the settings button next to **TextSnap**:

| Setting | Description | Default |
| :--- | :--- | :--- |
| **OCR Shortcut** | Global key combination to trigger text capture. | `Super+Shift+T` |
| **Language** | Tesseract language code (e.g., `eng`, `deu`, `fra`, `spa`, `jpn`). Supports combining languages with `+` (e.g., `eng+deu`). | `eng` |
| **Page Segmentation** | Tesseract layout analysis mode (PSM 3 = Automatic, 6 = Single uniform block, 11 = Sparse text, 13 = Single line). | `6` |
| **Image Preprocessing** | Enables 2× bilinear scaling, grayscale conversion, and automatic dark-mode inversion. | `true` |

### Installing Additional Language Packs

To extract text in other languages, install the corresponding Tesseract language pack:

- **Fedora**:
  ```bash
  sudo dnf install tesseract-langpack-<lang_code>
  # Example: sudo dnf install tesseract-langpack-deu tesseract-langpack-fra
  ```
- **Ubuntu/Debian**:
  ```bash
  sudo apt install tesseract-ocr-<lang_code>
  # Example: sudo apt install tesseract-ocr-deu tesseract-ocr-fra
  ```
- **Arch Linux**:
  ```bash
  sudo pacman -S tesseract-data-<lang_code>
  ```

---

## Future Updates

- **Instant Capture on Selection Release**: Option to automatically extract text upon releasing the mouse drag without having to press Enter or click the capture button.
- **Enhanced OCR Engine**: Integration options for higher-accuracy models and alternative local neural OCR engines (such as PaddleOCR or fine-tuned Tesseract LSTM models).
- **Text Extraction History**: A panel menu dropdown to browse and copy previously extracted snippets.
- **Barcode & QR Code Recognition**: Automatic detection and decoding of QR codes and barcodes with instant URL actions.
- **Table & Multi-column Layout Preservation**: Improved whitespace retention to preserve tabular formatting in terminal and spreadsheet captures.
- **On-screen Translation**: Quick-translate option for captured foreign-language text before copying.

---

## Project Structure

```
.
├── capture.js      # Native GNOME screenshotUI interception & compositor capture
├── extension.js    # Extension entry point, global shortcut, clipboard & notifications
├── ocr.js          # Image preprocessing (inversion, scaling) and async Tesseract OCR
├── prefs.js        # Libadwaita-based preferences window
├── metadata.json   # GNOME Shell extension metadata and supported versions
├── schemas/        # GSettings schema definition
├── setup.sh        # Dependency installation & deployment script
└── uninstall.sh    # Cleanup and uninstall script
```

---

## Uninstallation

To disable and remove the extension completely:

```bash
chmod +x uninstall.sh
./uninstall.sh
```

Log out and back in to finalize removal.

