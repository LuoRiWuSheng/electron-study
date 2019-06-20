//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------
((exports) => {
  'use strict';

  exports.runPDFA = () => {
    const main = async() => {
      try {
        console.log('PDFA validation test begins.');

        const inputURL = '../TestFiles/';
        const inputFilename = 'newsletter.pdf';

        const convert = false;
        const pwd = '';
        let exceptions;
        const maxRefObjs = 10;
        const firstStop = false;
        const url = inputURL + inputFilename;

        const pdfa = await PDFNet.PDFACompliance.createFromUrl(convert, url, pwd, PDFNet.PDFACompliance.Conformance.e_Level1B, exceptions, maxRefObjs, firstStop);

        const errorCount = await pdfa.getErrorCount();
        if (errorCount === 0) {
          console.log(inputFilename + ' is a valid PDFA.');
        } else {
          console.log(inputFilename + ' is NOT a valid PDFA.');
          for (let i = 0; i < errorCount; i++) {
            const errorCode = await pdfa.getError(i);
            const errorMsg = await PDFNet.PDFACompliance.getPDFAErrorMessage(errorCode);
            const numRefs = await pdfa.getRefObjCount(errorCode);
            if (numRefs > 0) {
              const objs = [];
              for (let j = 0; j < numRefs; j++) {
                const objRef = await pdfa.getRefObj(errorCode, j);
                objs.push(objRef);
              }
              console.log('Error:' + errorMsg + '. Objects:' + objs.toString());
            }
          }
        }
      } catch (err) {
        console.log(err);
      }
      try {
        console.log('PDFA conversion test begins.');

        const inputURL = '../TestFiles/';
        const inputFilename = 'fish.pdf';
        const outputFilename = 'fish_pdfa.pdf';

        const convert = true;
        const pwd = '';
        let exceptions;
        const maxRefObjs = 10;
        const urlInput = inputURL + inputFilename;

        console.log('Converting input document: ' + inputFilename);
        const pdfa = await PDFNet.PDFACompliance.createFromUrl(convert, urlInput, pwd, PDFNet.PDFACompliance.Conformance.e_Level1B, exceptions, maxRefObjs);

        const errorCount = await pdfa.getErrorCount();
        if (errorCount === 0) {
          console.log(inputFilename + ' is a valid PDFA.');
        } else {
          console.log(inputFilename + ' is NOT a valid PDFA.');
        }

        console.log('Save and validate the converted document: ' + outputFilename);
        const linearize = true;
        const docBuffer = await pdfa.saveAsFromBuffer(linearize);
        saveBufferAsPDFDoc(docBuffer, outputFilename);
        const validateOnly = false;
        const pdfaValidate = await PDFNet.PDFACompliance.createFromBuffer(validateOnly, docBuffer, pwd, PDFNet.PDFACompliance.Conformance.e_Level1B, exceptions, maxRefObjs);
        const errorCountValidate = await pdfaValidate.getErrorCount();
        if (errorCountValidate === 0) {
          console.log(outputFilename + ' is a valid PDFA.');
        } else {
          console.log(outputFilename + ' is NOT a valid PDFA.');
        }
      } catch (err) {
        console.log(err);
      }
    };
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=PDFATest.js
