// Instantiate
var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  initialDoc: '../../../samples/files/webviewer-demo-annotated.pdf',
  ui: 'legacy'
}, viewerElement);

viewerElement.addEventListener('ready', function() {
  var viewerInstance = viewer.getInstance();

  document.getElementById('select').onchange = function(e) {
    viewerInstance.loadDocument(e.target.value);
  };

  document.getElementById('file-picker').onchange = function(e) {
    var file = e.target.files[0];
    if (file) {
      viewerInstance.loadLocalFile(file, { filename: file.name });
    }
  };

  document.getElementById('url-form').onsubmit = function(e) {
    e.preventDefault();
    viewerInstance.loadDocument(document.getElementById('url').value);
  };
});