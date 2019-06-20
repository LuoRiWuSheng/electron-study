/* global define */
(function(root, PDFTron) {
  if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = PDFTron();
  } else if (typeof define === 'function' && define.amd) {
    define(PDFTron);
  } else if (typeof exports === 'object') {
    exports.PDFTron = PDFTron();
  } else {
    root.PDFTron = PDFTron();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  /**
   * The namespace reserved for PDFTron technologies.
   * @namespace PDFTron
  */
  var PDFTron = PDFTron || {};

  if (typeof console === 'undefined') {
    window.console = {
      log: function() {
      },
      warn: function() {
      },
      error: function() {
      }
    };
  }

  var Utils = {
    extend: function() {
      for (var i = 1; i < arguments.length; i++) {
        for (var key in arguments[i]) {
          if (arguments[i].hasOwnProperty(key)) {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
      return arguments[0];
    },
    createEvent: function(eventName, data) {
      var event;
      try {
        event = new CustomEvent(eventName, { detail: data, bubbles: true, cancelable: true });
      } catch (e) {
        event = document.createEvent('Event');
        event.initEvent(eventName, true, true);
        event.detail = data;
      }
      return event;
    }
  };

  if (window.PDFNet && !PDFTron.skipPDFNetWebViewerWarning) {
    console.warn('PDFNet.js and WebViewer.js have been included in the same context. See pdftron.com/kb_same_context for an explanation of why this could be an error in your application.');
  }


  /**
   * Creates a WebViewer instance and embeds it on the HTML page.
   * @class Represents a WebViewer which is a document viewer built using HTML5.<br/><br/>List of frequently used namspaces/classes:
<ul>
  <li>{@link CoreControls CoreControls} - A namespace containing core control classes.</li>
  <ul>
    <li>{@link CoreControls.ReaderControl ReaderControl} - A utility class that contains essential APIs.</li>
    <li>{@link CoreControls.DocumentViewer DocumentViewer} - A control class used for document viewing and operations.</li>
    <li>{@link CoreControls.AnnotationManager AnnotationManager} - A control class used for annotation managing.</li>
    <li>{@link CoreControls.Document Document} - A class representing a document.</li>
  </ul>
  <li>{@link Annotations Annotations} - A namespace containing annotation classes.</li>
  <li>{@link Tools Tools} - A namespace containing tool classes.</li>
  <li>{@link PDFNet PDFNet} - A namespace containing PDFNet classes (used in fullAPI option).</li>
</ul>
   * @memberOf PDFTron
   * @param {PDFTron.WebViewer#Options} options Options passed to the specific WebViewer.
   * @param {DOMElement} element The html element that will contain the web viewer (e.g. the <div> element that will be parent of the WebViewer). This can be obtained through document.getElementById() or similar functions.
   * @return {PDFTron.WebViewer} The instance of the WebViewer class.
   * @example var viewerElement = document.getElementById('viewer');
var viewer = new PDFTron.WebViewer({
  path: 'path/to/lib',
  l: 'YOUR_LICENSE_KEY',
  initialDoc : 'path/to/doc.pdf'
}, viewerElement);
   */
  PDFTron.WebViewer = function WebViewer(options, element) {
    this._validateOptions(options);

    if (options.ui === 'legacy') {
      options.html5Path = 'ui-legacy/ReaderControl.html';
      options.html5MobilePath = 'ui-legacy/MobileReaderControl.html';
      if (options.mobileRedirect === undefined) {
        options.mobileRedirect = true;
      }
    }
    this.options = Utils.extend({}, PDFTron.WebViewer.Options, options);
    // set up alternate viewer paths.
    if (typeof options.path !== 'undefined') {
      // alternate path provided
      var lastCharIndex = this.options.path.length - 1;
      if (lastCharIndex > 0 && this.options.path[lastCharIndex] !== '/') {
        this.options.path += '/';
      }
      this.options.html5Path = this.options.path + this.options.html5Path;
      this.options.html5MobilePath = this.options.path + this.options.html5MobilePath;
    }

    if (!element) {
      console.error('ViewerElement is not defined. This may be caused by calling the WebViewer constructor before the DOM is loaded, or an invalid selector. Please see https://www.pdftron.com/documentation/web/guides/quick-start for an example.');
    }
    this.element = element;
    this.element.style.overflow = 'hidden';

    window.WebViewer = {
      l: function() {
        return options.l;
      },
      workerTransportPromise: function() {
        return options.workerTransportPromise;
      }
    };

    window.addEventListener('message', function(event) {
      if (event.data === 'requestl') {
        event.source.postMessage({
          type: 'responsel',
          value: options.l
        }, '*');
      }
    }, false);

    if (this.options.autoCreate) {
      this.create();
    }
  };


  PDFTron.WebViewer.prototype = {
    version: '5.0.0',
    create: function() {
      if (this.options.initialDoc) {
        var docPath = this._correctRelativePath(this.options.initialDoc);
        docPath = encodeURIComponent(docPath); // url-encode the doc path
        this.options.initialDoc = docPath;
        this._create();
      } else {
        // just create the viewer if there is no initial doc specified
        this._create();
      }
    },
    _create: function() {
      // called by the constructor only once
      var me = this;
      me.rcId = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1); // random id
      if ((typeof this._trigger) === 'undefined') {
        this._trigger = function(type, data) {
          var event = Utils.createEvent(type, data);
          this.element.dispatchEvent(event);
        };
      }

      // get the selected type
      var viewers = this.options.type.replace(' ', '').split(',');
      if (viewers.length < 1) {
        viewers[0] = 'html5';
      } // use html5 as default

      me._createViewer(viewers);
    },
    _validateOptions: function(options) {
      for (var option in options) {
        if (!(option in PDFTron.WebViewer.Options)) {
          console.warn(option + ' is not a valid option name.');
        }
      }

      if (options.enableRedaction && !(options.fullAPI || options.pdftronServer)) {
        console.warn('FullAPI or WebViewer Server is needed to apply redactions');
      }
    },
    _notSupportedMobile: function() {
      var notSupportedDiv = document.createElement('div');
      notSupportedDiv.id = 'webviewer-browser-unsupported';
      notSupportedDiv.textContent = 'PDF document viewing is not supported by this browser.';

      this.element.appendChild(notSupportedDiv);
    },
    _createViewer: function(viewers) {
      var me = this;
      me.selectedType = null;
      var newLocation;

      if (this.isMobileDevice()) {
        if (this.options.documentType && this.options.documentType !== 'xod' && !this._testWebAssembly()) {
          this._notSupportedMobile();
          return;
        }

        viewers = Array('html5Mobile');
        me.selectedType = 'html5Mobile';

        if (this.options.mobileRedirect) {
          // redirect to new location
          newLocation = this.options.html5MobilePath + this._getHTML5OptionsURL();
          window.location = newLocation;
          return;
        }
      }
      var allowHTML5 = false;
      var corsError = false;

      for (var i = 0; i < viewers.length; i++) {
        if (viewers[i].toLowerCase() === 'html5mobile') {
          if (this.options.documentType && this.options.documentType !== 'xod' && !this._testWebAssembly()) {
            continue;
          }

          allowHTML5 = true;
          if (me._testHTML5()) {
            if (this.options.mobileRedirect) {
              // redirect to new location
              me.selectedType = 'html5Mobile';
              newLocation = this.options.html5MobilePath + this._getHTML5OptionsURL();
              window.location = newLocation;
              return;
            }
            if (this.options.xdomainProxyUrl || me.isSameOrigin(decodeURIComponent(me.options.initialDoc)) || me._testCORS()) {
              me.selectedType = 'html5Mobile';
              break;
            } else {
              corsError = true;
            }
          }
        }
        if (viewers[i].toLowerCase() === 'html5') {
          allowHTML5 = true;
          if (me._testHTML5()) {
            var sameOrigin = me.isSameOrigin(decodeURIComponent(me.options.initialDoc));
            if (this.options.xdomainProxyUrl || sameOrigin || me._testCORS()) {
              // if not same origin, need to support xdomain access through CORS
              me.selectedType = 'html5';
              break;
            } else {
              corsError = true;
            }
          }
        }
      }
      if (me.selectedType === 'html5') {
        me._createHTML5();
      } else if (me.selectedType === 'html5Mobile') {
        me._createHTML5Mobile();
      } else {
        var supportError;
        if (corsError) {
          supportError = 'This browser does not support cross origin requests. Please configure xdomain to support CORS.';
        } else if (allowHTML5) {
          supportError = 'Please use an HTML5 compatible browser.';
        }

        if (supportError) {
          var unsupportedDiv = document.createElement('div');
          unsupportedDiv.id = 'webviewer-browser-unsupported';
          unsupportedDiv.textContent = supportError;
          me.element.appendChild(unsupportedDiv);
        }
      }
    },
    _viewerLoaded: function(iframe) {
      var me = this;
      me._trigger('ready');

      try {
        var viewerWindow = iframe.contentWindow;

        // same the namespaces to the outer window
        var outerWindow = window;
        outerWindow.CoreControls = outerWindow.CoreControls || {};
        outerWindow.CoreControls.DisplayModes = viewerWindow.CoreControls.DisplayModes;

        if (typeof me.options.encryption !== 'undefined') {
          var doc = decodeURIComponent(me.options.initialDoc);
          var loadOptions = {
            decrypt: viewerWindow.CoreControls.Encryption.decrypt,
            decryptOptions: me.options.encryption,
            documentId: me.options.documentId
          }; // get the load options set via constructor

          viewerWindow.ControlUtils.byteRangeCheck(function(status) {
            // if the range header is supported then we will receive a status of 206
            if (status === 200) {
              loadOptions.streaming = true;
            }
            me.loadDocument(doc, loadOptions);
          }, function() {
            // some browsers that don't support the range header will return an error
            loadOptions.streaming = true;
            me.loadDocument(doc, loadOptions);
          });
        }

        if (me.instance.docViewer.getDocument() === null) {
          // note, we need to listen using the iframe window's instance of jQuery
          viewerWindow.$(iframe.contentDocument).on('documentLoaded', function(event) {
            me._trigger(event.type);
          });
        } else {
          // a document is already loaded, trigger the documentLoaded event directly
          me._trigger('documentLoaded');
        }

        // bind the rest of the events/callbacks here
        viewerWindow.$(iframe.contentDocument).on('displayModeChanged layoutModeChanged zoomChanged pageChanged fitModeChanged toolModeChanged printProgressChanged error',
          function() {
            var event = arguments[0];
            // relay event
            me._trigger(event.type, Array.prototype.slice.call(arguments, 1));
          });
      } catch (error) {
        console.warn('Viewer is on a different domain, API functions will not work because of cross domain permissions. See https://pdftron.com/kb_cross_origin for more information.');
      }
    },

    _isPDFExtension: function(extension) {
      var result = false;
      if (extension) {
        var pdfExtensions = ['.pdf', '.png', '.jpg', 'jpeg'];
        pdfExtensions.forEach(function(ext) {
          if (extension === ext) {
            result = true;
          }
        });
      }
      return result;
    },

    _isOfficeExtension: function(extension) {
      var result = false;
      if (extension) {
        var officeExtensions = ['.docx', '.doc', '.pptx'];
        officeExtensions.forEach(function(ext) {
          if (extension === ext) {
            result = true;
          }
        });
      }
      return result;
    },


    _getHTML5OptionsURL: function() {
      if (this.selectedType === 'html5') {
        if (this.options.html5Options) {
          Utils.extend(this.options, this.options.html5Options);
        }
      } else if (this.selectedType === 'html5Mobile') {
        if (this.options.html5MobileOptions) {
          Utils.extend(this.options, this.options.html5MobileOptions);
        }
      }

      var options = this.options;
      var url = '';

      function acceptBackendUrl(officeEnabled, pdfEnabled) {
        // optionally force backend, else default to auto
        if (officeEnabled) {
          url += options.backendType ? '&office=' + options.backendType : '&office=auto';
        }
        if (pdfEnabled) {
          url += options.backendType ? '&pdf=' + options.backendType : '&pdf=auto';
        }
      }


      if (options.initialDoc) {
        url += '#d=' + options.initialDoc;
      }

      var officeEnabled = false, pdfEnabled = false;
      // If document type not specified, use extension to determine viewer to load
      // Default to xod file format if not specified

      var periodPosition;
      var extension = (options.initialDoc && (periodPosition = options.initialDoc.lastIndexOf('.'))) ? options.initialDoc.slice(periodPosition).toLowerCase() : null;

      if (options.documentType === 'pdf' || options.documentType === 'all' ||
                (typeof options.documentType === 'undefined' && this._isPDFExtension(extension))) {
        pdfEnabled = true;
      }

      if (options.documentType === 'office' || options.documentType === 'all' ||
                (typeof options.documentType === 'undefined' && this._isOfficeExtension(extension))) {
        officeEnabled = true;
      }

      if (options.documentType) {
        url += '&documentType=' + options.documentType;
      }

      if (typeof options.backendType === 'undefined') {
        options.backendType = options.pdfBackend;
      }
      acceptBackendUrl(officeEnabled, pdfEnabled);

      if (options.streaming) {
        url += '&streaming=' + options.streaming;
      }
      if (options.externalPath) {
        var path = this._correctRelativePath(options.externalPath);
        path = encodeURIComponent(path);
        url += '&p=' + path;
      }
      if (options.encryption) {
        // we want to stop the document from automatically loading if it's encrypted as we'll do that later passing the options to it
        url += '&auto_load=false';
      }
      if (options.enableAnnotations) {
        url += '&a=1';
      }
      if (options.disabledElements && options.ui !== 'legacy') {
        var disabledElements = encodeURIComponent(options.disabledElements.join(','));
        url += '&disabledElements=' + disabledElements;
      }
      if (options.serverUrl) {
        var serverUrl = this._correctRelativePath(options.serverUrl);
        serverUrl = encodeURIComponent(serverUrl);
        url += '&server_url=' + serverUrl;
      }
      if (options.serverUrlHeaders) {
        url += '&serverUrlHeaders=' + JSON.stringify(options.serverUrlHeaders);
      }
      if (options.documentId) {
        url += '&did=' + options.documentId;
      }
      if (options.css) {
        var css = this._correctRelativePath(options.css);
        css = encodeURIComponent(css);
        url += '&css=' + css;
      }
      if (options.config) {
        var config = this._correctRelativePath(options.config);
        config = encodeURIComponent(config);
        url += '&config=' + config;
      }
      if (options.disableI18n && options.ui !== 'legacy') {
        url += '&disableI18n=1';
      }
      if (options.enableOfflineMode) {
        url += '&offline=1';
      }
      if (options.startOffline) {
        url += '&startOffline=1';
      }
      if (options.enableReadOnlyMode) {
        url += '&readonly=1';
      }
      if (options.hideAnnotationPanel) {
        url += '&hideAnnotationPanel=1';
      }
      if (typeof options.annotationUser !== 'undefined') {
        url += '&user=' + options.annotationUser;
      }
      if (typeof options.annotationAdmin !== 'undefined') {
        url += '&admin=' + (options.annotationAdmin ? 1 : 0);
      }
      if (typeof options.custom !== 'undefined') {
        url += '&custom=' + encodeURIComponent(options.custom);
      }
      if (typeof options.showLocalFilePicker !== 'undefined') {
        url += '&filepicker=' + (options.showLocalFilePicker ? 1 : 0);
      }
      if (typeof options.preloadPDFWorker !== 'undefined') {
        url += '&preloadWorker=' + (options.preloadPDFWorker ? 1 : 0);
      }
      if (typeof options.fullAPI !== 'undefined') {
        url += '&pdfnet=' + (options.fullAPI ? 1 : 0);
      }
      if (typeof options.enableRedaction !== 'undefined') {
        url += '&enableRedaction=' + (options.enableRedaction ? 1 : 0);
      }
      if (typeof options.enableMeasurement !== 'undefined') {
        url += '&enableMeasurement=' + (options.enableMeasurement ? 1 : 0);
      }
      if (typeof options.showToolbarControl !== 'undefined') {
        url += '&toolbar=' + (options.showToolbarControl ? 'true' : 'false');
      }
      if (typeof options.showPageHistoryButtons !== 'undefined') {
        url += '&pageHistory=' + (options.showPageHistoryButtons ? 1 : 0);
      }
      if (typeof options.xdomainProxyUrl !== 'undefined') {
        var urls;
        if (typeof options.xdomainProxyUrl === 'string') {
          // if the option is a string then a single url is being used and is handled differently
          // the single url will be on the url property
          urls = {
            url: options.xdomainProxyUrl
          };
        } else {
          // urls passed in through object form can be kept as is
          urls = options.xdomainProxyUrl;
        }
        url += '&xdomain_urls=' + encodeURIComponent(JSON.stringify(urls));
      }
      if (options.azureWorkaround) {
        url += '&azureWorkaround=1';
      }
      if (!options.useDownloader) {
        url += '&useDownloader=0';
      }
      if (options.disableWebsockets) {
        url += '&disableWebsockets=1';
      }
      if (options.subzero) {
        url += '&subzero=1';
      }
      if (typeof options.workerTransportPromise !== 'undefined') {
        url += '&useSharedWorker=' + (options.workerTransportPromise ? 'true' : 'false');
      }
      if (typeof options.pdftronServer !== 'undefined' && options.pdftronServer) {
        url += '&pdftronServer=' + encodeURIComponent(options.pdftronServer);
      }

      // if there is no initial doc specified then the first character might not be a '#' so fix this
      if (url.length > 0 && url[0] === '&') {
        url = '#' + url.slice(1);
      }

      return url;
    },
    _createHTML5: function() {
      var me = this;
      var iframeSource = this.options.html5Path + this._getHTML5OptionsURL();

      // _getHTML5OptionsURL
      var rcFrame = document.createElement('iframe');
      rcFrame.id = this.rcId;
      rcFrame.src = iframeSource;
      rcFrame.title = 'webviewer';
      rcFrame.frameBorder = 0;
      rcFrame.width = '100%';
      rcFrame.height = '100%';
      rcFrame.setAttribute('allowfullscreen', true);
      rcFrame.setAttribute('webkitallowfullscreen', true);
      rcFrame.setAttribute('mozallowfullscreen', true);

      if (this.options.backgroundColor) {
        rcFrame.setAttribute('data-bgcolor', this.options.backgroundColor);
      }

      if (this.options.assetPath) {
        rcFrame.setAttribute('data-assetpath', encodeURIComponent(this.options.assetPath));
      }

      rcFrame.addEventListener('load', function() {
        try {
          me.instance = this.contentWindow.readerControl;

          var iframe = this;

          if (typeof me.instance === 'undefined') {
            this.contentWindow.$(this.contentDocument).on('viewerLoaded', function() {
              me.instance = iframe.contentWindow.readerControl;
              me._viewerLoaded(iframe);
            });
          } else {
            me._viewerLoaded(iframe);
          }
        } catch (error) {
          me._viewerLoaded(iframe);
        }
      });

      this.element.appendChild(rcFrame);
    },
    _createHTML5Mobile: function() {
      // use the correct type if mobile
      var me = this;
      var iframeSource = this.options.html5MobilePath + this._getHTML5OptionsURL();

      var rcFrame = document.createElement('iframe');
      rcFrame.id = this.rcId;
      rcFrame.src = iframeSource;
      rcFrame.frameborder = 0;

      if (this.options.assetPath) {
        rcFrame.setAttribute('data-assetpath', encodeURIComponent(this.options.assetPath));
      }
      rcFrame.style.width = '100%';
      rcFrame.style.height = '100%';
      rcFrame.addEventListener('load', function() {
        try {
          me.instance = this.contentWindow.readerControl;

          var iframe = this;

          if (typeof me.instance === 'undefined') {
            this.contentWindow.$(this.contentDocument).bind('viewerLoaded', function() {
              me.instance = iframe.contentWindow.readerControl;
              me._viewerLoaded(iframe);
            });
          } else {
            me._viewerLoaded(iframe);
          }
        } catch (error) {
          me._viewerLoaded(iframe);
        }
      });
      this.element.appendChild(rcFrame);
    },
    /**
     * Gets the instance of the ReaderControl object loaded by WebViewer.
     * @method PDFTron.WebViewer#getInstance
     * @return {CoreControls.ReaderControl} A ReaderControl instance.
     */
    getInstance: function() {
      if (!this.instance) {
        console.error('The viewer instance is not defined yet. Try calling getInstance() in the ready event listener, or check https://www.pdftron.com/documentation/web/guides/ui/apis for a detailed example.');
      }

      return this.instance;
    },
    /**
     * Gets the visibility of the default side window. Not supported for mobile viewer.
     * @method PDFTron.WebViewer#getSideWindowVisibility
     * @return {boolean} `true` if the side window is visible.
     */
    getSideWindowVisibility: function() {
      return this.getInstance().getShowSideWindow();
    },
    /**
     * Gets the visibility of the default side window. Not supported for mobile viewer.
     * @method PDFTron.WebViewer#setSideWindowVisibility
     * @param {boolean} value `true` to show the side window.
     */
    setSideWindowVisibility: function(value) {
      this.getInstance().setShowSideWindow(value);
    },
    /**
     * Gets the value whether the side window is visible or not. Not supported for mobile viewer.
     * @method PDFTron.WebViewer#getShowSideWindow
     * @return {boolean} `true` if the side window is shown.
     * @deprecated Since version 1.7. Replaced by [getSideWindowVisibility]{@link PDFTron.WebViewer#getSideWindowVisibility}.
     */
    getShowSideWindow: function() {
      return this.getSideWindowVisibility();
    },
    /**
     * Sets the value whether the side window is visible or not. Not supported for mobile viewer.
     * @method PDFTron.WebViewer#setShowSideWindow
     * @param {boolean} value pass `true` to show the side window.
     * @deprecated Since version 1.7. Replaced by [setShowSideWindow]{@link PDFTron.WebViewer#setShowSideWindow}.
     */
    setShowSideWindow: function(value) {
      this.setSideWindowVisibility(value);
    },
    /**
     * Gets the visibilty of the default toolbar control.
     * @method PDFTron.WebViewer#getToolbarVisibility
     * @return {boolean} `true` if the toolbar is visible.
     */
    getToolbarVisibility: function() {
      console.warn('Unsupported method getToolbarVisibility');
    },
    /**
     * Sets the visibilty of the default toolbar control.
     * @method PDFTron.WebViewer#setToolbarVisibility
     * @param {boolean} isVisible `true` if the toolbar is visible.
     */
    setToolbarVisibility: function(isVisible) {
      this.getInstance().setToolbarVisibility(isVisible);
    },
    /**
     * Gets the current page number of the document loaded in the WebViewer.
     * @method PDFTron.WebViewer#getCurrentPageNumber
     * @return {number} The current page number of the document.
     */
    getCurrentPageNumber: function() {
      return this.getInstance().getCurrentPageNumber();
    },
    /**
     * Sets the current page number of the document loaded in the WebViewer.
     * @method PDFTron.WebViewer#setCurrentPageNumber
     * @param {number} pageNumber The page number of the document to set.
     */
    setCurrentPageNumber: function(pageNumber) {
      this.getInstance().setCurrentPageNumber(pageNumber);
    },
    /**
     * Gets the total number of pages of the loaded document.
     * @method PDFTron.WebViewer#getPageCount
     * @return {number} The total number of pages of the loaded document.
     */
    getPageCount: function() {
      return this.getInstance().getPageCount();
    },
    /**
     * Gets the zoom level of the document.
     * @method PDFTron.WebViewer#getZoomLevel
     * @return {number} The zoom level of the document.
     */
    getZoomLevel: function() {
      return this.getInstance().getZoomLevel();
    },
    /**
     * Sets the zoom level of the document.
     * @method PDFTron.WebViewer#setZoomLevel
     * @param {number} zoomLevel The new zoom level to set.
     */
    setZoomLevel: function(zoomLevel) {
      this.getInstance().setZoomLevel(zoomLevel);
    },
    /**
     * Rotates the document in the WebViewer clockwise. Not supported for mobile viewer.
     * @method PDFTron.WebViewer#rotateClockwise
     */
    rotateClockwise: function() {
      this.getInstance().rotateClockwise();
    },
    /**
     * Rotates the document in the WebViewer counter-clockwise. Not supported for mobile viewer.
     * @method PDFTron.WebViewer#rotateCounterClockwise
     */
    rotateCounterClockwise: function() {
      this.getInstance().rotateCounterClockwise();
    },
    /**
     * Gets the layout mode of the document in the WebViewer. Not supported for mobile viewer.
     * @method PDFTron.WebViewer#getLayoutMode
     * @return {PDFTron.WebViewer#LayoutMode} The layout mode of the document.
     */
    getLayoutMode: function() {
      var layoutMode = this.getInstance().getLayoutMode();
      var displayModes = CoreControls.DisplayModes;

      // the HTML5 viewer has different naming schemes for this
      if (layoutMode === displayModes.Single) {
        return PDFTron.WebViewer.LayoutMode.Single;
      } else if (layoutMode === displayModes.Continuous) {
        return PDFTron.WebViewer.LayoutMode.Continuous;
      } else if (layoutMode === displayModes.Facing) {
        return PDFTron.WebViewer.LayoutMode.Facing;
      } else if (layoutMode === displayModes.FacingContinuous) {
        return PDFTron.WebViewer.LayoutMode.FacingContinuous;
      } else if (layoutMode === displayModes.Cover) {
        return PDFTron.WebViewer.LayoutMode.FacingCoverContinuous;
      } else if (layoutMode === displayModes.CoverFacing) {
        return PDFTron.WebViewer.LayoutMode.FacingCover;
      }
      return undefined;
    },
    /**
     * Sets the layout mode of the document in the WebViewer. Not supported for mobile viewer.
     * @method PDFTron.WebViewer#setLayoutMode
     * @param {PDFTron.WebViewer#LayoutMode} layoutMode The layout mode to set.
     */
    setLayoutMode: function(layoutMode) {
      var displayModes = CoreControls.DisplayModes;

      var displayMode = displayModes.Continuous;

      // the HTML5 viewer have different naming schemes for this
      if (layoutMode === PDFTron.WebViewer.LayoutMode.Single) {
        displayMode = displayModes.Single;
      } else if (layoutMode === PDFTron.WebViewer.LayoutMode.Continuous) {
        displayMode = displayModes.Continuous;
      } else if (layoutMode === PDFTron.WebViewer.LayoutMode.Facing) {
        displayMode = displayModes.Facing;
      } else if (layoutMode === PDFTron.WebViewer.LayoutMode.FacingContinuous) {
        displayMode = displayModes.FacingContinuous;
      } else if (layoutMode === PDFTron.WebViewer.LayoutMode.FacingCover) {
        displayMode = displayModes.CoverFacing;
        // displayMode = displayModes.Cover;
      } else if (layoutMode === PDFTron.WebViewer.LayoutMode.FacingCoverContinuous) {
        displayMode = displayModes.Cover;
        // displayMode = displayModes.CoverContinuous;
      }

      this.getInstance().setLayoutMode(displayMode);
    },
    /**
     * Gets the current tool mode of the WebViewer.
     * @method PDFTron.WebViewer#getToolMode
     * @return {PDFTron.WebViewer.ToolMode} The current tool mode of the WebViewer.
     */
    getToolMode: function() {
      return this.getInstance().getToolMode();
    },
    /**
     * Sets the tool mode of the WebViewer.
     * @method PDFTron.WebViewer#setToolMode
     * @param {PDFTron.WebViewer.ToolMode} toolMode Must be one of the [ToolMode]{@link PDFTron.WebViewer.ToolMode}.
     */
    setToolMode: function(toolMode) {
      this.getInstance().setToolMode(toolMode);
    },
    /**
     * Controls if the document's Zoom property will be adjusted so that the width of the current page or panel
     * will exactly fit into the available space. Not supported for mobile viewer.
     * @method PDFTron.WebViewer#fitWidth
     * @deprecated Since version 1.7. Use [setFitMode]{@link PDFTron.WebViewer#setFitMode} instead.
     */
    fitWidth: function() {
      var docViewer = this.getInstance().docViewer;
      docViewer.setFitMode(docViewer.FitMode.FitWidth);
    },
    /**
     * Controls if the document's Zoom property will be adjusted so that the height of the current page or panel
     * will exactly fit into the available space. Not supported for mobile viewer.
     * @method PDFTron.WebViewer#fitHeight
     * @deprecated Since version 1.7. Use [setFitMode]{@link PDFTron.WebViewer#setFitMode} instead.
     */
    fitHeight: function() {
      // not supported
    },
    /**
     * Controls if the document's Zoom property will be adjusted so that the width and height of the current page or panel
     * will fit into the available space. Not supported for mobile viewer.
     * @method PDFTron.WebViewer#fitPage
     * @deprecated Since version 1.7. Use [setFitMode]{@link PDFTron.WebViewer#setFitMode} instead.
     */
    fitPage: function() {
      var docViewer = this.getInstance().docViewer;
      docViewer.setFitMode(docViewer.FitMode.FitPage);
    },
    /**
     * Gets the current fit mode of the viewer.
     * @since Version 1.7
     * @method PDFTron.WebViewer#getFitMode
     * @return {PDFTron.WebViewer.FitMode} The current fit mode of the viewer.
     */
    getFitMode: function() {
      var fitMode = this.getInstance().getFitMode();
      var FitModeEnums = this.getInstance().docViewer.FitMode;
      switch (fitMode) {
        case FitModeEnums.FitWidth:
          return PDFTron.WebViewer.FitMode.FitWidth;
        case FitModeEnums.FitHeight:
          return PDFTron.WebViewer.FitMode.FitHeight;
        case FitModeEnums.FitPage:
          return PDFTron.WebViewer.FitMode.FitPage;
        case FitModeEnums.Zoom:
          return PDFTron.WebViewer.FitMode.Zoom;
        default:
          console.warn('Unsupported fit mode');
      }
    },
    /**
     * Sets the fit mode of the viewer. This is equivalent to calling the methods: fitWidth, fitHeight, fitPage, zoom.
     * @method PDFTron.WebViewer#setFitMode
     * @param {PDFTron.WebViewer.FitMode} fitMode The fit mode to set.
     * @since Version 1.7
     */
    setFitMode: function(fitMode) {
      if (fitMode === PDFTron.WebViewer.FitMode.FitWidth) {
        this.fitWidth();
      } else if (fitMode === PDFTron.WebViewer.FitMode.FitHeight) {
        this.fitHeight();
      } else if (fitMode === PDFTron.WebViewer.FitMode.FitPage) {
        this.fitPage();
      } else if (fitMode === PDFTron.WebViewer.FitMode.Zoom) {
        this.zoom();
      } else {
        console.warn('Unsupported fit mode: ' + fitMode);
      }
    },
    /**
     * Controls if the document's Zoom property will be freely adjusted and not constrained with the width and height of the
     * current page or panel. Not supported for mobile viewer.
     * @method PDFTron.WebViewer#zoom
     * @deprecated Since version 1.7. Use [setFitMode]{@link PDFTron.WebViewer#setFitMode} instead.
     */
    zoom: function() {
      var docViewer = this.getInstance().docViewer;
      docViewer.setFitMode(docViewer.FitMode.Zoom);
    },
    /**
     * Goes to the first page of the document. Makes the document viewer display the first page of the document.
     * @method PDFTron.WebViewer#goToFirstPage
     */
    goToFirstPage: function() {
      this.getInstance().goToFirstPage();
    },
    /**
     * Goes to the last page of the document. Makes the document viewer display the last page of the document.
     * @method PDFTron.WebViewer#goToLastPage
     */
    goToLastPage: function() {
      this.getInstance().goToLastPage();
    },
    /**
     * Goes to the next page of the document. Makes the document viewer display the next page of the document.
     * @method PDFTron.WebViewer#goToNextPage
     */
    goToNextPage: function() {
      this.getInstance().goToNextPage();
    },
    /**
     * Goes to the previous page of the document. Makes the document viewer display the previous page of the document.
     * @method PDFTron.WebViewer#goToPrevPage
     */
    goToPrevPage: function() {
      this.getInstance().goToPrevPage();
    },
    /**
     * Loads a document to the WebViewer.
     * @method PDFTron.WebViewer#loadDocument
     * @param {string} url The URL of the document to be loaded.
     * @param {object} loadOptions Options for loading a new document.
     * @param loadOptions.documentId A unique identifer for the document. When an annotation server is specified, this ID will be sent to the server.
     * @param loadOptions.filename The filename of the document.
     * @param loadOptions.customHeaders An object custom HTTP headers to use when retrieving the document from the specified url. For example: \{'Authorization' : 'Basic dXNlcm5hbWU6cGFzc3dvcmQ='\}
     */
    loadDocument: function(url, options) {
      var existingLoadOptions = {
        streaming: this.options.streaming
      };
      var loadOptions = Utils.extend({}, existingLoadOptions, options);
      if (typeof loadOptions.documentId !== 'undefined') {
        // allow "null" values
        this.getInstance().docId = loadOptions.documentId;
      }
      this.getInstance().loadDocument(this._correctRelativePath(url), loadOptions);
    },
    /**
     * Searches the loaded document finding for the matching pattern. Search mode includes:
     * <ul>
     * <li>None</li>
     * <li>CaseSensitive</li>
     * <li>WholeWord</li>
     * <li>SearchUp</li>
     * <li>PageStop</li>
     * <li>ProvideQuads</li>
     * <li>AmbientString</li>
     * </ul>
     * @method PDFTron.WebViewer#searchText
     * @param {string} pattern The pattern to look for.
     * @param {string} searchMode Must one or a combination of the above search modes. To combine search modes, simply pass them as comma separated values in one string. i.e. "CaseSensitive,WholeWord"
     */
    searchText: function(pattern, searchModes) {
      var mode = 0;
      var modes = searchModes;
      if (typeof modes === 'string') {
        modes = searchModes.split(',');
      }
      if (typeof modes !== 'undefined') {
        for (var i = 0; i < modes.length; i++) {
          if (modes[i] === 'CaseSensitive') {
            mode += 0x1;
          } else if (modes[i] === 'WholeWord') {
            mode += 0x2;
          } else if (modes[i] === 'SearchUp') {
            mode += 0x4;
          } else if (modes[i] === 'PageStop') {
            mode += 0x8;
          } else if (modes[i] === 'ProvideQuads') {
            mode += 0x10;
          } else if (modes[i] === 'AmbientString') {
            mode += 0x20;
          }
        }
      }

      if (typeof searchModes === 'undefined') {
        this.getInstance().searchText(pattern);
      } else {
        this.getInstance().searchText(pattern, mode);
      }
    },
    /**
     * Sets the annotation author.
     * @method PDFTron.WebViewer#setAnnotationUser
     * @param {string} username Author of the annotation.
     */
    setAnnotationUser: function(username) {
      this.getInstance().setAnnotationUser(username);
    },
    /**
     * Sets the administrative permissions for the current annotation user.
     * @method PDFTron.WebViewer#setAdminUser
     * @param {boolean} isAdminUser `true` if admin.
     */
    setAdminUser: function(isAdminUser) {
      this.getInstance().setAdminUser(isAdminUser);
    },
    /**
     * Sets the viewer's annotation read-only state. When read-only, users will be allowed to view annotations
     and its popup text contents, but will not be able to edit or create new annotations.
     * @method PDFTron.WebViewer#setReadOnly
     * @param {boolean} isReadOnly `true` if setting it read-only.
     */
    setReadOnly: function(isReadOnly) {
      this.getInstance().setReadOnly(isReadOnly);
    },
    /**
     * Opens the XOD document through the browser to be downloaded.
     * @method PDFTron.WebViewer#downloadXodDocument
     * @since Version 1.7
     */
    downloadXodDocument: function() {
      if (this.documentType === 'xod') {
        var url = decodeURIComponent(this.options.initialDoc);
        window.open(url);
      } else {
        console.warn('Unsupported method for this document type');
      }
    },
    /**
     * Starts a printing job for the passed in pages. (Desktop only)
     * @method PDFTron.WebViewer#startPrintJob
     * @param {string} pages The pages that should be printed. Multiple pages can be separated by commas
        and ranges can be specified by a dash (e.g. 1,3-5).
     */
    startPrintJob: function(pages) {
      if (this.selectedType === 'html5') {
        this.getInstance().startPrintJob(pages);
      } else {
        console.warn('Unsupported method startPrintJob');
      }
    },
    /**
     * Cleans up the resources that were used for printing. (Desktop only)
     * @method PDFTron.WebViewer#endPrintJob
     */
    endPrintJob: function() {
      if (this.selectedType === 'html5') {
        this.getInstance().endPrintJob();
      } else {
        console.warn('Unsupported method endPrintJob');
      }
    },
    /**
     * Gets the currently loaded viewer type. This is only valid after the documentLoaded event.
     * @method PDFTron.WebViewer#getViewerType
     * @return {string} The viewer type: "html5" or "html5Mobile".
     */
    getViewerType: function() {
      return this.selectedType;
    },
    // make relative paths absolute
    _correctRelativePath: function(path) {
      if (typeof path !== 'string') {
        // if it's not a string then just pass it through
        return path;
      }

      // get current url
      var curdir = window.location.pathname.substr(0, window.location.pathname.lastIndexOf('/'));
      // pattern begins with --> https:// or http:// or file:// or / or blob: or %2F (%2F is '/' url encoded. Necessary to work with S3 signatures)
      var pattern = /^(https?:\/\/|file:\/\/|cid:\/\/|ms-appdata:\/\/|ms-appx-web:\/\/|\/|blob:|%2F|filesystem:)/i;
      // correct relative paths by prepending "../"
      return pattern.test(path) ? path : curdir + '/' + path;
    },
    _testHTML5: function() {
      try {
        var c = document.createElement('canvas');
        return (c && c.getContext('2d'));
      } catch (e) {
        // console.warn(e);
        return false;
      }
    },
    _testWebAssembly: function() {
      return !!(window.WebAssembly && window.WebAssembly.validate);
    },
    _supports: function(type) {
      if (type === this.selectedType) {
        return true;
      }
      for (var i = 1; i < arguments.length; i++) {
        if (arguments[i] === this.selectedType) {
          return true;
        }
      }
      return false;
    },
    _testCORS: function() {
      // https://github.com/Modernizr/Modernizr/blob/master/feature-detects/cors.js
      return 'XMLHttpRequest' in window && 'withCredentials' in new XMLHttpRequest();
    },
    isIE: function() {
      var ua = navigator.userAgent.toLowerCase();
      var match = /(msie) ([\w.]+)/.exec(ua) || /(trident)(?:.*? rv:([\w.]+)|)/.exec(ua);
      return match ? parseInt(match[2], 10) : match;
    },
    /**
     * Detects if the current browser is on a mobile device.
     * @method PDFTron.WebViewer#isMobileDevice
     * @return {boolean} `true` if this page is loaded on a mobile device.
     */
    isMobileDevice: function() {
      return !this.isIE() && ((this.scrollbarWidth() === 0 && navigator.userAgent.match(/Edge/i))
                    || navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i)
                    || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPod/i)
                    || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/Touch/i)
                    || navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/Silk/i));
    },
    // In windows 10 tablets, the tablet mode and desktop mode use the same user agent.  HOWEVER
    // the scrollbar width in tablet mode is 0. This means that we can find the scrollbar width
    // and use it to determine if they are in tablet mode (mobile viewer) or desktop mode
    scrollbarWidth: function() {
      var scrollDiv = document.createElement('div');
      scrollDiv.style.cssText = 'width:100px;height:100px;overflow:scroll !important;position:absolute;top:-9999px';
      document.body.appendChild(scrollDiv);
      var result = scrollDiv.offsetWidth - scrollDiv.clientWidth;
      document.body.removeChild(scrollDiv);
      return result;
    },
    /**
     * Detects if the give url string is in the same origin as the current page
     * @method PDFTron.WebViewer#isSameOrigin
     * @param {type} url The URL to test against
     * @returns {boolean} `true` if the provided URL is in the same origin as the current page
     */
    isSameOrigin: function(url) {
      var loc = window.location;
      var a = document.createElement('a');

      a.href = url;
      if (a.host === '') {
        // IE won't set the properties we want if we set href to a relative path, but it will
        // automatically change href to an absolute path, so if we set it again as absolute then
        // hostname, port and protocol will be set as expected
        a.href = a.href;
      }

      var locPort = window.location.port;
      var aPort = a.port;

      if (a.protocol === 'http:') {
        aPort = aPort || '80';
        locPort = locPort || '80';
      } else if (a.protocol === 'https:') {
        aPort = aPort || '443';
        locPort = locPort || '443';
      }

      return (a.hostname === loc.hostname && a.protocol === loc.protocol && aPort === locPort);
    },
    /**
     * Runs the specified function, passing in the iframe window object.
     * @method PDFTron.WebViewer#runInIframe
     * @param {function} func The function to run. The function will be passed the iframe window, readerControl (aka WebViewer instance) and jQuery of the iframe window as parameters.
     */
    runInIframe: function(func) {
      var iframeWindow = this.element.querySelector('iframe').contentWindow;
      var me = this;

      var callFunc = function() {
        me.element.removeEventListener('ready', callFunc);
        func(iframeWindow, me.getInstance(), iframeWindow.$);
      };

      if (this.getInstance()) {
        setTimeout(callFunc, 0);
      } else {
        this.element.addEventListener('ready', callFunc);
      }
    }
  };

  /**
   * Options object for WebViewer on creation. Used when constructing a new {@link PDFTron.WebViewer} instance.
   * @name PDFTron.WebViewer#Options
   * @property {string} initialDoc The URL path to a xod document to load on startup.
   * @property {boolean} [annotationAdmin] A boolean indicating this user has permission to modify all annotations, even if the annotationUser and author does not match.
   * @property {string} [annotationUser] A user identifier for annotations. All annotations created will have this as the author. It is used for permission checking: user only permitted to modify annotations where annotationUser and author matches.
   * @property {string} [assetPath] An alternate path to JavaScript and CSS files. Can be located on another domain.
   * @property {boolean} [autoCreate=true] A boolean to control whether the viewer should be created after instantiating a new PDFTron.WebViewer. When set to false, invoke the create() method explicity.
   * @property {boolean} [azureWorkaround=false] Whether or not to workaround the issue of Azure not accepting range requests of a certain type. Enabling the workaround will add an extra HTTP request of overhead but will still allow documents to be loaded from other locations.
   * @property {string} [backendType] Override the automatically selected backend type when viewing PDF documents directly. Defaults to 'auto' but can be set to 'pnacl' (Chrome only) or 'ems' to use those backends.
   * @property {string} [backgroundColor] A string to set the background color of the inner page to (desktop only).
   * @property {string} [css] A URL path to a custom CSS file that holds style customizations.
   * @property {string} [config] A URL path to a JavaScript configuration file that holds UI customizations.
   * @property {string} [custom] A string of custom data that can be retrieved by the ReaderControl. In a config file you can access using window.ControlUtils.getCustomData().
   * @property {string} [documentId] An identifier for the document to be used with annotations. (required for full annotation support).
   * @property {string} [documentType] The type of document the viewer will be used with. Valid values are "xod", "pdf", "office" and "all". When loading images directly the "pdf" type should be used. If you will be loading both office and pdf in the same session then use "all". (default is "xod").
   * @property {boolean} [enableAnnotations=true] A boolean to enable annotations.
   * @property {array} [disabledElements] An array containing elements that will be disabled by default.
   * @property {boolean} [enableOfflineMode=false] A boolean to enable offline mode. By default this will add buttons to the UI to allow for saving the document to an offline database. (XOD only)
   * @property {boolean} [enableReadOnlyMode=false] A boolean to enable annotations read-only mode.
   * @property {boolean} [enableRedaction=false] A boolean to enable redaction tools (creating and applying)
   * @property {boolean} [enableMeasurement=false] A boolean to enable measurement tools
   * @property {object} [encryption] An object containing encryption properties. Expects the object to have type: "aes" and p: "your_document_password" (XOD only).
   * @property {string} [externalPath] The path to a xod document folder generated using the external parts option.
   * @property {boolean} [hideAnnotationPanel=false] Whether to hide the annotation panel or not.
   * @property {Options} [html5MobileOptions] An Options object that overrides the existing options when the Mobile viewer is loaded.
   * @property {string} [html5MobilePath=html5/MobileReaderControl.html] An alternative path to the Mobile WebViewer, relative to the "path" option.
   * @property {Options} [html5Options] An Options object that overrides the existing options when the viewer is loaded.
   * @property {string} [html5Path=html5/ReaderControl.html] An alternative path to the WebViewer, relative to the "path" option.
   * @property {string} [l] The license key for viewing PDF or Office files (PDF/Office only).
   * @property {boolean} [mobileRedirect=true] A boolean indicating whether the mobile viewer should redirect to a new window or not. By default this is true because mobile browsers have had issues with iframes in the past. (mobile only).
   * @property {string} [path] An alternative path to the WebViewer root folder.
   * @property {string} [pdfBackend] A string to control PDF engine \["auto", "ems", "pnacl"\] (PDF/Office only, default "auto" chooses the best option availible)
   * @property {boolean} [fullAPI=false] A boolean to enable the use of PDFNet.js library functions (PDF only).
   * @property {boolean} [preloadPDFWorker=true] A boolean to enable the preloading of the PDF worker files (PDF only).
   * @property {string} [pdftronServer] A URL to the WebViewer server drop-in backend https://www.pdftron.com/documentation/web/guides/deployment-options/webviewer-server
   * @property {boolean} [showLocalFilePicker=false] A boolean to show/hide the local file picker (PDF/Office only).
   * @property {boolean} [showPageHistoryButtons=true] A boolean to show/hide the page history buttons.
   * @property {boolean} [showToolbarControl] A boolean to show/hide the default toolbar control.
   * @property {boolean} [startOffline=false] Whether to start loading the document in offline mode or not. This can be set to true if the document had previously been saved to an offline database using WebViewer APIs. You'll need to use this option to load from a completely offline state.
   * @property {boolean} [streaming=false] A boolean indicating whether to use http or streaming PartRetriever, it is recommended to keep streaming false for better performance.
   * @property {boolean} [subzero] Enable or disable using PNaCl subzero compiler.
   * With subzero enabled the first load and execution is significantly faster at the expense of slightly slower execution (about 10%)  for subsequent usage.
   * Note that subzero is only consistently available on Chrome 51 or above so this flag will be ignored on earlier Chrome versions. (PDF only, default true)
   * @property {string} [type=html5,html5Mobile] The type of WebViewer to load. Values must be comma-separated in order of preferred WebViewer (possibe values: html5, html5Mobile).
   * @property {boolean} [useDownloader=true] Enable or disable using Downloader on urls (PDF only).
   * @property {boolean} [workerTransportPromise] An object with keys 'pdf' and/or 'office' that are promises that will resolve to a PDF or Office worker, used if you already create a worker on the outer page and want to share it with the viewer. (PDF/Office only)
   * @property {string} [xdomainProxyUrl] A URL to the proxy HTML file on the remote server when using the xdomain CORS workaround. Can also be an object to specify multiple URLs.
  * @property {string} [ui] Enables old viewer if set to 'legacy'.
   */
  PDFTron.WebViewer.Options = {
    initialDoc: undefined,
    annotationAdmin: undefined,
    annotationUser: undefined,
    assetPath: undefined,
    autoCreate: true,
    azureWorkaround: false,
    backgroundColor: undefined,
    css: undefined,
    config: undefined,
    custom: undefined,
    documentId: undefined,
    documentType: undefined,
    enableAnnotations: true,
    disableI18n: false,
    disabledElements: undefined,
    disableWebsockets: false,
    enableOfflineMode: false,
    enableReadOnlyMode: false,
    enableRedaction: false,
    enableMeasurement: false,
    encryption: undefined,
    externalPath: undefined,
    hideAnnotationPanel: false,
    html5MobileOptions: {},
    html5MobilePath: './ui/build/index.html',
    html5Options: {},
    html5Path: './ui/build/index.html',
    l: undefined,
    mobileRedirect: false,
    path: '',
    pdfBackend: undefined,
    pdftronServer: undefined,
    fullAPI: false,
    preloadPDFWorker: true,
    serverUrl: undefined,
    serverUrlHeaders: undefined,
    showLocalFilePicker: false,
    showPageHistoryButtons: true,
    showToolbarControl: undefined,
    startOffline: false,
    streaming: false,
    subzero: true,
    type: 'html5,html5Mobile',
    useDownloader: true,
    workerTransportPromise: undefined,
    xdomainProxyUrl: undefined,
    ui: undefined
  };

  return PDFTron;
});
