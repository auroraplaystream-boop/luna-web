importScripts('./p2p/sw.min.js');

self.addEventListener('push', event => {
    let payload = {};
    try {
        payload = event.data ? event.data.json() : {};
    } catch {
        payload = { title: 'Novo lançamento no Luna' };
    }

    event.waitUntil(self.registration.showNotification(payload.title || 'Novo lançamento no Luna', {
        body: payload.body || 'Um título da sua lista estreou hoje.',
        icon: payload.icon || new URL('luna-icon-192.png', self.registration.scope).href,
        badge: payload.badge || new URL('luna-icon-192.png', self.registration.scope).href,
        tag: payload.tag || 'luna-release',
        data: { url: payload.url || self.registration.scope },
    }));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const target = new URL(event.notification.data?.url || self.registration.scope);
    if (target.origin !== self.location.origin) target.href = self.registration.scope;

    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        const existing = clients.find(client => new URL(client.url).origin === self.location.origin);
        if (existing) return existing.focus();
        return self.clients.openWindow(target.href);
    }));
});
