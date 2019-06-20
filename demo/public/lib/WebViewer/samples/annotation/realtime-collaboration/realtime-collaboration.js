var viewerElement = document.getElementById('viewer');
var myWebViewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  pdftronServer: 'https://demo.pdftron.com/', // comment this out to do client-side only
  initialDoc: 'https://pdftron.s3.amazonaws.com/downloads/pl/webviewer-demo-annotated.pdf'
}, viewerElement);

// eslint-disable-next-line no-undef
var server = new Server();
var viewerInstance;

viewerElement.addEventListener('ready', function() {
  var urlInput = document.getElementById('url');
  var copyButton = document.getElementById('copy');
  viewerInstance = myWebViewer.getInstance();
  viewerInstance.openElement('notesPanel');

  if (window.location.origin === 'http://localhost:3000') {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (xhttp.readyState === 4 && xhttp.status === 200) {
        urlInput.value = 'http://' + xhttp.responseText + ':3000/samples/annotation/realtime-collaboration/';
      }
    };
    xhttp.open('GET', '/ip', true);
    xhttp.send();
  } else {
    urlInput.value = 'https://pdftron.com/samples/web/samples/annotation/realtime-collaboration/';
  }

  copyButton.onclick = function() {
    urlInput.select();
    document.execCommand('copy');
    document.getSelection().empty();
  };
});

viewerElement.addEventListener('documentLoaded', function() {
  var annotationManager = viewerInstance.docViewer.getAnnotationManager();
  var authorId = null;

  // Bind server-side authorization state change to a callback function
  // The event is triggered in the beginning as well to check if author has already signed in
  server.bind('onAuthStateChanged', function(user) {
    // Author is logged in
    if (user) {
      // Using uid property from Firebase Database as an author id
      // It is also used as a reference for server-side permission
      authorId = user.uid;
      // Check if author exists, and call appropriate callback functions
      server.checkAuthor(authorId, openReturningAuthorPopup, openNewAuthorPopup);
      // Bind server-side data events to callback functions
      // When loaded for the first time, onAnnotationCreated event will be triggered for all database entries
      server.bind('onAnnotationCreated', onAnnotationCreated);
      server.bind('onAnnotationUpdated', onAnnotationUpdated);
      server.bind('onAnnotationDeleted', onAnnotationDeleted);
    } else {
      // Author is not logged in
      server.signInAnonymously();
    }
  });

  // Bind annotation change events to a callback function
  annotationManager.on('annotationChanged', function(e, annotations, type) {
    // e.imported is true by default for annotations from pdf and annotations added by importAnnotCommand
    if (e.imported) {
      return;
    }
    // Iterate through all annotations and call appropriate server methods
    annotations.forEach(function(annotation) {
      var xfdf = annotationManager.getAnnotCommand();
      var parentAuthorId = null;
      if (type === 'add') {
        // In case of replies, add extra field for server-side permission to be granted to the
        // parent annotation's author
        if (annotation.InReplyTo) {
          parentAuthorId = annotationManager.getAnnotationById(annotation.InReplyTo).authorId || 'default';
        }
        server.createAnnotation(annotation.Id, {
          authorId: authorId,
          parentAuthorId: parentAuthorId,
          xfdf: xfdf
        });
      } else if (type === 'modify') {
        // In case of replies, add extra field for server-side permission to be granted to the
        // parent annotation's author
        if (annotation.InReplyTo) {
          parentAuthorId = annotationManager.getAnnotationById(annotation.InReplyTo).authorId || 'default';
        }
        server.updateAnnotation(annotation.Id, {
          authorId: authorId,
          parentAuthorId: parentAuthorId,
          xfdf: xfdf
        });
      } else if (type === 'delete') {
        server.deleteAnnotation(annotation.Id);
      }
    });
  });

  // Overwrite client-side permission check method on the annotation manager
  // The default was set to compare the authorName
  // Instead of the authorName, we will compare authorId created from the server
  annotationManager.setPermissionCheckCallback(function(author, annotation) {
    return annotation.authorId === authorId;
  });

  function onAnnotationCreated(data) {
    // Import the annotation based on xfdf command
    var annotation = annotationManager.importAnnotCommand(data.val().xfdf)[0];
    // Set a custom field authorId to be used in client-side permission check
    annotation.authorId = data.val().authorId;
    annotationManager.redrawAnnotation(annotation);
    // viewerInstance.fireEvent('updateAnnotationPermission', [annotation]); //TODO
  }

  function onAnnotationUpdated(data) {
    // Import the annotation based on xfdf command
    var annotation = annotationManager.importAnnotCommand(data.val().xfdf)[0];
    // Set a custom field authorId to be used in client-side permission check
    annotation.authorId = data.val().authorId;
    annotationManager.redrawAnnotation(annotation);
  }

  function onAnnotationDeleted(data) {
    // data.key would return annotationId since our server method is designed as
    // annotationsRef.child(annotationId).set(annotationData)
    var command = '<delete><id>' + data.key + '</id></delete>';
    annotationManager.importAnnotCommand(command);
  }

  function openReturningAuthorPopup(authorName) {
    // The author name will be used for both WebViewer and annotations in PDF
    annotationManager.setCurrentUser(authorName);
    // Open popup for the returning author
    window.alert('Welcome back ' + authorName);
  }

  function openNewAuthorPopup() {
    // Open prompt for a new author
    var name = window.prompt('Welcome! Tell us your name :)');
    if (name) {
      updateAuthor(name);
    }
  }

  function updateAuthor(authorName) {
    // The author name will be used for both WebViewer and annotations in PDF
    annotationManager.setCurrentUser(authorName);
    // Create/update author information in the server
    server.updateAuthor(authorId, { authorName: authorName });
  }
});