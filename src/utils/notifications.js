export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notification');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

export function sendNotification(title, options = {}) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        const defaultOptions = {
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            ...options
        };

        // Check if service worker is active for mobile PWA notifications
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, defaultOptions);
            });
        } else {
            new Notification(title, defaultOptions);
        }
    }
}
