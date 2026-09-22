import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export function captureArea() {
    return new Promise((resolve, reject) => {
        const connection = Gio.DBus.session;

        const senderName = connection.get_unique_name().substring(1).replaceAll('.', '_');
        const handleToken = `textsnap_${Math.floor(Math.random() * 1e8)}`;
        const requestPath = `/org/freedesktop/portal/desktop/request/${senderName}/${handleToken}`;

        let signalId = null;
        let timeoutId = null;

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

        signalId = connection.signal_subscribe(
            'org.freedesktop.portal.Desktop',
            'org.freedesktop.portal.Request',
            'Response',
            requestPath,
            null,
            Gio.DBusSignalFlags.NONE,
            (_conn, _sender, _path, _iface, _signal, params) => {
                cleanup();

                const responseCode = params.get_child_value(0).get_uint32();

                if (responseCode !== 0) {
                    resolve(null);
                    return;
                }

                const results = params.get_child_value(1);
                const uriVariant = results.lookup_value('uri', null);

                if (!uriVariant) {
                    reject(new Error('Portal response missing URI'));
                    return;
                }

                const uri = uriVariant.deep_unpack();

                try {
                    const filePath = GLib.filename_from_uri(uri, null)[0];
                    resolve(filePath);
                } catch (e) {
                    resolve(decodeURIComponent(uri.slice(7)));
                }
            },
        );

        timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60, () => {
            timeoutId = null;
            cleanup();
            resolve(null);
            return GLib.SOURCE_REMOVE;
        });

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
                '',
                {
                    'handle_token': new GLib.Variant('s', handleToken),
                    'interactive':  new GLib.Variant('b', true),
                    'target':       new GLib.Variant('u', 4),
                },
            ]);

            proxy.call(
                'Screenshot',
                params,
                Gio.DBusCallFlags.NONE,
                -1,
                null,
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