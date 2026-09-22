import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { captureArea } from './capture.js';
import { preprocessAndOCR } from './ocr.js';

const KEYBINDING = 'ocr-shortcut';

export default class TextSnapExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        Main.wm.addKeybinding(
            KEYBINDING,
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => {
                this._onShortcutActivated().catch(e => {
                    console.error(`[TextSnap] ${e.message}`);
                    Main.notifyError('TextSnap', e.message);
                });
            },
        );

        console.log('[TextSnap] Extension enabled');
    }

    disable() {
        Main.wm.removeKeybinding(KEYBINDING);
        this._settings = null;
        console.log('[TextSnap] Extension disabled');
    }

    async _onShortcutActivated() {
        const imagePath = await captureArea();
        if (!imagePath) return;

        try {
            const lang       = this._settings.get_string('ocr-language');
            const psm        = this._settings.get_int('ocr-psm');
            const preprocess = this._settings.get_boolean('preprocess-enabled');

            const text = await preprocessAndOCR(imagePath, lang, psm, preprocess);

            if (!text) {
                Main.notify('TextSnap', 'No text detected in selected area.');
                return;
            }

            St.Clipboard.get_default().set_text(
                St.ClipboardType.CLIPBOARD,
                text,
            );

            const lines   = text.split('\n').length;
            const chars   = text.length;
            const preview = text.length > 80
                ? text.substring(0, 80) + '…'
                : text;
            Main.notify(
                'TextSnap',
                `Copied ${lines} line(s), ${chars} chars:\n${preview}`,
            );
        } finally {
            this._deleteFile(imagePath);
        }
    }

    _deleteFile(path) {
        try {
            Gio.File.new_for_path(path).delete(null);
        } catch (_) { }
    }
}