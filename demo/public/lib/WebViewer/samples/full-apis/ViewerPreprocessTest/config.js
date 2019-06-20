(() => {
  $(document).on('viewerLoaded', () => {
    PDFNet.initialize().then(() => runScript()
    ).then(async(doc) => {
      readerControl.loadDocument(doc);
      console.log('finished script');
    });
  });

  const runScript = () => {
    const ModAnnotations = async(doc) => {
      const imagefile = '../../../samples/full-apis/TestFiles/grayscale.tif';

      await PDFNet.startDeallocateStack(); // start stack-based deallocation. All objects will be deallocated by end of function
      // The following code snippet traverses all annotations in the document
      console.log('Traversing all annotations in the document...');
      const apWriter = await PDFNet.ElementWriter.create();
      const apBuilder = await PDFNet.ElementBuilder.create();

      const sigImg = await PDFNet.Image.createFromURL(doc, imagefile);

      const itr = await doc.getPageIterator(1);
      let numMod = 0;

      for (itr; (await itr.hasNext()); (await itr.next())) {
        const page = await itr.current();
        const numAnnots = await page.getNumAnnots();

        for (let i = 0; i < numAnnots; ++i) {
          const annot = await page.getAnnot(i);
          if (!(await annot.isValid())) {
            continue;
          }

          const annotType = await annot.getType();
          switch (annotType) {
            case PDFNet.Annot.Type.e_Stamp:
            {
              apWriter.begin(doc);
              const w = await sigImg.getImageWidth();
              const h = await sigImg.getImageHeight();
              let apElement = await apBuilder.createImageScaled(sigImg, 0, 0, w, h);
              apWriter.writePlacedElement(apElement);
              let apObj = await apWriter.end();
              apObj.putRect('BBox', 0, 0, w, h);
              apObj.putName('Subtype', 'Form');
              apObj.putName('Type', 'XObject');
              apElement = await apBuilder.createFormFromStream(apObj);
              apWriter.writePlacedElement(apElement);
              apObj = await apWriter.end();
              apObj.putRect('BBox', 0, 0, w, h);
              apObj.putName('Subtype', 'Form');
              apObj.putName('Type', 'XObject');
              await annot.setAppearance(apObj);
              numMod += 1;
              break;
            }
            default:
              break;
          }
        }
      }

      console.log('number of annotation modifications: ' + numMod);

      await PDFNet.endDeallocateStack();
    };

    const main = async() => {
      let doc = null;

      try {
        // todo load a document from url
        const inputURL = '../../../samples/full-apis/TestFiles/';
        const inputFilename = 'fish_stamped.pdf';
        const url = inputURL + inputFilename;
        console.log('loading document from url: ' + url);
        doc = await PDFNet.PDFDoc.createFromURL(url);
        doc.initSecurityHandler();
        doc.lock();
        console.log('loaded document from url: ' + url);
        // modify annotations
        await ModAnnotations(doc);
        // flatten annotations
        doc.flattenAnnotations();
        console.log('flattened document from url: ' + url);
        return doc;
      } catch (err) {
        console.log(err.stack);
      } finally {
        if (doc) {
          doc.unlock();
        }
      }
    };
    // start the generator, without cleanup so the document still valid when generator finishes running
    return PDFNet.runWithoutCleanup(main);
  };
})();
// eslint-disable-next-line spaced-comment
//# sourceURL=config.js