
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { captureArea } from './capture.js';
import { preprocessAndOCR } from './ocr.js';

const KEYBINDING = 'ocr-shortcut';

export default class ScreenOcrExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        Main.wm.addKeybinding(
            KEYBINDING,
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => {
                this._onShortcutActivated().catch(e => {
                    console.error(`[Screen OCR] ${e.message}`);
                    Main.notifyError('Screen OCR', e.message);
                });
            },
        );

        console.log('[Screen OCR] Extension enabled');
    }

    disable() {
        Main.wm.removeKeybinding(KEYBINDING);
        this._settings = null;
        console.log('[Screen OCR] Extension disabled');
    }

    // ── Main pipeline

    async _onShortcutActivated() {
        // 1. Capture 
        const imagePath = await captureArea();
        if (!imagePath) return; // user cancelled

        try {
            // 2. OCR 
            const lang       = this._settings.get_string('ocr-language');
            const psm        = this._settings.get_int('ocr-psm');
            const preprocess = this._settings.get_boolean('preprocess-enabled');

            const text = await preprocessAndOCR(imagePath, lang, psm, preprocess);

            if (!text) {
                Main.notify('Screen OCR', 'No text detected in selected area.');
                return;
            }

            // 3. Clipboard 
            St.Clipboard.get_default().set_text(
                St.ClipboardType.CLIPBOARD,
                text,
            );

            // 4. Notification 
            const lines   = text.split('\n').length;
            const chars   = text.length;
            const preview = text.length > 80
                ? text.substring(0, 80) + '…'
                : text;
            Main.notify(
                'Screen OCR',
                `Copied ${lines} line(s), ${chars} chars:\n${preview}`,
            );
        } finally {
            // 5. Clean up portal screenshot 
            this._deleteFile(imagePath);
        }
    }

    // ── Helpers s

    _deleteFile(path) {
        try {
            Gio.File.new_for_path(path).delete(null);
        } catch (_) { }
    }
}