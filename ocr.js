

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';

// Promisify once so we can `await` the subprocess result.
Gio._promisify(
    Gio.Subprocess.prototype,
    'communicate_utf8_async',
    'communicate_utf8_finish',
);

// ── Image preprocessing ────────────────────────────────────────────────

function preprocessImage(inputPath, outputPath) {
    // 1. Load
    let pixbuf = GdkPixbuf.Pixbuf.new_from_file(inputPath);

    // 2. Scale 2× (bilinear is the best quality/speed trade-off)
    const w = pixbuf.get_width();
    const h = pixbuf.get_height();
    pixbuf = pixbuf.scale_simple(w * 2, h * 2, GdkPixbuf.InterpType.BILINEAR);

    // Pixel layout helpers
    const width     = pixbuf.get_width();
    const height    = pixbuf.get_height();
    const rowstride = pixbuf.get_rowstride();
    const nChan     = pixbuf.get_n_channels();
    const pixels    = pixbuf.get_pixels(); // mutable Uint8Array view

    // 3. Calculate mean brightness (BT.601 luminance)
    let totalLum = 0;
    const totalPx = width * height;
    for (let y = 0; y < height; y++) {
        const row = y * rowstride;
        for (let x = 0; x < width; x++) {
            const off = row + x * nChan;
            totalLum += 0.299 * pixels[off] +
                        0.587 * pixels[off + 1] +
                        0.114 * pixels[off + 2];
        }
    }
    const isDark = (totalLum / totalPx) < 128;

    // 4. Convert to grayscale (and invert if dark background)
    for (let y = 0; y < height; y++) {
        const row = y * rowstride;
        for (let x = 0; x < width; x++) {
            const off = row + x * nChan;
            let gray = Math.round(
                0.299 * pixels[off] +
                0.587 * pixels[off + 1] +
                0.114 * pixels[off + 2],
            );
            if (isDark) gray = 255 - gray;
            pixels[off]     = gray;
            pixels[off + 1] = gray;
            pixels[off + 2] = gray;
            // alpha (off+3) left untouched
        }
    }

    // 5. Save
    pixbuf.savev(outputPath, 'png', [], []);
}


async function runTesseract(imagePath, lang = 'eng', psm = 6) {
    const proc = Gio.Subprocess.new(
        ['tesseract', imagePath, 'stdout', '-l', lang, '--psm', String(psm)],
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
    );

    const [, stdout, stderr] = await proc.communicate_utf8_async(null, null);

    if (!proc.get_successful()) {
        const code = proc.get_exit_status();
        throw new Error(`tesseract exited ${code}: ${(stderr || '').trim()}`);
    }

    return stdout || '';
}


function cleanText(raw) {
    return raw
        .split('\n')
        .map(line => line.trimEnd())            // strip trailing whitespace
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')             // collapse 3+ blank lines → 2
        .trim();                                 // strip leading/trailing
}

// ── Public API ─────────────────────────────────────────────────────────


export async function preprocessAndOCR(imagePath, lang, psm, preprocess) {
    let ocrInput = imagePath;
    let tmpFile  = null;

    if (preprocess) {
        tmpFile  = GLib.build_filenamev([
            GLib.get_tmp_dir(),
            `screen-ocr-pre-${GLib.get_monotonic_time()}.png`,
        ]);
        try {
            preprocessImage(imagePath, tmpFile);
            ocrInput = tmpFile;
        } catch (e) {
            console.warn(`[Screen OCR] Preprocessing failed, using raw image: ${e.message}`);
            ocrInput = imagePath;
        }
    }

    try {
        // Try with the configured PSM first
        let text = await runTesseract(ocrInput, lang, psm);
        text = cleanText(text);

        // Fallback: if no text was detected and PSM ≠ 3, retry with auto mode
        if (!text && psm !== 3) {
            console.log('[Screen OCR] No text with configured PSM, retrying with --psm 3');
            text = cleanText(await runTesseract(ocrInput, lang, 3));
        }

        return text;
    } finally {
        // Clean up the preprocessed temp file
        if (tmpFile) {
            try {
                Gio.File.new_for_path(tmpFile).delete(null);
            } catch (_) { /* ignore */ }
        }
    }
}