(function(exports) {
  'use strict';

  // reference the parent ReaderControl
  exports.DesktopReaderControl = exports.ReaderControl;

  exports.ReaderControl = function(options) {
    var me = this;
    this.showFilePicker = options.showFilePicker;
    this.useDownloader = _.isUndefined(options.useDownloader) ? true : !!options.useDownloader;

    exports.DesktopReaderControl.call(this, options);
    me.fireError = function(msg, genericMsg) {
      console.warn('Error: ' + msg);
      me.fireEvent('error', [msg, genericMsg]);
    };

    this.blackBoxServer = options.pdftronServer || null;
    this.pdfType = options.pdfType;
    this.officeType = options.officeType;
    this.disableWebsockets = options.disableWebsockets;
    this.initProgress();

    this.workerHandlers = {
      workerLoadingProgress: function(percentComplete) {
        me.fireEvent('workerLoadingProgress', percentComplete);
      }
    };

    exports.CoreControls.enableFullPDF(options.pdfnet);


    var autoLoadPdf = this.pdfType === 'auto' || this.pdfType === 'wait';
    var autoLoadOffice = this.officeType === 'auto' || this.officeType === 'wait';
    var defaultBackendTypePromise;
    if (autoLoadPdf || autoLoadOffice) {
      defaultBackendTypePromise = exports.CoreControls.getDefaultBackendType();
    }

    this.pdfTypePromise = autoLoadPdf ? defaultBackendTypePromise : Promise.resolve(this.pdfType);
    this.officeTypePromise = autoLoadOffice ? defaultBackendTypePromise : Promise.resolve(this.officeType);

    if (options.preloadWorker) {
      if (this.pdfType !== 'wait') {
        this.pdfTypePromise.then(function(pdfType) {
          var useEmscriptenWhileLoading = me.pdfType !== 'pnacl' && !exports.CoreControls.isSubzeroEnabled();
          exports.CoreControls.preloadPDFWorker(pdfType, me.workerHandlers, {
            useEmscriptenWhileLoading: useEmscriptenWhileLoading,
            autoSwap: false
          });
        });
      }

      if (this.officeType !== 'wait') {
        this.officeTypePromise.then(function(officeType) {
          var useEmscriptenWhileLoading = me.officeType !== 'pnacl' && !exports.CoreControls.isSubzeroEnabled();
          exports.CoreControls.preloadOfficeWorker(officeType, me.workerHandlers, {
            useEmscriptenWhileLoading: useEmscriptenWhileLoading,
            autoSwap: false
          });
        });
      }
    }

    this.filename = 'downloaded.pdf';


    // code to handle password requests from DocumentViewer
    var finishedPassword;
    var tryingPassword;

    me.handlePassword = function(options) {
      // only allow a few attempts
      finishedPassword = me.passwordTries >= 3;
      tryingPassword = false;
      if (me.passwordTries === 0) {
        var confirm = function(passwordCallback, passwordText) {
          if (!finishedPassword) {
            tryingPassword = true;
            passwordCallback(passwordText);
          }
        };

        var close = function() {
          if (!tryingPassword) {
            me.fireError('The document requires a valid password.', i18n.t('error.EncryptedUserCancelled'));
          }
        };

        options.initialize(confirm, close);
      } else if (finishedPassword) {
        // attempts have been used
        me.fireError('The document requires a valid password.', i18n.t('error.EncryptedAttemptsExceeded'));
      } else {
        // allow another request for the password
        options.resetAttempt();
      }

      ++(me.passwordTries);
    };

    me.onDocError = function(err) {
      if (err.stack) {
        console.log(err.stack);
      }
      me.fireError(err.message, i18n.t(me.usingOfficeWorker ? 'error.OfficeLoadError' : 'error.PDFLoadError'));
    };
  };

  exports.ReaderControl.prototype = {
    // we are fine with using a larger max zoom (like 1000%) unlike XOD webviewer
    MAX_ZOOM: 10,
    MIN_ZOOM: 0.05,
    // PDF units are 72 points per inch so we need to adjust it to 96 dpi for window.print()
    printFactor: 96 / 72,

    supportedPDFExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
    supportedOfficeExtensions: ['docx', 'xlsx', 'pptx', 'md'],
    supportedBlackboxExtensions: ['docx', 'xlsx', 'pptx', 'doc', 'xls', 'csv', 'ppt', 'htm', 'html', 'tif', 'tiff', 'jp2', 'md', 'txt', 'pdf', 'jpg', 'jpeg', 'png', 'rtf', 'odf', 'odt', 'odg', 'odp', 'ods', 'dwg', 'dgn', 'dxf'],

    /**
     * Initialize UI controls.
     * @ignore
     */
    initUI: function() {
      var me = this;

      exports.DesktopReaderControl.prototype.initUI.call(this);

      var $downloadButton = me.createPDFDownloadButton();

      if (this.showFilePicker) {
        var hasPDFExtensions = this.supportedPDFExtensions.length > 0;
        var hasOfficeExtensions = this.supportedOfficeExtensions.length > 0;
        var filterString = '.' + this.supportedPDFExtensions.join(',.') + (hasPDFExtensions && hasOfficeExtensions ? ',.' : '') + this.supportedOfficeExtensions.join(',.');
        var $filePicker = $('<span class="mobile-button"><label for="input-pdf" class="file-upload glyphicons folder_open"></label></span>' +
                    '<input id="input-pdf"  accept="' + filterString + '" type="file" class="input-pdf">')
          .attr('data-i18n', '[title]controlbar.open')
          .i18n();
        $filePicker.insertAfter($downloadButton);

        $filePicker.on('change', me.listener.bind(me));

        // if filepicker is supported we also want to support drag and drop
        var uiDisplayElement = document.getElementById('ui-display');

        uiDisplayElement.addEventListener('dragover', function(e) {
          e.stopPropagation();
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        });

        // Get file data on drop
        uiDisplayElement.addEventListener('drop', function(e) {
          e.stopPropagation();
          e.preventDefault();
          var files = e.dataTransfer.files; // Array of all files
          var firstFile = files[0];
          // most file types have a well-supported mime type. Note that this is not the case for markdown
          // so we rely on the file name to help identify markdown files.
          if (firstFile && (firstFile.type === 'application/pdf' || firstFile.type === 'image/jpeg' || firstFile.type === 'image/png' ||
                        firstFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                            || firstFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                            || firstFile.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                            || (firstFile.name.length > 3 && firstFile.name.lastIndexOf('.md') === firstFile.name.length - 3))) {
            // load the first file in this case
            me.loadLocalFile(firstFile, {
              filename: me.parseFileName(firstFile.name)
            });
          }
        });
      }
      me.saveInProgress = false;
      me.internalEnableAnnotControls();
    },

    createPDFDownloadButton: function() {
      var me = this;
      var existing = $('#PDFDownloadButtonContainer');
      if (existing.length > 0) {
        return;
      }

      var downloadButton = $('<span></span>').attr({ id: 'PDFDownloadButtonContainer' })
        .addClass('mobile-button')
        .append($('<span></span>')
          .addClass('glyphicons disk_save ')
          .attr({
            id: 'downloadButton',
            'data-i18n': '[title]controlbar.download'
          }).i18n());

      existing = $('#OfficeDownloadButtonContainer');
      if (existing.length > 0) {
        existing.replaceWith(downloadButton);
      } else {
        downloadButton.insertAfter($('#printButton'));
        // var $printParent = $('#printButton').parent();
        // $printParent.append(downloadButton);
        // existing = $printParent;
        existing = downloadButton;
      }

      downloadButton.on('click', function() {
        me.activeButtonID = '#downloadButton';
        me.activeButtonClass = 'disk_save';
        me.downloadFile({ downloadType: 'pdf' });
      });
      return existing;
    },

    createOfficeDownloadButton: function() {
      var existing = $('#OfficeDownloadButtonContainer');
      if (existing.length > 0) {
        return;
      }
      var me = this;
      var downloadButtonPDF = $('<div></div>').addClass('labelled-button-row')
        .append($('<span></span>')
          .addClass('glyphicons file_export labelled-button')
          .attr({
            id: 'exportPDFButton',
            'data-i18n': '[title]controlbar.convertToPDF'
          }).i18n())
        .append($('<span></span>').addClass('heading labelled-button-text')
          .attr({ 'data-i18n': '[title]controlbar.convertToPDF;controlbar.convertToPDF' })
          .i18n());
      var downloadOfficeButton = $('<div></div>').addClass('labelled-button-row')
        .append($('<span></span>')
          .addClass('glyphicons floppy_save labelled-button')
          .attr({
            id: 'downloadOfficeButton',
            'data-i18n': '[title]controlbar.download'
          }).i18n())
        .append($('<span></span>').addClass('heading labelled-button-text')
          .attr({ 'data-i18n': '[title]controlbar.download;controlbar.download' })
          .i18n());

      var outer = $('<span></span>').attr({ id: 'OfficeDownloadButtonContainer' }).addClass('mobile-button');

      $('<span></span>').addClass('current-layout drop-target glyphicons disk_save')
        .appendTo(outer);
      var current = $('<div></div>').addClass('hidden')
        .appendTo(outer);
      current = $('<div></div>').addClass('content  download-drop')
        .appendTo(current);
      current.append(downloadButtonPDF);
      current.append(downloadOfficeButton);

      downloadButtonPDF.on('click', function() {
        me.activeButtonID = '#exportPDFButton';
        me.activeButtonClass = 'file_export';
        me.downloadFile({ downloadType: 'pdf' });
      });
      downloadOfficeButton.on('click', function() {
        me.activeButtonID = '#downloadOfficeButton';
        me.activeButtonClass = 'floppy_save';
        me.downloadFile({ downloadType: 'office' });
      });

      existing = $('#PDFDownloadButtonContainer');
      if (existing.length > 0) {
        existing.replaceWith(outer);
      } else {
        var $printParent = $('#printButton').parent();
        $printParent.append(outer);
        existing = $printParent;
      }

      // drop code lifted from
      var drop = new Drop({
        target: document.querySelector('#OfficeDownloadButtonContainer .drop-target'),
        content: document.querySelector('#OfficeDownloadButtonContainer .content'),
        position: 'bottom center',
        openOn: 'hover',
        classes: 'drop-theme-arrows-bounce layout-mode-dropdown-content',
        tetherOptions: {
          targetOffset: '8px 0'
        }
      });

      drop.once('open', function() {
        me.docViewer.trigger('displayModeUpdated');
        var content = $(this.drop);
        content.i18n();
        content.css('z-index', 1000);
      });

      drop.on('close', function() {
        // workaround so that IE9 doesn't show the menu when hovering over the area where it should be hidden
        $(this.drop).css({
          'left': -1000,
          'top': -1000,
          'transform': ''
        });
      });

      return existing;
    },
    submitRedactions: function() {
      var currentDocument = this.docViewer.getDocument();
      var bbpromise = currentDocument.submitRedactions({});
      return bbpromise;
    },
    /**
     * Downloads the file to the client. PDF and Office documents only.
     * @method ReaderControl#downloadFile
     * @param {object} options Options for downloading the file
     * @param {string} options.downloadType If pdf then the PDF will be downloaded if office then the original office file
     * @param {string} options.xfdfString The XFDF data to include in the downloaded file, defaults to the annotations loaded in the viewer
     */
    downloadFile: function(options) {
      var me = this;
      var currentDocument = me.docViewer.getDocument();
      if (me.saveInProgress || !currentDocument) {
        return;
      }
      // If there are any free hand annotations that haven't been completely created yet
      // this will make sure that they exist in the downloaded pdf
      var freeHandCompletePromise = this.toolModeMap[exports.PDFTron.WebViewer.ToolMode.AnnotationCreateFreeHand].complete();

      me.saveInProgress = true;
      me.saveCancelled = false;

      var buttonId = me.activeButtonID || '#downloadButton';
      var buttonClass = me.activeButtonClass || 'file_save';
      var downloadButton = $(buttonId);
      downloadButton.removeClass(buttonClass);
      downloadButton.addClass('refresh');
      downloadButton.addClass('rotate-icon');
      var endLoading = function() {
        me.saveInProgress = false;
        downloadButton.removeClass('refresh');
        downloadButton.removeClass('rotate-icon');
        downloadButton.addClass(buttonClass);
      };

      Promise.all([me.docViewer.getAnnotationsLoadedPromise(), freeHandCompletePromise]).then(function() {
        var annotManager = me.docViewer.getAnnotationManager();
        options['xfdfString'] = options['xfdfString'] || annotManager.exportAnnotations();

        if (!('flags' in options)) {
          var signatures = annotManager.getAnnotationsList().filter(function(annot) {
            return annot instanceof Annotations.SignatureWidgetAnnotation;
          });
          if (signatures.length) {
            // by default we use incremental save when we have digital signatures so as to preserve them
            options['flags'] = exports.CoreControls.SaveOptions.INCREMENTAL;
          }
        }

        if (!me.saveCancelled) {
          var filename = me.getDownloadFilename(me.filename, '.pdf');

          var bbURLPromise = currentDocument.getDownloadLink({ filename: filename });
          if (bbURLPromise) {
            $('#dlFrame').empty();
            downloadButton.append('<iframe width="0" height="0" id="dlFrame"></iframe>');
            bbURLPromise.then(function(linky) {
              endLoading();
              var dlFrame = $('#dlFrame');
              dlFrame.attr('src', linky.url);
              me.fireEvent('finishedSavingPDF');
            });
          } else {
            // For non-web browser based WebViewer (e.g. Cordova, Qt, WkWebView, Node.js, etc.)
            // We pass the xfdf string directly to the worker...
            me.getFileData(options).then(function(data) {
              endLoading();
              // if the save was cancelled we don't want to go ahead with it
              if (!me.saveCancelled) {
                var arr = new Uint8Array(data); // should be removed soon
                var blob;

                var extension = '';
                if (options['downloadType'] === 'pdf') {
                  extension = '.pdf';
                  blob = new Blob([arr], {
                    type: 'application/pdf'
                  });
                } else {
                  extension = me.downloadExtension;
                  blob = new Blob([arr], {
                    type: me.downloadMimeType
                  });
                }

                saveAs(blob, me.getDownloadFilename(me.filename, extension));
                me.fireEvent('finishedSavingPDF');
              }
            },
            function onDownloadFailed(error) {
              endLoading();
              if (error && error.type && error.type === 'Cancelled') {
                console.log('Save operation was cancelled');
              } else {
                throw new Error(error.message);
              }
            });
          }
        }
      });
    },

    getFileData: function(options) {
      var currentDocument = this.docViewer.getDocument();
      return currentDocument.getFileData(options);
    },

    getFilename: function() {
      return this.filename;
    },

    getDownloadFilename: function(filename, extension) {
      if (filename && filename.slice(-extension.length).toLowerCase() !== extension) {
        filename += extension;
      }
      return filename;
    },

    loadDocumentConfirm: function() {
      var me = this;
      return new Promise(function(resolve, reject) {
        if (!me.saveInProgress) {
          resolve();
          return;
        }

        // first try so we create the dialog
        var loadConfirmDialog = $('<div>').attr({
          'id': 'loadConfirmDialog'
        });

        var loadMessage = $('<label>')
          .text('Are you sure you want to cancel the current document download and load the new document?')
          .appendTo(loadConfirmDialog);

        var onLoadFunction = function() {
          loadMessage.text('Download Complete. Continuing to new document.');
          loadConfirmDialog.dialog('option', 'buttons', { 'OK': okButton });
        };
        var onFinished = function() {
          $(document).off('finishedSavingPDF', onLoadFunction);
        };

        $(document).on('finishedSavingPDF', onLoadFunction);

        var okButton = {
          click: function() {
            resolve();
            $(this).dialog('close');
          },
          id: 'load_ok_button',
          text: 'OK'
        };

        loadConfirmDialog.dialog({
          modal: true,
          resizable: false,
          closeOnEscape: false,
          position: {
            within: document.body
          },
          close: function() {
            onFinished();
            reject('The load operation was cancelled');
            $(this).dialog('close');
          },
          buttons: {
            'OK': okButton,
            'Cancel': function() {
              onFinished();
              reject('The load operation was cancelled');
              $(this).dialog('close');
            }
          }
        });
      });
    },


    /**
     * Loads a PDF document into the ReaderControl
     * @param {string} doc a resource URI to the document. The URI may be an http or blob URL.
     * @param loadOptions options to load the document
     * @param loadOptions.filename the filename of the document to load. Used in the export/save PDF feature.
     * @param loadOptions.customHeaders specifies custom HTTP headers in retrieving the resource URI.
     * @param loadOptions.withCredentials The withCredentials property is a boolean that indicates whether or not cross-site Access-Control requests
     * should be made using credentials sucess as cookies, authorization headers or TLS client certificates. Setting withCredentials has no effect on
     * same-site requests.
     * @param loadOptions.workerTransportPromise optionally specifies a worker transport promise to be used
     * @param loadOptions.useDownloader When downloading a PDF, whether it should be downloaded using Downloader (defaults to true)
     */
    loadDocument: function(doc, options) {
      var me = this;
      this.loadDocumentConfirm().then(function() {
        me.showProgress();
        me.closeDocument();
        me.internalEnableAnnotControls();

        // in case a save or print is still going we want to cancel it
        me.saveCancelled = true;
        me.printCancelled = true;

        var partRetriever = null;
        if (me.blackBoxServer) {
          partRetriever = new CoreControls.PartRetrievers.BlackBoxPartRetriever(doc, me.blackBoxServer, {
            uploadData: options && options.uploadData,
            uriData: options && options.uriData,
            disableWebsockets: me.disableWebsockets
          });
        } else {
          partRetriever = new CoreControls.PartRetrievers.ExternalPdfPartRetriever(doc, {
            useDownloader: me.useDownloader,
            withCredentials: options && options.withCredentials,
            filename: options && options.filename
          });
        }

        if (options && options.customHeaders) {
          partRetriever.setCustomHeaders(options.customHeaders);
        }
        if (options && options.filename) {
          me.filename = options.filename;
        } else {
          me.filename = me.parseFileName(doc);
        }

        partRetriever.on('documentLoadingProgress', function(e, loaded, total) {
          me.fireEvent('documentLoadingProgress', [loaded, total]);
        });
        partRetriever.on('error', function(e, type, message) {
          me.fireEvent('error', [message, i18n.t('error.load') + ': ' + message]);
        });

        me.loadAsync(me.docId, partRetriever, options);
      },
      function() {
        // cancelled so do nothing
      });
    },

    loadLocalFile: function(file, options) {
      var me = this;
      this.loadDocumentConfirm().then(function() {
        me.showProgress();
        me.closeDocument();
        me.internalEnableAnnotControls();
        // in case a save or print is still going we want to cancel it
        me.saveCancelled = true;
        me.printCancelled = true;

        var partRetriever = new CoreControls.PartRetrievers.LocalPdfPartRetriever(file);
        partRetriever.on('documentLoadingProgress', function(e, loaded, total) {
          me.fireEvent('documentLoadingProgress', [loaded, total]);
        });

        // get the filename so we can use it when downloading the file
        if (options.filename) {
          me.filename = options.filename;
        }

        // load the document into the viewer
        me.loadAsync(window.readerControl.docId, partRetriever, options);
      }, function() {
        // cancelled so do nothing
      });
    },

    loadAsync: function(id, partRetriever, options) {
      var me = this;
      var defaultOptions = {
        docId: id,
        getPassword: me.getPassword,
        onError: me.onDocError,
        defaultPageSize: me.defaultPageSize,
      };

      var extension = 'pdf';
      var getExtension = function(filename, supportedExtensions) {
        var extension;
        if (filename) {
          var lowered = filename.toLowerCase();
          // get rid of query or hash parameters
          lowered = lowered.split('?')[0].split('#')[0];

          for (var i = 0; i < supportedExtensions.length; ++i) {
            if (lowered.endsWith('.' + supportedExtensions[i])) {
              extension = lowered.substr(lowered.length - supportedExtensions[i].length);
              break;
            }
          }
        }
        return extension;
      };
      var getLowered = function(inString) {
        if (inString) {
          return inString.toLowerCase();
        }
        return inString;
      };

      if (me.blackBoxServer) {
        extension = getExtension(me.filename, this.supportedBlackboxExtensions) || extension;
        options = $.extend({}, defaultOptions, options);
        options['type'] = 'blackbox';
        options['extension'] = extension;
        me.passwordTries = 0;
        me.hasBeenClosed = false;
        me.docViewer.loadAsync(partRetriever, options);
        me.bbAnnotManager = new CoreControls.BlackBoxAnnotationManager(me.blackBoxServer, me.docViewer);
        return;
      }

      // we determine at this point

      var useOfficeWorker = false;

      this.downloadMimeType = 'application/pdf';
      this.downloadExtension = '.pdf';
      extension = getLowered(getExtension(me.filename, this.supportedPDFExtensions) || extension);
      var officeExtension = getLowered(getExtension(me.filename, this.supportedOfficeExtensions));
      if (officeExtension) {
        useOfficeWorker = true;
        extension = officeExtension;
        switch (extension) {
          case 'docx':
            this.downloadMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            break;
          case 'pptx':
            this.downloadMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            break;
          case 'xlsx':
            this.downloadMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            break;
          case 'doc':
          case 'xls':
          case 'ppt':
            this.downloadMimeType = 'application/msword';
            break;
          case 'md':
            this.downloadMimeType = 'text/markdown';
            break;
        }
        this.downloadExtension = '.' + officeExtension;
        me.createOfficeDownloadButton();
      } else {
        me.createPDFDownloadButton();
      }
      this.usingOfficeWorker = useOfficeWorker;

      (useOfficeWorker ? this.officeTypePromise : this.pdfTypePromise).then(function(backendType) {
        var clientSideOptions = {
          type: (useOfficeWorker ? 'office' : 'pdf'),
          extension: extension,
          backendType: backendType,
          workerHandlers: me.workerHandlers,
          pageSizes: me.pageSizes
        };

        options = $.extend({}, defaultOptions, options);
        options = $.extend({}, clientSideOptions, options);

        if (useOfficeWorker && !options.officeWorkerTransportPromise) {
          options.workerTransportPromise = CoreControls.initOfficeWorkerTransports(backendType, me.workerHandlers);
        } else if (!useOfficeWorker && !options.workerTransportPromise) {
          options.workerTransportPromise = CoreControls.initPDFWorkerTransports(backendType, me.workerHandlers);
        } else if (useOfficeWorker) {
          options.workerTransportPromise = options.officeWorkerTransportPromise;
        }

        // add error handling for worker startup
        options.workerTransportPromise.catch(function(workerError) {
          if (typeof workerError === 'string') {
            me.fireError(workerError, workerError);
          } else {
            me.fireError(workerError.message, i18n.t(workerError.userMessage || workerError.message));
          }
        });

        if (options.pageSizes) {
          // if the pageSizes array comes from a different page then we need to clone it
          // as the array seems to have other properties which cause postMessage to the
          // worker to fail
          options.pageSizes = options.pageSizes.clone();
        }

        me.docViewer.setRenderBatchSize(2);
        me.docViewer.setViewportRenderMode(true);
        me.passwordTries = 0;
        me.hasBeenClosed = false;
        me.docViewer.loadAsync(partRetriever, options);
      });
    },

    initProgress: function() {
      var me = this;
      this.$progressBar = $('<div id="pdf-progress-bar"><div class="progress-text"></div><div class="progress-bar"><div style="width:0%">&nbsp;</div><span>&nbsp;</span></div></div>');
      $('body').append(this.$progressBar);

      var viewerLoadedDeferred = new $.Deferred();
      var documentLoadedDeferred = new $.Deferred();
      this.$progressBar.find('.progress-text').text(i18n.t('Initializing'));
      this.$progressBar.find('.progress-bar div').css({ width: 100 + '%' });

      $(document).on('workerLoadingProgress', function(e, progress) {
        var failed = me.$progressBar.hasClass('document-failed');
        var proPer = Math.round(progress * 100);
        var finished = progress >= 1 && !failed;

        if (proPer > 0 && !failed && !finished) {
          me.$progressBar.find('.progress-text').text(i18n.t('initialize.pnacl') + proPer + '%');
        }
        me.$progressBar.find('.progress-bar div').css({ width: proPer + '%' });
        if (progress >= 1 && !failed) {
          viewerLoadedDeferred.resolve();
          me.$progressBar.find('.progress-text').text(i18n.t('Initializing') + ' ' + proPer + '%');
        }
      }).on('documentLoadingProgress', function(e, bytesLoaded, bytesTotal) {
        var loadedPercent = -1;
        if (bytesTotal > 0) {
          loadedPercent = Math.round(bytesLoaded / bytesTotal * 100);
        }

        if (viewerLoadedDeferred.state() !== 'pending' || !me.$progressBar.hasClass('document-failed')) {
          // viewer is already, so show document progress

          if (loadedPercent >= 0) {
            if (!me.$progressBar.hasClass('document-failed')) {
              me.$progressBar.find('.progress-text').text(i18n.t('initialize.loadDocument') + loadedPercent + '%');
            }
            me.$progressBar.find('.progress-bar div').css({ width: loadedPercent + '%' });
          } else {
            var kbLoaded = Math.round(bytesLoaded / 1024);
            if (!me.$progressBar.hasClass('document-failed')) {
              me.$progressBar.find('.progress-text').text(i18n.t('initialize.loadDocument') + kbLoaded + 'KB');
              me.$progressBar.find('.progress-bar div').css({ width: '100%' });
            }
          }
        }

        if (bytesLoaded === bytesTotal) {
          documentLoadedDeferred.resolve();
        }
      });

      $(document).on('documentLoaded', function() {
        // viewer ready
        if (!me.$progressBar.hasClass('document-failed')) {
          me.$progressBar.fadeOut();
          clearTimeout(me.initialProgressTimeout);
        }
      });

      this.onError = function(e, msg, userMsg) {
        me.$progressBar.find('.progress-text').text(userMsg);
        me.$progressBar.addClass('document-failed');
        me.$progressBar.show();
        clearTimeout(me.initialProgressTimeout);
      };

      me.$progressBar.hide();
    },

    showProgress: function() {
      var me = this;
      this.$progressBar.hide();
      this.$progressBar.find('.progress-text').text(i18n.t('Initializing'));
      this.initialProgressTimeout = setTimeout(function() {
        me.$progressBar.fadeIn('slow');
        // need to make sure that the document failed class has been removed
        // since we are now loading a new document
        me.$progressBar.removeClass('document-failed');
      }, 2000);
    },

    parseFileName: function(fullPath) {
      var startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\') : fullPath.lastIndexOf('/'));
      var filename = fullPath.substring(startIndex);
      if (filename.indexOf('\\') === 0 || filename.indexOf('/') === 0) {
        return filename.substring(1);
      }

      return filename;
    },

    printHandler: function() {
      var me = this;
      var currentDocument = me.docViewer.getDocument();
      var bbURLPromise = currentDocument.getPrintablePDF();
      if (bbURLPromise) {
        var printPage = window.open('', '_blank');
        printPage.document.write('Preparing to print');
        bbURLPromise.then(function(linky) {
          printPage.location.href = linky.url;
        });
      } else if (!me.passwordTries) { // currently disable printing password protected files with PDFium since it doesn't appear to work
        (this.usingOfficeWorker ? Promise.resolve(false) : exports.isPDFiumSupported()).then(function(isSupported) {
          me.docViewer.getWatermark().then(function(watermark) {
            if (isSupported && !watermark) {
              currentDocument = me.docViewer.getDocument();
              if (!currentDocument || me.printInProgress) {
                return;
              }

              var printButton = $('#printButton');

              me.printInProgress = true;
              me.printCancelled = false;
              printButton.removeClass('print');
              printButton.addClass('refresh');
              printButton.addClass('rotate-icon');
              var endLoading = function() {
                me.printInProgress = false;
                printButton.removeClass('refresh');
                printButton.removeClass('rotate-icon');
                printButton.addClass('print');
              };


              var annotManager = me.docViewer.getAnnotationManager();
              var options = { 'xfdfString': annotManager.exportAnnotations(), 'printDocument': true };
              if (!me.printCancelled) {
                currentDocument.getFileData(options).then(function(data) {
                  endLoading();
                  if (!me.printCancelled) {
                    var arr = new Uint8Array(data);
                    var blob = new Blob([arr], {
                      type: 'application/pdf'
                    });
                    exports.pdfiumPrint(blob);
                  }
                },
                function onDownloadFailed() {
                  endLoading();
                  if (!me.printCancelled) {
                    // revert to basic printing
                    exports.DesktopReaderControl.prototype.printHandler.call(me);
                  }
                });
              }
            } else {
              exports.DesktopReaderControl.prototype.printHandler.call(me);
            }
          });
        });
      } else {
        exports.DesktopReaderControl.prototype.printHandler.call(me);
      }
    },

    listener: function(e) {
      var files = e.target.files;
      if (files.length === 0) {
        return;
      }
      this.loadLocalFile(files[0], {
        filename: this.parseFileName(document.getElementById('input-pdf').value)
      });
    },

    closeDocument: function() {
      exports.DesktopReaderControl.prototype.closeDocument.call(this);
      this.$progressBar.removeClass('document-failed');
      this.$progressBar.hide();
    }
  };

  exports.ReaderControl.prototype = $.extend({}, exports.DesktopReaderControl.prototype, exports.ReaderControl.prototype);
})(window);

$('#slider').addClass('hidden-lg');
$('#searchControl').parent().addClass('hidden-md');
$('head').append($('<link rel="stylesheet" type="text/css" />').attr('href', window.assetPath + 'pdf/PDFReaderControl.css'));

// # sourceURL=PDFReaderControl.js
