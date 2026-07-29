const CACHE_NAME = "daily-diamond-v1";

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
        self.clients.claim()
    );
});


self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);

    if (url.origin !== location.origin) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .catch(() => {
                return caches.match(event.request);
            })
    );
});