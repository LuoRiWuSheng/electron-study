((exports) => {
  'use strict';

  const initAll = async(docurl) => {
    try {
      // await exports.PDFNet.initialize(); // awaits promise
      // PDFNet.beginOperation();
      var doc = await exports.PDFNet.PDFDoc.createFromURL(docurl);
      doc.initSecurityHandler();
      doc.lock();
      var pagecount = await doc.getPageCount();
      var pdfdraw = await exports.PDFNet.PDFDraw.create(100);
      return { doc: doc, pdfdraw: pdfdraw, pagecount: pagecount };
    } catch (err) {
      console.log(err.stack);
    }
  };

  const renderPage = async(renderData, pageIndex) => {
    try {
      var doc = renderData.doc;
      var pdfdraw = renderData.pdfdraw;

      var currentPage = await doc.getPage(pageIndex);
      var bitmapInfo = await pdfdraw.getBitmap(currentPage, exports.PDFNet.PDFDraw.PixelFormat.e_rgba, false);
      var bitmapWidth = bitmapInfo.width;
      var bitmapHeight = bitmapInfo.height;
      var bitmapArray = new Uint8ClampedArray(bitmapInfo.buf);

      var drawingCanvas = document.createElement('canvas');
      drawingCanvas.width = bitmapWidth;
      drawingCanvas.height = bitmapHeight;

      var ctx = drawingCanvas.getContext('2d');
      var imgData = ctx.createImageData(bitmapWidth, bitmapHeight);
      imgData.data.set(bitmapArray);

      ctx.putImageData(imgData, 0, 0);
      return drawingCanvas;
    } catch (err) {
      console.log(err.stack);
    }
  };

  exports.loadDocument = docurl =>
    // replace with your own license key and remove the license-key.js script tag
    PDFNet.runWithoutCleanup(async() => initAll(docurl), window.parent.sampleL);
  exports.loadCanvasAsync = (renderData, pageIndex) => PDFNet.runWithoutCleanup(async() => renderPage(renderData, pageIndex));
})(window);
// # sourceURL=DeckJSTest.js