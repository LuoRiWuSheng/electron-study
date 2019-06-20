//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------

((exports) => {
  'use strict';

  exports.runSDFTest = () => {
    const main = async() => {
      console.log('Beginning SDF Test.');
      const inputURL = '../TestFiles/';

      try {
        // Here we create a SDF/Cos document directly from PDF file. In case you have
        // PDFDoc you can always access SDF/Cos document using PDFDoc.GetSDFDoc() method.
        const docorig = await PDFNet.PDFDoc.createFromURL(inputURL + 'fish.pdf');
        const doc = await docorig.getSDFDoc();
        doc.initSecurityHandler();
        doc.lock();
        console.log('Modifying into dictionary, adding custom properties, embedding a stream...');

        const trailer = await doc.getTrailer(); // Get the trailer

        // Now we will change PDF document information properties using SDF API

        // Get the Info dictionary.

        let itr = await trailer.find('Info');
        let info;
        if ((await itr.hasNext())) {
          info = await itr.value();
          // Modify 'Producer' entry.
          info.putString('Producer', 'PDFTron PDFNet');

          // read title entry if it is present
          itr = await info.find('Author');
          if (await (itr.hasNext())) {
            const itrval = await itr.value();
            const oldstr = await itrval.getAsPDFText();
            info.putText('Author', oldstr + ' - Modified');
          } else {
            info.putString('Author', 'Me, myself, and I');
          }
        } else {
          // Info dict is missing.
          info = await trailer.putDict('Info');
          info.putString('Producer', 'PDFTron PDFNet');
          info.putString('Title', 'My document');
        }

        // Create a custom inline dictionary within Infor dictionary
        const customDict = await info.putDict('My Direct Dict');
        customDict.putNumber('My Number', 100); // Add some key/value pairs
        customDict.putArray('My Array');

        // Create a custom indirect array within Info dictionary
        const customArray = await doc.createIndirectArray();
        info.put('My Indirect Array', customArray); // Add some entries

        // create indirect link to root
        const trailerRoot = await trailer.get('Root');
        customArray.pushBack((await trailerRoot.value()));

        // Embed a custom stream (file mystream.txt).
        const embedFile = await PDFNet.Filter.createURLFilter(inputURL + 'my_stream.txt');
        const mystm = await PDFNet.FilterReader.create(embedFile);
        const indStream = await doc.createIndirectStreamFromFilter(mystm);
        customArray.pushBack(indStream);

        const docbuf = await doc.saveMemory(0, '%PDF-1.4'); // PDFNet.SDFDoc.SaveOptions.e_remove_unused
        saveBufferAsPDFDoc(docbuf, 'sdftest_out.pdf');
        console.log('Done.');
      } catch (err) {
        console.log(err);
      }
    };
    // start the generator
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=SDFTest.js