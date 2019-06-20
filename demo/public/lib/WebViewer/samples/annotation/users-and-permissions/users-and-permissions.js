var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  pdftronServer: 'https://demo.pdftron.com/', // comment this out to do client-side only
  initialDoc: 'https://pdftron.s3.amazonaws.com/downloads/pl/webviewer-demo-annotated.pdf'
}, viewerElement);

viewerElement.addEventListener('documentLoaded', function() {
  var viewerInstance = viewer.getInstance();

  viewerInstance.setAnnotationUser('Justin');
  viewerInstance.setAdminUser(true);
  viewerInstance.openElement('notesPanel');

  document.getElementById('justin').onchange = function() {
    viewerInstance.setAnnotationUser('Justin');
    viewerInstance.setAdminUser(true);
    viewerInstance.setReadOnly(false);
    viewerInstance.setToolMode('AnnotationEdit');
  };

  document.getElementById('sally').onchange = function() {
    viewerInstance.setAnnotationUser('Sally');
    viewerInstance.setAdminUser(false);
    viewerInstance.setReadOnly(false);
    viewerInstance.setToolMode('AnnotationEdit');
  };

  document.getElementById('brian').onchange = function() {
    viewerInstance.setAnnotationUser('Brian');
    viewerInstance.setAdminUser(false);
    viewerInstance.setReadOnly(true);
    viewerInstance.setToolMode('AnnotationEdit');
  };

  document.getElementById('display').onchange = function(e) {
    var currentUser = viewerInstance.getAnnotationUser();
    var annotationManager = viewerInstance.docViewer.getAnnotationManager();
    var allAnnotations = annotationManager.getAnnotationsList().filter(function(annotation) {
      return annotation.Listable;
    });

    if (e.target.checked) {
      annotationManager.showAnnotations(allAnnotations);
    } else {
      var annotationsToHide = allAnnotations.filter(function(annotation) {
        return annotation.Author !== currentUser;
      });
      annotationManager.hideAnnotations(annotationsToHide);
    }
  };
});