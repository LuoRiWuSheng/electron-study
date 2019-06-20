//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------

((exports) => {
  'use strict';

  exports.runPDFRedactTest = () => {
    const main = async() => {
      console.log('Beginning Test');
      // Relative path to the folder containing test files.
      const inputPath = '../TestFiles/';
      // eslint-disable-next-line no-unused-vars
      let ret = 0;
      try {
        const doc = await PDFNet.PDFDoc.createFromURL(inputPath + 'newsletter.pdf');
        doc.initSecurityHandler();
        doc.lock();
        console.log('PDF document initialized and locked');

        const redactionArray = []; // we will contain a list of redaction objects in this array
        redactionArray.push(await PDFNet.Redactor.redactionCreate(1, (await PDFNet.Rect.init(100, 100, 550, 600)), false, 'Top Secret'));
        redactionArray.push(await PDFNet.Redactor.redactionCreate(2, (await PDFNet.Rect.init(30, 30, 450, 450)), true, 'Negative Redaction'));
        redactionArray.push(await PDFNet.Redactor.redactionCreate(2, (await PDFNet.Rect.init(0, 0, 100, 100)), false, 'Positive'));
        redactionArray.push(await PDFNet.Redactor.redactionCreate(2, (await PDFNet.Rect.init(100, 100, 200, 200)), false, 'Positive'));
        redactionArray.push(await PDFNet.Redactor.redactionCreate(2, (await PDFNet.Rect.init(300, 300, 400, 400)), false, ''));
        redactionArray.push(await PDFNet.Redactor.redactionCreate(2, (await PDFNet.Rect.init(500, 500, 600, 600)), false, ''));
        redactionArray.push(await PDFNet.Redactor.redactionCreate(3, (await PDFNet.Rect.init(0, 0, 700, 20)), false, ''));

        const appear = {};
        appear.redaction_overlay = true;
        const blue = await PDFNet.ColorPt.init(0.1, 0.2, 0.6, 0);
        appear.positive_overlay_color = blue;
        appear.border = false;
        const timesFont = await PDFNet.Font.create(doc, PDFNet.Font.StandardType1Font.e_times_roman);
        appear.font = timesFont;
        appear.show_redacted_content_regions = true;
        PDFNet.Redactor.redact(doc, redactionArray, appear, false, false);

        const docbuf = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
        saveBufferAsPDFDoc(docbuf, 'redacted.pdf');
        console.log('done');
      } catch (err) {
        console.log(err.stack);
        ret = 1;
      }
    };
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
}
)(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=PDFRedactTest.js