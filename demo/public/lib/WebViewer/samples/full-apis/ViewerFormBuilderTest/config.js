((exports) => {
  const PDFNet = exports.PDFNet;

  // create new PDF
  const createNewPDF = async() => {
    console.log('Loading document...');
    await PDFNet.initialize();
    var doc = await PDFNet.PDFDoc.create();

    doc.initSecurityHandler();
    doc.lock();

    // define new page dimensions
    const pageRect = await PDFNet.Rect.init(0, 0, 612, 794);
    const page = await doc.pageCreate(pageRect);
    doc.pagePushBack(page);

    const docbuf = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
    var blob = new Blob([docbuf], {
      type: 'application/pdf'
    });

    readerControl.loadDocument(blob, {
      filename: 'myfile.pdf'
    });
  };

  const convertAnnotToFormField = async() => {
    // initialize
    const docViewer = readerControl.docViewer;
    const annotManager = docViewer.getAnnotationManager();
    const annotationsList = annotManager.getAnnotationsList();
    const currentDocument = docViewer.getDocument();

    await PDFNet.initialize();
    const pdfDoc = await currentDocument.getPDFDoc();

    await Promise.all(annotationsList.map(async(annot) => {
      let field;

      if (typeof annot.custom !== 'undefined') {
        console.log(annot.custom);

        // create a form field based on the type of annotation
        if (annot.custom.type === 'TEXT') {
          field = await pdfDoc.fieldCreateFromStrings(annot.getContents(), PDFNet.Field.Type.e_text, annot.custom.value, '');
        } else if (annot.custom.type === 'SIGNATURE') {
          field = await pdfDoc.fieldCreateFromStrings(annot.getContents(), PDFNet.Field.Type.e_signature, '', '');
        } else if (annot.custom.type === 'CHECK') {
          field = await pdfDoc.fieldCreateFromStrings(annot.getContents(), PDFNet.Field.Type.e_check, '', '');
        } else {
          // exit early for other annotations
          return;
        }

        // check if there is a flag
        if (annot.custom.flag === true) {
          field.setFlag(PDFNet.Field.Flag.e_read_only, true);
        }
      } else {
        // exit early for other annotations
        return;
      }

      // translate coordinates
      const annotRect = await annot.getRect();
      const setTopLeft = currentDocument.getPDFCoordinates(annot.getPageNumber() - 1, annotRect.x1, annotRect.y1);
      const setBottomRight = currentDocument.getPDFCoordinates(annot.getPageNumber() - 1, annotRect.x2, annotRect.y2);

      // create an annotation with a form field created
      const pageNumber = annot.getPageNumber();
      const newAnnot = await PDFNet.WidgetAnnot.create(pdfDoc, (await PDFNet.Rect.init(setTopLeft.x, setTopLeft.y, setBottomRight.x, setBottomRight.y)), field);

      // delete original annotation
      annotManager.deleteAnnotation(annot, false, true);

      // customize styles of the form field
      Annotations.WidgetAnnotation.getCustomStyles = function(widget) {
        if (widget instanceof Annotations.TextWidgetAnnotation) {
          return {
            'background-color': '#a5c7ff',
            color: 'white',
            'font-size': '20px'
          };
        } else if (widget instanceof Annotations.SignatureWidgetAnnotation) {
          return {
            border: '1px solid #a5c7ff'
          };
        }
      };
      Annotations.WidgetAnnotation.getCustomStyles(newAnnot);

      // draw the annotation the viewer
      const page = await pdfDoc.getPage(pageNumber);
      page.annotPushBack(newAnnot);
      await pdfDoc.refreshFieldAppearances();
    }));

    // import newly created form fields
    const fdfDoc = await pdfDoc.fdfExtract(PDFNet.PDFDoc.ExtractFlag.e_both);
    const xfdf = await fdfDoc.saveAsXFDFAsString();
    annotManager.importAnnotations(xfdf);

    // refresh viewer
    docViewer.refreshAll();
    docViewer.updateView();
    docViewer.getDocument().refreshTextData();
  };

  // adding the annotation which later will be converted to form fields
  const addFormFieldAnnot = (type, name, value, flag) => {
    var docViewer = readerControl.docViewer;
    var annotManager = docViewer.getAnnotationManager();

    var textAnnot = new Annotations.FreeTextAnnotation();
    textAnnot.PageNumber = 1;
    if (type === 'CHECK') {
      textAnnot.Width = 50;
      textAnnot.Height = 50;
    } else {
      textAnnot.Width = 200;
      textAnnot.Height = 50;
    }
    textAnnot.X = 100;
    textAnnot.Y = 150;

    textAnnot.setPadding(new Annotations.Rect(0, 0, 0, 0));
    textAnnot.custom = {
      type,
      value,
      flag
    };

    // set the type of annot
    textAnnot.setContents(`${name}_${type}`);
    textAnnot.FontSize = '20px';

    textAnnot.Author = annotManager.getCurrentUser();

    annotManager.addAnnotation(textAnnot);
    annotManager.redrawAnnotation(textAnnot);
  };

  exports.addFormFieldAnnot = addFormFieldAnnot;
  exports.convertAnnotToFormField = convertAnnotToFormField;
  exports.createNewPDF = createNewPDF;
})(window);