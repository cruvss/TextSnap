import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';

Gio._promisify(
    Gio.Subprocess.prototype,
    'communicate_utf8_async',
    'communicate_utf8_finish',
);

function preprocessImage(inputPath, outputPath) {
    let pixbuf = GdkPixbuf.Pixbuf.new_from_file(inputPath);

    const w = pixbuf.get_width();
    const h = pixbuf.get_height();
    pixbuf = pixbuf.scale_simple(w * 2, h * 2, GdkPixbuf.InterpType.BILINEAR);

    const width     = pixbuf.get_width();
    const height    = pixbuf.get_height();
    const rowstride = pixbuf.get_rowstride();
    const nChan     = pixbuf.get_n_channels();
    const pixels    = pixbuf.get_pixels();

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
        }
    }

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
        .map(line => line.trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export async function preprocessAndOCR(imagePath, lang, psm, preprocess) {
    let ocrInput = imagePath;
    let tmpFile  = null;

    if (preprocess) {
        tmpFile  = GLib.build_filenamev([
            GLib.get_tmp_dir(),
            `textsnap-pre-${GLib.get_monotonic_time()}.png`,
        ]);
        try {
            preprocessImage(imagePath, tmpFile);
            ocrInput = tmpFile;
        } catch (e) {
            console.warn(`[TextSnap] Preprocessing failed, using raw image: ${e.message}`);
            ocrInput = imagePath;
        }
    }

    try {
        let text = await runTesseract(ocrInput, lang, psm);
        text = cleanText(text);

        if (!text && psm !== 3) {
            console.log('[TextSnap] No text with configured PSM, retrying with --psm 3');
            text = cleanText(await runTesseract(ocrInput, lang, 3));
        }

        return text;
    } finally {
        if (tmpFile) {
            try {
                Gio.File.new_for_path(tmpFile).delete(null);
            } catch (_) { }
        }
    }
}