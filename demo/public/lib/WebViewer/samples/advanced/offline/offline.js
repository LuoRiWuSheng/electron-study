var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  backendType: 'ems',
  documentType: 'all'
}, viewerElement);

var files = [
  '../../../samples/files/webviewer-demo.pdf',
  '../../../samples/files/construction-drawing-final.pdf',
  '../../../samples/files/op-blend-test.pdf'
];

viewerElement.addEventListener('ready', function() {
  var viewerInstance = viewer.getInstance();
  var documentsDiv = document.getElementById('documents');

  files.forEach(function(file) {
    var div = document.createElement('div');
    div.innerHTML = file.split('/').slice(-1)[0];

    var button = document.createElement('button');
    button.innerHTML = 'Open';
    button.onclick = function() {
      if (button.innerHTML === 'Open') {
        viewerInstance.loadDocument(file);
      } else {
        // Cache the document and change button text to Open
        window.caches.open('v1').then(function(cache) {
          fetch(file)
            .then((response) => {
              if (response.ok) {
                button.innerHTML = 'Open';
                return cache.put(file, response);
              }
            }).catch(() => {
              console.error('Failed to download the document');
            });
        });
      }
    };

    var list = document.createElement('li');
    list.appendChild(div);
    list.appendChild(button);

    documentsDiv.appendChild(list);

    // Change button text to Open if the file is cached
    caches.open('v1').then(function(cache) {
      return cache.match(file).then((response) => {
        if (response) {
          button.innerHTML = 'Open';
        } else {
          button.innerHTML = 'Download';
        }
      });
    });
  });
});

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('../../../samples/advanced/offline/service-worker.js', {
    scope: '../../../'
  }).then(function(registration) {
    if (registration.installing) {
      console.log('Service worker installing');
    } else if (registration.waiting) {
      console.log('Service worker installed');
    } else if (registration.active) {
      console.log('Service worker active');
    }
  }).catch(function(err) {
    console.log('ServiceWorker registration failed: ', err);
  });
} else {
  alert('This browser does not support service worker.');
  window.history.back();
}
