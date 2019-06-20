(() => {
  const refreshSVG = color => '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="' + color + '"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/><path d="M0 0h24v24H0z" fill="none"/></svg>';

  const runElementEditTest = (pdfDoc) => {
    let ProcessElements = () => {};
    // getting around gulp error for recurive async functions
    ProcessElements = async(reader, writer, visited) => {
      await PDFNet.startDeallocateStack();
      console.log('Processing elements');
      let element;
      let gs;
      const colorspace = await PDFNet.ColorSpace.createDeviceRGB();
      const redColor = await PDFNet.ColorPt.init(1, 0, 0, 0);
      const blueColor = await PDFNet.ColorPt.init(0, 0, 1, 0);
      for (element = await reader.next(); element !== null; element = await reader.next()) {
        const elementType = await element.getType();
        let formObj, formObjNum, insertedObj, newWriter;

        switch (elementType) {
          case PDFNet.Element.Type.e_image:
          case PDFNet.Element.Type.e_inline_image:
            // remove all images by skipping them
            break;
          case PDFNet.Element.Type.e_path:
            // Set all paths to red
            gs = await element.getGState();
            gs.setFillColorSpace(colorspace);
            gs.setFillColorWithColorPt(redColor);
            // Note: since writeElement does not return an object, the await is technically unneeded.
            // However, on a slower computer or browser writeElement may not finish before the page is
            // updated, so the await ensures that all changes are finished before continuing.
            await writer.writeElement(element);
            break;
          case PDFNet.Element.Type.e_text:
            // Set all text to blue
            gs = await element.getGState();
            gs.setFillColorSpace(colorspace);
            gs.setFillColorWithColorPt(blueColor);
            // Same as above comment on writeElement
            await writer.writeElement(element);
            break;
          case PDFNet.Element.Type.e_form:
            await writer.writeElement(element);
            formObj = await element.getXObject();
            formObjNum = formObj.getObjNum();
            // if XObject not yet processed
            if (visited.indexOf(formObjNum) === -1) {
              // Set Replacement
              insertedObj = await formObj.getObjNum();
              if (_.findWhere(visited, insertedObj) == null) {
                visited.push(insertedObj);
              }
              newWriter = await PDFNet.ElementWriter.create();
              reader.formBegin();
              newWriter.beginOnObj(formObj, true);
              await ProcessElements(reader, newWriter, visited);
              newWriter.end();
              reader.end();
              if (newWriter) {
                newWriter.destroy();
              }
            }
            break;
          default:
            await writer.writeElement(element);
        }
      }
      await PDFNet.endDeallocateStack();
    };

    const main = async() => {
      let ret = 0;
      try {
        // eslint-disable-next-line no-unused-vars
        let islocked = false;
        const doc = pdfDoc;
        doc.lock();
        islocked = true;
        doc.initSecurityHandler();

        const writer = await PDFNet.ElementWriter.create();
        const reader = await PDFNet.ElementReader.create();
        const visited = [];

        const pageCount = await doc.getPageCount();

        let pageCounter = 1;
        while (pageCounter <= pageCount) {
          // This section is only required to ensure the page is available
          // for incremental download. At the moment the call to requirePage must be
          // be wrapped in this manner to avoid potential deadlocks and
          // allow other parts of the viewer to run while the page is being downloaded.
          doc.unlock();
          await PDFNet.finishOperation();
          await doc.requirePage(pageCounter);
          await PDFNet.beginOperation();
          doc.lock();

          // load the page and begin processing
          const page = await doc.getPage(pageCounter);
          const sdfObj = await page.getSDFObj();
          const insertedObj = await sdfObj.getObjNum();
          if (_.findWhere(visited, insertedObj) == null) {
            visited.push(insertedObj);
          }
          reader.beginOnPage(page);
          writer.beginOnPage(page, PDFNet.ElementWriter.WriteMode.e_replacement, false);
          await ProcessElements(reader, writer, visited);
          writer.end();
          reader.end();
          console.log('page ' + pageCounter + ' finished editing');
          pageCounter++;
        }
        console.log('Done.');
      } catch (err) {
        console.log(err.stack);
        ret = 1;
      }
      return ret;
    };

    return PDFNet.runWithCleanup(main);
  };

  $(document).on('documentLoaded', () => {
    PDFNet.initialize().then(() => {
      const doc = readerControl.docViewer.getDocument();
      doc.getPDFDoc().then((pdfDoc) => {
        readerControl.setHeaderItems((headerItems) => {
          headerItems.push({
            initialState: 'enabled',
            type: 'statefulButton',
            states: {
              enabled: {
                img: refreshSVG('currentColor'),
                onClick: (update) => {
                  update('disabled');
                  runElementEditTest(pdfDoc).then(() => {
                    // re-enable our button
                    update('enabled');
                    // refresh the cache with the newly updated document
                    readerControl.docViewer.refreshAll();
                    // update viewer with new document
                    readerControl.docViewer.updateView();
                  });
                }
              },
              disabled: {
                img: refreshSVG('lightgray'),
                onClick: () => {}
              }
            },
          });

          return headerItems;
        });
      });
    });
  });
})();
// eslint-disable-next-line spaced-comment
//# sourceURL=config.js