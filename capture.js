import Gio from 'gi://Gio';
import GLib from 'gi://GLib';


export function captureArea() {
    return new Promise((resolve, reject) => {
        const connection = Gio.DBus.session;


        const senderName = connection.get_unique_name().substring(1).replaceAll('.', '_');
        const handleToken = `screen_ocr_${Math.floor(Math.random() * 1e8)}`;
        const requestPath =
            `/org/freedesktop/portal/desktop/request/${senderName}/${handleToken}`;

        let signalId = null;
        let timeoutId = null;

        // --- cleanup helper 
        const cleanup = () => {
            if (signalId !== null) {
                connection.signal_unsubscribe(signalId);
                signalId = null;
            }
            if (timeoutId !== null) {
                GLib.source_remove(timeoutId);
                timeoutId = null;
            }
        };

        // --- 1. Subscribe to the Response signal 
        signalId = connection.signal_subscribe(
            'org.freedesktop.portal.Desktop',   // sender
            'org.freedesktop.portal.Request',    // interface
            'Response',                          // signal name
            requestPath,                         // object path
            null,                                // arg0 (unused)
            Gio.DBusSignalFlags.NONE,
            (_conn, _sender, _path, _iface, _signal, params) => {
                cleanup();

                const responseCode = params.get_child_value(0).get_uint32();

                if (responseCode !== 0) {
                    // User cancelled or portal error
                    resolve(null);
                    return;
                }

                // Extract the file URI from the results dict (a{sv})
                const results = params.get_child_value(1);
                const uriVariant = results.lookup_value('uri', null);

                if (!uriVariant) {
                    reject(new Error('Portal response missing URI'));
                    return;
                }

                const uri = uriVariant.deep_unpack();

                try {
                    // Convert file:///… URI to a local path
                    const filePath = GLib.filename_from_uri(uri, null)[0];
                    resolve(filePath);
                } catch (e) {
                    // Fallback: strip the file:// prefix manually
                    resolve(decodeURIComponent(uri.slice(7)));
                }
            },
        );

        // --- 2. Safety timeout (60 s) 
        timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60, () => {
            timeoutId = null;
            cleanup();
            resolve(null); // treat as cancellation
            return GLib.SOURCE_REMOVE;
        });

        // --- 3. Create the portal proxy and call Screenshot 
        try {
            const proxy = Gio.DBusProxy.new_for_bus_sync(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.DO_NOT_AUTO_START,
                null,
                'org.freedesktop.portal.Desktop',
                '/org/freedesktop/portal/desktop',
                'org.freedesktop.portal.Screenshot',
                null,
            );

            const params = new GLib.Variant('(sa{sv})', [
                '', // parent_window (empty for shell extensions)
                {
                    'handle_token': new GLib.Variant('s', handleToken),
                    'interactive':  new GLib.Variant('b', true),
                    'target':       new GLib.Variant('u', 4), // 4 = Area
                },
            ]);

            proxy.call(
                'Screenshot',
                params,
                Gio.DBusCallFlags.NONE,
                -1,   // no call timeout (the user is interacting)
                null,  // no cancellable
                (_proxy, res) => {
                    try {
                        _proxy.call_finish(res);
            
                    } catch (e) {
                        cleanup();
                        reject(e);
                    }
                },
            );
        } catch (e) {
            cleanup();
            reject(e);
        }
    });
}