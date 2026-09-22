import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { ExtensionPreferences, gettext as _ }
    from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

function isModifierOnly(keyval) {
    return [
        Gtk.accelerator_parse('Shift_L')[0],
        Gtk.accelerator_parse('Shift_R')[0],
        Gtk.accelerator_parse('Control_L')[0],
        Gtk.accelerator_parse('Control_R')[0],
        Gtk.accelerator_parse('Alt_L')[0],
        Gtk.accelerator_parse('Alt_R')[0],
        Gtk.accelerator_parse('Super_L')[0],
        Gtk.accelerator_parse('Super_R')[0],
        Gtk.accelerator_parse('Meta_L')[0],
        Gtk.accelerator_parse('Meta_R')[0],
    ].includes(keyval);
}

export default class TextSnapPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('TextSnap'),
            icon_name: 'document-edit-symbolic',
        });
        window.add(page);

        const shortcutGroup = new Adw.PreferencesGroup({
            title: _('Keyboard Shortcut'),
        });
        page.add(shortcutGroup);

        const currentAccel = settings.get_strv('ocr-shortcut');
        const shortcutRow = new Adw.ActionRow({
            title: _('OCR Shortcut'),
            subtitle: _('Press the button then type a new shortcut'),
        });

        const shortcutLabel = new Gtk.ShortcutLabel({
            accelerator: currentAccel.length > 0 ? currentAccel[0] : '',
            disabled_text: _('Not set'),
            valign: Gtk.Align.CENTER,
        });

        const editButton = Gtk.Button.new_from_icon_name('document-edit-symbolic');
        editButton.valign = Gtk.Align.CENTER;
        editButton.add_css_class('flat');
        editButton.connect('clicked', () => {
            this._captureShortcut(window, settings, shortcutLabel);
        });

        shortcutRow.add_suffix(shortcutLabel);
        shortcutRow.add_suffix(editButton);
        shortcutGroup.add(shortcutRow);

        const ocrGroup = new Adw.PreferencesGroup({
            title: _('OCR Settings'),
            description: _('Configure the Tesseract OCR engine'),
        });
        page.add(ocrGroup);

        const langRow = new Adw.EntryRow({
            title: _('Language'),
            text: settings.get_string('ocr-language'),
            show_apply_button: true,
        });
        langRow.connect('apply', () => {
            settings.set_string('ocr-language', langRow.get_text());
        });
        ocrGroup.add(langRow);

        const psmModel = new Gtk.StringList();
        const psmValues = [
            { value: 3,  label: '3 — Fully automatic' },
            { value: 6,  label: '6 — Single uniform block' },
            { value: 11, label: '11 — Sparse text' },
            { value: 13, label: '13 — Single line' },
        ];
        psmValues.forEach(p => psmModel.append(p.label));

        const currentPsm = settings.get_int('ocr-psm');
        const psmIndex = psmValues.findIndex(p => p.value === currentPsm);

        const psmRow = new Adw.ComboRow({
            title: _('Page Segmentation'),
            subtitle: _('How Tesseract analyses the text layout'),
            model: psmModel,
            selected: psmIndex >= 0 ? psmIndex : 1,
        });
        psmRow.connect('notify::selected', () => {
            settings.set_int('ocr-psm', psmValues[psmRow.selected].value);
        });
        ocrGroup.add(psmRow);

        const preprocessRow = new Adw.SwitchRow({
            title: _('Image Preprocessing'),
            subtitle: _('Auto dark-mode inversion, grayscale, 2× upscale'),
        });
        settings.bind(
            'preprocess-enabled',
            preprocessRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT,
        );
        ocrGroup.add(preprocessRow);

        const infoGroup = new Adw.PreferencesGroup({
            title: _('Tips'),
        });
        page.add(infoGroup);

        const infoRow = new Adw.ActionRow({
            title: _('Install additional languages'),
            subtitle: 'sudo dnf install tesseract-langpack-deu tesseract-langpack-fra …',
        });
        infoRow.add_suffix(new Gtk.Image({
            icon_name: 'dialog-information-symbolic',
            valign: Gtk.Align.CENTER,
        }));
        infoGroup.add(infoRow);
    }

    _captureShortcut(parentWindow, settings, shortcutLabel) {
        const dialog = new Adw.AlertDialog({
            heading: _('Set Shortcut'),
            body: _('Press the desired key combination…\nPress Escape to cancel.'),
        });

        dialog.add_response('cancel', _('Cancel'));

        const controller = new Gtk.EventControllerKey();
        let captured = false;

        controller.connect('key-pressed', (_ctrl, keyval, keycode, state) => {
            if (captured) return true;

            if (isModifierOnly(keyval)) return true;

            if (keyval === Gtk.accelerator_parse('Escape')[0]) {
                dialog.close();
                return true;
            }

            const mask = state & Gtk.accelerator_get_default_mod_mask();
            const accel = Gtk.accelerator_name(keyval, mask);

            if (accel) {
                captured = true;
                settings.set_strv('ocr-shortcut', [accel]);
                shortcutLabel.set_accelerator(accel);
                dialog.close();
            }

            return true;
        });

        dialog.choose(parentWindow, null, () => {});
        parentWindow.add_controller(controller);

        setTimeout(() => {
            try { parentWindow.remove_controller(controller); } catch (_) {}
        }, 500);
    }
}
