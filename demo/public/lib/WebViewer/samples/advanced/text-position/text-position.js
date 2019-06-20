var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  pdftronServer: 'https://demo.pdftron.com/', // comment this out to do client-side only
  initialDoc: 'https://pdftron.s3.amazonaws.com/downloads/pl/legal-contract.pdf'
}, viewerElement);

viewerElement.addEventListener('documentLoaded', function() {
  var viewerInstance = viewer.getInstance();
  var docViewer = viewerInstance.docViewer;
  var doc = docViewer.getDocument();
  var annotationManager = docViewer.getAnnotationManager();
  var Annotations = viewerElement.querySelector('iframe').contentWindow.Annotations;
  var textInput = document.getElementById('text');
  var pagesDiv = document.getElementById('pages');

  var pageIndex;
  for (pageIndex = 0; pageIndex < docViewer.getPageCount(); pageIndex++) {
    var input = document.createElement('input');
    input.id = 'page-' + pageIndex;
    input.type = 'checkbox';
    input.checked = false;
    input.value = pageIndex;
    input.onchange = function(e) {
      if (e.target.checked) {
        doc.loadPageText(Number(e.target.value), function(text) {
          var textStartIndex = 0;
          var textIndex;
          var annotations = [];
          var searchText = textInput.value;

          while ((textIndex = text.indexOf(searchText, textStartIndex)) > -1) {
            textStartIndex = textIndex + searchText.length;
            // Get text position
            doc.getTextPosition(Number(e.target.value), textIndex, textIndex + searchText.length, function(quads) {
              var annotation = new Annotations.TextHighlightAnnotation();
              annotation.Author = viewerInstance.getAnnotationUser();
              annotation.PageNumber = Number(e.target.value) + 1;
              annotation.Quads = quads;
              annotation.StrokeColor = new Annotations.Color(136, 39, 31);
              annotations.push(annotation);
            });
          }
          annotationManager.addAnnotations(annotations);
          annotationManager.selectAnnotations(annotations);
        });
      } else {
        var annotations = annotationManager.getAnnotationsList().filter(function(annotation) {
          return annotation.PageNumber === Number(e.target.value) + 1;
        });
        annotationManager.deleteAnnotations(annotations);
      }
    };

    var label = document.createElement('label');
    label.htmlFor = 'page-' + pageIndex;
    label.innerHTML = 'Page ' + (pageIndex + 1);

    var lineBreak = document.createElement('br');

    pagesDiv.appendChild(input);
    pagesDiv.appendChild(label);
    pagesDiv.appendChild(lineBreak);
  }
});