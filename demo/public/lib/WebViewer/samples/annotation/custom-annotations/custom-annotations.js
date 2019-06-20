var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: '../../../lib',
  l: window.sampleL,
  pdftronServer: 'https://demo.pdftron.com/', // comment this out to do client-side only
  initialDoc: 'https://pdftron.s3.amazonaws.com/downloads/pl/webviewer-demo-annotated.pdf'
}, viewerElement);

viewerElement.addEventListener('ready', function() {
  window.viewerInstance = viewer.getInstance();
  var viewerInstance = window.viewerInstance;
  var contentWindow = viewerElement.querySelector('iframe').contentWindow;
  window.Annotations = contentWindow.Annotations;
  window.Tools = contentWindow.Tools;

  // ruler.js
  var rulerTool = window.createRulerTool(viewerInstance.docViewer);
  // stamp.js
  var customStampTool = window.createStampTool(viewerInstance.docViewer);

  var addRulerTool = function() {
    // Register tool
    viewerInstance.registerTool({
      toolName: 'RulerTool',
      toolObject: rulerTool,
      buttonImage: '../../../samples/annotation/custom-annotations/ruler.svg',
      buttonName: 'rulerToolButton',
      tooltip: 'Ruler Tool'
    });

    // Add tool button in header
    viewerInstance.setHeaderItems(function(header) {
      header.get('freeHandToolGroupButton').insertBefore({
        type: 'toolButton',
        toolName: 'RulerTool',
        hidden: ['tablet', 'mobile']
      });
      header.getHeader('tools').get('freeHandToolGroupButton').insertBefore({
        type: 'toolButton',
        toolName: 'RulerTool',
        hidden: ['desktop']
      });
    });
    viewerInstance.setToolMode('RulerTool');
  };

  var removeRulerTool = function() {
    // Unregister tool
    viewerInstance.unregisterTool('RulerTool');
    viewerInstance.setToolMode('AnnotationEdit');
  };

  var addCustomStampTool = function() {
    // Register tool
    viewerInstance.registerTool({
      toolName: 'CustomStampTool',
      toolObject: customStampTool,
      buttonImage: '../../../samples/annotation/custom-annotations/stamp.png',
      buttonName: 'customStampToolButton',
      tooltip: 'Approved Stamp Tool'
    });

    // Add tool button in header
    viewerInstance.setHeaderItems(function(header) {
      header.get('freeHandToolGroupButton').insertBefore({
        type: 'toolButton',
        toolName: 'CustomStampTool',
        hidden: ['tablet', 'mobile']
      });
      header.getHeader('tools').get('freeHandToolGroupButton').insertBefore({
        type: 'toolButton',
        toolName: 'CustomStampTool',
        hidden: ['desktop']
      });
    });

    viewerInstance.setToolMode('CustomStampTool');
  };

  var removeCustomStampTool = function() {
    viewerInstance.unregisterTool('CustomStampTool');
    viewerInstance.setToolMode('AnnotationEdit');
  };

  document.getElementById('ruler').onchange = function(e) {
    if (e.target.checked) {
      addRulerTool();
    } else {
      removeRulerTool();
    }
  };

  document.getElementById('custom-stamp').onchange = function(e) {
    if (e.target.checked) {
      addCustomStampTool();
    } else {
      removeCustomStampTool();
    }
  };
});