// instantiation
var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  pdftronServer: 'https://demo.pdftron.com/', // comment this out to do client-side only
  initialDoc: 'https://pdftron.s3.amazonaws.com/downloads/pl/form1.pdf'
}, viewerElement);

viewerElement.addEventListener('documentLoaded', function() {
  var viewerInstance = viewer.getInstance();
  var pageCount = viewerInstance.docViewer.getPageCount();
  var annotationManager = viewerInstance.docViewer.getAnnotationManager();
  var Annotations = viewerElement.querySelector('iframe').contentWindow.Annotations;

  var defaultStyles = Annotations.WidgetAnnotation.getCustomStyles;
  var customStyles = function(widget) {
    if (widget instanceof Annotations.TextWidgetAnnotation) {
      if (widget.fieldName === 'f1-1') {
        return {
          'background-color': 'lightgreen'
        };
      }
      return {
        'background-color': 'lightblue',
        color: 'brown'
      };
    } else if (widget instanceof Annotations.PushButtonWidgetAnnotation) {
      return {
        'background-color': 'red',
        color: 'white'
      };
    }
  };

  document.getElementById('form').onchange = function(e) {
    if (e.target.id === 'custom') {
      // Change styles for widget annotations
      Annotations.WidgetAnnotation.getCustomStyles = customStyles;
    } else {
      Annotations.WidgetAnnotation.getCustomStyles = defaultStyles;
    }
    for (let i = 0; i < pageCount; i++) {
      // Redraw canvas
      annotationManager.drawAnnotations(i + 1, null, true);
    }
  };
});