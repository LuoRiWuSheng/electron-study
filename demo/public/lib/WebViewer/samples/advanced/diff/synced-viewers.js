CoreControls.setWorkerPath('../../../lib/core');

let workerTransportPromise;

const getWorkerTransportPromise = function() {
  return workerTransportPromise || CoreControls.getDefaultBackendType().then(function(backendType) {
    workerTransportPromise = CoreControls.initPDFWorkerTransports(backendType, {}, window.sampleL);
    return workerTransportPromise;
  });
};

const viewerIds = [
  { panel: 'leftPanel' },
  { panel: 'middlePanel' },
  { panel: 'rightPanel' }
];


initializeViewers(viewerIds, function() {
  openDoc('middlePanel', '../../../samples/files/test_doc_1.pdf');
  loadDocument('middlePanel', '../../../samples/files/test_doc_2.pdf');
  openDoc('leftPanel', '../../../samples/files/test_doc_1.pdf');
  openDoc('rightPanel', '../../../samples/files/test_doc_2.pdf');
});


const viewers = [];
const instances = {};
let currentLoadCanvas;
let lastRenderRect;

function initializeViewers(array, callback) {
  Promise.all(array.map(setupViewer)).then(function() {
    const viewerInstance = instances['middlePanel'].viewerInstance;
    viewerInstance.docViewer.on('pageComplete', function(e, completedPageIndex) {
      update('middlePanel', completedPageIndex);
    });
    viewerInstance.docViewer.on('beginRendering', function() {
      lastRenderRect = viewerInstance.docViewer.getViewportRegionRect(viewerInstance.docViewer.getCurrentPage() - 1);
      if (currentLoadCanvas) {
        const newDoc = instances['middlePanel'].newDoc;
        newDoc.cancelLoadCanvas(currentLoadCanvas);
      }
    });
    return callback(null, instances);
  });
}

function setupViewer(item) {
  const viewerElement = document.getElementById(item.panel);
  const viewer = new PDFTron.WebViewer({
    path: '../../../lib',
    workerTransportPromise: getWorkerTransportPromise(),
    l: window.sampleL,
    initialDoc: item.pdf || null,
    enableAnnotations: false
  }, viewerElement);

  return new Promise(function(resolve) {
    viewerElement.addEventListener('ready', function() {
      const viewerInstance = viewer.getInstance();
      const readerControl = viewerElement.querySelector('iframe')
        .contentWindow.readerControl;
      const CoreControls = viewerElement.querySelector('iframe')
        .contentWindow.CoreControls;
      viewerInstance.docViewer.on('zoomUpdated', function(e, zoom) {
        syncZoom(zoom);
      });
      viewers.push(item);
      instances[item.panel] = {
        viewerInstance: viewerInstance,
        readerControl: readerControl,
        CoreControls: CoreControls,
        viewerElement: viewerElement
      };
      resolve();
    });

    viewerElement.addEventListener('documentLoaded', function() {
      if (!instances[item.panel].documentContainer) {
        const documentContainer = viewerElement.querySelector('iframe')
          .contentDocument.querySelector('.DocumentContainer');
        instances[item.panel] = $.extend({}, instances[item.panel], {
          documentContainer: documentContainer
        });
        documentContainer.onscroll = function() {
          syncScrolls(documentContainer.scrollLeft, documentContainer.scrollTop);
        };
      }
    });
  });
}


document.getElementById('selectControl').onclick = function(e) {
  e.preventDefault();
  const select1 = document.getElementById('select1');
  const firstPdf = select1.options[select1.selectedIndex].value;
  const select2 = document.getElementById('select2');
  const secondPdf = select2.options[select2.selectedIndex].value;

  openDoc('middlePanel', secondPdf);
  loadDocument('middlePanel', firstPdf);
  openDoc('leftPanel', firstPdf);
  openDoc('rightPanel', secondPdf);
};

document.getElementById('url-form').onsubmit = function(e) {
  e.preventDefault();
  const firstPdf = document.getElementById('url').value;
  const secondPdf = document.getElementById('url2').value;

  openDoc('middlePanel', secondPdf);
  loadDocument('middlePanel', firstPdf);
  openDoc('leftPanel', firstPdf);
  openDoc('rightPanel', secondPdf);
};

document.getElementById('file-picker-form').onsubmit = function(e) {
  e.preventDefault();
  const firstPdf = document.forms['file-picker-form'][0].files[0];
  const secondPdf = document.forms['file-picker-form'][1].files[0];

  openDoc('middlePanel', secondPdf);
  loadDocument('middlePanel', firstPdf);
  openDoc('leftPanel', firstPdf);
  openDoc('rightPanel', secondPdf);
};


