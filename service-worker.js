const CACHE_NAME = "daily-diamond-v1";

const STATIC_FILES = [
    "/",
    "/index.html",
    "/game.html",
    "/ratings.html",
    "/css/style.css",
    "/js/index.js",
    "/js/game.js",
    "/js/ratings.js",
    "/js/database.js",
    "/js/api.js"
];


self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(STATIC_FILES))
    );
});


self.addEventListener("fetch", event => {
    event.respondWith(
        fetch(event.request)
        .catch(() => caches.match(event.request))
    );
});