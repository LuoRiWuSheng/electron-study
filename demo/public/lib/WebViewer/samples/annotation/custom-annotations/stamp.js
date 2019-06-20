window.createStampTool = function(docViewer) {
// Custom stamp tool constructor that inherits generic annotation create tool
  var CustomStampCreateTool = function() {
    window.Tools.GenericAnnotationCreateTool.call(this, docViewer, Annotations.StampAnnotation);
    delete this.defaults.StrokeColor;
    delete this.defaults.FillColor;
    delete this.defaults.StrokeThickness;
  };

  // Inherit generic annotation create tool
  CustomStampCreateTool.prototype = new window.Tools.GenericAnnotationCreateTool();

  // Override mouseLeftDown
  CustomStampCreateTool.prototype.mouseLeftDown = function() {
    window.Tools.AnnotationSelectTool.prototype.mouseLeftDown.apply(this, arguments);
  };

  // Override mouseMove
  CustomStampCreateTool.prototype.mouseMove = function() {
    window.Tools.AnnotationSelectTool.prototype.mouseMove.apply(this, arguments);
  };

  // Override moseLeftUp
  CustomStampCreateTool.prototype.mouseLeftUp = function(e) {
    window.Tools.GenericAnnotationCreateTool.prototype.mouseLeftDown.call(this, e);
    var annotation;
    if (this.annotation) {
      var width = 212;
      var height = 60;
      var rotation = this.docViewer.getCompleteRotation(this.annotation.PageNumber) * 90;
      this.annotation.Rotation = rotation;
      if (rotation === 270 || rotation === 90) {
        var t = height;
        height = width;
        width = t;
      }
      this.annotation.ImageData = '../../../samples/annotation/custom-annotations/stamp.png';
      this.annotation.Width = width;
      this.annotation.Height = height;
      this.annotation.X -= width / 2;
      this.annotation.Y -= height / 2;
      this.annotation.MaintainAspectRatio = true;
      annotation = this.annotation;
    }

    window.Tools.GenericAnnotationCreateTool.prototype.mouseLeftUp.call(this, e);

    if (annotation) {
      // eslint-disable-next-line no-undef
      viewerInstance.docViewer.getAnnotationManager().redrawAnnotation(annotation);
    }
  };

  return new CustomStampCreateTool();
};