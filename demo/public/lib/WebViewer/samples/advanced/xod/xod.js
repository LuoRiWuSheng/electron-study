// Instantiate
var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  initialDoc: '../../../samples/files/webviewer-demo-annotated.xod',
}, viewerElement);

viewerElement.addEventListener('ready', function() {
  var viewerInstance = viewer.getInstance();
  window.viewerInstance = viewerInstance;

  document.getElementById('select').onchange = function(e) {
    if (e.target.value === 'https://pdftron.s3.amazonaws.com/downloads/pl/encrypted-foobar12.xod') {
      viewerInstance.loadDocument(e.target.value, {
        decrypt: document.querySelector('iframe').contentWindow.CoreControls.Encryption.decrypt,
        decryptOptions: {
          p: 'foobar12',
          type: 'aes',
          error: function(msg) {
            alert(msg);
          }
        }
      });
    } else {
      viewerInstance.loadDocument(e.target.value);
    }
  };

  document.getElementById('file-picker').onchange = function(e) {
    var file = e.target.files[0];
    if (file) {
      viewerInstance.loadDocument(file);
    }
  };

  document.getElementById('url-form').onsubmit = function(e) {
    e.preventDefault();
    viewerInstance.loadDocument(document.getElementById('url').value);
  };
});