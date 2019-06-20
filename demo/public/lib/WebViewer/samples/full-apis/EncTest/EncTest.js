//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------
((exports) => {
  'use strict';

  exports.runEncTest = () => {
    const main = async() => {
      console.log('Beginning Test');
      let ret = 0;
      // Relative path to the folder containing test files.
      const inputUrl = '../TestFiles/';
      let doc = null;
      // Example 1:
      // secure a PDF document with password protection and adjust permissions
      try {
        console.log('Running Sample 1');
        // eslint-disable-next-line no-unused-vars
        let islocked = false;
        doc = await PDFNet.PDFDoc.createFromURL(inputUrl + 'fish.pdf');
        doc.initSecurityHandler();
        doc.lock();
        islocked = true;
        console.log('PDFNet and PDF document initialized and locked');

        const performOperation = true; // optional parameter

        // Perform some operation on the document. In this case we use low level SDF API
        // to replace the content stream of the first page with contents of file 'my_stream.txt'
        // Results in fish.pdf becoming a pair of feathers.
        if (performOperation) {
          console.log('Replacing the content stream, use Flate compression...');
          // Get the page dictionary using the following path: trailer/Root/Pages/Kids/0
          const pageTrailer = await doc.getTrailer();
          const pageRoot = await pageTrailer.get('Root');
          const pageRootValue = await pageRoot.value();
          const pages = await pageRootValue.get('Pages');
          const pagesVal = await pages.value();
          const kids = await pagesVal.get('Kids');
          const kidsVal = await kids.value();
          const pageDict = await kidsVal.getAt(0);

          const embedFile = await PDFNet.Filter.createURLFilter(inputUrl + 'my_stream.txt');
          const mystm = await PDFNet.FilterReader.create(embedFile);

          const emptyFilter = new PDFNet.Filter('0');
          const flateEncode = await PDFNet.Filter.createFlateEncode(emptyFilter);

          const indStream = await doc.createIndirectStreamFromFilter(mystm, flateEncode);
          await pageDict.put('Contents', indStream);
        }

        // Encrypt the document
        // Apply a new security handler with given security settings.
        // In order to open saved PDF you will need a user password 'test'.
        const newHandler = await PDFNet.SecurityHandler.createDefault();

        // Set a new password required to open a document
        newHandler.changeUserPasswordUString('test');
        console.log("Setting password to 'test'");

        // Set Permissions
        newHandler.setPermission(PDFNet.SecurityHandler.Permission.e_print, false);
        newHandler.setPermission(PDFNet.SecurityHandler.Permission.e_extract_content, true);

        // Note: document takes the ownership of newHandler.
        doc.setSecurityHandler(newHandler);

        // Save the changes
        console.log('Saving modified file...');

        const docbuf = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
        saveBufferAsPDFDoc(docbuf, 'secured.pdf');
      } catch (err) {
        console.log(err);
        console.log(err.stack);
        ret = 1;
      }

      // Example 2:
      // Opens an encrypted PDF document and removes its security.
      try {
        console.log('Running Sample 2');
        const securedDoc = doc;

        if (!(await securedDoc.initSecurityHandler())) {
          let success = false;
          console.log("The password has been set to : 'test'");
          const passwordsToTry = ['password', 'testy', 'test'];

          for (let count = 0; count < passwordsToTry.length; count++) {
            const candidate = passwordsToTry[count];
            console.log("Trying password candidate: '" + candidate + "'");
            if ((await securedDoc.initStdSecurityHandlerUString(candidate))) {
              success = true;
              console.log('The password is correct');
              break;
            } else {
              console.log('The password is incorrect.');
            }
          }
          if (!success) {
            console.log('Document authentication error...');
            ret = 1;
            return ret;
          }
        }
        securedDoc.lock();

        console.log('PDF document initialized and locked');
        const hdlr = await securedDoc.getSecurityHandler();

        console.log('Document Open Password: ' + (await hdlr.isUserPasswordRequired()));
        console.log('Permissions Password: ' + (await hdlr.isMasterPasswordRequired()));
        console.log('Permissions: ');
        console.log("\tHas 'owner' permissions: " + (await hdlr.getPermission(PDFNet.SecurityHandler.Permission.e_owner)));

        console.log('\tOpen and decrypt the document: ' + (await hdlr.getPermission(PDFNet.SecurityHandler.Permission.e_doc_open)));
        console.log('\tAllow content extraction: ' + (await hdlr.getPermission(PDFNet.SecurityHandler.Permission.e_extract_content)));
        console.log('\tAllow full document editing: ' + (await hdlr.getPermission(PDFNet.SecurityHandler.Permission.e_doc_modify)));
        console.log('\tAllow printing: ' + (await hdlr.getPermission(PDFNet.SecurityHandler.Permission.e_print)));
        console.log('\tAllow high resolution printing: ' + (await hdlr.getPermission(PDFNet.SecurityHandler.Permission.e_print_high)));
        console.log('\tAllow annotation editing: ' + (await hdlr.getPermission(PDFNet.SecurityHandler.Permission.e_mod_annot)));
        console.log('\tAllow form fill: ' + (await hdlr.getPermission(PDFNet.SecurityHandler.Permission.e_fill_forms)));
        console.log('\tAllow content extraction for accessibility: ' + (await hdlr.getPermission(PDFNet.SecurityHandler.Permission.e_access_support)));
        console.log('\tAllow document assembly: ' + (await hdlr.getPermission(PDFNet.SecurityHandler.Permission.e_assemble_doc)));

        // remove all security on the document
        securedDoc.removeSecurity();

        const docbuf = await securedDoc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
        saveBufferAsPDFDoc(docbuf, 'not_secured.pdf');
        console.log('done');
      } catch (err) {
        console.log(err.stack);
        ret = 1;
      }
      return ret;
    };

    // start the generator
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=EncTest.js