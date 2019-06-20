/**
 * ReaderControl config file
 * ------------------------------
 * This js file is meant to simplify configuring commonly used settings for ReaderControl.
 * You can override default settings through ReaderControl.config properties, or add JavaScript code directly here.
 */
(() => {
  'use strict';

  // Create a custom tool for redaction
  class CustomRedactionCreateTool extends Tools.GenericAnnotationCreateTool {
    constructor(docViewer) {
      super(docViewer, Annotations.RectangleAnnotation);
    }

    mouseLeftUp(e) {
      const annot = this.annotation;
      super.mouseLeftUp.call(this, e);
      if (annot) {
        // if an annot is created...
        const am = readerControl.docViewer.getAnnotationManager();
        const docCore = readerControl.docViewer.getDocument();
        let pdfDoc;

        // When any outstanding operation have completed, begin redacting
        PDFNet.initialize().then(function() {
          docCore.getPDFDoc().then(function(viewedDoc) {
            pdfDoc = viewedDoc;
            // waits for page to be downloaded before continuing
            return pdfDoc.requirePage(annot.getPageNumber());
          }).then(function() {
            return redactElementsInBox(pdfDoc, docCore, annot, am);
          }).then(function() {
            // remove our selection box
            am.deleteAnnotation(annot);
            // refresh the page with the newly updated document
            readerControl.docViewer.refreshPage(annot.getPageNumber());

            // update viewer with new document
            readerControl.docViewer.updateView();
            readerControl.docViewer.getDocument().refreshTextData();
          });
        });
      }
    }
  }


  $(document).on('documentLoaded', () => {
    const redactToolName = 'AnnotationCreateRedactionTool';
    const redactTool = new CustomRedactionCreateTool(readerControl.docViewer);

    readerControl.registerTool({
      toolName: redactToolName,
      toolObject: redactTool
    });

    readerControl.setHeaderItems((header) => {
      const items = header.getItems();
      items.splice(9, 0, {
        type: 'actionButton',
        img: '../../../samples/full-apis/ViewerRedactTest/annot_custom_redact.png',
        onClick: () => {
          readerControl.setToolMode(redactToolName);
        }
      });
      header.update(items);
    });

    readerControl.setToolMode(redactToolName);
  });

  let redactElementsInBox = (pdfDoc, docCore, annot, annotManager) => {
    // Convert an iterator of sequentially dependent promises (that take each result in the sequence as the next one's parameter) into a single promise
    const main = async() => {
      /* eslint-disable no-unused-vars */
      let ret = 0;
      try {
        let islocked = false;
        const pageNumber = annot.getPageNumber();
        const doc = pdfDoc;
        doc.initSecurityHandler();
        doc.lock();

        islocked = true;

        const redactRectX1 = annot.getX();
        const redactRectY1 = annot.getY();
        const redactRectX2 = redactRectX1 + annot.getWidth();
        const redactRectY2 = redactRectY1 + annot.getHeight();
        // Redact all annotations that come in contact with the redaction box.
        const listOfAnnots = annotManager.getAnnotationsList();
        for (let i = listOfAnnots.length - 1; i >= 0; i--) {
          const currAnnot = listOfAnnots[i];
          const currAnnotPage = currAnnot.PageNumber;
          if (pageNumber !== currAnnotPage) {
            continue;
          } // discontinue if not on same page
          const currAnnotX1 = currAnnot.X;
          const currAnnotX2 = currAnnot.X + currAnnot.Width;
          if (redactRectX1 > currAnnotX2 || redactRectX2 < currAnnotX1) {
            continue; // discontinue if not on same vertical level
          }
          const currAnnotY1 = currAnnot.Y;
          const currAnnotY2 = currAnnot.Y + currAnnot.Height;
          if (redactRectY1 > currAnnotY2 || redactRectY2 < currAnnotY1) {
            continue; // discontinue if not on same horizontal level
          }
          annotManager.deleteAnnotation(currAnnot);
        }
        // Turn element coordinates into PDF coordinates
        const pdfCoord = docCore.getPDFCoordinates(pageNumber - 1, redactRectX1, redactRectY1);
        const pdfCoord2 = docCore.getPDFCoordinates(pageNumber - 1, redactRectX2, redactRectY2);

        const redactionArray = [];
        // Create our redaction object
        redactionArray.push(await PDFNet.Redactor.redactionCreate(pageNumber, (await PDFNet.Rect.init(pdfCoord.x, pdfCoord.y, pdfCoord2.x, pdfCoord2.y)), false, ''));
        const appear = {};
        await PDFNet.Redactor.redact(doc, redactionArray, appear, false, false);

        console.log('Redacted Area (x1: ' + pdfCoord.x + ', y1: ' + pdfCoord.y + ', x2: ' + pdfCoord2.x + ', y2: ' + pdfCoord2.y + ') redacted');
      } catch (err) {
        console.log(err.stack);
        ret = 1;
      }
    };
    return PDFNet.runWithCleanup(main);
  };
})();
// eslint-disable-next-line spaced-comment
//# sourceURL=config.js