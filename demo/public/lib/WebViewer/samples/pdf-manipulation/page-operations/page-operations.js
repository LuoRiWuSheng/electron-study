var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  useDownloader: false,
  initialDoc: '../../../samples/files/webviewer-demo.pdf',
}, viewerElement);

viewerElement.addEventListener('documentLoaded', function() {
  var viewerInstance = viewer.getInstance();
  var docViewer = viewerInstance.docViewer;
  var CoreControls = viewerElement.querySelector('iframe').contentWindow.CoreControls;
  var doc = docViewer.getDocument();

  var editDropdown = document.getElementById('edit');
  var moveFromDropdown = document.getElementById('move-from');
  var moveToDropdown = document.getElementById('move-to');
  var insertAtDropdown = document.getElementById('insert-at');
  var rotateButton = document.getElementById('rotate');
  var cropButton = document.getElementById('crop');
  var deleteButton = document.getElementById('delete');
  var moveButton = document.getElementById('move');
  var insertButton = document.getElementById('insert');
  var filePickerButton = document.getElementById('file-picker');

  // Updates page dropdowns when page count changes
  var updatePages = function(pageCount) {
    editDropdown.innerHTML = '';
    moveFromDropdown.innerHTML = '';
    moveToDropdown.innerHTML = '';
    insertAtDropdown.innerHTML = '';

    var i;
    for (i = 0; i < pageCount; i++) {
      var option = document.createElement('option');
      option.innerHTML = i + 1;
      editDropdown.appendChild(option);
      moveFromDropdown.appendChild(option.cloneNode(true));
      moveToDropdown.appendChild(option.cloneNode(true));
      insertAtDropdown.appendChild(option.cloneNode(true));
    }

    var clonedOption = option.cloneNode(true);
    clonedOption.innerHTML = i + 1;
    insertAtDropdown.appendChild(clonedOption);
  };

  rotateButton.onclick = function() {
    // Rotate pages
    doc.rotatePages([Number(editDropdown.value)], CoreControls.PageRotation.e_90);
  };

  cropButton.onclick = function() {
    // Crop pages
    doc.cropPages([Number(editDropdown.value)], 40, 40, 40, 40);
  };

  deleteButton.onclick = function() {
    var newPageCount = doc.getPageCount() - 1;
    // Delete pages
    doc.removePages([Number(editDropdown.value)]);
    updatePages(newPageCount);
  };

  moveButton.onclick = function() {
    var pageFrom = Number(moveFromDropdown.value);
    var pageTo = Number(moveToDropdown.value);
    if (pageFrom < pageTo) {
      pageTo++;
    }

    // Move pages
    doc.movePages([pageFrom], pageTo);
  };

  insertButton.onclick = function() {
    var info = doc.getPageInfo(0);
    var width = info.width;
    var height = info.height;
    var newPageCount = doc.getPageCount() + 1;
    // Insert blank pages
    doc.insertBlankPages([Number(insertAtDropdown.value)], width, height);
    updatePages(newPageCount);
  };

  filePickerButton.onchange = function(e) {
    var file = e.target.files[0];
    var newDoc = new CoreControls.Document(file.name, 'pdf');
    var ext = file.name.split('.').slice(-1)[0];
    CoreControls.getDefaultBackendType().then(function(backendType) {
      var options = {
        workerTransportPromise: CoreControls.initPDFWorkerTransports(backendType, {}/* , license key here */),
        extension: ext
      };
      var partRetriever = new CoreControls.PartRetrievers.LocalPdfPartRetriever(file);

      newDoc.loadAsync(partRetriever, function(err) {
        if (err) {
          console.error('Could not open file, please try again');
          return;
        }
        var pages = [];
        for (var i = 0; i < newDoc.numPages; i++) {
          pages.push(i + 1);
        }
        var newPageCount = doc.getPageCount() + newDoc.numPages;
        // Insert (merge) pages
        doc.insertPages(newDoc, pages, doc.numPages + 1);
        updatePages(newPageCount);
      }, options);
    });
  };

  updatePages(doc.getPageCount());
});
