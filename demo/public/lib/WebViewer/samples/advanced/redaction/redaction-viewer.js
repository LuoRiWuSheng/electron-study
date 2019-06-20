// Instantiate
var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  initialDoc: '../../../samples/full-apis/TestFiles/newsletter.pdf',
  fullAPI: true,
  enableRedaction: true,
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

  const redactToolName = 'AnnotationCreateRedaction';
  const readerControl = viewerElement.querySelector('iframe').contentWindow.readerControl;

  readerControl.setToolMode(redactToolName);
  viewerInstance.setHeaderItems(function(header) {
    header.delete('textToolGroupButton');
    header.delete('freeHandToolGroupButton');
    header.delete('shapeToolGroupButton');
    header.delete('signatureToolButton');
    header.delete('freeTextToolButton');
    header.delete('stickyToolButton');
    header.delete('miscToolGroupButton');
  });
});
