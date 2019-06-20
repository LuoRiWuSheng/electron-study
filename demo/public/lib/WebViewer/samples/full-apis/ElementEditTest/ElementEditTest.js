//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------

((exports) => {
  'use strict';

  exports.runElementEditTest = () => {
    async function ProcessElements(reader, writer, visited) {
      await PDFNet.startDeallocateStack();
      const colorspace = await PDFNet.ColorSpace.createDeviceRGB();
      const redColor = await PDFNet.ColorPt.init(1, 0, 0, 0);
      const blueColor = await PDFNet.ColorPt.init(0, 0, 1, 0);

      for (let element = await reader.next(); element !== null; element = await reader.next()) {
        const elementType = await element.getType();
        let gs, formObj, formObjNum = null;
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
            writer.writeElement(element);
            break;
          case PDFNet.Element.Type.e_text:
            // Set all text to blue
            gs = await element.getGState();
            gs.setFillColorSpace(colorspace);
            gs.setFillColorWithColorPt(blueColor);
            writer.writeElement(element);
            break;
          case PDFNet.Element.Type.e_form:
            writer.writeElement(element);
            formObj = await element.getXObject();
            formObjNum = formObj.getObjNum();
            // if XObject not yet processed
            if (visited.indexOf(formObjNum) === -1) {
              // Set Replacement
              const insertedObj = await formObj.getObjNum();
              if (_.findWhere(visited, insertedObj) == null) {
                visited.push(insertedObj);
              }
              const newWriter = await PDFNet.ElementWriter.create();
              reader.formBegin();
              newWriter.beginOnObj(formObj, true);
              await ProcessElements(reader, newWriter, visited);
              newWriter.end();
              reader.end();
            }
            break;
          default:
            writer.writeElement(element);
        }
      }
      await PDFNet.endDeallocateStack();
    }

    const main = async() => {
      console.log('Beginning Test');
      const ret = 0;
      // Relative path to the folder containing test files.
      const inputUrl = '../TestFiles/';
      const doc = await PDFNet.PDFDoc.createFromURL(inputUrl + 'newsletter.pdf');
      doc.initSecurityHandler();
      doc.lock();

      console.log('PDF document initialized and locked');
      const writer = await PDFNet.ElementWriter.create();
      const reader = await PDFNet.ElementReader.create();
      const visited = [];

      const totalPageNumber = await doc.getPageCount();

      const itr = await doc.getPageIterator(1);

      // Read every page
      for (itr; await itr.hasNext(); itr.next()) {
        const page = await itr.current();
        const currentPageNumber = await page.getIndex();
        console.log('Processing elements on page ' + currentPageNumber + '/' + totalPageNumber);
        const sdfObj = await page.getSDFObj();
        // Set Replacement
        const insertedObj = await sdfObj.getObjNum();
        if (_.findWhere(visited, insertedObj) == null) {
          visited.push(insertedObj);
        }
        reader.beginOnPage(page);
        writer.beginOnPage(page, PDFNet.ElementWriter.WriteMode.e_replacement, false);
        await ProcessElements(reader, writer, visited);
        writer.end();
        reader.end();
      }

      const docBuffer = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_remove_unused);
      saveBufferAsPDFDoc(docBuffer, 'newsletter_edited.pdf');
      console.log('Done.');
      return ret;
    };
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=ElementEditTest.js