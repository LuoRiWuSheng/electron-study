//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------

((exports) => {
  'use strict';

  exports.runDigitalSignatureTest = () => {
    const SignPDF = async() => {
      const infile = '../TestFiles/doc_to_sign.pdf';
      const certfile = '../TestFiles/pdftron.pfx';
      const imagefile = '../TestFiles/signature.jpg';

      const result = true;
      try {
        console.log('Signing PDF document: ');
        const doc = await PDFNet.PDFDoc.createFromURL(infile);
        doc.initSecurityHandler();
        doc.lock();
        console.log('PDFNet and PDF document initialized and locked');

        const sigHandlerId = await doc.addStdSignatureHandlerFromURL(certfile, 'password');

        // Obtain the signature form field from the PDFDoc via Annotation.
        const sigField = await doc.getField('Signature1');
        const widgetAnnot = await PDFNet.WidgetAnnot.createFromObj((await sigField.getSDFObj()));

        // Tell PDFNetC to use the SignatureHandler created to sign the new signature form field.
        const sigDict = await sigField.useSignatureHandler(sigHandlerId);

        // Add more information to the signature dictionary.
        // sigDict.PutName("SubFilter", "adbe.pkcs7.detached");
        await sigDict.putString('Name', 'PDFTron');
        await sigDict.putString('Location', 'Vancouver, BC');
        await sigDict.putString('Reason', 'Document verification.');

        // Add the signature appearance.
        const apWriter = await PDFNet.ElementWriter.create();
        const apBuilder = await PDFNet.ElementBuilder.create();

        apWriter.begin(doc);

        const sigImg = await PDFNet.Image.createFromURL(doc, imagefile);
        const w = await sigImg.getImageWidth();
        const h = await sigImg.getImageHeight();
        let apElement = await apBuilder.createImageScaled(sigImg, 0, 0, w, h);
        apWriter.writePlacedElement(apElement);
        let apObj = await apWriter.end();
        apObj.putRect('BBox', 0, 0, w, h);
        apObj.putName('Subtype', 'Form');
        apObj.putName('Type', 'XObject');
        apWriter.begin(doc);
        apElement = await apBuilder.createFormFromStream(apObj);
        apWriter.writePlacedElement(apElement);
        apObj = await apWriter.end();
        apObj.putRect('BBox', 0, 0, w, h);
        apObj.putName('Subtype', 'Form');
        apObj.putName('Type', 'XObject');

        await widgetAnnot.setAppearance(apObj);
        await widgetAnnot.refreshAppearance();

        const docbuf = await doc.saveMemoryBuffer(0);
        saveBufferAsPDFDoc(docbuf, 'signed_doc.pdf');

        console.log('Finished signing PDF document');
      } catch (err) {
        console.log(err);
      }
      return result;
    };

    const CertifyPDF = async() => {
      const infile = '../TestFiles/newsletter.pdf';
      const certfile = '../TestFiles/pdftron.pfx';
      const result = true;
      try {
        console.log('Certifying PDF document: "' + infile + '"');
        // Open existing PDF document.
        const doc = await PDFNet.PDFDoc.createFromURL(infile);
        doc.initSecurityHandler();
        doc.lock();
        // Add an StdSignatureHandler instance to PDFDoc, making sure to keep track of it using the ID returned.
        const sigHandlerId = await doc.addStdSignatureHandlerFromURL(certfile, 'password');
        // When using OpenSSLSignatureHandler class, uncomment the following lines and comment the line above.
        // Create a new instance of the SignatureHandler.
        // OpenSSLSignatureHandler sigHandler(certfile.ConvertToUtf8().c_str(), "password");
        // Add the SignatureHandler instance to PDFDoc, making sure to keep track of it using the ID returned.
        // SDF::SignatureHandlerId sigHandlerId = doc.AddSignatureHandler(sigHandler);

        // Create new signature form field in the PDFDoc.
        const sigField = await doc.fieldCreate('Signature1', PDFNet.Field.Type.e_signature);

        const page1 = await doc.getPage(1);
        const widgetAnnot = await PDFNet.WidgetAnnot.create((await doc.getSDFDoc()), (await PDFNet.Rect.init(0, 0, 0, 0)), sigField);
        page1.annotPushBack(widgetAnnot);
        widgetAnnot.setPage(page1);
        const widgetObj = await widgetAnnot.getSDFObj();
        widgetObj.putNumber('F', 132);
        widgetObj.putName('Type', 'Annot');

        // Tell PDFNetC to use the SignatureHandler created to sign the new signature form field.
        const sigDict = await sigField.useSignatureHandler(sigHandlerId);

        // Add more information to the signature dictionary.
        sigDict.putName('SubFilter', 'adbe.pkcs7,detached');
        sigDict.putString('Name', 'PDFTron');
        sigDict.putString('Location', 'Vancouver, BC');
        sigDict.putString('Reason', 'Document verification');

        // Appearance can be added to the widget annotation. Please see the "SignPDF()" function for details.

        // Add this sigDict as DocMDP in Perms dictionary from root
        const root = await doc.getRoot();
        const perms = await root.putDict('Perms');
        // add the sigDict as DocMDP (indirect) in Perms
        perms.put('DocMDP', sigDict);

        // add the additional DocMDP transform params
        const refObj = await sigDict.putArray('Reference');
        const transform = await refObj.pushBackDict();
        transform.putName('TransformMethod', 'DocMDP');
        transform.putName('Type', 'SigRef');
        const transformParams = await transform.putDict('TransformParams');
        transformParams.putNumber('P', 1); // Set permissions as necessary.
        transformParams.putName('Type', 'TransformParams');
        transformParams.putName('V', '1.2');

        const docbuf = await doc.saveMemoryBuffer(0);
        saveBufferAsPDFDoc(docbuf, 'newsletter_certified.pdf');

        console.log('Finished certifying PDF document.');
      } catch (err) {
        console.log(err);
      }
      return result;
    };

    const main = async() => {
      console.log('Beginning Test');
      let result = true;

      if (!(await SignPDF())) {
        result = false;
      }

      if (!(await CertifyPDF())) {
        result = false;
      }

      if (!result) {
        console.log('Tests Failed');
      } else {
        console.log('Done. All Tests Passed');
      }
    };
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=DigitalSignatureTest.js