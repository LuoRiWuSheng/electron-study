(() => {
  const getMouseLocation = (e) => {
    const scrollElement = readerControl.docViewer.getScrollViewElement();
    const scrollLeft = scrollElement.scrollLeft || 0;
    const scrollTop = scrollElement.scrollTop || 0;

    return {
      x: e.pageX + scrollLeft,
      y: e.pageY + scrollTop
    };
  };

  const mouseToPagePoint = (e) => {
    const displayMode = readerControl.docViewer.getDisplayModeManager().getDisplayMode();
    const windowPoint = getMouseLocation(e);

    const page = displayMode.getSelectedPages(windowPoint, windowPoint);
    const pageIndex = (page.first !== null) ? page.first : readerControl.docViewer.getCurrentPage() - 1;

    return {
      point: displayMode.windowToPage(windowPoint, pageIndex),
      pageNumber: pageIndex + 1
    };
  };

  $(document).on('documentLoaded', () => {
    const lineAnnot = new Annotations.LineAnnotation();
    lineAnnot.setStartPoint(0, 0);
    lineAnnot.setEndPoint(0, 0);
    lineAnnot.PageNumber = 1;

    const annotManager = readerControl.docViewer.getAnnotationManager();
    annotManager.addAnnotation(lineAnnot);

    readerControl.docViewer.on('mouseMove', (jqueryE, e) => {
      const result = mouseToPagePoint(e);
      const pagePoint = result.point;
      const pageNumber = result.pageNumber;
      const oldPageNumber = lineAnnot.PageNumber;

      lineAnnot.PageNumber = pageNumber;
      lineAnnot.setStartPoint(pagePoint.x, pagePoint.y);
      // refresh old page since line annotation has been removed from it
      if (pageNumber !== oldPageNumber) {
        annotManager.drawAnnotations(oldPageNumber);
      }

      readerControl.docViewer.snapToNearest(pageNumber, pagePoint.x, pagePoint.y).then((snapPoint) => {
        lineAnnot.setEndPoint(snapPoint.x, snapPoint.y);
        annotManager.redrawAnnotation(lineAnnot);
      });
    });
  });
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=config.js