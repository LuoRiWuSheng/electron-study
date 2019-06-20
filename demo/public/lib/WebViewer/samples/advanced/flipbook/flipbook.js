CoreControls.setWorkerPath('../../../lib/core');

var flipbookElement = document.getElementById('flipbook');

flipbookElement.innerHTML = 'Preparing document...';

var doc = new CoreControls.Document('cheetahs.pdf', 'pdf');

CoreControls.getDefaultBackendType().then(function(backendType) {
  var options = {
    workerTransportPromise: CoreControls.initPDFWorkerTransports(backendType, {}, window.sampleL/* license key here */),
  };
  var partRetriever = new CoreControls.PartRetrievers.ExternalPdfPartRetriever('../../../samples/files/cheetahs.pdf');

  // Load document
  doc.loadAsync(partRetriever, function(err) {
    if (err) {
      console.error('Could not open file, please try again');
      return;
    }

    var info = doc.getPageInfo(0);
    var width = info.width;
    var height = info.height;
    var pageCount = doc.getPageCount();
    var promises = [];
    var canvases = [];

    var headerHeight = document.querySelector('header').offsetHeight;
    flipbookElement.style.marginTop = headerHeight;
    var flipbookHeight = window.innerHeight - headerHeight - 20;
    var flipbookWidth = window.innerWidth - 340;
    if (flipbookHeight * width / height * 2 < flipbookWidth) {
      flipbookWidth = flipbookHeight * width / height * 2;
    } else {
      flipbookHeight = flipbookWidth / width * height / 2;
    }

    for (var i = 0; i < pageCount; i++) {
      promises.push(
        /* eslint-disable-next-line no-loop-func */
        new Promise(function(resolve) {
          // Load page canvas
          /* eslint-disable-line no-loop-func */
          doc.loadCanvasAsync(i, 1, 0, function(canvas, index) { /* eslint-disable-line no-loop-func */
            canvases.push({
              index: index,
              canvas: canvas
            });
            flipbookElement.innerHTML = 'Loading page canvas... (' + index + '/' + pageCount + ')';
            resolve();
          });
        })
      );
    }

    Promise.all(promises).then(function() {
      flipbookElement.innerHTML = '';
      flipbookElement.style.padding = 0;
      flipbookElement.style.margin = '60px 0 0 auto';

      canvases.sort(function(a, b) {
        return a.index - b.index;
      }).forEach(function(o) {
        flipbookElement.appendChild(o.canvas);
      });

      $('#flipbook').turn({
        width: flipbookWidth,
        height: flipbookHeight
      });

      setTimeout(function() {
        $('#flipbook').turn('next');
      }, 500);

      document.getElementById('previous').onclick = function() {
        $('#flipbook').turn('previous');
      };

      document.getElementById('next').onclick = function() {
        $('#flipbook').turn('next');
      };
    });
  }, options);
});