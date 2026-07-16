/* Split It service worker — lets the app open with no connection */
var CACHE = 'splitit-v4';
var PRECACHE = [
  './',
  './index.html',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return Promise.all(PRECACHE.map(function(u){ return c.add(u).catch(function(){}); })); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){ return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  var url = e.request.url;

  // live data (Firestore, exchange rate): network only — the app has its own fallbacks
  if (url.indexOf('googleapis.com') !== -1 || url.indexOf('open.er-api.com') !== -1) return;

  // Firebase SDK: cache-first (it's versioned, never changes)
  if (url.indexOf('gstatic.com') !== -1) {
    e.respondWith(
      caches.match(e.request).then(function(hit){
        return hit || fetch(e.request).then(function(res){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
          return res;
        });
      })
    );
    return;
  }

  // the app page: network-first (so updates arrive), cached copy when offline
  e.respondWith(
    fetch(e.request).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
      return res;
    }).catch(function(){
      return caches.match(e.request).then(function(hit){
        return hit || caches.match('./index.html');
      });
    })
  );
});
