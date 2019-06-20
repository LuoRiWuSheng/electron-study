(() => {
  let PDFNet = null;
  let CoreControls = null;
  let Annotations = null;

  const parentDoc = window.parent.window.document;
  const uploadedDoc = [null, null];

  const viewerElement = parentDoc.getElementById('viewer');

  viewerElement.addEventListener('ready', async() => {
    await init();
    const doc1 = await PDFNet.PDFDoc.createFromURL('../../../samples/files/test_doc_1.pdf');
    const doc2 = await PDFNet.PDFDoc.createFromURL('../../../samples/files/test_doc_2.pdf');
    await compareDoc(doc1, doc2);

    parentDoc.getElementById('fileUpload1').disabled = false;
    parentDoc.getElementById('fileUpload2').disabled = false;
  });

  parentDoc.getElementById('fileUpload1').addEventListener('change', (e) => {
    getPDFDocFromUpload(e.target.files[0], 0);
  });

  parentDoc.getElementById('fileUpload2').addEventListener('change', (e) => {
    getPDFDocFromUpload(e.target.files[0], 1);
  });

  const enableCompareButton = async() => {
    const compareButton = parentDoc.getElementById('compareButton');

    if (!compareButton.classList.contains('disabled')) {
      return;
    }

    compareButton.classList.remove('disabled');

    compareButton.addEventListener('click', async() => {
      const doc1 = await uploadedDoc[0].getPDFDoc();
      const doc2 = await uploadedDoc[1].getPDFDoc();

      await compareDoc(doc1, doc2);
    });
  };

  const getPDFDocFromUpload = (file, fileIndex) => {
    const newDoc = new CoreControls.Document(file.name, 'pdf');

    const backendType = CoreControls.getDefaultBackendType();
    const options = {
      workerTransportPromise: CoreControls.initPDFWorkerTransports(backendType, {}),
      extension: 'pdf'
    };

    const partRetriever = new CoreControls.PartRetrievers.LocalPdfPartRetriever(file);

    newDoc.loadAsync(partRetriever, (err) => {
      if (err) {
        console.warn(err);
      }
      uploadedDoc[fileIndex] = newDoc;

      if (uploadedDoc[1] !== null && uploadedDoc[0] !== null) {
        enableCompareButton();
      }
    }, options);
  };

  const init = async() => {
    PDFNet = viewerElement.querySelector('iframe').contentWindow.PDFNet;
    const iframe = parentDoc.getElementById('viewer').getElementsByTagName('iframe')[0];
    CoreControls = iframe.contentWindow.CoreControls;
    Annotations = iframe.contentWindow.Annotations;
    PDFNet = viewerElement.querySelector('iframe').contentWindow.PDFNet;

    readerControl.setEngineType(readerControl.constants.engineTypes.PDFNETJS);
    CoreControls.resetWorker();
    const type = await CoreControls.getDefaultBackendType();

    CoreControls.enableFullPDF(true);
    CoreControls.initPDFWorkerTransports(type, {});
    await PDFNet.initialize();
  };

  const getDiffOptions = async() => {
    const redColor = new Annotations.Color(200, 0, 0, 1);
    const blueColor = new Annotations.Color(0, 200, 200, 1);

    const options = await PDFNet.createDiffOptions();

    // instead of Annotations.Color, we can pass in an objects in the form {R: 200, G: 0, B: 0, A: 1}
    options.setColorA(redColor);
    options.setColorB(blueColor);

    options.setBlendMode(5);
    return options;
  };

  const compareDoc = async(doc1, doc2) => {
    const newDoc = await PDFNet.PDFDoc.create();
    newDoc.lock();

    const options = await getDiffOptions();

    const pages = [];
    const itr = await doc1.getPageIterator(1);
    const itr2 = await doc2.getPageIterator(1);

    let i = 0;
    for (itr; await itr.hasNext(); itr.next()) {
      const page = await itr.current();
      pages[i] = [page];
      i++;
    }

    i = 0;
    for (itr2; await itr2.hasNext(); itr2.next()) {
      const page = await itr2.current();
      (pages[i] || (pages[i] = [null])).push(page);
      i++;
    }

    pages.forEach(async([p1, p2]) => {
      if (!p1) {
        p1 = new PDFNet.Page(0);
      }
      if (!p2) {
        p2 = new PDFNet.Page(0);
      }

      await newDoc.appendVisualDiff(p1, p2, options);
    });

    await newDoc.unlock();
    readerControl.loadDocument(newDoc);
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=config.js