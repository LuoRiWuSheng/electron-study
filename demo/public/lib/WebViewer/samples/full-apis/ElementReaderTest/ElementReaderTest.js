//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------

((exports) => {
  'use strict';

  exports.runElementReaderTest = () => {
    const ProcessElements = async(reader) => {
      // Read page contents
      for (let element = await reader.next(); element !== null; element = await reader.next()) {
        const temp = await element.getType();
        switch (temp) {
          case exports.PDFNet.Element.Type.e_path: // Process path data...
            {
              const data = await element.getPathData();
              /* eslint-disable no-unused-vars */
              const operators = data.operators;
              const points = data.points;
              /* eslint-enable no-unused-vars */
            }
            break;
          case exports.PDFNet.Element.Type.e_text: // Process text strings...
            {
              const data = await element.getTextString();
              console.log(data);
            }
            break;
          case exports.PDFNet.Element.Type.e_form: // Process form XObjects
            {
              reader.formBegin();
              await ProcessElements(reader);
              reader.end();
            }
            break;
          default:
        }
      }
    };

    const main = async() => {
      console.log('Beginning Test');
      const ret = 0;

      // Relative path to the folder containing test files.
      const inputUrl = '../TestFiles/';

      const doc = await exports.PDFNet.PDFDoc.createFromURL(inputUrl + 'newsletter.pdf');// await if there is ret that we care about.
      doc.initSecurityHandler();
      doc.lock();
      console.log('PDFNet and PDF document initialized and locked');

      // eslint-disable-next-line no-unused-vars
      const pgnum = await doc.getPageCount();
      const pageReader = await exports.PDFNet.ElementReader.create();
      const itr = await doc.getPageIterator(1);

      // Read every page
      for (itr; await itr.hasNext(); itr.next()) {
        const curritr = await itr.current();
        pageReader.beginOnPage(curritr);
        await ProcessElements(pageReader);
        pageReader.end();
      }

      console.log('Done.');
      return ret;
    };

    // start the generator
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=ElementReaderTest.js