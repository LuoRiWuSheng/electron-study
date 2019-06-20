//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------

((exports) => {
  'use strict';


  var createFDFFromXFDFURL = url => new Promise((resolve, reject) => {
    const xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function() {
      if (this.readyState === this.DONE) {
        if (xhttp.status === 200) {
          const data = xhttp.responseText;
          PDFNet.FDFDoc.createFromXFDF(data).then((fdfdoc) => {
            resolve(fdfdoc);
          }, (e) => {
            reject(e);
          });
        } else {
          reject('Request for URL ' + url + ' received incorrect HTTP response code ' + xhttp.status);
        }
      }
    };
    xhttp.open('GET', url, true);
    xhttp.send();
  });


  exports.runFDFTest = () => {
    const main = async() => {
      console.log('Beginning FDF Test.');
      const inputUrl = '../TestFiles/';

      // Import XFDF into FDF, then update adjust the PDF annotations to match the FDF
      try {
        // Annotations
        console.log('Import annotations from XFDF to FDF.');
        const fdfDoc = await createFDFFromXFDFURL(inputUrl + 'form1_annots.xfdf');

        const doc = await PDFNet.PDFDoc.createFromURL(inputUrl + 'form1.pdf');
        doc.initSecurityHandler();

        console.log('Update annotations from fdf');
        doc.fdfUpdate(fdfDoc);

        const docbuf = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
        saveBufferAsPDFDoc(docbuf, 'form1_with_annots.pdf');
        console.log('Done sample');
      } catch (err) {
        console.log(err);
      }
    };
    // start the generator
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=FDFTest.js