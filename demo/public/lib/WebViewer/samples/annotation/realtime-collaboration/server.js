/* global firebase, Server */
(function() {
  window.Server = function() {
    // Initialize server
    var config = {
      apiKey: 'AIzaSyC37tT37MnQ4oZJddLNjzM2MhlJd3A1xvc',
      authDomain: 'realtimecollaboration-87c11.firebaseapp.com',
      databaseURL: 'https://realtimecollaboration-87c11.firebaseio.com',
      storageBucket: 'realtimecollaboration-87c11.appspot.com',
      messagingSenderId: '436405992036'
    };
    firebase.initializeApp(config);

    // Get references to database locations
    this.annotationsRef = firebase.database().ref().child('annotations');
    this.authorsRef = firebase.database().ref().child('authors');
  };

  // Custom bind function for authorization and data events
  Server.prototype.bind = function(action, callbackFunction) {
    switch (action) {
      case 'onAuthStateChanged':
        firebase.auth().onAuthStateChanged(callbackFunction);
        break;
      case 'onAnnotationCreated':
        this.annotationsRef.on('child_added', callbackFunction);
        break;
      case 'onAnnotationUpdated':
        this.annotationsRef.on('child_changed', callbackFunction);
        break;
      case 'onAnnotationDeleted':
        this.annotationsRef.on('child_removed', callbackFunction);
        break;
      default:
        console.error('The action is not defined.');
        break;
    }
  };

  // Check if the author exists and open an appropriate popup
  Server.prototype.checkAuthor = function(authorId, openReturningAuthorPopup, openNewAuthorPopup) {
    this.authorsRef.once('value', function(authors) {
      if (authors.hasChild(authorId)) {
        this.authorsRef.child(authorId).once('value', function(author) {
          openReturningAuthorPopup(author.val().authorName);
        });
      } else {
        openNewAuthorPopup();
      }
    }.bind(this));
  };

  // Sign in
  Server.prototype.signInAnonymously = function() {
    firebase.auth().signInAnonymously().catch(function(error) {
      if (error.code === 'auth/operation-not-allowed') {
        alert('You must enable Anonymous auth in the Firebase Console.');
      } else {
        console.error(error);
      }
    });
  };

  // Create/update/delete methods
  Server.prototype.createAnnotation = function(annotationId, annotationData) {
    this.annotationsRef.child(annotationId).set(annotationData);
  };

  Server.prototype.updateAnnotation = function(annotationId, annotationData) {
    this.annotationsRef.child(annotationId).set(annotationData);
  };

  Server.prototype.deleteAnnotation = function(annotationId) {
    this.annotationsRef.child(annotationId).remove();
  };

  Server.prototype.updateAuthor = function(authorId, authorData) {
    this.authorsRef.child(authorId).set(authorData);
  };
})();