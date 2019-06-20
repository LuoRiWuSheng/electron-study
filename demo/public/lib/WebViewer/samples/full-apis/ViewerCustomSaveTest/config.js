((exports) => {
  const PDFNet = exports.PDFNet;
  const mergeAndSave = (doc, xfdf) => {
    const main = async() => {
      // Import XFDF into FDF, then merge data from FDF into PDF
      // Annotations
      const fdfDoc = await PDFNet.FDFDoc.createFromXFDF(xfdf);

      const pitr = await doc.getPageIterator();
      let page, annotObj;
      /* eslint no-await-in-loop: 0 */
      for (; (await pitr.hasNext()); pitr.next()) {
        try {
          page = await pitr.current();
          for (let i = (await page.getNumAnnots()); i > 0;) {
            annotObj = await page.getAnnot(--i);
            switch (await annotObj.getType()) {
              case PDFNet.Annot.Type.e_Widget:
              case PDFNet.Annot.Type.e_Link:
              case PDFNet.Annot.Type.e_Sound:
              case PDFNet.Annot.Type.e_Movie:
              case PDFNet.Annot.Type.e_FileAttachment:
                // these are not supported for import from webviewer
                break;
              default:
                page.annotRemoveByIndex(i);
                break;
            }
          }
        } catch (e) {
          console.log('Error Removing Annotations: ' + e);
          (await page.getSDFObj()).erase('Annots');
        }
      }

      doc.fdfMerge(fdfDoc);

      // run any custom logic here
      doc.flattenAnnotations();

      const docbuf = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
      return docbuf;
    };
    // start the generator
    return PDFNet.runWithCleanup(main);
  };

  const customDownload = (options) => {
    const docViewer = readerControl.docViewer;
    const am = docViewer.getAnnotationManager();
    const annotationsToRemove = am.getAnnotationsList();
    const currentDocument = docViewer.getDocument();
    return PDFNet.initialize().then(() => currentDocument.getPDFDoc())
      .then(pdfDoc => mergeAndSave(pdfDoc, options.xfdfString))
      .then((data) => {
        // since we are flattening annotations we should remove the existing annotations in webviewer
        // and rerender so that the file displays correctly

        am.deleteAnnotations(annotationsToRemove);
        // clear the cache
        docViewer.refreshAll();
        // update viewer with new document
        docViewer.updateView();
        // Annotations may contain text so we need to regenerate
        // our text representation
        docViewer.getDocument().refreshTextData();
        return data;
      });
  };

  $(document).on('documentLoaded', () => {
    const doc = readerControl.docViewer.getDocument();
    doc.getFileData = customDownload;
  });
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=config.js