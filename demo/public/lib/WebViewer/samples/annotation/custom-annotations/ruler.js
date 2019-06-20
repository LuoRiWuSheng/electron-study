window.createRulerTool = function(docViewer) {
  // Ruler annotation constructor that inherits line annotation
  var RulerAnnotation = function() {
    window.Annotations.LineAnnotation.apply(this, arguments);
    this.StrokeColor = '#F69A00';
    this.StrokeThickness = 2;
  };

  // Inherit line annotation
  RulerAnnotation.prototype = new window.Annotations.LineAnnotation();

  // Override draw function
  RulerAnnotation.prototype.draw = function(ctx) {
    window.Annotations.LineAnnotation.prototype.draw.apply(this, arguments);

    var startX = this.Start.x;
    var startY = this.Start.y;
    var endX = this.End.x;
    var endY = this.End.y;

    var distance = Math.round(Math.sqrt(Math.pow((endX - startX), 2) + Math.pow((endY - startY), 2)));
    var inches = (distance / 72).toFixed(2); // assume 72 dpi
    var distanceText = (inches / 0.39370).toFixed(2) + 'cm';

    ctx.save();
    ctx.font = (16 + this.StrokeThickness) + 'px Arial';
    ctx.fillStyle = this.StrokeColor;
    ctx.strokeStyle = this.StrokeColor;
    ctx.lineWidth = this.StrokeThickness;
    ctx.translate(startX, startY);

    var textWidth = ctx.measureText(distanceText).width;
    // eslint-disable-next-line no-undef
    var rotation = viewerInstance.docViewer.getCompleteRotation(1);
    var rotated = rotation === 1 || rotation === 3;
    var angle = Math.atan2(endY - startY, endX - startX);

    if (rotated) {
      if (angle < 0) {
        distance = -distance;
        ctx.rotate(angle + Math.PI);
      } else {
        ctx.rotate(angle);
      }
    } else if (angle > Math.PI / 2 || (angle > -Math.PI && angle < -(Math.PI / 2))) {
      distance = -distance;
      ctx.rotate(angle + Math.PI);
    } else {
      ctx.rotate(angle);
    }

    ctx.beginPath();
    ctx.moveTo(distance, this.StrokeThickness + 4);
    ctx.lineTo(distance, -this.StrokeThickness - 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, this.StrokeThickness + 4);
    ctx.lineTo(0, -this.StrokeThickness - 4);
    ctx.stroke();

    ctx.fillText(distanceText, (distance / 2) - (textWidth / 2), -8 - this.StrokeThickness);
    ctx.restore();
  };

  // Ruler create tool constructor
  var RulerCreateTool = function() {
    window.Tools.GenericAnnotationCreateTool.call(this, docViewer, RulerAnnotation);
    this.defaults.StrokeColor = new window.Annotations.Color('#F69A00');
    this.defaults.StrokeThickness = 2;
    delete this.defaults.FillColor;
  };

  RulerCreateTool.prototype = new window.Tools.LineCreateTool();

  return new RulerCreateTool();
};