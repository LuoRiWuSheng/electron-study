var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  pdftronServer: 'https://demo.pdftron.com/', // comment this out to do client-side only
  initialDoc: 'https://pdftron.s3.amazonaws.com/downloads/pl/webviewer-demo-annotated.pdf'
}, viewerElement);

viewerElement.addEventListener('ready', function() {
  var viewerInstance = viewer.getInstance();

  document.getElementById('form').onchange = function(e) {
    // Set language
    viewerInstance.setLanguage(e.target.id);
  };
});