const CACHE_NAME = "daily-diamond-v3.5";

const STATIC_FILES = [
    "./icon-192.png",
    "./icon-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_FILES))
    );

    self.skipWaiting();
});


self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});


self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);

    // Ignore external requests (Supabase, AdSense, MLB API, etc.)
    if (url.origin !== location.origin) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .catch(() => caches.match(event.request))
    );
});



self.addEventListener("push", event => {

    const data = event.data.json();


    const options = {

        body: data.body,

        icon: "./icon-192.png",

        badge: "./icon-192.png",

        data: {
            url: "./"
        }

    };


    event.waitUntil(

        self.registration.showNotification(
            data.title,
            options
        )

    );

});



self.addEventListener("notificationclick", event => {

    event.notification.close();


    event.waitUntil(

        clients.openWindow(
            event.notification.data.url
        )

    );

});