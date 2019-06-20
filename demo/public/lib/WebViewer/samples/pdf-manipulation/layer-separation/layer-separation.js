var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  initialDoc: '../../../samples/files/construction-drawing-final.pdf',
}, viewerElement);

viewerElement.addEventListener('documentLoaded', function() {
  var viewerInstance = viewer.getInstance();
  var docViewer = viewerInstance.docViewer;
  var doc = docViewer.getDocument();
  var layersElement = document.getElementById('layers');

  docViewer.on('pageComplete', function() {
    viewerInstance.closeElement('loadingModal');
  });

  // Get PDF layers array
  doc.getLayersArray().then(function(layers) {
    layers.forEach(function(layer, index) {
      var input = document.createElement('input');
      input.id = layer.name;
      input.type = 'checkbox';
      input.checked = layer.visible;
      input.onchange = function(e) {
        viewerInstance.openElement('loadingModal');
        // Show/hide a layer
        layers[index].visible = e.target.checked;
        doc.setLayersArray(layers);
        // Redraw the canvas
        docViewer.refreshAll();
        docViewer.updateView();
      };

      var label = document.createElement('label');
      label.htmlFor = layer.name;
      label.innerHTML = layer.name;

      var lineBreak = document.createElement('br');

      layersElement.appendChild(input);
      layersElement.appendChild(label);
      layersElement.appendChild(lineBreak);
    });
  });
});