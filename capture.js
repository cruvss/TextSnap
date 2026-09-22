import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export function captureArea() {
    return new Promise(resolve => {
        const ui = Main.screenshotUI;
        if (!ui || ui._opened) {
            resolve(null);
            return;
        }

        const origSaveScreenshot = ui._saveScreenshot;
        let closedId = 0;
        let captured = false;

        const cleanup = () => {
            if (closedId && ui) {
                ui.disconnect(closedId);
                closedId = 0;
            }
            if (origSaveScreenshot && ui) {
                ui._saveScreenshot = origSaveScreenshot;
            }
        };

        closedId = ui.connect('closed', () => {
            cleanup();
            if (!captured) {
                resolve(null);
            }
        });

        ui._saveScreenshot = async function() {
            captured = true;
            cleanup();

            let targetPath = null;
            try {
                const content = this._stageScreenshot.get_content();
                if (content) {
                    const texture = content.get_texture();
                    const geometry = this._getSelectedGeometry(true);
                    const [x, y, w, h] = geometry ?? [0, 0, -1, -1];

                    targetPath = GLib.build_filenamev([
                        GLib.get_user_runtime_dir(),
                        `textsnap-cap-${GLib.get_monotonic_time()}.png`,
                    ]);

                    const file = Gio.File.new_for_path(targetPath);
                    const stream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);

                    await Shell.Screenshot.composite_to_stream(
                        texture,
                        x, y, w, h,
                        this._scale,
                        null, 0, 0, 1,
                        stream
                    );
                    stream.close(null);
                }
            } catch (e) {
                console.error(`[TextSnap] Capture failed: ${e.message}`);
                targetPath = null;
            }

            this.close();
            resolve(targetPath);
        };

        ui.open().catch(err => {
            cleanup();
            console.error(`[TextSnap] Failed to open screenshot UI: ${err.message}`);
            resolve(null);
        });
    });
}