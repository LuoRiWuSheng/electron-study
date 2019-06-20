/* global Android, DesktopReaderControl */
// Code that is shared between ReaderControl.js and MobileReaderControl.js
(function(exports) {
  'use strict';

  exports.ControlUtils = {};

  // polyfill for console object
  exports.console = exports.console || {
    log: function() { },
    warn: function() { },
    error: function() { },
    assert: function() { }
  };

  var isUndefined = function(val) {
    return typeof val === 'undefined';
  };

  // use instead of window.location.hash because of https://bugzilla.mozilla.org/show_bug.cgi?id=483304
  var getWindowHash = function() {
    var url = window.location.href;
    var i = url.indexOf('#');
    return (i >= 0 ? url.substring(i + 1) : '');
  };

  // get a map of the query string parameters
  // useHash parameter's default is true
  exports.ControlUtils.getQueryStringMap = function(useHash) {
    if (isUndefined(useHash)) {
      useHash = true;
    }
    var varMap = {};
    // if useHash is false then we'll use the parameters after '?'
    var queryString = useHash ? getWindowHash() : window.location.search.substring(1);
    var fieldValPairs = queryString.split('&');

    for (var i = 0; i < fieldValPairs.length; i++) {
      var fieldVal = fieldValPairs[i].split('=');
      varMap[fieldVal[0]] = fieldVal[1];
    }

    return {
      getBoolean: function(field, defaultValue) {
        var value = varMap[field];

        if (!isUndefined(value)) {
          value = value.toLowerCase();

          if (value === 'true' || value === 'yes' || value === '1') {
            return true;
          } else if (value === 'false' || value === 'no' || value === '0') {
            return false;
          }
          // convert to boolean
          return !!field;
        }
        if (isUndefined(defaultValue)) {
          return null;
        }
        return defaultValue;
      },

      getString: function(field, defaultValue) {
        var value = varMap[field];

        if (!isUndefined(value)) {
          return decodeURIComponent(value);
        }
        if (isUndefined(defaultValue)) {
          return null;
        }
        return defaultValue;
      }
    };
  };

  exports.ControlUtils.initialize = function(notSupportedCallback) {
    $(window).on('hashchange', function() {
      window.location.reload();
    });

    window.ControlUtils.i18nInit(function() {
      if (!window.CanvasRenderingContext2D) {
        notSupportedCallback();
      }
    });

    if (!window.CanvasRenderingContext2D) {
      return;
    }

    var queryParams = window.ControlUtils.getQueryStringMap(!window.utils.windowsApp);
    var configScript = queryParams.getString('config');
    var startOffline = queryParams.getBoolean('startOffline');
    var xdomainUrls = queryParams.getString('xdomain_urls');

    if (xdomainUrls !== null) {
      window.ControlUtils.initXdomain(xdomainUrls);
    }

    function initializeReaderControl() {
      var showToolbar = queryParams.getBoolean('toolbar');
      var useSharedWorker = queryParams.getBoolean('useSharedWorker', false);
      if (showToolbar !== null) {
        ReaderControl.config.ui.hideControlBar = !showToolbar;
      }

      window.readerControl = new ReaderControl({
        enableAnnot: queryParams.getBoolean('a', false),
        enableOffline: queryParams.getBoolean('offline', false),
        docId: queryParams.getString('did'),
        serverUrl: queryParams.getString('server_url'),
        serverUrlHeaders: JSON.parse(queryParams.getString('serverUrlHeaders', '{}')),
        user: queryParams.getString('user'),
        isAdmin: queryParams.getBoolean('admin', false),
        readOnly: queryParams.getBoolean('readonly', false),
        hideToolbar: ReaderControl.config.ui.hideControlBar,
        showFilePicker: queryParams.getBoolean('filepicker', false),
        pdfType: pdfType,
        officeType: officeType,
        pdftronServer: queryParams.getString('pdftronServer', null),
        preloadWorker: queryParams.getBoolean('preloadWorker', true),
        disableWebsockets: queryParams.getBoolean('disableWebsockets', false),
        pdfnet: queryParams.getBoolean('pdfnet', false),
        useDownloader: queryParams.getBoolean('useDownloader', true),
        hideAnnotationPanel: queryParams.getBoolean('hideAnnotationPanel', false),
        pageHistory: queryParams.getBoolean('pageHistory', true),
        enableRedaction: queryParams.getBoolean('enableRedaction', false)
      });

      var doc = queryParams.getString('d');
      if (typeof Android !== 'undefined' && typeof Android.getXodContentUri !== 'undefined') {
        doc = Android.getXodContentUri();
      }

      var subzero = queryParams.getBoolean('subzero', false);
      CoreControls.enableSubzero(subzero);

      var streaming = queryParams.getBoolean('streaming', false);
      var rangeStreaming = queryParams.getString('streaming', '') === 'range';
      var pdftronServer = queryParams.getString('pdftronServer', null) || null;
      streaming = rangeStreaming ? 'range' : streaming;
      var autoLoad = queryParams.getBoolean('auto_load', true);

      window.readerControl.fireEvent('viewerLoaded');

      var externalPath = queryParams.getString('p');

      // auto loading may be set to false by webviewer if it wants to trigger the loading itself at a later time
      if ((doc === null || autoLoad === false) && !externalPath && !startOffline) {
        return;
      }

      try {
        if (useSharedWorker && window.parent.WebViewer) {
          var workerTransportPromise = window.parent.WebViewer.workerTransportPromise();
          // originally the option was just for the pdf worker transport promise, now it can be an object
          // containing both the pdf and office promises
          if (workerTransportPromise.pdf || workerTransportPromise.office) {
            CoreControls.setWorkerTransportPromise(workerTransportPromise);
          } else {
            CoreControls.setWorkerTransportPromise({ 'pdf': workerTransportPromise });
          }
        }
      } catch (e) {
        console.warn(e);
        if (e.name === 'SecurityError') {
          console.warn('workerTransportPromise option cannot be used with CORS');
        }
      }
      if (startOffline) {
        $.ajaxSetup({
          cache: true
        });
        window.readerControl.loadDocument(doc, { streaming: false });
      } else if (streaming === true) {
        window.readerControl.loadDocument(doc, { streaming: streaming });
      } else {
        window.ControlUtils.byteRangeCheck(function(status) {
          // if the range header is supported then we will receive a status of 206
          if (status !== 206) {
            streaming = true;
            console.warn('HTTP range requests not supported. Switching to streaming mode.');
          }
          window.readerControl.loadDocument(doc, { streaming: streaming, pdftronServer: pdftronServer });
        }, function() {
          // some browsers that don't support the range header will return an error
          window.readerControl.loadDocument(doc, { streaming: true, pdftronServer: pdftronServer });
        });
      }
    }

    // Cache config script by default.
    $.ajaxSetup({
      cache: true
    });

    function loadConfigScript() {
      if (configScript !== null && configScript.length > 0) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.onload = function() {
          initializeReaderControl();
        };
        script.onerror = function() {
          console.warn('Config script could not be loaded. The default configuration will be used.');
          initializeReaderControl();
        };
        script.src = configScript;
        document.getElementsByTagName('head')[0].appendChild(script);
      } else {
        // no override script path, use default
        initializeReaderControl();
      }
    }

    var pdfType = queryParams.getString('pdf');
    var officeType = queryParams.getString('office');
    var pdftronServer = queryParams.getString('pdftronServer');
    if (pdfType === 'pnacl' || pdfType === 'ems' || pdfType === 'jsworker' || pdfType === 'auto' || pdfType === 'wait' ||
            officeType === 'pnacl' || officeType === 'ems' || officeType === 'jsworker' || officeType === 'auto' || officeType === 'wait'
            || pdftronServer) {
      // if these are not set we assume the worker should be in the 'wait' state.
      pdfType = pdfType || 'wait';
      officeType = officeType || 'wait';

      var files = ['external/FileSaver.min.js', 'pdf/PDFReaderControl.js'];

      var pdfnetFull = queryParams.getBoolean('pdfnet', false);
      if (pdfnetFull) {
        files.push('../core/pdf/PDFNet.js');
      }
      var assetPath = window.assetPath;

      var getScripts = files.map(function(fileName) {
        // for cordova (or other non-pure webbrowser platforms), we don't include FileSaver...
        if (pdfType === 'jsworker') {
          if (fileName === 'external/FileSaver.min.js') {
            return null;
          }
        }
        var deferred = new $.Deferred();

        var s = document.createElement('script');
        s.type = 'text/javascript';
        var body = document.getElementsByTagName('body')[0];
        body.appendChild(s);
        s.onload = function() {
          deferred.resolve();
        };
        s.src = assetPath + fileName;

        return deferred;
      });

      $.when.apply(null, getScripts).done(function() {
        ReaderControl.config = DesktopReaderControl.config;
        loadConfigScript();
      });
    } else {
      loadConfigScript();
    }
  };

  exports.ControlUtils.getCustomData = function() {
    var queryParams = exports.ControlUtils.getQueryStringMap();
    var customData = queryParams.getString('custom');
    if (customData === null) {
      return null;
    }

    return customData;
  };

  exports.ControlUtils.getI18nOptions = function(autodetect) {
    var options = {
      useCookie: false,
      useDataAttrOptions: true,
      defaultValueFromContent: false,
      fallbackLng: 'en',
      resGetPath: 'Resources/i18n/__ns__-__lng__.json'
    };

    if (!autodetect) {
      options.lng = 'en';
    }

    return options;
  };

  exports.ControlUtils.i18nInit = function(callback) {
    i18n.init(exports.ControlUtils.getI18nOptions(), function() {
      $(document).trigger('i18nready');

      if (callback) {
        callback();
      }

      $('body').i18n();
    });
  };

  exports.ControlUtils.initXdomain = function(xdomainUrls) {
    var urls = JSON.parse(xdomainUrls);

    var xdomainScript = $('<script>').attr('src', 'external/xdomain.js');
    if (urls.url) {
      // only a single proxy
      xdomainScript.attr('slave', urls.url);
    }

    $('head').append(xdomainScript);

    if (!urls.url) {
      // multiple proxies
      xdomain.slaves(urls);
    }
  };

  exports.ControlUtils.getNotifyFunction = function(e, type) {
    switch (type) {
      case 'permissionEdit':
        alert(i18n.t('annotations.permissionEdit'));
        break;
      case 'permissionDelete':
        alert(i18n.t('annotations.permissionDelete'));
        break;
      case 'readOnlyCreate':
        alert(i18n.t('annotations.readOnlyCreate'));
        break;
      case 'readOnlyDelete':
        alert(i18n.t('annotations.readOnlyDelete'));
        break;
      case 'readOnlyEdit':
        alert(i18n.t('annotations.readOnlyEdit'));
        break;
      case 'endOfDocumentSearch':
        var searchAgain = confirm(i18n.t('endOfDocument'));
        readerControl.docViewer.trigger('endOfDocumentResult', searchAgain);
        break;
      case 'noMatchesFound':
        alert(i18n.t('noMatchesFound'));
        break;
    }
  };

  // determine if the browser and server support the range header so we can decide to stream or not
  // note that this will not handle the case where the document is on a different domain than the viewer
  // and one server supports range requests and the other doesn't
  exports.ControlUtils.byteRangeCheck = function(onSuccess, onError) {
    $.ajax({
      url: window.location.href,
      type: 'GET',
      cache: false,
      headers: {
        'Range': 'bytes=0-0'
      },
      success: function(data, textStatus, jqXHR) {
        onSuccess(jqXHR.status);
      },
      error: function() {
        onError();
      }
    });
  };


  var userPreferences = {
    toolList: [],

    viewerPreferences: {
      showSideWindow: true
    },

    // register annotation tools that should have their default values updated when an annotation property changes
    // the name property should be unique to the tool
    registerTool: function(tool, name, annotType, annotationCheck) {
      var toolObj = {
        tool: tool,
        name: name,
        annotationCheck: function(annot) {
          // check the annotation type and do an additional check if specified
          var passed = annot.elementName === annotType.prototype.elementName;
          if (passed && annotationCheck) {
            passed = annotationCheck(annot);
          }
          return passed;
        }
      };

      var storedValue = this._importToolData(name);
      if (storedValue && storedValue.defaultEditMode) {
        toolObj.defaultEditMode = storedValue.defaultEditMode;
      } else {
        toolObj.defaultEditMode = exports.ControlUtils.editMode.basic;
      }

      // check to see if the annotation defines these color properties
      var testAnnot = new annotType();
      if (testAnnot.StrokeColor) {
        if (storedValue && storedValue.colors) {
          toolObj.colors = storedValue.colors;
        } else {
          toolObj.colors = ['#FF0000', '#FF8000', '#FFFF00', '#00FF00', '#008000', '#00FFFF', '#0000FF', '#FF00FF', '#000000', '#FFFFFF'];
        }
      }
      if (testAnnot.FillColor) {
        if (storedValue && storedValue.fillColors) {
          toolObj.fillColors = storedValue.fillColors;
        } else {
          toolObj.fillColors = ['#FF0000', '#FF8000', '#FFFF00', '#00FF00', '#008000', '#00FFFF', '#0000FF', '#FF00FF', '#000000', '#FFFFFF', 'transparent'];
        }
      }
      if (testAnnot.TextColor) {
        if (storedValue && storedValue.textColors) {
          toolObj.textColors = storedValue.textColors;
        } else {
          toolObj.textColors = ['#FF0000', '#FF8000', '#FFFF00', '#00FF00', '#008000', '#00FFFF', '#0000FF', '#FF00FF', '#000000', '#FFFFFF'];
        }
      }

      if (storedValue && storedValue.defaults) {
        tool.defaults = storedValue.defaults;
      }

      this.toolList.push(toolObj);
    },

    _getMatchingTools: function(annotation) {
      var matchedTools = [];

      var listLength = this.toolList.length;
      // check for matching tools that handle this type of annotation
      for (var i = 0; i < listLength; ++i) {
        if (this.toolList[i].annotationCheck(annotation)) {
          matchedTools.push(this.toolList[i]);
        }
      }

      return matchedTools;
    },

    getToolColors: function(annotation) {
      var matchedTools = this._getMatchingTools(annotation);

      if (matchedTools.length === 1) {
        return {
          colors: matchedTools[0].colors,
          fillColors: matchedTools[0].fillColors,
          textColors: matchedTools[0].textColors
        };
      }
    },

    getAdvancedToolColors: function() {
      return ['#F8E0E0', '#F8ECE0', '#F7F8E0', '#E0F8E0', '#E0F8F7', '#E0E0F8', '#ECE0F8', '#F8E0F7', '#FFFFFF',
        '#F5A9A9', '#F5D0A9', '#F2F5A9', '#A9F5A9', '#A9F5F2', '#A9A9F5', '#D0A9F5', '#F5A9F2', '#E6E6E6',
        '#FA5858', '#FAAC58', '#F4FA58', '#58FA58', '#58FAF4', '#4848FA', '#AC58FA', '#FA58F4', '#BDBDBD',
        '#FF0000', '#FF8000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#8000FF', '#FF00FF', '#808080',
        '#B40404', '#B45F04', '#AEB404', '#04B404', '#04B4AE', '#0404B4', '#5F04B4', '#B404AE', '#585858',
        '#800000', '#804000', '#808000', '#008000', '#008080', '#000080', '#400080', '#800080', '#444444',
        '#610B0B', '#61380B', '#5E610B', '#0B610B', '#0B615E', '#0B0B61', '#380B61', '#610B5E', '#2E2E2E',
        '#2A0A0A', '#2A1B0A', '#292A0A', '#0A2A0A', '#0A2A29', '#0A0A2A', '#1B0A2A', '#2A0A29', '#000000'];
    },

    _getColorList: function(annotation, property) {
      var colorList = null;
      var matchedTools = this._getMatchingTools(annotation);
      if (matchedTools.length === 1) {
        if (property === 'StrokeColor') {
          colorList = matchedTools[0].colors;
        } else if (property === 'FillColor') {
          colorList = matchedTools[0].fillColors;
        } else if (property === 'TextColor') {
          colorList = matchedTools[0].textColors;
        }
      }

      return {
        tool: matchedTools[0],
        colorList: colorList
      };
    },

    addToolColor: function(annotation, property, color) {
      var result = this._getColorList(annotation, property);
      var colorList = result.colorList;
      if (colorList !== null) {
        if (colorList.indexOf(color) === -1) {
          if (property === 'FillColor') {
            // always keep transparent last
            colorList.splice(-1, 0, color);
          } else {
            colorList.push(color);
          }
          this._exportToolData(result.tool);
        }
      }
    },

    removeToolColor: function(annotation, property, color) {
      var result = this._getColorList(annotation, property);
      var colorList = result.colorList;
      if (colorList !== null) {
        var index = colorList.indexOf(color);
        if (index > -1) {
          colorList.splice(index, 1);
          this._exportToolData(result.tool);
        }
      }
    },

    getDefaultToolEditingMode: function(annotation) {
      var matchedTools = this._getMatchingTools(annotation);

      if (matchedTools.length === 1) {
        return matchedTools[0].defaultEditMode;
      }
      return null;
    },

    setDefaultToolEditingMode: function(annotation, editMode) {
      var matchedTools = this._getMatchingTools(annotation);

      if (matchedTools.length === 1) {
        matchedTools[0].defaultEditMode = editMode;
        this._exportToolData(matchedTools[0]);
      }
    },

    defaultToolValueChanged: function(annotation, property, value) {
      var matchedTools = this._getMatchingTools(annotation);

      if (matchedTools.length === 1) {
        matchedTools[0].tool.defaults[property] = value;
        this._exportToolData(matchedTools[0]);
      }
    },

    _exportTool: function(tool) {
      var toolData = {
        defaultEditMode: tool.defaultEditMode
      };
      if (tool.colors) {
        toolData.colors = tool.colors;
      }
      if (tool.fillColors) {
        toolData.fillColors = tool.fillColors;
      }
      if (tool.textColors) {
        toolData.textColors = tool.textColors;
      }
      toolData.defaults = tool.tool.defaults;

      this._storePreference('toolData-' + tool.name, toolData);
    },

    // if no tool is specified then data for all tools is saved
    _exportToolData: function(tool) {
      if (_.isUndefined(tool)) {
        this.toolList.forEach(this._exportTool);
      } else {
        this._exportTool(tool);
      }
    },

    // returns null if nothing is saved there
    _importToolData: function(name) {
      return this._getPreference('toolData-' + name);
    },

    getViewerPreferences: function() {
      this.viewerPreferences = this._getPreference('viewerPreferences') || this.viewerPreferences;
      return this.viewerPreferences;
    },

    setViewerPreference: function(key, value) {
      this.viewerPreferences[key] = value;
      this._storePreference('viewerPreferences', this.viewerPreferences);
    },

    _storePreference: function(key, value) {
      try {
        localStorage[key] = JSON.stringify(value);
      } catch (err) {
        console.warn('localStorage could not be accessed. ' + err.message);
      }
    },

    _getPreference: function(key) {
      var pref;
      try {
        pref = localStorage[key];
      } finally {
        if (pref) {
          return JSON.parse(pref);
        }
        return null;
      }
    }
  };

  exports.ControlUtils.userPreferences = userPreferences;

  exports.ControlUtils.editMode = {
    basic: 'Basic',
    advanced: 'Advanced'
  };

  $(document).on('defaultToolValueChanged', function(e, annotation, property, value) {
    userPreferences.defaultToolValueChanged(annotation, property, value);
  });

  exports.ControlUtils.getSelectedAnnotation = function() {
    var am = readerControl.docViewer.getAnnotationManager();
    var selectedAnnotations = am.getSelectedAnnotations();
    if (selectedAnnotations.length <= 0) {
      return null;
    }
    var annotation = selectedAnnotations[0];
    if (!am.canModify(annotation)) {
      return null;
    }

    return annotation;
  };

  exports.ControlUtils.PropertyManager = function(annotationProperty, $slider, $radioContainer) {
    this.annotationProperty = annotationProperty;
    this.$slider = $slider;
    this.$radioContainer = $radioContainer;
    this.displayUnit = '';
    this.annotationPropertyModifier = function(value) {
      return value;
    };

    var me = this;
    // set up event handlers for radio buttons
    $radioContainer.find('[data-value]').each(function() {
      var $this = $(this);
      var val = $this.attr('data-value');
      $this.on('click', function() {
        me.update(val);
        readerControl.fireEvent('defaultToolValueChanged',
          [exports.ControlUtils.getSelectedAnnotation(), me.annotationProperty, me.annotationPropertyModifier(val)]);
      });
    });
  };

  exports.ControlUtils.PropertyManager.prototype = {
    setDisplayUnit: function(unit) {
      this.displayUnit = unit;
    },
    setAnnotationPropertyModifier: function(modifierFunction) {
      this.annotationPropertyModifier = modifierFunction;
    },
    update: function(value, updateAnnot) {
      updateAnnot = _.isUndefined(updateAnnot) ? true : updateAnnot;

      var selectedButton = this.$radioContainer.find('[data-value="' + value + '"]');
      if (selectedButton.length > 0) {
        selectedButton.prop('checked', true);
      } else {
        // deselect all radio buttons if the value isn't found
        this.$radioContainer.find('[data-value]').prop('checked', false);
      }
      this.$radioContainer.find('.propertyValue').text(Math.round(value) + this.displayUnit);

      if (updateAnnot) {
        var annot = exports.ControlUtils.getSelectedAnnotation();
        if (annot) {
          annot[this.annotationProperty] = this.annotationPropertyModifier(value);
          var am = readerControl.docViewer.getAnnotationManager();
          am.trigger('annotationChanged', [[annot], 'modify']);
          am.updateAnnotation(annot);
          exports.ControlUtils.updateAnnotPreview(annot);
        }
      }
    }
  };

  var annotPreview;

  exports.ControlUtils.setPreviewCanvas = function(canvas, width, height) {
    annotPreview = new AnnotPreview(canvas, width, height);
  };

  exports.ControlUtils.updateAnnotPreview = function(annot) {
    annotPreview.update(annot);
  };

  var AnnotPreview = function(canvas, width, height) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.width = width;
    this.height = height;
  };

  AnnotPreview.prototype = {
    drawRectangle: function(strokeThickness, textColor) {
      var lineWidth = this.ctx.lineWidth;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(lineWidth, lineWidth);
      this.ctx.lineTo(this.width - lineWidth, lineWidth);
      this.ctx.lineTo(this.width - lineWidth, this.height - lineWidth);
      this.ctx.lineTo(lineWidth, this.height - lineWidth);
      this.ctx.closePath();
      this.ctx.clip();
      this.ctx.moveTo(0, 0);
      this.ctx.fillRect(0, 0, this.width, this.height);
      if (textColor) {
        this.ctx.fillStyle = textColor.toString();
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Aa', this.width / 2, this.height / 2);
      }
      this.ctx.restore();
      if (strokeThickness > 0) {
        this.ctx.lineWidth *= 2;
        this.ctx.strokeRect(0, 0, this.width, this.height);
      }
    },

    drawCircle: function() {
      var centerX = 0.5 * this.width;
      var centerY = 0.5 * this.height;
      var radius = 0.5 * this.width;
      var lineWidth = this.ctx.lineWidth;

      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius - lineWidth, 0, 2 * Math.PI);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius - (lineWidth / 2), 0, 2 * Math.PI);
      this.ctx.stroke();
    },

    drawHorizontalLine: function() {
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.height / 2);
      this.ctx.lineTo(this.width, this.height / 2);
      this.ctx.stroke();
    },

    drawDiagonalLine: function() {
      var offset = 10;
      this.ctx.beginPath();
      this.ctx.moveTo(offset, this.height - offset);
      this.ctx.lineTo(this.width - offset, offset);
      this.ctx.stroke();
    },

    drawCurvedLine: function() {
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo((1 / 8) * this.width, 0.5 * this.height);
      this.ctx.bezierCurveTo((5 / 16) * this.width, (3 / 8) * this.height,
        (5 / 16) * this.width, (3 / 8) * this.height, 0.5 * this.width, 0.5 * this.height);
      this.ctx.bezierCurveTo((11 / 16) * this.width, (5 / 8) * this.height,
        (11 / 16) * this.width, (5 / 8) * this.height, (7 / 8) * this.width, 0.5 * this.height);
      this.ctx.stroke();
    },

    drawStickyNote: function(annot) {
      var maxScale = Math.max(annot.SIZE / this.width, annot.SIZE / this.height);
      var scaleFactor = 0.75 / maxScale;
      this.ctx.translate(this.width * 0.125, this.height * 0.125);
      this.ctx.scale(scaleFactor, scaleFactor);
      annot.draw(this.ctx);
    },

    update: function(annot) {
      var strokeThickness = annot.StrokeThickness;
      var color = annot.StrokeColor;
      var fillColor = annot.FillColor;
      var opacity = annot.Opacity;
      var textColor = annot.TextColor;
      var fontSize = annot.FontSize;

      this.ctx.save();
      this.ctx.clearRect(0, 0, this.width, this.height);
      if (strokeThickness) {
        this.ctx.lineWidth = strokeThickness;
      }
      if (color) {
        this.ctx.strokeStyle = color.toString();
      }
      if (fillColor) {
        this.ctx.fillStyle = fillColor.toString();
      }
      if (!_.isUndefined(opacity)) {
        this.ctx.globalAlpha = opacity;
      }
      if (!_.isUndefined(fontSize)) {
        this.ctx.font = fontSize + ' Arial';
      }

      if ((annot instanceof Annotations.TextMarkupAnnotation && !(annot instanceof Annotations.TextHighlightAnnotation))
                || annot instanceof Annotations.PolylineAnnotation) {
        this.drawHorizontalLine();
      } else if (annot instanceof Annotations.LineAnnotation) {
        this.drawDiagonalLine();
      } else if (annot instanceof Annotations.FreeHandAnnotation) {
        this.drawCurvedLine();
      } else if (annot instanceof Annotations.StickyAnnotation) {
        this.drawStickyNote(annot);
      } else if (annot instanceof Annotations.RectangleAnnotation || annot instanceof Annotations.FreeTextAnnotation
                || annot instanceof Annotations.PolygonAnnotation) {
        this.drawRectangle(strokeThickness, textColor);
      } else if (annot instanceof Annotations.EllipseAnnotation) {
        this.drawCircle();
      } else if (fillColor) {
        this.drawRectangle(strokeThickness, textColor);
      } else {
        this.drawHorizontalLine();
      }
      this.ctx.restore();
    }
  };
})(window);
