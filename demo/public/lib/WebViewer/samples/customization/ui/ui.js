var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  pdftronServer: 'https://demo.pdftron.com/', // comment this out to do client-side only
  initialDoc: 'https://pdftron.s3.amazonaws.com/downloads/pl/webviewer-demo-annotated.pdf'
}, viewerElement);

viewerElement.addEventListener('ready', function() {
  var viewerInstance = viewer.getInstance();

  var reverseHeaderItems = function() {
    // Change header items
    viewerInstance.setHeaderItems(function(header) {
      var items = header.getItems();
      var copiedItems = items.splice(1, 17);
      copiedItems.reverse();
      header.update([].concat(items.slice(0, 1), copiedItems, items.slice(1)));
    });
  };

  var toggleElement = function(e, dataElement) {
    // Enable/disable individual element
    if (e.target.checked) {
      viewerInstance.enableElement(dataElement);
    } else {
      viewerInstance.disableElement(dataElement);
    }
  };

  [].forEach.call(document.getElementsByName('header'), function(radioInput) {
    radioInput.onchange = function() {
      reverseHeaderItems();
    };
  });

  document.getElementById('text-selection').onchange = function(e) {
    // Enable/disable text selection
    viewerInstance.enableTextSelection(e.target.checked);
  };

  document.getElementById('annotations').onchange = function(e) {
    // Enable/disable annotations
    viewerInstance.enableAnnotations(e.target.checked);
  };

  document.getElementById('notes-panel').onchange = function(e) {
    // Enable/disable notes panel
    viewerInstance.enableNotesPanel(e.target.checked);
  };

  document.getElementById('file-picker').onchange = function(e) {
    // Enable/disable file picker
    viewerInstance.enableFilePicker(e.target.checked);
  };

  document.getElementById('print').onchange = function(e) {
    // Enable/disable print
    viewerInstance.enablePrint(e.target.checked);
  };

  document.getElementById('download').onchange = function(e) {
    // Enable/disable download
    viewerInstance.enableDownload(e.target.checked);
  };

  document.getElementById('view-controls').onchange = function(e) {
    toggleElement(e, 'viewControlsButton');
  };

  document.getElementById('search').onchange = function(e) {
    toggleElement(e, 'searchButton');
  };

  document.getElementById('pan-tool').onchange = function(e) {
    toggleElement(e, 'panToolButton');
  };

  document.getElementById('page-nav').onchange = function(e) {
    toggleElement(e, 'pageNavOverlay');
  };

  document.getElementById('default').onchange = function(e) {
    if (e.target.checked) {
      reverseHeaderItems();
    }
  };

  document.getElementById('reverse').onchange = function(e) {
    if (e.target.checked) {
      reverseHeaderItems();
    }
  };

  [].forEach.call(document.getElementsByName('theme'), function(radioInput) {
    radioInput.onchange = function(e) {
      if (e.target.id === 'light' && e.target.checked) {
        viewerInstance.setTheme('default');
      } else {
        viewerInstance.setTheme('dark');
        // or
        // viewerInstance.setTheme({
        // primary: '#2C2B3A',
        // secondary: '#4D4C5F',
        // border: '#555555',
        // buttonHover: '#686880',
        // buttonActive: '#686880',
        // text: '#FFFFFF',
        // icon: '#FFFFFF',
        // iconActive: '#FFFFFF'
        // });
      }
    };
  });
});