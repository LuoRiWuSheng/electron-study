//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------

((exports) => {
  'use strict';

  exports.runPDFDrawTest = () => {
    const main = async() => {
      console.log('Beginning Test');
      const ret = 0;
      const inputUrl = '../TestFiles/';
      const doc = await exports.PDFNet.PDFDoc.createFromURL(inputUrl + 'newsletter.pdf');
      doc.initSecurityHandler();
      doc.lock();

      console.log('PDFNet and PDF document initialized and locked');

      const pdfdraw = await exports.PDFNet.PDFDraw.create(92);
      const itr = await doc.getPageIterator(1);
      const currPage = await itr.current();
      const pngBuffer = await pdfdraw.exportStream(currPage, 'PNG');
      saveBufferAsPNG(pngBuffer, 'newsletter.png');
      const tifBuffer = await pdfdraw.exportStream(currPage, 'TIFF');
      saveBufferAsPNG(tifBuffer, 'newsletter.tif');

      console.log('Done');
      return ret;
    };

    // start the generator
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=PDFDrawTest.js