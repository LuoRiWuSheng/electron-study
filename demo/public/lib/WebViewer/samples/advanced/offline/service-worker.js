self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1')
      .then((cache) => {
        const resources = [
          '../../../samples/advanced/offline/',
          '../../../samples/advanced/offline/offline.js',
          '../../../samples/style.css',
          '../../../samples/license-key.js',
          '../../../samples/menu-button.js',
          '../../../lib/webviewer.min.js',
          '../../../lib/core/CoreControls.js',
          '../../../lib/core/pdf/pdfnet.res',
          '../../../lib/core/pdf/PDFworker.js?isfull=false',
          '../../../lib/core/pdf/lean/PDFNetC.gz.js.mem',
          '../../../lib/core/pdf/lean/PDFNetC.gz.mem',
          '../../../lib/core/pdf/lean/PDFNetCWasm.br.js.mem',
          '../../../lib/core/pdf/lean/PDFNetCWasm.br.wasm',
          '../../../lib/core/office/OfficeWorker.js?isfull=false',
          '../../../lib/core/office/WebOfficeWorker.gz.mem',
          '../../../lib/core/office/WebOfficeWorker.gz.js.mem',
          '../../../lib/core/external/decode.min.js',
          '../../../lib/core/external/rawinflate.js',
          '../../../lib/core/external/pako_inflate.min.js',
          '../../../lib/core/external/jquery-3.2.1.min.js',
          '../../../lib/core/external/html2canvas.min.js',
          '../../../lib/core/external/Promise.js',
          '../../../lib/ui/build/index.html',
          '../../../lib/ui/build/style.css',
          '../../../lib/ui/build/webviewer-ui.min.js',
          '../../../lib/ui/build/i18n/translation-en.json',
        ];
        return cache.addAll(resources);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('activate');
  caches.keys().then(cacheNames => cacheNames.map(cacheName => console.log(cacheName)));
  const cacheWhitelist = ['v1'];
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map((cacheName) => {
        if (cacheWhitelist.indexOf(cacheName) === -1) {
          return caches.delete(cacheName);
        }
        return Promise.resolve();
      })
    ))
  );
});