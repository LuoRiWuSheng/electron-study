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

  exports.runAddImageTest = () => {
    const PDFNet = exports.PDFNet;

    const main = async() => {
      try {
        console.log('Beginning Test');
        // Relative path to the folder containing test files.
        const inputURL = '../TestFiles/';

        const doc = await PDFNet.PDFDoc.create();
        doc.initSecurityHandler();
        doc.lock();
        console.log('PDFNet and PDF document initialized and locked');

        const builder = await PDFNet.ElementBuilder.create(); // ElementBuilder, used to build new element Objects
        // create a new page writer that allows us to add/change page elements
        const writer = await PDFNet.ElementWriter.create(); // ElementWriter, used to write elements to the page
        // define new page dimensions
        const pageRect = await PDFNet.Rect.init(0, 0, 612, 794);
        let page = await doc.pageCreate(pageRect);

        writer.beginOnPage(page, PDFNet.ElementWriter.WriteMode.e_overlay);

        // Adding a JPEG image to output file
        let img = await PDFNet.Image.createFromURL(doc, inputURL + 'peppers.jpg');
        let matrix = await PDFNet.Matrix2D.create(200, 0, 0, 250, 50, 500);
        const matrix2 = await PDFNet.Matrix2D.createZeroMatrix();
        await matrix2.set(200, 0, 0, 250, 50, 500);
        let element = await builder.createImageFromMatrix(img, matrix2);
        writer.writePlacedElement(element);

        // Add a PNG to output file
        img = await PDFNet.Image.createFromURL(doc, inputURL + 'butterfly.png');
        matrix = await PDFNet.Matrix2D.create((await img.getImageWidth()), 0, 0, (await img.getImageHeight()), 300, 500);
        element = await builder.createImageFromMatrix(img, matrix);
        writer.writePlacedElement(element);

        // Add a GIF image to the output file
        img = await PDFNet.Image.createFromURL(doc, inputURL + 'pdfnet.gif');
        matrix = await PDFNet.Matrix2D.create((await img.getImageWidth()), 0, 0, (await img.getImageHeight()), 50, 350);
        element = await builder.createImageFromMatrix(img, matrix);
        writer.writePlacedElement(element);

        // Add a TIFF image to the output file
        img = await PDFNet.Image.createFromURL(doc, inputURL + 'grayscale.tif');
        matrix = await PDFNet.Matrix2D.create((await img.getImageWidth()), 0, 0, (await img.getImageHeight()), 10, 50);
        element = await builder.createImageFromMatrix(img, matrix);
        writer.writePlacedElement(element);
        writer.end();
        doc.pagePushBack(page);

        // Embed monochrome TIFF compressed using lossy JBIG2 filter
        page = await doc.pageCreate(pageRect);
        writer.beginOnPage(page, 1, true, true);

        const hintSet = await PDFNet.ObjSet.create();
        const enc = await hintSet.createArray();
        await enc.pushBackName('JBIG2');
        await enc.pushBackName('Lossy');

        img = await PDFNet.Image.createFromURL(doc, inputURL + 'multipage.tif', enc);
        matrix = await PDFNet.Matrix2D.create(612, 0, 0, 794, 0, 0);
        element = await builder.createImageFromMatrix(img, matrix);
        writer.writePlacedElement(element);
        writer.end();
        doc.pagePushBack(page);

        // Add a JPEG200 to output file
        page = await doc.pageCreate(pageRect);
        writer.beginOnPage(page, 1, true, true);

        img = await PDFNet.Image.createFromURL(doc, inputURL + 'palm.jp2');
        matrix = await PDFNet.Matrix2D.create((await img.getImageWidth()), 0, 0, (await img.getImageHeight()), 96, 80);
        element = await builder.createImageFromMatrix(img, matrix);
        writer.writePlacedElement(element);

        // write 'JPEG2000 Sample' text under image
        const timesFont = await PDFNet.Font.create(doc, PDFNet.Font.StandardType1Font.e_times_roman);
        writer.writeElement(await builder.createTextBeginWithFont(timesFont, 32));
        element = await builder.createTextRun('JPEG2000 Sample', timesFont, 32);
        matrix = await PDFNet.Matrix2D.create(1, 0, 0, 1, 190, 30);
        element.setTextMatrix(matrix);// await?
        writer.writeElement(element);
        const element2 = await builder.createTextEnd();
        writer.writeElement(element2);

        writer.end();
        doc.pagePushBack(page); // add the page to the document

        const docbuf = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
        exports.saveBufferAsPDFDoc(docbuf, 'addimage.pdf');

        console.log('Done. Result saved as addimage.pdf');
      } catch (err) {
        console.log(err);
      }
    };
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=AddImageTest.js