function loadDocument(panel, docLocation, callback) {
  const CoreControls = instances[panel].CoreControls;
  const newDoc = new CoreControls.Document('file.pdf', 'pdf');

  CoreControls.getDefaultBackendType()
    .then(function() {
      const options = {
        workerTransportPromise: getWorkerTransportPromise()
      };
      let partRetriever;
      if (docLocation instanceof File) {
        partRetriever = new CoreControls.PartRetrievers
          .LocalPdfPartRetriever(docLocation);
      } else {
        partRetriever = new CoreControls.PartRetrievers
          .ExternalPdfPartRetriever(docLocation);
      }

      newDoc.loadAsync(partRetriever, callback, options);
      instances[panel] = $.extend({}, instances[panel], { newDoc: newDoc });
    });
}

function updatePage(doc, documentContainer, readerControl, pageIndex, currentLoadCanvas, lastRenderRect) {
  const firstDocCanvas = documentContainer.querySelector('.canvas' + pageIndex);
  // make first doc blue
  const firstDocCtx = firstDocCanvas.getContext('2d');
  const firstDocOriginalData = firstDocCtx.getImageData(0, 0, firstDocCanvas.width, firstDocCanvas.height).data;
  const firstDocImageData = firstDocCtx.getImageData(0, 0, firstDocCanvas.width, firstDocCanvas.height);
  const firstDocData = firstDocImageData.data;

  for (let i = 0; i < firstDocData.length; i += 4) {
    // make all non-white pixels blue
    const isWhite = firstDocData[i] === 255 && firstDocData[i + 1] === 255 && firstDocData[i + 2] === 255;
    if (!isWhite) {
      firstDocData[i] = 0;
      firstDocData[i + 1] = 0;
      firstDocData[i + 2] = 255;
    }
  }
  firstDocCtx.putImageData(firstDocImageData, 0, 0);

  const isViewportRender = firstDocCanvas.style.left !== '';
  return doc.loadCanvasAsync({
    pageIndex: pageIndex,
    canvasNum: 1,
    getZoom: function() {
      return readerControl.docViewer.getZoom();
    },
    drawComplete: function(pageCanvas) {
      pageCanvas.style.position = 'absolute';
      pageCanvas.style.zIndex = 25;
      pageCanvas.style.left = firstDocCanvas.style.left;
      pageCanvas.style.top = firstDocCanvas.style.top;
      pageCanvas.style.backgroundColor = '';

      pageCanvas.classList.add('canvasOverlay');
      firstDocCanvas.parentNode.appendChild(pageCanvas);

      const ctx = pageCanvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, pageCanvas.width, pageCanvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // make all white pixels transparent
        if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
          data[i + 3] = 0;
        } else {
          const coords = getCoords(i, pageCanvas.width);
          const index = getIndex(coords, firstDocCanvas.width);
          if (coords.y <= firstDocCanvas.height && coords.x <= firstDocCanvas.width &&
            (firstDocOriginalData[index] === data[index] || firstDocOriginalData[index + 1] === data[index + 1] || firstDocOriginalData[index + 2] === data[index + 2])) {
            // make overlapping pixels gray
            data[i] = 128;
            data[i + 1] = 128;
            data[i + 2] = 128;
          } else {
            // make all other pixels red
            data[i] = 255;
            data[i + 1] = 0;
            data[i + 2] = 0;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
    },
    renderRect: isViewportRender ? lastRenderRect : undefined
  });
}

function update(panel, pageIndex) {
  const newDoc = instances[panel].newDoc;
  const documentContainer = instances[panel].documentContainer;
  const readerControl = instances[panel].readerControl;
  currentLoadCanvas = updatePage(newDoc, documentContainer, readerControl, pageIndex, currentLoadCanvas, lastRenderRect);
}

function openDoc(panel, pdf) {
  const viewerInstance = instances[panel].viewerInstance;
  viewerInstance.setEngineType(viewerInstance.constants.engineTypes.PDFNETJS);
  viewerInstance.closeDocument()
    .then(function() {
      viewerInstance.loadDocument(pdf);
    });
}

function getCoords(i, width) {
  const pixels = Math.floor(i / 4);
  return {
    x: pixels % width,
    y: Math.floor(pixels / width)
  };
}

function getIndex(coords, width) {
  return ((coords.y * width) + coords.x) * 4;
}

function syncScrolls(scrollLeft, scrollTop) {
  viewers.forEach(function(item) {
    const documentContainer = instances[item.panel].documentContainer;

    if (!documentContainer) {
      return;
    }

    if (documentContainer.scrollLeft !== scrollLeft) {
      documentContainer.scrollLeft = scrollLeft;
    }

    if (documentContainer.scrollTop !== scrollTop) {
      documentContainer.scrollTop = scrollTop;
    }
  });
}

function syncZoom(zoom) {
  viewers.forEach(function(item) {
    const viewerInstance = instances[item.panel].viewerInstance;

    if (viewerInstance.getZoomLevel() !== zoom) {
      viewerInstance.setZoomLevel(zoom);
    }
  });
}