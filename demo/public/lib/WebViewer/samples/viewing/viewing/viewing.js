// Instantiate
var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  pdftronServer: 'https://demo.pdftron.com/', // comment this out to do client-side only
  initialDoc: 'https://pdftron.s3.amazonaws.com/downloads/pl/webviewer-demo-annotated.pdf'
}, viewerElement);

viewerElement.addEventListener('ready', function() {
  var viewerInstance = viewer.getInstance();

  document.getElementById('select').onchange = function(e) {
    if (e.target.value.indexOf('https://') === 0) {
      viewerInstance.setEngineType(viewerInstance.constants.engineTypes.AUTO);
    } else {
      viewerInstance.setEngineType(viewerInstance.constants.engineTypes.PDFNETJS);
    }
    viewerInstance.loadDocument(e.target.value);
  };

  document.getElementById('file-picker').onchange = function(e) {
    var file = e.target.files[0];
    if (file) {
      viewerInstance.setEngineType(viewerInstance.constants.engineTypes.PDFNETJS);
      viewerInstance.loadDocument(file);
    }
  };

  document.getElementById('url-form').onsubmit = function(e) {
    e.preventDefault();
    viewerInstance.loadDocument(document.getElementById('url').value);
  };
});