// Instantiate
var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  initialDoc: '../../../samples/files/test_doc_1.pdf',
  enableMeasurement: true
}, viewerElement);

viewerElement.addEventListener('ready', function() {
  var viewerInstance = viewer.getInstance();

  viewerInstance.setHeaderItems(function(header) {
    header.delete('textToolGroupButton');
    header.delete('freeHandToolGroupButton');
    header.delete('shapeToolGroupButton');
    header.delete('signatureToolButton');
    header.delete('freeTextToolButton');
    header.delete('stickyToolButton');
    header.delete('miscToolGroupButton');
  });
  viewerInstance.openElements(['notesPanel']);

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
