//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------
((exports) => {
  'use strict';

  exports.runPDFPageTest = () => {
    const main = async() => {
      console.log('Beginning Test');
      // eslint-disable-next-line no-unused-vars
      let ret = 0;
      const inputPath = '../TestFiles/';
      let docStoreArray = null;

      // split a pdf into multiple separate pdf pages
      try {
        const inDoc = await PDFNet.PDFDoc.createFromURL(inputPath + 'newsletter.pdf');
        inDoc.initSecurityHandler();
        inDoc.lock();

        console.log('PDF document initialized and locked');

        const pageCount = await inDoc.getPageCount();
        const pagesToSplit = Math.min(4, pageCount);

        // docStoreArray is used to leep track of the documents we have split up for later use.
        docStoreArray = [];
        for (let i = 1; i <= pagesToSplit; ++i) {
          const newDoc = await PDFNet.PDFDoc.create();
          const filename = 'newsletter_split_page_' + i + '.pdf';
          newDoc.insertPages(0, inDoc, i, i, PDFNet.PDFDoc.InsertFlag.e_none);
          docStoreArray[i - 1] = newDoc;
          const docbuf = await newDoc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
          saveBufferAsPDFDoc(docbuf, filename);
          console.log('Result saved as ' + filename);
        }
      } catch (err) {
        // console.log(err);
        console.log(err.stack);
        ret = 1;
      }

      try {
        // start stack-based deallocation with startDeallocateStack. Later on when endDeallocateStack is called,
        // all objects in memory that were initialized since the most recent startDeallocateStack call will be
        // cleaned up. Doing this makes sure that memory growth does not get too high.
        await PDFNet.startDeallocateStack();
        const newDoc = await PDFNet.PDFDoc.create();
        newDoc.initSecurityHandler();
        newDoc.lock();

        console.log('Sample 2, merge several PDF documents into one:');

        for (let i = 1; i <= docStoreArray.length; ++i) {
          const currDoc = docStoreArray[i - 1];
          const currDocPageCount = await currDoc.getPageCount();
          newDoc.insertPages(i, currDoc, 1, currDocPageCount, PDFNet.PDFDoc.InsertFlag.e_none);
        }
        const docbuf = await newDoc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
        saveBufferAsPDFDoc(docbuf, 'newsletter_merged.pdf');
        await PDFNet.endDeallocateStack();
      } catch (err) {
        // console.log(err);
        console.log(err.stack);
        ret = 1;
      }

      try {
        await PDFNet.startDeallocateStack();
        console.log('Sample 3, delete every second page');
        const inDoc = await PDFNet.PDFDoc.createFromURL(inputPath + 'newsletter.pdf');

        inDoc.initSecurityHandler();
        inDoc.lock();

        let pageNum = await inDoc.getPageCount();

        while (pageNum >= 1) {
          const itr = await inDoc.getPageIterator(pageNum);
          inDoc.pageRemove(itr);
          pageNum -= 2;
        }

        const docbuf = await inDoc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
        saveBufferAsPDFDoc(docbuf, 'newsletter_page_removed.pdf');
        await PDFNet.endDeallocateStack();
      } catch (err) {
        console.log(err);
        ret = 1;
      }

      try {
        await PDFNet.startDeallocateStack();
        console.log('Sample 4, Insert a page at different locations');
        const in1Doc = await PDFNet.PDFDoc.createFromURL(inputPath + 'newsletter.pdf');
        in1Doc.initSecurityHandler();
        in1Doc.lock();

        const in2Doc = await PDFNet.PDFDoc.createFromURL(inputPath + 'fish.pdf');
        in2Doc.initSecurityHandler();
        in2Doc.lock();

        const srcPage = await in2Doc.getPageIterator(1);
        const dstPage = await in1Doc.getPageIterator(1);
        let pageNum = 1;
        while (await dstPage.hasNext()) {
          if (pageNum++ % 3 === 0) {
            in1Doc.pageInsert(dstPage, await srcPage.current());
          }
          dstPage.next();
        }

        const docbuf = await in1Doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
        saveBufferAsPDFDoc(docbuf, 'newsletter_page_insert.pdf');
        console.log('done');
        await PDFNet.endDeallocateStack();
      } catch (err) {
        console.log(err.stack);
        ret = 1;
      }

      try {
        await PDFNet.startDeallocateStack();
        console.log('Sample 5, replicate pages within a single document');
        const doc = await PDFNet.PDFDoc.createFromURL(inputPath + 'newsletter.pdf');
        doc.initSecurityHandler();

        // Replicate the cover page three times (copy page #1 and place it before the
        // seventh page in the document page sequence)
        const cover = await doc.getPage(1);
        const p7 = await doc.getPageIterator(7);
        doc.pageInsert(p7, cover);
        doc.pageInsert(p7, cover);
        doc.pageInsert(p7, cover);
        // replicate cover page two more times by placing it before and after existing pages
        doc.pagePushFront(cover);
        doc.pagePushBack(cover);

        const docbuf = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
        saveBufferAsPDFDoc(docbuf, 'newsletter_page_clone.pdf');
        console.log('done saving newsletter_page_clone.pdf');
        await PDFNet.endDeallocateStack();
      } catch (err) {
        console.log(err.stack);
        ret = 1;
      }
    };
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=PDFPageTest.js