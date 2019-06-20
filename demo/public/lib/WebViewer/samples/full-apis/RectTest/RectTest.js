//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------

((exports) => {
  'use strict';

  exports.runRectTest = () => {
    const main = async() => {
      let ret = 0;
      try {
        console.log('Beginning Rect Test. This test will take the rect box of an image and move/translate it');

        const inputPath = '../TestFiles/';
        const doc = await PDFNet.PDFDoc.createFromURL(inputPath + 'tiger.pdf');
        doc.initSecurityHandler();
        doc.lock();
        console.log('PDF document initialized and locked');

        const pgItr1 = await doc.getPageIterator();
        const mediaBox = await (await pgItr1.current()).getMediaBox();
        mediaBox.x1 -= 200; // translate page 200 units left(1 uint = 1/72 inch)
        mediaBox.x2 -= 200;

        await mediaBox.update();

        const docbuf = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
        saveBufferAsPDFDoc(docbuf, 'tiger_shift.pdf');
        console.log('Done.');
      } catch (err) {
        console.log(err);
        ret = 1;
      }
      return ret;
    };
    // start the generator
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=AnnotationTest.js