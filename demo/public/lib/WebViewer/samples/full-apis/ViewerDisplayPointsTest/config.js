(() => {
  // Stores information of the elements of each page so that we don't have to recompute them on subsequent clicks
  let pageElementDataList = [];

  // prevListenerFunc required to clean up mouse event listeners after switching documents
  let prevListenerFunc;
  // keep track of previously created annotations so that they can be cleaned up
  let prevAnnotations = [];
  $(document).on('documentLoaded', () => {
    PDFNet.initialize().then(() => {
      // get document
      let stillRunning = false;
      const documentViewer = readerControl.docViewer;
      const doc = documentViewer.getDocument();
      doc.getPDFDoc().then((pdfDoc) => {
        if (prevListenerFunc) {
          // If we have a previously loaded pdf document, remove any event listeners from that document.
          documentViewer.getViewer()[0].removeEventListener('mousedown', prevListenerFunc);
          // Clear out any information about the pdf's elements we may have stored.
          pageElementDataList = [];
        }
        const handleMouseClick = (evt) => {
          // Make a check to see if processes are still running to prevent multiple from running at same time.
          if (!stillRunning) {
            stillRunning = true;
            const annotManager = readerControl.docViewer.getAnnotationManager();
            if (prevAnnotations.length > 0) {
              for (let i = 0; i < prevAnnotations.length; i++) {
                annotManager.deleteAnnotation(prevAnnotations[i]);
              }
              prevAnnotations = [];
            }
            console.log('MouseClick X: ' + evt.pageX + ', MouseClick Y: ' + evt.pageY);

            // Get the Window coordinates
            const scrollContainer = $('.DocumentContainer');
            const viewportTop = scrollContainer.scrollTop();
            const viewportLeft = scrollContainer.scrollLeft();
            const windowCoord = { x: (evt.pageX + viewportLeft), y: (evt.pageY + viewportTop) };

            const displayModeManager = documentViewer.getDisplayModeManager();
            const displayMode = displayModeManager.getDisplayMode();
            // Get which page was clicked on
            const pageIndex = displayMode.getSelectedPages(windowCoord, windowCoord).first;

            pdfDoc.requirePage(pageIndex + 1).then(() =>
              // Get the context from the doc which is used for properly reading the elements on the pdf document.
              doc.extractPDFNetLayersContext() // layers context object, whenever layers changed, want to recalculate.
            ).then(layersContextID =>
              // running custom PDFNetJS script
              runCustomScript(pdfDoc, layersContextID, windowCoord, pageIndex, documentViewer, Annotations, annotManager)
            ).then(() => {
              console.log('finished script');
              // refresh information on viewer and update appearance
              documentViewer.updateView();
              stillRunning = false;
            });
          }
        };
        prevListenerFunc = handleMouseClick;
        documentViewer.getViewer()[0].addEventListener('mousedown', handleMouseClick);
      });
    });
  });

  const runCustomScript = (pdfDoc, layersContextID, windowCoord, pageIndex, documentViewer, Annotations, annotManager) => {
    // eslint-disable-next-line no-unused-vars
    const setPoint = async(pdfCoord, pageIndex, builder, writer, rectImg, testSize) => {
      let size = 5;
      if (testSize !== undefined) {
        size = testSize;
      }
      const posMatrix = await PDFNet.Matrix2D.create(size, 0, 0, size, pdfCoord.x - 2.5, pdfCoord.y - 2.5);
      const rectElement = await builder.createImageFromMatrix(rectImg, posMatrix);
      writer.writePlacedElement(rectElement);
    };

    const DrawRectangleAnnot = async(pageIndex, x1, y1, x2, y2) => {
      const p1 = docCore.getViewerCoordinates(pageIndex, x1, y1);
      const p2 = docCore.getViewerCoordinates(pageIndex, x2, y2);

      const displayAnnot = new Annotations.RectangleAnnotation();
      displayAnnot.setPageNumber(pageIndex + 1);
      displayAnnot.setRect(new Annotations.Rect(p1.x, Math.min(p1.y, p2.y), p2.x, Math.max(p1.y, p2.y)));
      annotManager.addAnnotation(displayAnnot);
      prevAnnotations.push(displayAnnot);
    };

    const DrawPointAnnot = async(pageIndex, x, y) => {
      const p1 = docCore.getViewerCoordinates(pageIndex, x, y);
      const p2 = docCore.getViewerCoordinates(pageIndex, x, y);
      p1.x -= 2;
      p1.y -= 2;
      p2.x += 2;
      p2.y += 2;
      const displayAnnot = new Annotations.RectangleAnnotation();
      displayAnnot.setPageNumber(pageIndex + 1);

      displayAnnot.FillColor = new Annotations.Color(255, 255, 0, 1);
      displayAnnot.StrokeColor = new Annotations.Color(255, 0, 0, 1);

      displayAnnot.setRect(new Annotations.Rect(p1.x, Math.min(p1.y, p2.y), p2.x, Math.max(p1.y, p2.y)));
      annotManager.addAnnotation(displayAnnot);
      prevAnnotations.push(displayAnnot);
    };

    const ProcessElements = async(pageElementData, pageBuilder, doc, page, pageIndex, pdfMousePoint, selectTopElementOnly) => {
      // Read page contents, last object is top object
      let pageRotMtx = await page.getDefaultMatrix();
      pageRotMtx = await pageRotMtx.inverse();
      const rotatedMousePoint = await pageRotMtx.mult(pdfMousePoint.x, pdfMousePoint.y);
      // (optional) display mouse point
      // await DrawPointAnnot(pageIndex, rotatedMousePoint.x, rotatedMousePoint.y);
      for (let elementNum = pageElementData.length - 1; elementNum >= 0; elementNum--) {
        const element = pageElementData[elementNum];
        const elementBBox = element.bbox;
        // Check bounding box
        if (elementBBox.x1 < rotatedMousePoint.x && elementBBox.x2 > rotatedMousePoint.x && elementBBox.y1 < rotatedMousePoint.y && elementBBox.y2 > rotatedMousePoint.y) {
          console.log('bounding box detected');
        } else {
          // mouseclick outside of any available bbox;
          continue;
        }
        await DrawRectangleAnnot(pageIndex, elementBBox.x1, elementBBox.y1, elementBBox.x2, elementBBox.y2);
        if (element.name === 'path') {
          await ProcessPaths(element.operators, element.points, element.ctm, pageIndex);
        }
        if (selectTopElementOnly) {
          break;
        }
      }
    };

    // Draw out all path points
    const ProcessPaths = async(opr, pointList, currTransMtx, pageIndex) => {
      let pointIndex = 0;
      if (opr.length > 4000) {
        console.log('Processing ' + opr.length + ' points. This will take significant time.');
      } else if (opr.length > 500) {
        console.log('Processing ' + opr.length + ' points. This may take some time.');
      }

      for (let oprIndex = 0; oprIndex < opr.length; ++oprIndex) {
        let x1, y1, x2, y2, x3, y3, x4, y4, w, h, pagePoint, pagePoint1, pagePoint2, pagePoint3, pagePoint4;
        switch (opr[oprIndex]) {
          case PDFNet.Element.PathSegmentType.e_moveto:
            // code to handle move segments
            x1 = pointList[pointIndex]; ++pointIndex;
            y1 = pointList[pointIndex]; ++pointIndex;
            pagePoint = await currTransMtx.mult(x1, y1);
            await DrawPointAnnot(pageIndex, pagePoint.x, pagePoint.y);
            break;
          case PDFNet.Element.PathSegmentType.e_lineto:
            // code to handle line segments
            x1 = pointList[pointIndex]; ++pointIndex;
            y1 = pointList[pointIndex]; ++pointIndex;
            pagePoint = await currTransMtx.mult(x1, y1);
            await DrawPointAnnot(pageIndex, pagePoint.x, pagePoint.y);
            break;
          case PDFNet.Element.PathSegmentType.e_cubicto:
            // code to handle cubic segments
            x1 = pointList[pointIndex]; ++pointIndex;
            y1 = pointList[pointIndex]; ++pointIndex;
            x2 = pointList[pointIndex]; ++pointIndex;
            y2 = pointList[pointIndex]; ++pointIndex;
            x3 = pointList[pointIndex]; ++pointIndex;
            y3 = pointList[pointIndex]; ++pointIndex;
            pagePoint = await currTransMtx.mult(x3, y3);
            await DrawPointAnnot(pageIndex, pagePoint.x, pagePoint.y);
            break;
          case PDFNet.Element.PathSegmentType.e_rect:
            // code to handle rect segments
            x1 = pointList[pointIndex]; ++pointIndex;
            y1 = pointList[pointIndex]; ++pointIndex;
            w = pointList[pointIndex]; ++pointIndex;
            h = pointList[pointIndex]; ++pointIndex;
            x2 = x1 + w;
            y2 = y1;
            x3 = x2;
            y3 = y1 + h;
            x4 = x1;
            y4 = y3;
            pagePoint1 = await currTransMtx.mult(x1, y1);
            pagePoint2 = await currTransMtx.mult(x2, y2);
            pagePoint3 = await currTransMtx.mult(x3, y3);
            pagePoint4 = await currTransMtx.mult(x4, y4);

            await DrawPointAnnot(pageIndex, pagePoint1.x, pagePoint1.y);
            await DrawPointAnnot(pageIndex, pagePoint2.x, pagePoint2.y);
            await DrawPointAnnot(pageIndex, pagePoint3.x, pagePoint3.y);
            await DrawPointAnnot(pageIndex, pagePoint4.x, pagePoint4.y);
            break;
          case PDFNet.Element.PathSegmentType.e_closepath:
            break;
          default:
            break;
        }
      }
      // ensure that we update the view
      annotManager.drawAnnotations(pageIndex + 1);
    };

    // Store all information we need so that we won't have to do this a second time.
    const ExtractElements = async(pageReader) => {
      let elementArray = [];
      // Read page contents
      for (let element = (await pageReader.next()); element !== null; element = (await pageReader.next())) {
        // does not display invisible elements or clipping path elements
        if (!(await element.isOCVisible()) || (await element.isClippingPath())) {
          continue;
        }
        // trace out images and paths (does not include text)
        const ctm = await element.getCTM();
        const elemType = await element.getType();
        let elementBBox, retObj;
        switch (elemType) {
          case PDFNet.Element.Type.e_path: // Process path data
            {
              // extract path information
              const pathinfo = await element.getPathData();
              const opr = new Uint8Array(pathinfo.operators);
              const points = new Float64Array(pathinfo.points);
              elementBBox = await element.getBBox();
              retObj = {
                name: 'path', type: elemType, ctm: ctm, operators: opr, points: points, bbox: elementBBox
              };
              elementArray.push(retObj);
            }
            break;
          case PDFNet.Element.Type.e_image: // Process image data
            {
              elementBBox = await element.getBBox();
              const elementXObj = await element.getXObject();
              const elementNum = await elementXObj.getObjNum();
              retObj = {
                name: 'image', type: elemType, num: elementNum, ctm: ctm, bbox: elementBBox
              };
              elementArray.push(retObj);
            }
            break;
          case PDFNet.Element.Type.e_form: // Process form XObjects
            {
              pageReader.formBegin();
              const elemArray2 = await ExtractElements(pageReader);
              elementArray = elementArray.concat(elemArray2);
              pageReader.end();
            }
            break;
          default:
            break;
        }
      }
      return elementArray;
    };


    const displayModeManager = documentViewer.getDisplayModeManager();
    const displayMode = displayModeManager.getDisplayMode();
    let docCore = documentViewer.getDocument();
    const main = async() => {
      // eslint-disable-next-line no-unused-vars
      let ret = 0;
      try {
        const doc = pdfDoc;
        doc.lock();
        doc.initSecurityHandler();

        // to select all elements underneath mouse click instead of just the top-most element, change to false.
        const selectTopElementOnly = true;

        const pageNum = pageIndex + 1;
        const viewerPageCoord = displayMode.windowToPage(windowCoord, pageIndex);
        let pdfCoord = docCore.getPDFCoordinates(pageIndex, viewerPageCoord.x, viewerPageCoord.y);

        const pageReader = await PDFNet.ElementReader.create();
        const pageBuilder = await PDFNet.ElementBuilder.create();

        let currPage = await doc.getPage(pageNum);
        // making sure mouse position is adjusted for rotations
        const pageRotMtx = await currPage.getDefaultMatrix();
        pdfCoord = await pageRotMtx.mult(pdfCoord.x, pdfCoord.y);

        let pageElementData = pageElementDataList[pageIndex];
        let layersContext;
        // Read from the document and find its relevant elements if we haven't done so before.
        if (pageElementData === undefined) {
          currPage = await doc.getPage(pageNum);
          layersContext = new PDFNet.OCGContext(layersContextID);
          pageReader.beginOnPage(currPage, layersContext);

          pageElementData = await ExtractElements(pageReader);
          pageElementDataList[pageIndex] = pageElementData;
          pageReader.end();
        }

        // Process the found elements
        currPage = await doc.getPage(pageNum);
        layersContext = new PDFNet.OCGContext(layersContextID);
        await ProcessElements(pageElementData, pageBuilder, doc, currPage, pageIndex, pdfCoord, selectTopElementOnly);

        const sq = await PDFNet.SquareAnnot.create(doc, PDFNet.Rect(10, 200, 800, 300));
        sq.setColor((await PDFNet.ColorPt.init(0, 0, 0)), 3);
        sq.refreshAppearance();
        currPage.annotPushBack(sq);
      } catch (err) {
        console.log(err.stack);
        ret = 1;
      }
    };

    // start the generator
    return PDFNet.runWithCleanup(main);
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=config.js