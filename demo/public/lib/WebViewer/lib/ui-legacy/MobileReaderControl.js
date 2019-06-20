/* global FastClick */
(function(exports) {
  'use strict';

  var fCmp = exports.utils.fCmp;

  var Text = XODText;
  window.Tools.Tool.ENABLE_AUTO_SWITCH = false;
  var ToolMode = exports.PDFTron.WebViewer.ToolMode;
  var colorTypes = {
    color: 'StrokeColor',
    fillColor: 'FillColor',
    textColor: 'TextColor'
  };
  var selectedColorPicker = colorTypes.color;
  var isRemovingColors = false;
  var editMode = window.ControlUtils.editMode;
  var currentEditMode = editMode.basic;
  var userPrefs = window.ControlUtils.userPreferences;

  /**
   * Creates a new instance of MobileReaderControl
   * @name MobileReaderControl
   * @extends BaseReaderControl
   * @class Represents the full-featured MobileReaderControl reusable UI component that extends DocumentViewer.
   * @see MobileReaderControl.html MobileReaderControl.js MobileReaderControl.css
   * @param {object} options Options for the reader control
   *
   */
  exports.ReaderControl = function(options) {
    exports.BaseReaderControl.call(this, options);

    var me = this;
    me.defaultToolMode = me.toolModeMap[ToolMode.Pan];

    var userAgent = window.navigator.userAgent;
    me.isAndroid = userAgent.indexOf('Android') > -1;
    me.androidBrowser = me.isAndroid && userAgent.indexOf('Chrome') === -1 && userAgent.indexOf('Firefox') === -1;
    var uiWebView = userAgent.indexOf('UIWebView') > -1;
    me.isIOS = navigator.userAgent.match(/(iPad|iPhone|iPod)/i);

    if (window.opera || me.androidBrowser || exports.utils.ie === 10 || exports.utils.ie === 11) {
      // certain browsers have issues with css transforms for one reason or another so we just fall back to using top and left
      // IE10/11 seem to have some issues with after swiping pages, sometimes just in metro mode
      // Android webview doesn't like negative transforms
      me.useTransformFallback = true;
    }

    if (me.isIOS) {
      me.useZoomFallback = true;
    }

    if (window.utils.isChrome) {
      // Chrome can have some rendering issues when the address bar is hidden and shown and "position: fixed" will keep it shown
      document.body.style.position = 'fixed';
    }

    if (_.isUndefined(window.devicePixelRatio) && exports.utils.ie && window.document.body.clientWidth < 1024) {
      // for Windows Phone devices that don't define devicePixelRatio
      exports.utils.setCanvasMultiplier(2);
    }

    // newer iOS devices have a devicePixelRatio of 3 which can cause Safari to fail because of an internal canvas size limit
    // capping the multiplier at 2 still maintains good rendering quality
    if (window.utils.getCanvasMultiplier() > 2) {
      window.utils.setCanvasMultiplier(2);
    }

    // some browsers seem to have some issues with fast click
    if (!window.opera && !me.androidBrowser && !exports.utils.windowsApp && !uiWebView) {
      // library used to fix slow buttons on mobile devices
      // only attach to certain elements because of issues with widgets on the dialogs
      var togGroup = document.getElementsByClassName('useFastClick');
      for (var i = 0; i < togGroup.length; i++) {
        FastClick.attach(togGroup[i]);
      }
    } else if (uiWebView) {
      FastClick.attach(document.getElementById('pageHeader'));
    }

    if (!me.isAndroid) {
      // currently Android doesn't support printing
      $('#printButton').show();
    }

    exports.CoreControls.SetCanvasMode(exports.CoreControls.CanvasMode.ViewportCanvas);
    me.docViewer.setViewportRenderMode(false);

    Annotations.ControlHandle.selectionAccuracyPadding = 10; // make it easier to select control handles
    Annotations.SelectionAlgorithm.canvasVisibilityPadding = 20;
    Annotations.SelectionModel.selectionAccuracyPadding = 10;
    Annotations.ControlHandle.handleWidth = 16;

    this.pageDisplayModes = {
      Single: 0,
      Double: 1
    };
    this.pageDisplay = this.pageDisplayModes.Double;
    this.isCoverMode = false;

    me.isCopySupported = !!((window.utils.ie || window.chrome || this.isIOS));

    this.touchedPoint = null;

    me.$viewerPage = $('#viewerPage');
    me.$viewer = $('#viewer');
    me.$slider = $('#slider');
    // call the slider function to initialize it, only necessary for IE9
    me.$slider.slider();
    me.$preview = $('#preview');
    me.$viewerWrapper = $('#viewerWrapper'); /* used to avoid event conflicts */
    me.$wrapper = $('#wrapper'); /* used to avoid event conflicts */
    me.$thumbContainer = $('#thumbContainer');
    me.$pageIndicator = $('#sliderWrapper').find('input'); /* page number input control */
    me.$goToPagePopup = $('#goToPagePopup').popup().trigger('create');
    me.$pageNumberInput = me.$goToPagePopup.find('#pageNumberInput');
    $('#passwordPopup').popup().trigger('create');
    me.$menuWrapper = $('#menuWrapper'); /* top menu bar */
    me.$bookmarkView = $('#bookmarkView');
    me.$bookmarkList = $('#bookmarkList');
    me.$pageHeader = $('#pageHeader');
    me.$printPopup = $('#printPopup').popup({
      afterclose: function() {
        $('#printPageNumberInput').val('');
        me.cancelPrintJob();
      }
    }).trigger('create');
    me.$printPageNumberInput = me.$printPopup.find('#printPageNumberInput');

    me.$clipboard = $('#clipboard');
    me.$clipboardWrapper = $('#clipboardWrapper');
    me.$searchInput = $('#searchInput');

    me.$fixedToolbars = $("[data-position='fixed']");
    me.$defaultMenuContext = $('#defaultMenuContext');
    me.$searchMenuContext = $('#searchMenuContext');
    me.$annotCreateButton = $('#annotCreateButton');
    me.$annotCreateMenuContext = $('#annotCreateMenuContext');
    me.$annotEditPopup = $('#annotEditPopup');
    me.$annotEditPopup.popup({
      'tolerance': '0,2'
    }).trigger('create');
    me.$addNewColor = me.$annotEditPopup.find('#addNewColor');
    me.$annotEditButtons = me.$annotEditPopup.find('#annotEditButtons');
    me.$annotQuickMenu = $('#annotQuickMenuPopup');
    me.$annotQuickMenu.popup({
      'tolerance': '0,2'
    });
    // this helps to fix an issue where the tap hold menu closes after releasing the hold on iOS
    $('#annotQuickMenuPopup-screen').addClass('needsclick');
    me.$annotQuickMenuButtons = me.$annotQuickMenu.find('#annotQuickMenuButtons');
    me.$annotQuickMenuGrid = me.$annotQuickMenu.find('#annotQuickMenuGrid');
    me.$signaturePopup = $('#signaturePopup').popup().trigger('create');
    me.$signatureSelectionContainer = me.$annotEditPopup.find('#signatureSelectionContainer').controlgroup();

    me.$textSelectionContainer = me.$annotEditPopup.find('#textSelectionContainer').controlgroup();

    me.$thicknessSlider = $('#thicknessSlider').slider();
    me.$opacitySlider = $('#opacitySlider').slider();
    me.$fontSizeSlider = $('#fontSizeSlider').slider();
    me.$annotList = $('#annotList');
    me.$noAnnotations = $('<li class="noannotations"></li>');

    me.$noAnnotations.attr('data-i18n', 'mobile.annotations.noAnnotations').i18n()
      .appendTo(me.$annotList);

    me.$annotList.listview({
      autodividers: true,
      autodividersSelector: function(li) {
        var mode = me.$annotList.attr('data-mode');
        if (mode === 'thread') {
          return i18n.t('mobile.annotations.threadedViewTitle');
        }
        if (mode === 'single') {
          // don't show page divider for these two modes
          return null;
        }
        var pagenumber = $(li).data('pagenumber');
        if (typeof pagenumber !== 'undefined') {
          return i18n.t('annotations.pageNumber', {
            number: pagenumber
          });
          // return "Page " + pagenumber;
        }
        return null;
      }
    });
    $('.showAllAnnotButton').hide().click(function() {
      me.viewAnnotsListMode();
    });

    var stickyNoteTool = this.toolModeMap[ToolMode.AnnotationCreateSticky];
    stickyNoteTool.on('annotationAdded', function(e, annotation) {
      // switch the tool mode first because that will deselect all annotations
      me.setToolMode(ToolMode.AnnotationEdit);
      me.annotationManager.selectAnnotation(annotation);

      me.showAnnotationEditPopup();
    });

    var stampTool = this.toolModeMap[ToolMode.AnnotationCreateStamp];
    stampTool.on('annotationAdded', function() {
      me.setToolMode(ToolMode.AnnotationEdit);
    });

    // mapping between button ids and their associated tool modes
    me.buttonIdsToToolModes = {
      'editAnnotButton': this.toolModeMap[ToolMode.AnnotationEdit],
      'createStickyButton': this.toolModeMap[ToolMode.AnnotationCreateSticky],
      'createHighlightButton': this.toolModeMap[ToolMode.AnnotationCreateTextHighlight],
      'createUnderlineButton': this.toolModeMap[ToolMode.AnnotationCreateTextUnderline],
      'createStrikeoutButton': this.toolModeMap[ToolMode.AnnotationCreateTextStrikeout],
      'createSquigglyButton': this.toolModeMap['AnnotationCreateTextSquiggly'],
      'createSignatureButton': this.toolModeMap['AnnotationCreateSignature'],
      'createFreetextButton': this.toolModeMap[ToolMode.AnnotationCreateFreeText],
      'createRectangleButton': this.toolModeMap[ToolMode.AnnotationCreateRectangle],
      'createEllipseButton': this.toolModeMap[ToolMode.AnnotationCreateEllipse],
      'createLineButton': this.toolModeMap[ToolMode.AnnotationCreateLine],
      'createArrowButton': this.toolModeMap['AnnotationCreateArrow'],
      'createFreehandButton': this.toolModeMap[ToolMode.AnnotationCreateFreeHand],
      'createRedactButton': this.toolModeMap[ToolMode.AnnotationCreateRedaction],
      'textSelectButton': this.toolModeMap[ToolMode.TextSelect]
    };

    var throttledSelect = _.throttle(window.Tools.TextTool.prototype.select, 50);
    window.Tools.TextTool.prototype.select = function() {
      throttledSelect.apply(this, arguments);
    };

    me.doc = null;
    me.nPages = null;
    me.hasThumbs = false;
    me.eventsBound = false;

    me.offsetSwipe = 0; /* number of swipes done before a render */
    me.vWOffset = 0; /* fixed position of viewer wrapper */
    me.vwxPos = 0; /* current position of viewer wrapper with scrolling */

    me.currentPageIndex = 0;
    me.currentPageZoom = null;
    me.currentPageMinZoom = null;
    me.currentPageMaxZoom = null;
    me.minZooms = [];

    me.zoomedWrapper = null;
    me.transformOffset = null;

    me.pagesRendering = [];
    me.snapComplete = false;

    me.isSliding = false;
    me.isPinching = false;
    me.recentlyZoomed = false;
    me.shouldRerender = false;
    me.lastRequestedThumbnail = null;

    me.lastWidth = window.document.body.clientWidth;
    me.lastHeight = window.document.body.clientHeight;

    me.distRatio = 1;
    me.oldScale = 1;
    me.newScale = 1;
    me.oldPinchCenter = {
      x: 0,
      y: 0
    };
    me.oldDist = 1;
    me.newDist = null;
    me.oldTouch = {
      x: 0,
      y: 0
    };

    me.c = null; /* current page wrapper */
    me.n = null; /* next page wrapper */
    me.p = null; /* prev page wrapper */

    me.rerenderPages = null;

    me.nPagesPerWrapper = 1;

    me.searchMode = null;
    me.annotMode = false;
    me.setToolbarContext('top');

    me.getPassword = function(passwordCallback) {
      var $passwordPopup = $('#passwordPopup');
      var $passwordInput = $passwordPopup.find('#passwordInput');

      me.handlePassword({
        initialize: function(confirm, close) {
          $passwordPopup.popup('open', {
            y: 0
          });
          $passwordInput.focus();

          var checkPassword = function() {
            $passwordPopup.popup('close');
            // check in a timeout because otherwise the android virtual keyboard
            // may still be visible and confuse WebViewer by changing the window height
            setTimeout(function() {
              confirm(passwordCallback, $passwordInput.val());
            }, 500);
          };

          $passwordPopup.find('#passwordForm').submit(function() {
            checkPassword();
            return false;
          });

          $passwordPopup.find('#passwordOKButton').on('click', function() {
            checkPassword();
          });

          $passwordPopup.find('#passwordCancelButton').on('click', function() {
            $passwordPopup.popup('close');
            close();
          });
        },
        resetAttempt: function() {
          $passwordInput.val('');
          $passwordPopup.popup('open', {
            y: 0
          });
          $passwordPopup.find('#passwordError').show();
          $passwordInput.focus();
        }
      });
    };

    $(document).on('error', function(e, msg, userMessage) {
      me.onError(e, msg, userMessage);
    });

    me.docViewer.on('displayPageLocation', function(e, pageNumber, vpos, hpos, doNotJumpIfInView) {
      // clear the timeout so that if there's a pending swipe it will be cancelled
      if (doNotJumpIfInView && me.docViewer.getCurrentPage() === pageNumber) {
        return;
      }
      clearTimeout(me.swipeTimeout);
      me.offsetSwipe = 0;

      me.setCurrentPage(parseInt(pageNumber, 10) - 1);
    });

    me.docViewer.on('changePage', function(e, pageNumber) {
      me.setCurrentPage(parseInt(pageNumber, 10) - 1);
    });

    me.docViewer.on('pageNumberUpdated', function(e, pageNumber) {
      me.$slider.val(pageNumber).slider('refresh');
      me.fireEvent('pageChanged', {
        pageNumber: pageNumber
      });
    });
    me.docViewer.on('toolModeUpdated', function(e, newToolMode, oldToolMode) {
      var allButtons = me.$annotCreateMenuContext.find('a');
      allButtons.removeClass('active');

      var toolName = '';
      for (var key in me.toolModeMap) {
        if (newToolMode === me.toolModeMap[key]) {
          toolName = key;
          break;
        }
      }
      if (newToolMode instanceof window.Tools.PanTool) {
        me.annotMode = false;
      } else {
        me.annotMode = true;
      }
      if (toolName) {
        me.$annotCreateMenuContext.find('[data-toolmode=' + toolName + ']').addClass('active');
      }

      me.fireEvent('toolModeChanged', [newToolMode, oldToolMode]);
    });

    me.docViewer.on('textSelected', function() {
      me.$clipboard.val(me.docViewer.getSelectedText());
    });

    $(me.docViewer.el).css('cursor', 'default');

    me.initUI();
    me.initViewer();

    me.annotationManager = me.docViewer.getAnnotationManager();
    me.annotationManager.disableFreeTextEditing();

    me.annotationManager.on('annotationSelected', function(e, annotations, action) {
      if (!me.enableAnnotations) {
        return;
      }

      var am = me.docViewer.getAnnotationManager();
      var selected = am.getSelectedAnnotations();

      var enableAnnotationMode = true;

      var currentToolMode = me.docViewer.getToolMode();
      if (currentToolMode === me.toolModeMap[ToolMode.Pan]) {
        // if pan tool is on then enable if there are selected annotations
        enableAnnotationMode = (selected.length > 0);
      }

      me.annotMode = enableAnnotationMode;

      if (!me.$annotCreateMenuContext.is(':visible')) {
        // when the annotation menu is visible then tap toggling should remain disabled
        me.setMenuTapToggle(!enableAnnotationMode);
      }


      if (action === 'selected') {
        if (annotations.length === 1) {
          // single annotation was selected;
          var annotation = annotations[0];

          // get the 0-indexed page number of the annotation
          var annotPageIndex = annotation.PageNumber - 1;
          var firstPageInWrapper = me.adjustedPageIndex(me.currentPageIndex);
          var lastPageInWrapper = firstPageInWrapper + me.nPagesPerWrapper - 1;

          // if the page of the annotation is not in the currently shown page wrapper then jump to its page
          if (annotPageIndex < firstPageInWrapper || annotPageIndex > lastPageInWrapper) {
            me.setCurrentPage(annotPageIndex);
          }
        }
      }
    });

    me.annotationManager.on('annotationChanged', function(e, annotations, action) {
      if (!me.enableAnnotations) {
        return;
      }

      var annotation;
      for (var i = 0; i < annotations.length; ++i) {
        annotation = annotations[i];
        if (!annotation.Listable) {
          continue;
        }

        if (action === 'add') {
          me.$noAnnotations.hide();
          var container = me.createAnnotationListItem(annotation);
          if (!annotation.isVisible()) {
            container.addClass('annotlist-hidden');
          }
        } else if (action === 'modify') {
          me.refreshAnnotationItem(annotation, me.$annotList.find('[data-id=' + annotation.Id + ']'));
        } else if (action === 'delete') {
          me.getAnnotationNoteContainer(annotation).remove();

          // unhide all replies
          annotation.getReplies().forEach(function(annotReply) {
            me.getAnnotationNoteContainer(annotReply).removeClass('annotlist-hidden');
          });
          if (me.annotationManager.getAnnotationsList().length > 0) {
            me.$noAnnotations.hide();
          } else {
            me.$noAnnotations.show();
          }

          // if the annotation that was deleted is currently being viewed as a thread
          // then we should return to the list view
          if (me.threadAnnot === annotation) {
            me.viewAnnotsListMode();
          }
        }
      }

      if (me.$annotList.hasClass('ui-listview')) {
        me.refreshAnnotationList();
      }
    });

    me.annotationManager.on('annotationHidden', function(e, annotations, hidden) {
      if (!me.enableAnnotations) {
        return;
      }

      annotations.forEach(function(annot) {
        var noteElement = me.$annotList.find('li[data-id="' + annot.Id + '"]');
        if (hidden) {
          noteElement.addClass('annotlist-hidden');
        } else {
          noteElement.removeClass('annotlist-hidden');
        }
      });

      me.refreshAnnotationList();
    });

    me.annotationManager.on('addReply', function(e, annotation, parent, root) {
      if (!me.enableAnnotations) {
        return;
      }

      me.createAnnotationListItem(annotation, parent, root);
      me.refreshAnnotationList();
    });

    me.annotationManager.on('deleteReply', function(e, annotation, root) {
      if (!me.enableAnnotations) {
        return;
      }

      me.getAnnotationNoteContainer(annotation, root).remove();

      // remove all replies as they will be shown outside the root annotation now
      annotation.getReplies().forEach(function(annotReply) {
        me.getAnnotationNoteContainer(annotReply, root).remove();
      });
    });

    me.annotationManager.on('setNoteText', function(e, annotation, root) {
      if (!me.enableAnnotations) {
        return;
      }

      var annotContainer = me.getAnnotationNoteContainer(annotation, root).children('.annotContainer');
      var contents = annotation.getContents();
      annotContainer.find('textarea.comment-text').val(contents);
      annotContainer.find('span.comment-text').text(contents);
    });
  };

  exports.ReaderControl.prototype = {


    ChangeResponses: {
      UpdateAll: 1, // If anything impacts the visible pages we update everything
      UpdateList: 2, // If
      UpdateNone: 3 // We don't need to update anything
    },

    getChangeResponse: function(changes) {
      // figure out if the changes are relevant
      var nPages = this.nPages;
      // 1 pages away (or 3 pages away if we are in facing mode) + 1 because the current page is 0 indexed
      // + 1 to avoid the last visible page being updated when
      // we update the zoom of the previous page if we are in facing mode
      var visibleDistance = this.nPagesPerWrapper + (this.nPagesPerWrapper - 1);
      var relevantPageMax = this.currentPageIndex + 1 + (this.nPagesPerWrapper - 1) + visibleDistance;
      // 1 pages away (or 3 pages away if we are in facing mode) - 1 because the current page is 0 indexed
      var relevantPageMin = this.currentPageIndex - (visibleDistance - 1);


      var lowestAddRemove = nPages + 1;
      var current;

      // Added pages
      // We force a full update if the visible pages are impacted
      // this occurs if we have added
      var added = changes.added;
      var addedLength = added.length;

      var i;
      for (i = 0; i < addedLength; ++i) {
        current = added[i];
        if (current <= relevantPageMax) {
          return {
            type: this.ChangeResponses.UpdateAll
          };
        } else if (lowestAddRemove > current) {
          lowestAddRemove = current;
        }
      }

      // Removed pages (currently we use the same logic as added pages)
      var removed = changes.removed;
      var removedLength = removed.length;
      for (i = 0; i < removedLength; ++i) {
        current = removed[i];
        if (current <= relevantPageMax) {
          return {
            type: this.ChangeResponses.UpdateAll
          };
        } else if (lowestAddRemove > current) {
          lowestAddRemove = current;
        }
      }

      // Only support full updates if pages are moved
      for (var entry in changes.moved) {
        if (changes.moved.hasOwnProperty(entry)) {
          return {
            type: this.ChangeResponses.UpdateAll
          };
        }
      }

      // If we have added or removed pages we update
      // the zoom of the previous page as well since
      // it can be impacted by this change
      if (this.nPagesPerWrapper > 1 && lowestAddRemove <= nPages) {
        lowestAddRemove -= 1;
      }

      // Create a list of pages to update. This should include
      // all of the pages after we have removed or added a page
      // in addition to pages with changed content
      // Note that the numbers in this list are 0 indexed
      var pagesToUpdate = new Array(nPages - lowestAddRemove + 1);
      for (i = lowestAddRemove; i <= nPages; ++i) {
        pagesToUpdate[i - lowestAddRemove] = i - 1;
      }


      // contentChanged (can ignore entries significantly before or after the current page)
      var contentChanged = changes.contentChanged;
      var contentChangedLength = contentChanged.length;
      for (i = 0; i < contentChangedLength; ++i) {
        current = contentChanged[i];
        if (current >= relevantPageMin && current <= relevantPageMax) {
          return {
            type: this.ChangeResponses.UpdateAll
          };
        } else if (current < lowestAddRemove) {
          pagesToUpdate.push(current - 1);
        }
      }

      if (pagesToUpdate.length) {
        return {
          type: this.ChangeResponses.UpdateSome,
          updateList: pagesToUpdate
        };
      }
      return {
        type: this.ChangeResponses.UpdateNone
      };
    },


    onLayoutChanged: function(evt, changes) {
      // update the viewer if we consider the changes to be relevant
      var me = this;
      me.doc = me.docViewer.getDocument();

      me.nPages = me.docViewer.getPageCount();

      // determine how we should respond to these changes
      var response = this.getChangeResponse(changes);

      me.$slider.attr('max', me.nPages);
      if (response.type === this.ChangeResponses.UpdateAll) {
        me.setMinZooms();
        me.setPageMode();

        var position = (exports.document.body.clientWidth - me.$preview.width()) / 2;
        me.$preview.css('left', position + 'px');

        me.margin = me.docViewer.getMargin();

        me.updateCurrentZooms(me.currentPageIndex);

        var page = me.doc.getPageInfo(me.currentPageIndex);
        var pageZoom = me.docViewer.getPageZoom(me.currentPageIndex);

        me.$viewer.css('width', (page.width * pageZoom) + 'px');
        me.$viewer.css('height', (page.height * pageZoom) + 'px');

        me.currentPageIndex = me.docViewer.getCurrentPage() - 1;
        me.setCurrentPage(me.currentPageIndex);
      } else if (response.type === this.ChangeResponses.UpdateSome) {
        // me.setMinZooms();
        me.setMinZoomsInList(response.updateList);
      }
    },
    onDocumentLoaded: function() {
      var me = this;
      me.doc = me.docViewer.getDocument();
      clearTimeout(me.swipeTimeout);
      me.offsetSwipe = 0;

      exports.BaseReaderControl.prototype.onDocumentLoaded.call(this);

      // set the tool mode after the document has loaded because setting the tool mode will cause a call to
      // deselectAllAnnotations which will get the visible pages which needs to have ReaderControl defined
      me.docViewer.setToolMode(me.defaultToolMode);

      if (!me.eventsBound) {
        me.eventsBound = true;

        me.bindEvents();
      }

      me.nPages = me.docViewer.getPageCount();
      me.currentPageIndex = 0;

      me.setPageMode();

      var position = (exports.document.body.clientWidth - me.$preview.width()) / 2;
      me.$preview.css('left', position + 'px');

      me.$slider.attr('max', me.nPages);

      me.margin = me.docViewer.getMargin();

      me.hasThumbs = me.doc.includesThumbnails();
      if (!me.hasThumbs) {
        // just show the page number when using the slider if there are no thumbnails
        me.$preview.css('height', 'auto');
        me.$thumbContainer.hide();
      }

      me.setMinZooms();

      me.updateCurrentZooms(me.currentPageIndex);

      var page = me.doc.getPageInfo(me.currentPageIndex);
      var pageZoom = me.docViewer.getPageZoom(me.currentPageIndex);

      me.$viewer.css('width', (page.width * pageZoom) + 'px');
      me.$viewer.css('height', (page.height * pageZoom) + 'px');

      me.currentPageIndex = me.docViewer.getCurrentPage() - 1;
      me.setCurrentPage(me.currentPageIndex);

      me.$viewer.css('visibility', 'visible');

      me.initBookmarkView();

      me.toolModeMap[ToolMode.AnnotationCreateRectangle].defaults.StrokeThickness = 3;
      me.toolModeMap[ToolMode.AnnotationCreateEllipse].defaults.StrokeThickness = 3;
      me.toolModeMap[ToolMode.AnnotationCreateLine].defaults.StrokeThickness = 3;
      me.toolModeMap['AnnotationCreateArrow'].defaults.StrokeThickness = 3;

      if (me.enableAnnotations) {
        $('#annotationOptions').show();
        me.$annotCreateButton.show();
        $('#annotListButton').show();
        $('.annotBookmarkToggleGroup').show();

        me.$annotList.empty();
        me.$noAnnotations.appendTo(me.$annotList).show();
        me.refreshAnnotationList();

        // update control group with new buttons
        me.$defaultMenuContext.controlgroup();
      }

      if (!me.annotationManager.isCreateRedactionEnabled()) {
        $('#createRedactButton').hide();
      }

      me.docViewer.on('layoutChanged', this.onLayoutChanged.bind(this));
      me.fireEvent('documentLoaded');
    },

    bindEvents: function() {
      var me = this;

      me.$wrapper.bind('swipeleft swiperight', _(this.onSwipe).bind(this));

      me.$slider.on('slidestart', _(this.onSliderStart).bind(this));
      me.$slider.on('change', _(this.onSliderMove).bind(this));
      me.$slider.on('slidestop', _(this.onSliderEnd).bind(this));

      // The following three events handle pinch: touchstart, touchmove, and touchend.
      me.$viewerPage.bind('touchstart', _(this.onTouchStart).bind(this));
      me.$viewerPage.bind('touchmove', _(this.onTouchMove).bind(this));
      me.$viewerPage.bind('touchend', _(this.onTouchEnd).bind(this));

      // $(window.top).bind('orientationchange', _(this.onOrientationChange).bind(this));
      // window.top cannot be accessed if this page is in an iframe, where window.top is from another origin
      // note: if window !== window.top, then orientation change is not detected, and the viewer's viewport will be incorrect
      $(window).bind('orientationchange', _(this.onOrientationChange).bind(this));

      me.$wrapper.bind('vmousedown', _(this.onToolMouseDown).bind(this));
      me.$wrapper.bind('vmouseup', _(this.onToolMouseUp).bind(this));

      me.$wrapper.bind('contextmenu MSHoldVisual', function(e) {
        e.preventDefault();
      });
      me.$wrapper.bind('taphold', _(this.onTapHold).bind(this));
      // Tap event for handling left/right navigation and menu toggling
      // bind to wrapper because we want to be able to stop the propagation of the event if there is a tap swipe
      // if we bind to viewerPage the menus will already have been hidden before we can stop the event from bubbling
      me.$wrapper.bind('tap', _(this.onTap).bind(this));

      var throttledDoubleTap = _.throttle(_(this.onDoubleTap).bind(this), 500, { trailing: false });
      me.$wrapper.bind('dblclick', throttledDoubleTap);
      if (!exports.utils.ie && !exports.utils.isEdge) {
        me.$wrapper.bind('doubletap', throttledDoubleTap);
      }

      // do not use vclick, which triggers event on content underneath menu
      me.$bookmarkList.on('click', 'a', _(this.onBookmarkSelect).bind(this));

      // used to fix issue with the annotation popup menu and _handleDocumentFocusIn in IE going into an infinite loop
      // see https://github.com/jquery/jquery-mobile/issues/5814 for a similar issue
      if (exports.utils.ie) {
        $('body').on('blur', function(e) {
          e.stopImmediatePropagation();
          e.preventDefault();
        });
      }

      var displaySingle = $('#displaySingle');
      var displayDouble = $('#displayDouble');

      displaySingle.on('checkboxradiocreate', function() {
        if (me.pageDisplay === me.pageDisplayModes.Single) {
          displaySingle.prop('checked', true);
        } else if (me.pageDisplay === me.pageDisplayModes.Double) {
          displayDouble.prop('checked', true);
        }
      });

      function updatePageMode(pageMode) {
        me.pageDisplay = pageMode;
        me.setPageMode();
        me.setMinZooms();
        // setting to the current page will recreate the pages for the new page mode
        me.setCurrentPage(me.currentPageIndex);
      }

      displaySingle.on('click', function() {
        updatePageMode(me.pageDisplayModes.Single);
      });

      displayDouble.on('click', function() {
        updatePageMode(me.pageDisplayModes.Double);
      });

      var cbHighRes = $('#cbHighRes');

      cbHighRes.on('checkboxradiocreate', function() {
        if (window.utils.getCanvasMultiplier() > 1) {
          cbHighRes.prop('checked', true);
        }
      });

      cbHighRes.on('change', function() {
        var newRatio = $(this).prop('checked') ? 2 : 1;

        window.utils.setCanvasMultiplier(newRatio);
        me.docViewer.removeContent();
        me.setCurrentPage(me.currentPageIndex);
      });

      // set default value
      $('#cbShowAnnotations').on('checkboxradiocreate', function() {
        $(this).prop('checked', true);
      });

      $('.goToAnnotationPanelButton').on('click', function() {
        me.changeVisiblePage('annotationDialog');
      });
      $('.goToBookmarkPanelButton').on('click', function() {
        me.changeVisiblePage('bookmarkDialog');
      });

      me.$customDialogs = $('.custom-dialog');

      me.$customDialogs.on('pagecreate', function() {
        var $this = $(this);
        // use translateZ(0) to work around an issue with -webkit-overflow-scrolling: touch on iOS5 where content not in view initially won't be rendered
        // see http://stackoverflow.com/questions/7808110/css3-property-webkit-overflow-scrollingtouch-error
        $this.find('div[data-role="header"]').css('-webkit-transform', 'translateZ(0)');

        // need this dialog overlay for IE as events seem to go through the transparent part of the dialog page
        // need to add it at creation time so that it isn't placed inside the dialog container
        $this.append('<div class="dialogOverlay">');
      });

      me.$customDialogs.on('swiperight', function(e) {
        if (!exports.utils.isEditableElement($(e.target))) {
          me.changeVisiblePage('viewerPage');
        }
      });

      me.$customDialogs.click(function(e) {
        if ($(e.target).hasClass('dialogOverlay')) {
          me.changeVisiblePage('viewerPage');
        }
      });

      // use mousedown so that the close button can be pressed even when a blur event
      // scrolls the page
      me.$customDialogs.find('.closeBtn').on('mousedown', function() {
        me.changeVisiblePage('viewerPage');
      });

      me.$viewerPage.on('pagebeforeshow', function(e, data) {
        // show the menu when transitioning back from a dialog/panel
        if (data.prevPage.hasClass('custom-dialog')) {
          me.reshowMenu();
        }

        if (data.prevPage.attr('id') === 'annotationDialog') {
          me.showAnnotationList();
        }
      });

      // prevent browser's default scrolling when in viewing mode
      document.addEventListener('touchmove', function(e) {
        if (!$.mobile.activePage.hasClass('custom-dialog') || (e.scale && e.scale !== 1)) {
          e.preventDefault();
        }
      }, { passive: false });

      $('#printButton').on('click', function() {
        me.printHandler();
      });

      $('#printCancelButton').on('click', function() {
        if (me.preparingForPrint) {
          me.cancelPrintJob();
        } else {
          me.$printPopup.popup('close');
        }
      });

      function printPages() {
        var orientation;
        if ($('#printAuto').prop('checked')) {
          orientation = me.pageOrientations.Auto;
        } else if ($('#printPortrait').prop('checked')) {
          orientation = me.pageOrientations.Portrait;
        } else if ($('#printLandscape').prop('checked')) {
          orientation = me.pageOrientations.Landscape;
        }

        me.startPrintJob($('#printPageNumberInput').val(), orientation, false, $('#includeComments').prop('checked'), function() {
          window.print();
        });

        if (me.preparingForPrint) {
          var printSlider = me.$printPopup.find('.progress-bar');
          printSlider.show();
          printSlider.find('.ui-slider-bg').addClass('ui-btn-active');
        }
      }

      $('#printForm').submit(function() {
        printPages();
        return false;
      });

      $('#pageNumberPrintButton').on('click', printPages);

      $(document).on('printProgressChanged', function(e, pageNum, totalPages) {
        var fractionDone = pageNum / totalPages;
        me.$printPopup.find('#print-progress').val(fractionDone * 100).slider('refresh');

        var progressLabel = me.$printPopup.find('.progress-label');
        progressLabel.attr('data-i18n', 'print.preparingPages')
          .data('i18n-options', {
            'current': pageNum,
            'total': totalPages
          })
          .i18n();
      });

      $('#searchButton').click(function() {
        me.$defaultMenuContext.hide();
        me.$searchMenuContext.fadeIn('fast');
        me.$searchInput.focus();
        me.setToolbarContext('search');
        me.setMenuTapToggle(false);
      });

      $('#searchCancelButton').click(function() {
        me.$searchMenuContext.hide();
        me.$defaultMenuContext.fadeIn('fast');
        me.setToolbarContext('top');
        me.setMenuTapToggle(true);
      });

      $('#searchRightButton').click(function() {
        var searchterm = me.$searchInput.val();
        me.searchText(searchterm);
      });

      $('#searchLeftButton').click(function() {
        var searchterm = me.$searchInput.val();
        me.searchText(searchterm, me.docViewer.SearchMode.e_page_stop | me.docViewer.SearchMode.e_highlight | me.docViewer.SearchMode.e_search_up);
      });

      $('#cbShowAnnotations').change(function() {
        var annotManager = me.docViewer.getAnnotationManager();
        if ($('#cbShowAnnotations').prop('checked')) {
          annotManager.showAnnotations(annotManager.getAnnotationsList());
        } else {
          annotManager.hideAnnotations(annotManager.getAnnotationsList());
        }
      });

      $('#saveAnnotationsBtn').click(function() {
        me.saveAnnotations();
      });

      me.$annotCreateButton.on('click', function() {
        me.endAnnotationQuickMode();

        me.$defaultMenuContext.hide();

        if (me.readOnly) {
          me.$annotCreateMenuContext.find('a').hide();
          me.$annotCreateMenuContext.find('#editAnnotButton').show();
          me.$annotCreateMenuContext.find('#textSelectButton').show();
          me.$annotCreateMenuContext.find('#annotCreateCancelButton').show();
        }

        me.$annotCreateMenuContext.fadeIn('fast');
        me.setToolbarContext('tools');
        me.setMenuTapToggle(false);
      });

      $('#annotCreateCancelButton').click(function() {
        me.docViewer.clearSelection();
        me.annotationManager.deselectAllAnnotations();

        me.$defaultMenuContext.fadeIn('fast');
        me.$annotCreateMenuContext.hide();
        me.setToolbarContext('top');
        me.setMenuTapToggle(true);
      });

      me.$annotCreateMenuContext.on('click', function(e) {
        var $buttonPressed = $(e.target).closest('a');
        var buttonId = $buttonPressed.attr('id');

        // simulate toggling: if a tool is already selected, de-select and switch to PanEdit mode.
        if ($buttonPressed.hasClass('active')) {
          me.docViewer.setToolMode(me.defaultToolMode);
          me.annotMode = false;
          return;
        }

        var toolMode = me.buttonIdsToToolModes[buttonId];

        if (!_.isUndefined(toolMode)) {
          // anything other than the cancel button is pressed
          me.docViewer.setToolMode(toolMode);
          me.annotMode = true;
        }

        if (buttonId === 'annotCreateCancelButton') {
          me.docViewer.setToolMode(me.defaultToolMode);
          me.annotMode = false;
          me.$defaultMenuContext.show();
          me.setToolbarContext('top');
          me.$annotCreateMenuContext.hide();
        } else if (buttonId === 'textSelectButton') {
          if (me.docViewer.getToolMode() !== me.toolModeMap[ToolMode.TextSelect]) {
            me.setToolMode(ToolMode.TextSelect);
          } else {
            me.docViewer.clearSelection();
          }
        }

        me.closeEditPopup();
      });

      me.$annotEditPopup.find('#editDoneButton').click(function() {
        me.annotationManager.deselectAllAnnotations();
        me.closeEditPopup();
      });

      me.$annotEditPopup.find('#editDeleteButton').click(function() {
        me.deleteSelectedAnnotations();
        if (me.docViewer.getToolMode() === me.toolModeMap[ToolMode.Pan]) {
          // deleting selected annotation does not trigger a deselect event
          // (deselect event turns annotMode off), so we do this explicitly here.
          me.annotMode = false;
        }
        if (me.toolbarContext === 'top') {
          // top level context, we are not in annotation tool context
          me.setMenuTapToggle(true);
        }
      });

      // Annotation Note Button
      me.$annotEditPopup.find('#editNoteButton').click(function() {
        var selected = me.annotationManager.getSelectedAnnotations();
        if (!selected || selected.length < 1) {
          return;
        }
        var annotation = selected[0];
        var editable = me.mayEditAnnotation(annotation);

        if (annotation.getReplies().length === 0 && editable) {
          // if there are no replies then just edit the note directly
          me.viewAnnotsSingleMode(annotation, 'thread');
        } else {
          me.viewAnnotsThreadMode(annotation, 'thread');
        }
      });

      function createColorElement(color) {
        var $li = $('<li class="light" data-color="' + color + '"></li>');
        var $colorSquare = $('<div>');
        if (color === 'transparent') {
          $colorSquare.addClass('color-transparent');
        } else {
          $colorSquare.css('background', color);
        }
        $li.append($colorSquare);
        return $li;
      }

      me.$annotEditPopup.find('#applyRedactButton').click(function() {
        var selected = me.annotationManager.getSelectedAnnotations();
        if (!selected || selected.length < 1) {
          return;
        }
        var annotation = selected[0];
        if (annotation && annotation instanceof Annotations.RedactionAnnotation) {
          me.annotationManager.applyRedactions(annotation, readerControl.docViewer);
        }
      });

      me.$annotEditPopup.find('#editStyleButton').on('click', function() {
        var selectedAnnotations = me.annotationManager.getSelectedAnnotations();
        if (selectedAnnotations.length === 1) {
          var annotation = selectedAnnotations[0];

          var $colorButtonContainer = me.$annotEditPopup.find('#colorType').show();
          var $colorButtons = $colorButtonContainer.find('.colorButton').show();

          var numberOfColors = 0;

          if (_.isNull(annotation.TextColor) || _.isUndefined(annotation.TextColor)) {
            me.$annotEditPopup.find('#textColorButton').hide();
          } else {
            selectTab(colorTypes.textColor);
            numberOfColors++;
          }

          // hide the buttons that aren't applicable for the selected annotation
          if (_.isNull(annotation.FillColor) || _.isUndefined(annotation.FillColor)) {
            me.$annotEditPopup.find('#fillColorButton').hide();
          } else {
            selectTab(colorTypes.fillColor);
            numberOfColors++;
          }

          if (_.isNull(annotation.StrokeColor) || _.isUndefined(annotation.StrokeColor)) {
            me.$annotEditPopup.find('#colorButton').hide();
          } else {
            selectTab(colorTypes.color);
            numberOfColors++;
          }

          if (_.isNull(annotation.StrokeThickness) || _.isUndefined(annotation.StrokeThickness)) {
            me.$annotEditPopup.find('.thicknessPicker').hide();
          } else {
            if (annotation instanceof Annotations.FreeTextAnnotation) {
              me.$thicknessSlider.attr('min', 0);
            } else {
              me.$thicknessSlider.attr('min', 1);
            }
            me.$annotEditPopup.find('.thicknessPicker').show();
            thicknessManager.update(annotation.StrokeThickness, false);
          }

          if (annotation instanceof Annotations.TextHighlightAnnotation) {
            me.$annotEditPopup.find('.opacityPicker').hide();
            $annotPreviewCanvas.hide();
          } else {
            me.$annotEditPopup.find('.opacityPicker').show();
            opacityManager.update(annotation.Opacity * 100, false);
            $annotPreviewCanvas.show();
          }

          if (annotation.FontSize) {
            me.$annotEditPopup.find('.fontSizePicker').show();
            fontSizeManager.update(parseFloat(annotation.FontSize), false);
          } else {
            me.$annotEditPopup.find('.fontSizePicker').hide();
          }

          me.$annotEditButtons.hide();
          me.$annotEditPopup.find('#annotEditProperties').show();

          if (numberOfColors <= 1) {
            $colorButtonContainer.hide();
          } else if (numberOfColors === 2) {
            $colorButtons.css('width', '50%');
          } else if (numberOfColors === 3) {
            $colorButtons.css('width', '33%');
          }

          window.ControlUtils.updateAnnotPreview(annotation);
          setEditMode(userPrefs.getDefaultToolEditingMode(annotation));
          me.setEditPopupLocation(annotation);
        }
      });

      var $basicColorPicker = me.$annotEditPopup.find('#basicProperties .colorPicker');
      var $advancedColorPicker = me.$annotEditPopup.find('#advancedProperties .colorPicker');
      var $addNewColorPicker = me.$annotEditPopup.find('#addNewColor .colorPicker');
      var advancedColors = userPrefs.getAdvancedToolColors();
      advancedColors.forEach(function(color) {
        var $li = createColorElement(color);
        $addNewColorPicker.append($li);
        $advancedColorPicker.append($li.clone());
      });

      $advancedColorPicker.append(createColorElement('transparent'));

      var $addColorButton = me.$annotEditPopup.find('#addColorButton');
      $addColorButton.on('click', function(e) {
        e.stopImmediatePropagation();

        $selectAddColor.addClass('disabled');
        deselectColor($addNewColorPicker);
        me.$annotEditPopup.find('#annotEditProperties').hide();
        me.$addNewColor.show();
      });

      me.$addNewColor.find('#cancelAddColor').on('click', function() {
        leaveAdvancedColorMenu();
      });

      var $selectAddColor = me.$addNewColor.find('#selectAddColor');
      $selectAddColor.on('click', function() {
        if (!$(this).hasClass('disabled')) {
          var annot = window.ControlUtils.getSelectedAnnotation();
          var selectedColor = $addNewColorPicker.find('.color-selected').parent().attr('data-color');
          userPrefs.addToolColor(annot, selectedColorPicker, selectedColor);
          selectTab(selectedColorPicker);
          colorSelectedHandler($basicColorPicker.find('li[data-color="' + selectedColor + '"]'), $basicColorPicker);
          leaveAdvancedColorMenu();
          me.setEditPopupLocation(annot);
        }
      });

      $addNewColorPicker.on('click', 'li', function() {
        deselectColor($addNewColorPicker);
        selectColor($(this));

        $selectAddColor.removeClass('disabled');
      });

      var $removeColorButton = me.$annotEditPopup.find('#removeColorButton');
      $removeColorButton.on('click', function(e) {
        e.stopImmediatePropagation();

        removingColors(!isRemovingColors);
      });

      function removingColors(isRemoving) {
        isRemovingColors = isRemoving;

        if (isRemovingColors) {
          $removeColorButton.addClass('removing');

          $basicColorPicker.find('li').each(function(i, element) {
            var color = element.getAttribute('data-color');

            if (color !== null && color !== 'transparent') {
              var $element = $(element);
              $element.find('div.color-selected').remove();
              $element.prepend('<div class="color-removing"></div>');
            }
          });
        } else {
          $removeColorButton.removeClass('removing');
          $basicColorPicker.find('div.color-removing').remove();
          selectTab(selectedColorPicker);
        }
      }

      function colorSelectedHandler($element, $colorPicker) {
        var annotation = window.ControlUtils.getSelectedAnnotation();
        if (!annotation) {
          return;
        }

        var color = me.colorHexToRGB($element.attr('data-color'));
        if (color) {
          var annotationProperty = selectedColorPicker;

          if (isRemovingColors) {
            var colorName = me.colorToHex(color);
            if (colorName !== 'transparent') {
              userPrefs.removeToolColor(annotation, annotationProperty, colorName);
              $element.remove();
            }
          } else {
            deselectColor($colorPicker);
            selectColor($element);

            annotation[selectedColorPicker] = color;

            me.annotationManager.updateAnnotation(annotation);
            me.annotationManager.trigger('annotationChanged', [
              [annotation], 'modify'
            ]);
            me.fireEvent('defaultToolValueChanged', [annotation, annotationProperty, color]);
            window.ControlUtils.updateAnnotPreview(annotation);
          }
        }
      }

      function selectColor($li) {
        $li.prepend('<div class="color-selected"></div>');
      }

      function deselectColor($colorPicker) {
        $colorPicker.find('div.color-selected').remove();
      }

      function setColor(color, $colorPicker) {
        var colorName = me.colorToHex(color);
        deselectColor($colorPicker);
        selectColor($colorPicker.find('li[data-color="' + colorName + '"]'));
      }

      function leaveAdvancedColorMenu() {
        me.$addNewColor.hide();
        me.$annotEditPopup.find('#annotEditProperties').show();
      }

      function selectTab(colorType) {
        var annot = window.ControlUtils.getSelectedAnnotation();
        if (!annot) {
          return;
        }
        var $tab, colors;
        var toolColors = userPrefs.getToolColors(annot);
        selectedColorPicker = colorType;

        if (colorType === colorTypes.color) {
          $tab = me.$annotEditPopup.find('#colorButton');
          colors = toolColors.colors;
        } else if (colorType === colorTypes.fillColor) {
          $tab = me.$annotEditPopup.find('#fillColorButton');
          colors = toolColors.fillColors;
        } else if (colorType === colorTypes.textColor) {
          $tab = me.$annotEditPopup.find('#textColorButton');
          colors = toolColors.textColors;
        }

        $removeColorButton.removeClass('removing');
        isRemovingColors = false;

        me.$annotEditPopup.find('.colorButton').removeClass('active');
        $tab.addClass('active');
        setTransparentColorVisibility();

        var $colorMenu = me.$annotEditPopup.find('#colorMenu');
        $colorMenu.find('[data-color]').remove();

        $basicColorPicker.find('[data-color]').remove();
        colors.forEach(function(color) {
          $addColorButton.before(createColorElement(color));
        });

        var color = annot[colorType];
        setColor(color, $basicColorPicker);
        setColor(color, $advancedColorPicker);

        me.setEditPopupLocation(annot);
      }

      me.$annotEditPopup.find('#colorButton').on('click', function() {
        selectTab(colorTypes.color);
      });

      me.$annotEditPopup.find('#fillColorButton').on('click', function() {
        selectTab(colorTypes.fillColor);
      });

      me.$annotEditPopup.find('#textColorButton').on('click', function() {
        selectTab(colorTypes.textColor);
      });

      $basicColorPicker.on('click', 'li', function() {
        colorSelectedHandler($(this), $basicColorPicker);
      });

      $advancedColorPicker.on('click', 'li', function() {
        colorSelectedHandler($(this), $advancedColorPicker);
      });

      var MobilePropertyManager = function() {
        window.ControlUtils.PropertyManager.apply(this, arguments);
      };

      MobilePropertyManager.prototype = $.extend({}, window.ControlUtils.PropertyManager.prototype, {
        update: function(value) {
          window.ControlUtils.PropertyManager.prototype.update.apply(this, arguments);
          this.$slider.val(parseFloat(value)).slider('refresh');
          this.$radioContainer.find('[data-value]').checkboxradio('refresh');
          this.$slider.closest('table').find('.propertyValue').text(Math.round(value) + this.displayUnit);
        }
      });

      var annotPreviewCanvas = document.getElementById('annotPreviewCanvas');
      var $annotPreviewCanvas = $(annotPreviewCanvas);
      window.ControlUtils.setPreviewCanvas(annotPreviewCanvas, annotPreviewCanvas.width, annotPreviewCanvas.height);

      var $basicProperties = me.$annotEditPopup.find('#basicProperties');
      var $advancedProperties = me.$annotEditPopup.find('#advancedProperties');

      var thicknessManager = new MobilePropertyManager('StrokeThickness', me.$thicknessSlider, $basicProperties.find('#thicknessRadio'));
      thicknessManager.setDisplayUnit('pt');
      me.$thicknessSlider.change(function() {
        var selectedAnnotations = me.annotationManager.getSelectedAnnotations();
        if (selectedAnnotations.length <= 0) {
          return;
        }
        var annotation = selectedAnnotations[0];

        thicknessManager.update(me.$thicknessSlider[0].value);
        me.fireEvent('defaultToolValueChanged', [annotation, 'StrokeThickness', annotation.StrokeThickness]);
      });

      var opacityManager = new MobilePropertyManager('Opacity', me.$opacitySlider, $basicProperties.find('#opacityRadio'));
      opacityManager.setDisplayUnit('%');
      opacityManager.setAnnotationPropertyModifier(function(value) {
        return value / 100;
      });

      me.$opacitySlider.change(function() {
        var selectedAnnotations = me.annotationManager.getSelectedAnnotations();
        if (selectedAnnotations.length <= 0) {
          return;
        }
        var annotation = selectedAnnotations[0];

        opacityManager.update(me.$opacitySlider[0].value);
        me.fireEvent('defaultToolValueChanged', [annotation, 'Opacity', annotation.Opacity]);
      });

      var fontSizeManager = new MobilePropertyManager('FontSize', me.$fontSizeSlider, $basicProperties.find('#fontSizeRadio'));
      fontSizeManager.setAnnotationPropertyModifier(function(value) {
        return value + 'pt';
      });

      me.$fontSizeSlider.change(function() {
        var selectedAnnotations = me.annotationManager.getSelectedAnnotations();
        if (selectedAnnotations.length <= 0) {
          return;
        }
        var annotation = selectedAnnotations[0];

        fontSizeManager.update(me.$fontSizeSlider[0].value);
        me.fireEvent('defaultToolValueChanged', [annotation, 'FontSize', annotation.FontSize]);
      });

      var $propertySliders = me.$thicknessSlider
        .add(me.$opacitySlider)
        .add(me.$fontSizeSlider);

      $propertySliders.on('slidestop', function() {
        var selectedAnnotations = me.annotationManager.getSelectedAnnotations();
        if (selectedAnnotations.length <= 0) {
          return;
        }
        var annotation = selectedAnnotations[0];

        me.annotationManager.trigger('annotationChanged', [
          [annotation], 'modify'
        ]);
      });

      function setEditMode(mode) {
        currentEditMode = mode;
        selectTab(selectedColorPicker);

        if (currentEditMode === editMode.basic) {
          $basicPropertyEdit.addClass('ui-btn-active');
          $basicProperties.show();
          $advancedPropertyEdit.removeClass('ui-btn-active');
          $advancedProperties.hide();
          $annotPreviewCanvas.parent().insertBefore($basicProperties.find('#basicPropertyContainer'));
        } else if (currentEditMode === editMode.advanced) {
          $advancedPropertyEdit.addClass('ui-btn-active');
          $advancedProperties.show();
          $basicPropertyEdit.removeClass('ui-btn-active');
          $basicProperties.hide();
          $annotPreviewCanvas.parent().insertBefore($advancedProperties.find('#advancedPropertyContainer'));
        }

        me.setEditPopupLocation(window.ControlUtils.getSelectedAnnotation());
      }

      // hide or show the transparent color box depending on which color tab is selected
      // it should only be shown for fill color
      function setTransparentColorVisibility() {
        var transparentColorBox = $advancedColorPicker.find('[data-color="transparent"]');
        if (selectedColorPicker === colorTypes.fillColor) {
          transparentColorBox.show();
        } else {
          transparentColorBox.hide();
        }
      }

      var $basicPropertyEdit = me.$annotEditPopup.find('#basicPropertyEdit');
      $basicPropertyEdit.on('click', function() {
        setEditMode(editMode.basic);
        userPrefs.setDefaultToolEditingMode(window.ControlUtils.getSelectedAnnotation(), editMode.basic);
      });

      var $advancedPropertyEdit = me.$annotEditPopup.find('#advancedPropertyEdit');
      $advancedPropertyEdit.on('click', function() {
        setEditMode(editMode.advanced);
        userPrefs.setDefaultToolEditingMode(window.ControlUtils.getSelectedAnnotation(), editMode.advanced);
        setTransparentColorVisibility();
      });

      me.$annotQuickMenu.on('click', function(e) {
        var $button = $(e.target).closest('a');

        if ($button.length > 0) {
          var toolMode = $button.data('toolmode');
          me.setToolMode(toolMode);
          me.annotMode = true;
          me.annotQuickCreate = true;

          me.$annotQuickMenu.popup('close');

          var annotManager = me.docViewer.getAnnotationManager();
          annotManager.on('annotationChanged.quickMenu', function(e, annotations, action) {
            // this is looking for the first annotation that is added by the user
            // so that it can automatically switch back to pan mode
            if (!e.imported && action === 'add') {
              setTimeout(function() {
                me.endAnnotationQuickMode();
                annotManager.selectAnnotation(annotations[0]);
                me.showAnnotationEditPopup();
              }, 0);
            }
          });
        }
      });

      me.$signaturePopup.popup({
        beforeposition: function() {
          var multiplier = window.utils.getCanvasMultiplier();
          var width = window.document.body.clientWidth * 0.9;
          var height = window.document.body.clientHeight * 0.85;

          $signatureCanvas.attr({
            width: width * multiplier,
            height: height * multiplier
          })
            .css({
              width: width,
              height: height
            });
        },
        afteropen: function() {
          signatureTool.openSignature();
        },
        afterclose: function() {
          signatureTool.clearSignatureCanvas();
        }
      });

      me.$signaturePopup.find('#signatureCancelButton').on('click', function() {
        me.$signaturePopup.popup('close');
      });

      me.$signaturePopup.find('#signatureClearButton').on('click', function() {
        signatureTool.clearSignatureCanvas();
        signatureTool.drawBackground();
      });

      me.$signaturePopup.find('#signatureAddButton').on('click', function() {
        var makeDefault = $makeDefaultCheckbox.prop('checked');

        var added = signatureTool.addSignature(makeDefault);
        if (added) {
          me.$signaturePopup.popup('close');
        }
      });

      $('#mySignatureButton').on('click', function() {
        signatureTool.addDefaultSignature();
        me.closeEditPopup();
      });

      $('#newSignatureButton').on('click', function() {
        me.closeEditPopup();
        openSignaturePopup();
      });

      function openSignaturePopup() {
        $makeDefaultCheckbox.prop('checked', false).checkboxradio('refresh');
        me.$signaturePopup.popup('open');
      }

      var $makeDefaultCheckbox = $('#makeDefaultSignature');

      var signatureTool = readerControl.toolModeMap['AnnotationCreateSignature'];
      signatureTool.on('locationSelected', function(e, pageLocation) {
        if (signatureTool.hasDefaultSignature()) {
          me.$annotEditButtons.hide();
          me.$signatureSelectionContainer.show();
          me.$annotEditPopup.popup('option', 'arrow', 'b');

          var displayMode = readerControl.docViewer.getDisplayModeManager().getDisplayMode();
          var location = displayMode.pageToWindow({
            x: pageLocation.x,
            y: pageLocation.y
          }, pageLocation.pageIndex);

          me.$annotEditPopup.popup('close');
          me.$annotEditPopup.popup('open', {
            x: location.x,
            y: location.y
          });
        } else {
          openSignaturePopup();
        }
      });

      var $signatureCanvas = me.$signaturePopup.find('#signatureCanvas');
      signatureTool.setSignatureCanvas($signatureCanvas);

      var verticalOffset = 30;
      var currentQuads = null;

      var $copyButton = me.$textSelectionContainer.find('#copyButton');
      if (!me.isCopySupported) {
        $copyButton.hide();
        me.$textSelectionContainer.controlgroup();
      }

      $copyButton.on('click', function() {
        me.closeEditPopup();
        $('#clipboardWrapper').show();
        me.copyButtonHandler();
        $('#clipboardWrapper').hide();
      });

      var textSelectTool = readerControl.toolModeMap['TextSelect'];
      textSelectTool.on('selectionComplete', function(e, startLocation, allQuads) {
        if (me.docViewer.getAnnotationManager().getReadOnly() || !readerControl.enableAnnotations) {
          if (!me.isCopySupported) {
            return;
          }

          $copyButton.siblings().hide();
          me.$textSelectionContainer.controlgroup();
        }

        me.$annotEditButtons.hide();
        me.$textSelectionContainer.show();
        me.$annotEditPopup.popup('option', 'arrow', 'b');

        currentQuads = allQuads;
        var quad = startLocation.quad;

        var pageLocation = {
          x: (quad.x1 + quad.x3) / 2,
          y: quad.y1,
          pageIndex: startLocation.pageIndex
        };

        var displayMode = readerControl.docViewer.getDisplayModeManager().getDisplayMode();
        var location = displayMode.pageToWindow({
          x: pageLocation.x,
          y: pageLocation.y
        }, pageLocation.pageIndex);

        me.$annotEditPopup.popup('close');
        me.$annotEditPopup.popup('open', {
          x: location.x,
          y: location.y - verticalOffset
        });
      });

      function handleAnnotationCreate(buttonId, annotConstructor, annotTool) {
        var am = readerControl.docViewer.getAnnotationManager();

        me.$textSelectionContainer.find('#' + buttonId).on('click', function() {
          for (var page in currentQuads) {
            if (currentQuads.hasOwnProperty(page)) {
              var pageIndex = parseInt(page, 10);
              var pageQuads = currentQuads[pageIndex];
              var textAnnot = new annotConstructor();
              textAnnot.PageNumber = pageIndex + 1;
              textAnnot.Quads = pageQuads;
              textAnnot.Author = readerControl.getAnnotationUser();
              textAnnot.StrokeColor = annotTool.defaults.StrokeColor;
              if (window.Tools.TextAnnotationCreateTool.AUTO_SET_TEXT) {
                textAnnot.setContents(readerControl.docViewer.getSelectedText());
              }
              am.addAnnotation(textAnnot);
            }
          }

          readerControl.docViewer.clearSelection();
          me.closeEditPopup();
        });
      }

      handleAnnotationCreate('selectHighlightButton', Annotations.TextHighlightAnnotation, readerControl.toolModeMap['AnnotationCreateTextHighlight']);
      handleAnnotationCreate('selectStrikeoutButton', Annotations.TextStrikeoutAnnotation, readerControl.toolModeMap['AnnotationCreateTextStrikeout']);
      handleAnnotationCreate('selectUnderlineButton', Annotations.TextUnderlineAnnotation, readerControl.toolModeMap['AnnotationCreateTextUnderline']);
      handleAnnotationCreate('selectSquigglyButton', Annotations.TextSquigglyAnnotation, readerControl.toolModeMap['AnnotationCreateTextSquiggly']);

      me.$pageIndicator.on('click', function() {
        me.$goToPagePopup.popup('open', {
          y: 0
        });
        me.$pageNumberInput.focus();
      });

      function goToPage() {
        var pageNum = parseInt(me.$pageNumberInput.val(), 10) || me.docViewer.getCurrentPage();
        me.$pageNumberInput.val('');
        var maxPage = me.docViewer.getPageCount();
        pageNum = pageNum > maxPage ? maxPage : pageNum;

        // close popup before going to the page so that the virtual keyboard is hidden and the window size is correct
        me.$goToPagePopup.popup('close');

        // need a delay here because of our height change resize code on android isn't being activated anymore when
        // the virtual keyboard is hidden so we want to wait until the virtual keyboard has had time to hide
        setTimeout(function() {
          me.setCurrentPage(pageNum - 1);

          window.scrollTo(0, 0);
        }, 300);
      }

      me.$goToPagePopup.find('#pageNumberGoButton').on('click', goToPage);

      $('#goToPageForm').submit(function() {
        goToPage();
        return false;
      });

      if (me.isAndroid) {
        // this is a hacky workaround for issues with submitting an number input field on android
        // instead of a "go" or "submit" button there is a "next" button, so this will go to the off screen field and then submit the form
        // we also can't include this for other browsers because on the ipad the off screen field causes the menu animation to be jittery
        var numFix = $('<input data-role="none" type="text" style="margin-left:-9999px;position:absolute"/>');
        var numSubmit = $('<input data-role="none" style="height: 0px; width: 0px; border: none; padding: 0px;position: absolute" tabindex="999" type="submit" />');
        numFix.focus(function() {
          $('#goToPageForm').submit();
        });

        $('#goToPageForm').append(numFix, numSubmit);
      }


      var $searchForm = $(me.$searchInput.get(0).form);

      $searchForm.click(function() {
        // focus the search input box if the form was clicked
        // handles the case were the search icon image is clicked instead of the input
        me.$searchInput.focus();
      });

      $searchForm.submit(function() {
        var searchterm = me.$searchInput.val();
        try {
          me.searchText(searchterm);
          me.$searchInput.blur();
        } catch (ex) {
          // console.log(ex.message);
        } finally {
          return false;
        }
      });
    },

    initUI: function() {
      // Used to disables all dragging.
      // We don't know why, so now it doesn't.
      // exports.ondragstart = function() {
      //     return false;
      // };
      // don't allow editing of input directly
      this.$pageIndicator.prop('readonly', true);

      // so we can interact with annotations right away even when the edit popup is visible
      $('#annotEditPopup-screen').remove();
    },

    initViewer: function() {
      var me = this;

      $(window).bind('resize', _(this.onResize).bind(this));

      var windowToPage = function(windowPt, pageIndex, rotation) {
        var zoom = me.docViewer.getPageZoom(pageIndex);
        var pageTransform = me.displayMode.getPageTransform(pageIndex);

        var scaledPagePt = new Text.Point2D();
        scaledPagePt.x = windowPt.x - pageTransform.x;
        scaledPagePt.y = windowPt.y - pageTransform.y;

        var mTransform = exports.GetPageMatrix(zoom, rotation, { width: me.docViewer.getPageWidth(pageIndex), height: me.docViewer.getPageHeight(pageIndex) }, 0, false);
        mTransform = mTransform.inverse();

        var pt = mTransform.mult(scaledPagePt);

        return {
          'pageIndex': pageIndex,
          x: pt.x,
          y: pt.y
        };
      };

      var pageToWindow = function(pt, pageIndex, rotation) {
        var zoom = me.docViewer.getPageZoom(pageIndex);
        var pageTransform = me.displayMode.getPageTransform(pageIndex);

        var mTransform = exports.GetPageMatrix(zoom, rotation, { width: me.docViewer.getPageWidth(pageIndex), height: me.docViewer.getPageHeight(pageIndex) }, 0, false);
        pt = mTransform.mult(pt);

        return {
          'pageIndex': pageIndex,
          x: pt.x + pageTransform.x,
          y: pt.y + pageTransform.y
        };
      };

      me.displayMode = new exports.CoreControls.DisplayMode(me.docViewer, exports.CoreControls.DisplayModes.Custom);
      // override the necessary display mode functions
      $.extend(me.displayMode, {
        // Due to the differences between the way page offsets are measured in mobile, these are modified copies of the real functions
        // TODO: unify the page offsets so this is no longer necessary
        windowToPage: function(windowPt, pageIndex) {
          return windowToPage(windowPt, pageIndex, me.docViewer.getCompleteRotation(pageIndex + 1));
        },
        pageToWindow: function(pt, pageIndex) {
          return pageToWindow(pt, pageIndex, me.docViewer.getCompleteRotation(pageIndex + 1));
        },

        pageToWindowNoRotate: function(pt, pageIndex) {
          return pageToWindow(pt, pageIndex, me.docViewer.getRotation(pageIndex + 1));
        },

        windowToPageNoRotate: function(windowPt, pageIndex) {
          return windowToPage(windowPt, pageIndex, me.docViewer.getRotation(pageIndex + 1));
        },

        getSelectedPages: function(mousePt1, mousePt2) {
          var firstPageIndex = null;
          var lastPageIndex = null;

          me.forEachPageInWrapper(me.currentPageIndex, function(idx) {
            var pageTransform = me.displayMode.getPageTransform(idx);

            var page = me.doc.getPageInfo(idx);
            var pageZoom = me.docViewer.getPageZoom(idx);

            var pageRect = {
              x1: pageTransform.x,
              y1: pageTransform.y,
              x2: pageTransform.x + page.width * pageZoom,
              y2: pageTransform.y + page.height * pageZoom
            };

            if (mousePt1.x <= pageRect.x2
                            && mousePt1.x >= pageRect.x1
                            && mousePt1.y <= pageRect.y2
                            && mousePt1.y >= pageRect.y1) {
              firstPageIndex = idx;
            }

            if (mousePt2.x <= pageRect.x2
                            && mousePt2.x >= pageRect.x1
                            && mousePt2.y <= pageRect.y2
                            && mousePt2.y >= pageRect.y1) {
              lastPageIndex = idx;
            }
          });

          return {
            first: firstPageIndex,
            last: lastPageIndex
          };
        },

        getVisiblePages: function() {
          var pageIndexes = [];
          var adjustedPageIndex = me.adjustedPageIndex(me.currentPageIndex);

          var addPage = function(i) {
            pageIndexes.push(i);
          };

          me.forEachPageInWrapper(adjustedPageIndex, addPage, true);
          // get pages in next wrapper
          if (adjustedPageIndex + me.nPagesPerWrapper < me.nPages) {
            me.forEachPageInWrapper(adjustedPageIndex + me.nPagesPerWrapper, addPage, true);
          }
          // get pages in previous wrapper
          if (adjustedPageIndex - 1 >= 0) {
            me.forEachPageInWrapper(adjustedPageIndex - 1, addPage, true);
          }
          // When zoomed in account for this and do not include pages
          // that are not visible
          if (me.newScale * me.currentPageZoom > me.currentPageMinZoom) {
            var zoomedPages = me.getVisibleZoomedPages();
            // check if we can skip rendering any of the pages because they aren't visible
            if (zoomedPages.length < me.nPagesPerWrapper) {
              me.forEachPageInWrapper(me.currentPageIndex, function(pageIndex) {
                // if page isn't visible while zoomed then remove it from the list of visible pages
                if (zoomedPages.indexOf(pageIndex) === -1) {
                  var index = pageIndexes.indexOf(pageIndex);
                  if (index !== -1) {
                    pageIndexes.splice(index, 1);
                  }
                }
              });
            }
          }
          return pageIndexes;
        },

        getVisibleRegionRect: function() {
          var viewportTop = 0;
          var viewportLeft = 0;
          var viewportBottom = viewportTop + exports.document.body.clientHeight;
          var viewportRight = viewportLeft + exports.document.body.clientWidth;
          return {
            x1: viewportLeft,
            y1: viewportTop,
            x2: viewportRight,
            y2: viewportBottom
          };
        },

        getPageTransform: function(pageIndex) {
          var pageData = me.getPageData(pageIndex);
          var viewportRender = false;
          if (me.transformOffset !== null) {
            // these values are the coordinates for the pagewrapper
            // note that the pagewrapper may be larger than the pages!
            var left = me.transformOffset.left;
            var top = me.transformOffset.top;

            // the leftmost page's x offset which we want to use for calculating the snap location
            var leftMostX = pageData.x - pageData.xShift;

            // calculate the snap location for the zoomed in page or pages
            // adds the pagewrapper coordinates and the page's offset from the wrapper edge
            var pt = me.getSnapLocation(left + leftMostX, top + pageData.y, pageData.totalWidth, pageData.maxHeight);

            pageData.x = pt.left + me.vWOffset + pageData.xShift;
            pageData.y = pt.top;
            viewportRender = true;
          }

          return {
            x: pageData.x,
            y: pageData.y,
            width: pageData.fitWidth,
            height: pageData.fitHeight,
            viewportRender: viewportRender
          };
        },

        getPageOffset: function(pageIndex) {
          var pageData = me.getPageData(pageIndex);

          return {
            x: pageData.x,
            y: pageData.y
          };
        }
      });

      me.docViewer.getDisplayModeManager().setDisplayMode(me.displayMode);
      me.docViewer.defaults.DisplayMode = me.displayMode;

      var fitMode = me.docViewer.FitMode.FitPage;
      me.docViewer.setFitMode(fitMode);
      me.docViewer.defaults.FitMode = fitMode;

      exports.CoreControls.SetCachingLevel(2);
      exports.CoreControls.SetPreRenderLevel(0);
      me.docViewer.setMargin(0);

      me.docViewer.on('pageProgressiveUpdate', function(e, pageIndex, canvas) {
        me.pageUpdate(pageIndex, canvas, true /* progresssive */);
      });

      me.docViewer.on('backendSwitch', function() {
        me.setMinZooms();
        me.updateCurrentZooms(0);
        var page = me.doc.getPageInfo(me.currentPageIndex);
        var pageZoom = me.docViewer.getPageZoom(me.currentPageIndex);

        me.$viewer.css('width', (page.width * pageZoom) + 'px');
        me.$viewer.css('height', (page.height * pageZoom) + 'px');

        me.currentPageIndex = me.docViewer.getCurrentPage() - 1;
      });

      me.docViewer.on('pageComplete', function(e, pageIndex, canvas) {
        var idx = me.pagesRendering.indexOf(pageIndex);
        if (idx > -1) {
          me.pagesRendering.splice(idx, 1);
        }

        me.pageUpdate(pageIndex, canvas, false /* not progresssive */);
        me.fireEvent('pageCompleted', [pageIndex + 1]);
      });
    },

    onError: function(e, msg, userMessage) {
      $.mobile.loading('show', {
        text: userMessage,
        textVisible: true,
        textonly: true
      });
    },

    saveAnnotations: function() {
      //---------------------------
      // Save annotations
      //---------------------------
      // You'll need server-side communication here

      // 1) local saving
      // var xfdfString = me.annotationManager.exportAnnotations();
      // var uriContent = "data:text/xml," + encodeURIComponent(xfdfString);
      // newWindow=window.open(uriContent, 'XFDF Document');

      var me = this;
      return new Promise(function(resolve, reject) {
        // 2) saving to server (simple)
        me.exportAnnotations({
          start: function() {
            $.mobile.loading('show', {
              text: i18n.t('annotations.savingAnnotations'),
              textVisible: true
            });
          },
          // eslint-disable-next-line no-unused-vars
          success: function(data) {
            // Annotations were sucessfully uploaded to server
            $.mobile.loading('show', {
              text: i18n.t('annotations.saveSuccess'),
              textVisible: true,
              textonly: true
            });
            resolve();
          },
          error: function() {
            $.mobile.loading('show', {
              text: i18n.t('annotations.saveError'),
              textVisible: true,
              textonly: true
            });
            reject();
          },
          complete: function() {
            setTimeout(function() {
              $.mobile.loading('hide');
            }, 1000);
          }
        });
      });

      // 3) saving to server with the command structure (avoid conflicts)
      // NOT IMPLEMENTED
    },

    printHandler: function() {
      this.$printPopup.popup('open', {
        y: 0
      });
    },

    cancelPrintJob: function() {
      CoreControls.SetCanvasMode(CoreControls.CanvasMode.ViewportCanvas);
      this.docViewer.setPagesPerCanvas(this.nPagesPerWrapper, this.isCoverMode);
      this.$printPopup.find('#print-progress').val(0).slider('refresh')
        .closest('.progress-bar')
        .hide();
      this.$printPopup.find('.progress-label').text('');
      this.endPrintJob();
    },

    offlineReady: function() {
      var me = this;

      $('#offlineOptions').show();
      var $enableOfflineCheckbox = $('#cbEnableOfflineMode').checkboxradio();

      me.$defaultMenuContext.trigger('create');
      me.$defaultMenuContext.controlgroup();

      $enableOfflineCheckbox.change(function() {
        var offlineEnabled = !me.doc.getOfflineModeEnabled();
        me.doc.setOfflineModeEnabled(offlineEnabled);
      });

      if (me.doc.getOfflineModeEnabled()) {
        toggleOfflineCheckbox(true);
      }

      function toggleOfflineCheckbox(offlineEnabled) {
        $enableOfflineCheckbox.prop('checked', offlineEnabled).checkboxradio('refresh');
      }

      $('#offlineDownloadBtn').click(function() {
        var $this = $(this);

        var progressSlider = $('#optionsDialog').find('.progress-bar');
        progressSlider.show();
        // add the active class explicitly so that the bar displays
        progressSlider.find('.ui-slider-bg').addClass('ui-btn-active');

        var isDownloading = $this.data('downloading');

        if (isDownloading) {
          $this.data('downloading', false);
          me.doc.cancelOfflineModeDownload();
        } else {
          $this.data('downloading', true);
          $this.attr('data-i18n', '[value]offline.cancelDownload').i18n().button('refresh');

          me.doc.storeOffline(function() {
            $this.data('downloading', false);
            $this.attr('data-i18n', '[value]offline.downloadOfflineViewing').i18n().button('refresh');
            progressSlider.hide();
            $('#download-progress').val(0).slider('refresh');

            if (me.doc.isDownloaded()) {
              $enableOfflineCheckbox.checkboxradio('enable');
            }
          }, function(fractionDone) {
            $('#download-progress').val(fractionDone * 100).slider('refresh');
          });
        }
      });

      if (!me.doc.isDownloaded()) {
        $enableOfflineCheckbox.attr('disabled', true);
      }
    },

    // calls the given function on each page index in the wrapper of the passed in page index
    forEachPageInWrapper: function(pageIndex, func, normalOrder) {
      // if normal order is passed then it will override the right to left mode settings
      var me = this;
      var rightToLeft = me.docViewer.getRightToLeftPages();
      var adjustedIndex = me.adjustedPageIndex(pageIndex);

      var i, idx;
      if (rightToLeft && !normalOrder) {
        for (i = me.nPagesPerWrapper - 1; i >= 0; --i) {
          idx = adjustedIndex + i;
          if (idx >= me.nPages || idx < 0) {
            continue;
          }
          func(idx);
        }
      } else {
        for (i = 0; i < me.nPagesPerWrapper; ++i) {
          idx = adjustedIndex + i;
          if (idx >= me.nPages) {
            break;
          } else if (idx < 0) {
            continue;
          }
          func(idx);
        }
      }
    },

    endAnnotationQuickMode: function() {
      this.annotMode = false;
      this.annotQuickCreate = false;
      this.setToolMode(ToolMode.Pan);
      this.docViewer.getAnnotationManager().off('annotationChanged.quickMenu');
    },

    setToolbarContext: function(context) {
      this.toolbarContext = context;
      this.$pageHeader.attr('data-context', context);
    },

    changeVisiblePage: function(pageId) {
      $.mobile.changePage('#' + pageId, {
        transition: 'none',
        changeHash: false
      });
    },

    /**
     * Enable or disable the tap toggling behavior of the menu
     * @method MobileReaderControl#setMenuTapToggle
     * @param {boolean} value Whether the tap toggling should be enabled or not
     */
    setMenuTapToggle: function(value) {
      this.$fixedToolbars.toolbar('option', 'tapToggle', value);
    },

    /**
     * Show the menu if it's currently hidden
     * @method MobileReaderControl#reshowMenu
     */
    reshowMenu: function() {
      if (this.$fixedToolbars.hasClass('ui-fixed-hidden')) {
        this.$fixedToolbars.toolbar('show');
      }
    },

    setPageMode: function() {
      if (this.pageDisplay === this.pageDisplayModes.Single) {
        // always one page shown
        this.nPagesPerWrapper = 1;
      } else if (this.pageDisplay === this.pageDisplayModes.Double) {
        // two pages in landscape, one in portrait
        if (window.document.body.clientWidth > window.document.body.clientHeight) {
          this.nPagesPerWrapper = 2;
        } else {
          this.nPagesPerWrapper = 1;
        }
      }

      this.docViewer.setPagesPerCanvas(this.nPagesPerWrapper, this.isCoverMode);
    },

    updateCurrentZooms: function(pageIndex) {
      var me = this;

      var pageZoom = me.docViewer.getPageZoom(pageIndex);
      me.currentPageZoom = pageZoom;
      me.currentPageMinZoom = me.minZooms[pageIndex];

      var zoomApprox = window.devicePixelRatio > 1 ? 5 : 5;

      me.currentPageMaxZoom = me.currentPageMinZoom * zoomApprox;
    },

    setMinZooms: function() {
      var me = this;
      for (var i = 0; i < me.nPages; i++) {
        var pageIndex = i;
        var pageZoom = me.getFitPageZoom(pageIndex);
        me.docViewer.setPageZoom(pageIndex, pageZoom);
        me.minZooms[i] = pageZoom;
      }
    },

    setMinZoomsInList: function(pagesToUpdate) {
      var me = this;
      var pagesToUpdateLength = pagesToUpdate.length;
      for (var i = 0; i < pagesToUpdateLength; i++) {
        var pageIndex = pagesToUpdate[i];
        var pageZoom = me.getFitPageZoom(pageIndex);
        me.docViewer.setPageZoom(pageIndex, pageZoom);
        me.minZooms[pageIndex] = pageZoom;
      }
    },

    setCurrentToMinZoom: function() {
      var me = this;

      me.forEachPageInWrapper(me.currentPageIndex, function(i) {
        me.docViewer.setPageZoom(i, me.minZooms[i]);
      });
    },

    clearPages: function($wrapper) {
      // remove the links and widgets
      var pageWidgetContainer = $wrapper.find('[id^=pageWidgetContainer]');

      var pageWidgetContainerClone = [];

      for (var i = 0; i < pageWidgetContainer.length; ++i) {
        // clone the widgets so that they can be displayed scaled while updating
        // the position and scaling of the real widgets
        pageWidgetContainerClone.push(pageWidgetContainer[i].cloneNode(true));
        pageWidgetContainerClone[i].id = 'pageWidgetContainerClone' + i;
      }

      pageWidgetContainer.detach();
      $wrapper.append(pageWidgetContainerClone);
    },

    pageUpdate: function(pageIndex, canvas, progressive) {
      var me = this;
      me.canvasToAppend = canvas;

      if (!me.rerenderPages) {
        var $pageContainer = $('#pageContainer' + pageIndex);
        me.appendCanvas($pageContainer.parent(), pageIndex, progressive);
      } else if (!me.pagesRendering.length && me.rerenderPages && me.snapComplete) {
        me.rerenderPages(progressive);
      }

      if (me.androidBrowser) {
        // workaround for issue in android browser, see http://code.google.com/p/android/issues/detail?id=31862
        me.c.$e.find('canvas').each(function() {
          var $this = $(this);
          if ($this.css('transform') === 'none') {
            $this.css('transform', 'translateZ(0)');
          }
        });
      }
    },

    appendCanvas: function(container, pageIndex, progressive) {
      var me = this;

      // look for canvas with class that starts with canvas
      var oldCanvas = container.find("[class^='canvas'], [class*=' canvas']");

      if (oldCanvas.length > 0) {
        oldCanvas = oldCanvas[0];
      } else {
        oldCanvas = null;
      }

      var finalPageInWrapper = Math.min((me.adjustedPageIndex(pageIndex) + me.nPagesPerWrapper - 1), me.nPages - 1) === pageIndex;

      if (finalPageInWrapper || !me.isZoomedIn() || progressive) {
        // the widget container is hidden by default so we need to show it at this point
        $('[id^="pageWidgetContainer"]').css('display', 'block');

        $(me.canvasToAppend).css('position', 'absolute');
        container.append(me.canvasToAppend);
        if (oldCanvas === me.canvasToAppend) {
          oldCanvas = null;
        } else if (oldCanvas !== null) {
          $(oldCanvas).attr('style', '');
          $(oldCanvas).remove();
        }
        // don't recycle if this is a progressive update
        if (finalPageInWrapper && !progressive) {
          me.docViewer.returnCanvas(pageIndex, oldCanvas);
        }
      }
    },

    createPageWrapper: function(wrapperIndex, offset) {
      var me = this;

      var pageIndex = me.wrapperToPage(wrapperIndex);

      var $pageWrapper = $('<div style="top:0px; z-index:0; background-color: #929292;" class="pageContainer"></div>');
      $pageWrapper.attr('id', 'pageWrapper' + wrapperIndex);

      var maxHeight = 0;
      me.forEachPageInWrapper(pageIndex, function(pageToAdd) {
        var pageTransform = me.displayMode.getPageTransform(pageToAdd);

        var width = Math.ceil(pageTransform.width);

        var pc = $('<div style="position: absolute; float: left; z-index: 0; background-color: white " class="pageContainer"></div>');
        pc.attr('id', 'pageContainer' + pageToAdd).width(width).height(pageTransform.height);
        pc.addClass('loading');

        me.transform(pc, pageTransform.x, pageTransform.y);

        $pageWrapper.append(pc);

        if (pageTransform.height > maxHeight) {
          maxHeight = pageTransform.height;
        }
      });

      $pageWrapper.width(window.document.body.clientWidth);
      $pageWrapper.height(window.document.body.clientHeight);

      var left = -me.vWOffset + offset;
      var top = 0;

      me.transform($pageWrapper, left, top);

      // $e is the jquery object for the wrapper.
      // tX is the translated x position.
      // tY is the translated y position.
      return {
        $e: $pageWrapper,
        tX: left,
        tY: top,
        i: wrapperIndex
      };
    },

    /**
     * Gets the zoom level when the page is fit to the screen
     * @method MobileReaderControl#getFitPageZoom
     * @return {number} The zoom level when fit to the screen
     */
    getFitPageZoom: function(pageIndex) {
      var me = this;

      var width = 0;
      var height = 0;
      me.forEachPageInWrapper(pageIndex, function(idx) {
        var page = me.doc.getPageInfo(idx);
        height = page.height > height ? page.height : height;
        width += page.width;
      });

      var heightval = parseFloat(window.document.body.clientHeight - me.margin * 2) / height;
      var widthval = parseFloat(window.document.body.clientWidth - me.margin * 2) / width;

      var fitPageZoom = heightval < widthval ? heightval : widthval;

      return fitPageZoom;
    },

    zoomAbort: function() {
      var me = this;

      me.pagesRendering = [];
      me.rerenderPages = null;

      me.snapComplete = false;
      me.zoomedWrapper = null;

      me.newScale = 1;
      me.oldScale = 1;
    },

    unZoomWrapper: function() {
      var me = this;

      if (me.zoomedWrapper) {
        me.setCurrentToMinZoom();

        me.clearTransform(me.zoomedWrapper.$e.find('canvas'));
        me.zoomedWrapper.$e.remove();

        var wi = me.pageToWrapper(me.currentPageIndex);
        me.c = me.createPageWrapper(wi, 0);

        me.$viewer.append(me.c.$e);

        me.zoomAbort();
      }
    },

    addPages: function(vis, wrapperIndex) {
      var me = this;

      var startIdx = me.wrapperToPage(wrapperIndex);
      me.forEachPageInWrapper(startIdx, function(pageToAdd) {
        vis.push(pageToAdd);
      }, true);
    },

    pageToWrapper: function(pageIndex) {
      if (this.isCoverMode && this.nPagesPerWrapper > 1) {
        return (pageIndex === 0) ? 0 : Math.floor((pageIndex + 1) / this.nPagesPerWrapper);
      }
      return Math.floor(pageIndex / this.nPagesPerWrapper);
    },

    wrapperToPage: function(wrapperIndex) {
      if (this.isCoverMode && this.nPagesPerWrapper > 1) {
        return (wrapperIndex === 0) ? -1 : wrapperIndex * this.nPagesPerWrapper - 1;
      }
      return wrapperIndex * this.nPagesPerWrapper;
    },

    // gets the page index of the first page in the wrapper that the passed in page index is a part of
    adjustedPageIndex: function(pageIndex) {
      var wrapperIndex = this.pageToWrapper(pageIndex);
      return this.wrapperToPage(wrapperIndex);
    },

    numberOfWrappers: function() {
      var offset = (this.isCoverMode && this.nPagesPerWrapper > 1) ? 1 : 0;
      return Math.ceil((this.nPages + offset) / this.nPagesPerWrapper);
    },

    getPageData: function(pageIndex) {
      var me = this;

      var fitZoom = me.getFitPageZoom(pageIndex);
      var totalWidth = 0;
      var maxHeight = 0;
      var xShift = 0;
      var width, height;

      // get the fit page zoom width and height of the pages
      me.forEachPageInWrapper(pageIndex, function(i) {
        var page = me.doc.getPageInfo(i);
        var pageWidth = page.width * fitZoom;
        var pageHeight = page.height * fitZoom;

        if (pageIndex === i) {
          xShift = totalWidth;
          width = pageWidth;
          height = pageHeight;
        }

        totalWidth += pageWidth;

        if (pageHeight > maxHeight) {
          maxHeight = pageHeight;
        }
      });

      var snapLocation = me.getSnapLocation(0, 0, totalWidth, maxHeight);

      // get the offset to the page for fit page zoom
      var x = snapLocation.left + me.vWOffset + xShift;

      var y = snapLocation.top;

      // amount of scaling done by zooming
      var relativeScale = me.docViewer.getPageZoom(pageIndex) / fitZoom;

      return {
        // the offset from the edge of the page wrapper increases depending on how much the page scale has increased
        x: x * relativeScale,
        y: y * relativeScale,
        // how much the individual page is shifted relative to x
        xShift: xShift * relativeScale,
        // the combined dimensions of all the pages in the wrapper
        totalWidth: totalWidth * relativeScale,
        maxHeight: maxHeight * relativeScale,
        // the fit width and height of only the current page
        fitWidth: width,
        fitHeight: height
      };
    },

    setCurrentPage: function(pageIndex) {
      var me = this;

      me.transformOffset = null;
      // clear any transforms on the canvases
      if (me.c) {
        me.clearTransform(me.c.$e.find('canvas'));
      }

      me.setCurrentToMinZoom();
      if (me.zoomedWrapper) {
        me.zoomAbort();
      }

      // only close the edit popup if we are actually changing pages
      if (pageIndex !== me.currentPageIndex) {
        me.closeEditPopup();
      }

      me.currentPageIndex = pageIndex;
      me.updateCurrentZooms(me.currentPageIndex);

      var wrapperIndex = me.pageToWrapper(pageIndex);

      me.docViewer.removeContent();

      var vis = [];

      me.addPages(vis, wrapperIndex);

      me.c = me.createPageWrapper(wrapperIndex, 0);
      me.$viewer.append(me.c.$e);

      var forwardDirection = me.docViewer.getRightToLeftPages() ? -1 : 1;

      // if there should be a next page
      if (wrapperIndex < me.numberOfWrappers() - 1) {
        var nextWrapperIndex = wrapperIndex + 1;

        me.addPages(vis, nextWrapperIndex);

        me.n = me.createPageWrapper(nextWrapperIndex, forwardDirection * exports.document.body.clientWidth);
        me.$viewer.append(me.n.$e);
      } else {
        me.n = null;
      }

      // if there should be a previous page
      if (wrapperIndex > 0) {
        var prevWrapperIndex = wrapperIndex - 1;

        me.addPages(vis, prevWrapperIndex);

        me.p = me.createPageWrapper(prevWrapperIndex, -1 * forwardDirection * exports.document.body.clientWidth);
        me.$viewer.append(me.p.$e);
      } else {
        me.p = null;
      }

      me.docViewer.updateView(vis, pageIndex);

      me.$slider.val((pageIndex + 1)).slider('refresh');
    },

    cancelPageRenders: function() {
      var me = this;

      if (me.rerenderPages !== null) {
        me.rerenderPages = null;

        me.forEachPageInWrapper(me.currentPageIndex, function(i) {
          me.docViewer.stopPageRender(i);
        });
      }
    },

    onSwipe: function(evt) {
      var me = this;

      if (me.isInToolbar(evt.target) || me.isSliding || me.annotMode || me.isPinching || me.isZoomedIn() || me.recentlyZoomed || me.isWidgetTargetType(evt.target.type)) {
        return;
      }

      var rightToLeft = me.docViewer.getRightToLeftPages();
      var forwardDirection = rightToLeft ? -1 : 1;
      var forwardSwipe = rightToLeft ? 'swiperight' : 'swipeleft';
      var backwardSwipe = rightToLeft ? 'swipeleft' : 'swiperight';

      var direction;
      if (evt.type === backwardSwipe && me.p) {
        direction = -1;
        me.offsetSwipe--;
      } else if (evt.type === forwardSwipe && me.n) {
        direction = 1;
        me.offsetSwipe++;
      } else {
        return;
      }

      me.unZoomWrapper();

      var currentPageIndex = me.docViewer.getCurrentPage() - 1;
      var wrapperIndex = me.pageToWrapper(currentPageIndex) + me.offsetSwipe;
      var pageIndex = Math.max(0, me.wrapperToPage(wrapperIndex));
      me.currentPageIndex = pageIndex;
      me.updateCurrentZooms(me.currentPageIndex);

      var wpToRemove = null;
      var tmpWp = me.c;

      if (direction === 1) {
        me.c = me.n;
        wpToRemove = me.p;
      } else {
        me.c = me.p;
        wpToRemove = me.n;
      }

      me.vWOffset += -1 * forwardDirection * direction * exports.document.body.clientWidth;
      me.$viewerWrapper.stop();
      me.$viewerWrapper.addClass('animated');

      me.transform(me.$viewerWrapper, me.vWOffset, 0);

      me.vwxPos = me.vWOffset;

      var nextWrapperIndex = wrapperIndex + direction;
      var prevWrapperIndex = wrapperIndex - direction;

      // Remove the previous page.
      if (wpToRemove) {
        wpToRemove.$e.detach();

        // if a page is being removed then we should notify document viewer the visible pages have changed
        // but we also don't want to rerender yet
        me.docViewer.updateVisiblePages();
      }

      var wpToAdd = null;

      // Append the next page.
      if (nextWrapperIndex >= 0 && nextWrapperIndex < me.numberOfWrappers()) {
        var offset = forwardDirection * direction * exports.document.body.clientWidth;
        wpToAdd = me.createPageWrapper(nextWrapperIndex, offset);
      }

      if (direction === 1) {
        me.n = wpToAdd;
        me.p = tmpWp;

        if (me.n) {
          me.$viewer.append(me.n.$e);
        }
      } else {
        me.p = wpToAdd;
        me.n = tmpWp;

        if (me.p) {
          me.$viewer.prepend(me.p.$e);
        }
      }

      me.$slider.val(pageIndex + 1).slider('refresh');

      clearTimeout(me.swipeTimeout);
      me.swipeTimeout = setTimeout(function() {
        me.offsetSwipe = 0;

        var vis = [];
        me.addPages(vis, wrapperIndex);

        if (nextWrapperIndex >= 0 && nextWrapperIndex < me.numberOfWrappers()) {
          me.addPages(vis, nextWrapperIndex);
        }

        if (prevWrapperIndex >= 0 && prevWrapperIndex < me.numberOfWrappers()) {
          me.addPages(vis, prevWrapperIndex);
        }

        me.docViewer.updateView(vis, pageIndex);
      }, 250);
    },

    onSliderStart: function() {
      var me = this;

      me.isSliding = true;
      if (me.nPages !== 1) {
        me.$preview.css('opacity', '1');
        me.$preview.css('z-index', '9999');
      }
    },

    onSliderMove: function() {
      var me = this;

      if (me.isSliding === false) {
        return;
      }

      var pageNumber = me.$slider.get(0).value;
      var div = $('#textdiv');

      div.attr('data-i18n', 'mobile.thumbnailPageNumber');
      // need to use the data function instead of .attr('data-i18n-options') or else it will be cached and won't update
      div.data('i18n-options', {
        'current': pageNumber,
        'total': me.nPages
      });
      div.i18n();

      if (!me.hasThumbs) {
        return;
      }

      clearTimeout(me.getThumbnailTimeout);

      me.getThumbnailTimeout = setTimeout(function() {
        var pageIndex = me.$slider.get(0).value - 1;

        var thumbContainer = me.$thumbContainer.get(0);

        // try to cancel the last requested thumbnail
        if (me.lastRequestedThumbnail) {
          me.doc.cancelLoadThumbnail(me.lastRequestedThumbnail);
        }
        me.lastRequestedThumbnail = me.doc.loadThumbnailAsync(pageIndex, function(thumb) {
          var ratio, width, height;

          if (thumb.width > thumb.height) {
            ratio = thumb.width / 150;
            height = thumb.height / ratio;
            width = 150;
          } else {
            ratio = thumb.height / 150;
            width = thumb.width / ratio;
            height = 150;
          }

          thumb.style.width = width + 'px';
          thumb.style.height = height + 'px';

          while (thumbContainer.hasChildNodes()) {
            thumbContainer.removeChild(thumbContainer.firstChild);
          }

          me.$thumbContainer.css('width', width + 'px');
          me.$thumbContainer.css('height', height + 'px');

          me.$preview.css('width', width + 'px');
          me.$preview.css('height', height + 17 + 'px');

          me.$thumbContainer.prepend(thumb);
          me.lastRequestedThumbnail = null;
        });
      }, 15);
    },

    onSliderEnd: function() {
      var me = this;

      if (!me.isSliding) {
        return;
      }
      me.isSliding = false;

      var pageNumber = me.$slider.get(0).value;
      if (pageNumber !== me.docViewer.getCurrentPage()) {
        me.setCurrentPage(pageNumber - 1);
      }

      me.$preview.css('opacity', '0');
      me.$preview.css('z-index', '0');
      me.$slider.slider('refresh');
    },

    getTapHotSpotWidth: function() {
      // make sure the tap navigation region is never more than 1/4 of the screen width
      var defaultWidth = exports.document.body.clientWidth / 4;
      return (defaultWidth > 80) ? 80 : defaultWidth;
    },

    onTap: function(evt) {
      var me = this;
      if (me.annotQuickCreate) {
        me.endAnnotationQuickMode();
      }

      me.showAnnotationEditPopup();

      if (evt.target.type === 'text' || evt.target.type === 'number') {
        // these are text inputs, don't do anything
        return true;
      }
      var docX = exports.document.body.clientWidth;
      var pageX = evt.pageX;
      var pageY = evt.pageY;

      var hotspotWidth = me.getTapHotSpotWidth();
      var menuBarBufferHeight = 40;

      // don't check for hotspot tapping if we're in annotation mode because the triggered swipe is going to be blocked anyway
      // also if we return false it will stop the event from propagating to the click handler on the stroke color picker
      if (!this.annotMode) {
        // hotspot tapping
        if (pageY > menuBarBufferHeight) {
          if (pageX < hotspotWidth) {
            me.$wrapper.trigger('swiperight');
            return false; // prevent event bubbling
          } else if ((docX - pageX) < hotspotWidth) {
            me.$wrapper.trigger('swipeleft');
            return false; // prevent event bubbling
          }
        }
      } else if (me.$annotCreateMenuContext.is(':visible')) {
        // always show menu when in annot mode with the annot toolbar shown
        me.reshowMenu();
      }

      return true;
    },

    onDoubleTap: function(evt) {
      if (this.annotMode) {
        return;
      }

      var me = this;

      var touchLocation;
      if (evt.originalEvent.changedTouches) {
        touchLocation = {
          x: evt.originalEvent.changedTouches[0].clientX,
          y: evt.originalEvent.changedTouches[0].clientY
        };
      } else {
        touchLocation = {
          x: evt.originalEvent.clientX,
          y: evt.originalEvent.clientY
        };
      }

      var hotspotWidth = me.getTapHotSpotWidth();
      if (touchLocation.x < hotspotWidth || (exports.document.body.clientWidth - touchLocation.x) < hotspotWidth) {
        // we are tap swiping so don't try to zoom into the page
        return;
      }

      if (me.offsetSwipe !== 0) {
        // if we are swiping quickly it's possible to trigger a double tap
        // so we should return here if the user is swiping
        return;
      }

      me.newScale = 1;
      me.oldScale = 1;
      var DOUBLE_TAP_ZOOM_SCALE = 3;

      var originalPageZoom = me.docViewer.getPageZoom(me.currentPageIndex);
      var newPageZoom = DOUBLE_TAP_ZOOM_SCALE * me.getFitPageZoom(me.currentPageIndex);

      // if we should zoom in
      if (originalPageZoom < newPageZoom) {
        var offset = me.c.$e.offset();
        var width = me.c.$e.width();
        var height = me.c.$e.height();

        // calculate the location of the touch event on the page where (0,0) is at the center of the page
        var touchLocX = (touchLocation.x - offset.left) - width / 2;
        var touchLocY = (touchLocation.y - offset.top) - height / 2;
        // get the coordinates of the event for the new scaled page
        var scaledLocX = touchLocX * (newPageZoom / originalPageZoom);
        var scaledLocY = touchLocY * (newPageZoom / originalPageZoom);
        // calculate the amount that the zoomed page needs to be shifted so that the same part of the page is
        // under the touch location after it has been zoomed
        var offsetX = touchLocX - scaledLocX;
        var offsetY = touchLocY - scaledLocY;

        me.c.tX += offsetX;
        me.c.tY += offsetY;

        // don't want to animate this zoom
        me.setZoomLevel(newPageZoom, false);
      } else {
        me.setZoomLevel(me.minZooms[me.currentPageIndex], false);
      }
      // don't let the second tap be triggered
      evt.stopImmediatePropagation();
    },

    isWidgetTargetType: function(type) {
      return type === 'textarea' || type === 'checkbox' || type === 'button' || type === 'submit';
    },

    isInToolbar: function(ele) {
      return $(ele).closest('#pageHeader, #pageFooter').length > 0;
    },

    /**
     * Returns whether the current page is zoomed in or not
     * @method MobileReaderControl#isZoomedIn
     * @return {boolean} Whether the current page is zoomed in or not
     */
    isZoomedIn: function() {
      var currentZoom = this.docViewer.getPageZoom(this.currentPageIndex);
      var fitPageZoom = this.minZooms[this.currentPageIndex];
      return currentZoom > fitPageZoom && !fCmp(currentZoom, fitPageZoom);
    },

    // if these are different then the page is being scrolled horizontally
    isPageScrolled: function() {
      return this.vwxPos !== this.vWOffset;
    },

    onTapHold: function() {
      if (this.docViewer.getToolMode() === this.toolModeMap[ToolMode.Pan] && !this.isReadOnly() && this.enableAnnotations) {
        if (window.document.body.clientWidth <= 640) {
          this.$annotQuickMenuButtons.hide();
          this.$annotQuickMenuGrid.show();
        } else {
          this.$annotQuickMenuButtons.show().controlgroup();
          this.$annotQuickMenuGrid.hide();
        }

        this.$annotQuickMenu.popup('open', this.touchedPoint);
      }
    },

    // innerWidth and innerHeight can be incorrect when resize event is hit.
    // Always correct in orientationChange event but orientationChange event almost
    // always has incorrect values for innerWidth and innerHeight on some Android devices
    // Resize event seems to always have correct values
    onResize: function() {
      if (this.isIOS && window.top !== window) {
        // work around issue where the window size doesn't get properly updated on iOS
        // when the screen is rotated and WebViewer is inside an iframe
        document.body.style.display = 'none';
        clearTimeout(this.orientationChangeTimeout);
        this.orientationChangeTimeout = setTimeout(function() {
          document.body.style.display = 'block';
        }, 250);
      }

      if (!this.docViewer.getDocument()) {
        return;
      }

      // close the popups so they aren't out of position
      this.closeEditPopup();
      this.$annotQuickMenu.popup('close');
      this.$signaturePopup.popup('close');

      var me = this;
      var screenWidth = document.body.clientWidth;
      var screenHeight = document.body.clientHeight;

      var heightChanged = screenHeight !== me.lastHeight;
      var widthChanged = screenWidth !== me.lastWidth;

      // if the height has gotten smaller and the width hasn't changed then we can assume that the virtual keyboard
      // being shown has caused the resize. In this case if we are in the main menu then we should not perform a resize
      // so that the form inputs can be used. We do want to resize if we are searching as this will cause issues with the placement of the page
      var allowHeightChangeResize = me.$defaultMenuContext.css('display') !== 'none' || me.$annotCreateMenuContext.css('display') !== 'none';

      // if the virtual keyboard is being shown then possibly shift the view so that a focused input element will be visible as the user types
      if ((screenHeight < me.lastHeight) && !widthChanged && allowHeightChangeResize) {
        var remainingWindowHeight = (me.lastHeight - screenHeight) * 0.7;

        var top = parseFloat(document.activeElement.parentNode.style.top) * window.utils.getCanvasMultiplier();
        var pageTransform = document.activeElement.parentNode.parentNode.parentNode.style.transform;
        var yTransform = parseFloat(pageTransform.match(/translate3d\([-\d.px]+,([-\d\s.px]+),[-\d\s.px]+\)/)[1]);
        top += yTransform;

        if (top > remainingWindowHeight) {
          top *= 0.6;

          me.$wrapper.css('transform', 'translate(0, -' + top + 'px)');
        }
      } else if (screenHeight > me.lastHeight) {
        me.$wrapper.css('transform', '');
      }

      if (heightChanged && !widthChanged && allowHeightChangeResize) {
        me.lastHeight = screenHeight;
        return;
      }

      // only continue if the dimensions have changed since the last resize
      // opera mobile often seems to report the same dimensions on an orientation change so just always redraw
      // also if MobileReaderControl is iframed, we need to redraw
      var dimensionsChanged = widthChanged || heightChanged;
      if (!dimensionsChanged && !window.opera) {
        return;
      }

      // makes sure that the side dialogs will be positioned correctly in iOS
      window.scrollTo(0, 0);

      me.lastWidth = screenWidth;
      me.lastHeight = screenHeight;

      clearTimeout(me.swipeTimeout);

      me.setPageMode();
      me.setMinZooms();
      me.updateCurrentZooms(me.currentPageIndex);

      var position = (exports.document.body.clientWidth - me.$preview.width()) / 2;
      me.$preview.css('left', position + 'px');
      me.setCurrentPage(me.currentPageIndex);

      // sometimes the fixed menu doesn't get reshown when changing orientations and a note is open
      // so we should show the menu if it's hidden
      if (me.annotMode) {
        me.reshowMenu();
      }
    },

    onOrientationChange: function(evt) {
      // on the initial load if there is an orientation change it seems like there is no resize event
      // triggered, causing the page to be displayed incorrectly so we manually call it here
      this.onResize(evt);
    },

    restartTouchTimeout: function() {
      var me = this;

      clearTimeout(me.touchTimeout);
      me.touchTimeout = setTimeout(_(me.onTouchEnd).bind(me), 1000, {
        originalEvent: {
          touches: []
        }
      });
    },

    onTouchStart: function(evt) {
      var me = this;

      me.restartTouchTimeout();
      me.docViewer.trigger('PAUSE');
      me.c.$e.removeClass('animated');

      // Only pinch if dealing with two or more fingers
      if (evt.originalEvent.touches.length > 1) {
        if (me.isPageScrolled()) {
          return;
        }
        me.isPinching = true;

        var touch0 = evt.originalEvent.touches[0];
        var touch1 = evt.originalEvent.touches[1];

        var x1 = touch1.clientX;
        var y1 = touch1.clientY;
        var x0 = touch0.clientX;
        var y0 = touch0.clientY;

        me.oldPinchCenter.x = (x0 + x1) / 2;
        me.oldPinchCenter.y = (y0 + y1) / 2;

        me.oldDist = Math.sqrt((x0 - x1) * (x0 - x1) + (y0 - y1) * (y0 - y1));
      } else if (evt.originalEvent.touches.length === 1) {
        me.oldTouch.x = evt.originalEvent.touches[0].clientX;
        me.oldTouch.y = evt.originalEvent.touches[0].clientY;
      }
    },

    transform: function($e, x, y, scale) {
      var me = this;

      // css doesn't support exponential notation so set to zero if we're sufficiently close
      if (fCmp(x, 0)) {
        x = 0;
      }

      if (fCmp(y, 0)) {
        y = 0;
      }

      if (me.useZoomFallback) {
        // zoom uses top left as the transform origin so we need to compensate when setting the top/left
        var finalScale = _.isUndefined(scale) ? 1 : scale;

        var width = $e.width();
        var widthDiff = (width / 2) - (width / 2 * finalScale);

        var height = $e.height();
        var heightDiff = (height / 2) - (height / 2 * finalScale);

        var centerZoomX = (x + widthDiff) * (1 / finalScale);
        var centerZoomY = (y + heightDiff) * (1 / finalScale);

        $e.css('top', centerZoomY);
        $e.css('left', centerZoomX);

        // iOS doesn't like much memory going to the GPU and using zoom instead of "transform: scale" avoids this
        if (!_.isUndefined(scale)) {
          $e.css('zoom', scale);
        }
      } else if (me.useTransformFallback) {
        // some older browsers don't support css transforms or there are issues with them so revert to setting coordinates
        $e.css('top', y);
        $e.css('left', x);

        if (!_.isUndefined(scale)) {
          $e.css('transform', 'scale(' + scale + ')');
        }
      } else {
        // var _2dstr = 'translate(' + x + 'px,' + y + 'px)';
        var _3dstr = 'translate3d(' + x + 'px,' + y + 'px, 0px)';

        if (!_.isUndefined(scale)) {
          var scaleStr = ' scale(' + scale + ')';
          // _2dstr += scaleStr;
          _3dstr += scaleStr;
        }

        if (me.androidBrowser) {
          // see http://code.google.com/p/android/issues/detail?id=31862
          $e.css('transform', _3dstr);
        } else {
          // use 3d transforms for all browsers by default, this can be changed to 2d transforms if desired
          $e.css('transform', _3dstr);
        }
      }
    },

    clearTransform: function($canvases) {
      $canvases.css({
        'transform': '',
        'left': '',
        'top': '',
        'zoom': ''
      });
    },

    onTouchMove: function(evt) {
      var me = this;

      me.restartTouchTimeout();

      var touch0;
      var touch1;
      // don't pan in annotation create mode
      if (me.isInToolbar(evt.target) || me.isSliding || me.annotMode || me.isWidgetTargetType(evt.target.type)) {
        return;
      }

      var width = me.c.$e.width();
      var height = me.c.$e.height();

      if (evt.originalEvent.touches.length === 1 && !me.isPinching) {
        touch0 = evt.originalEvent.touches[0];
        me.$viewerWrapper.removeClass('animated');
        var scrollX = me.oldTouch.x - touch0.clientX;
        var scrollY = me.oldTouch.y - touch0.clientY;

        if (!me.isZoomedIn()) {
          // Perform horizontal scrolling.

          me.vwxPos -= scrollX;
          me.transform(me.$viewerWrapper, me.vwxPos, 0);
        } else {
          // Scrolled the zoomed in wrapper.

          me.c.tY -= scrollY;
          me.c.tX -= scrollX;
          me.transform(me.c.$e, me.c.tX, me.c.tY, me.newScale);

          me.shouldRerender = true;
          me.cancelPageRenders();
        }

        me.oldTouch.x = touch0.clientX;
        me.oldTouch.y = touch0.clientY;
      } else if (evt.originalEvent.touches.length > 1) {
        if (me.isPageScrolled()) {
          return;
        }

        touch0 = evt.originalEvent.touches[0];
        touch1 = evt.originalEvent.touches[1];

        var x1 = touch1.clientX;
        var y1 = touch1.clientY;
        var x0 = touch0.clientX;
        var y0 = touch0.clientY;

        me.newDist = Math.sqrt((x0 - x1) * (x0 - x1) + (y0 - y1) * (y0 - y1));
        me.distRatio = me.newDist / me.oldDist;

        // Find pinch center after each touch me.vWOffset event with two fingers
        var newPinchCenter = {
          x: (x0 + x1) / 2,
          y: (y0 + y1) / 2
        };

        me.newScale = me.distRatio * me.oldScale;
        var actualZoom = me.newScale * me.currentPageZoom;

        if (actualZoom > me.currentPageMaxZoom) {
          me.newScale = me.currentPageMaxZoom / parseFloat(me.currentPageZoom);
        }

        // Relative to viewport.
        var pcMidX = me.c.tX + me.vWOffset + width / 2;
        var pcMidY = me.c.tY + height / 2;

        var pcCenter = {
          x: pcMidX,
          y: pcMidY
        };

        var scX = pcCenter.x - (me.newScale / me.oldScale) * (pcCenter.x - me.oldPinchCenter.x);
        var scY = pcCenter.y - (me.newScale / me.oldScale) * (pcCenter.y - me.oldPinchCenter.y);

        var scaledOldPinchCenter = {
          x: scX,
          y: scY
        };

        // Differences in the two pinch centers.
        var offsetX = newPinchCenter.x - scaledOldPinchCenter.x;
        var offsetY = newPinchCenter.y - scaledOldPinchCenter.y;
        me.c.tX += offsetX;
        me.c.tY += offsetY;

        me.transform(me.c.$e, me.c.tX, me.c.tY, me.newScale);

        // Update old values
        me.oldScale = me.newScale;
        me.oldDist = me.newDist;
        me.oldPinchCenter.x = newPinchCenter.x;
        me.oldPinchCenter.y = newPinchCenter.y;

        me.shouldRerender = true;
        me.cancelPageRenders();
      }
    },

    onTouchEnd: function(evt, animate) {
      var me = this;

      if (evt.originalEvent.touches.length === 0) {
        // We are doing this to work around an issue in Android browsers where the window size will briefly be incorrect
        // when the virtual keyboard is hiding. So we are blurring it first, and executing re-rendering functions after
        // a delay so that their positions are calculated based on correct window size.
        var timeoutDelay = 0;
        if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
          timeoutDelay = 300;
          document.activeElement.blur();
        }

        setTimeout(function() {
          clearTimeout(me.touchTimeout);

          var newPageZoom = me.newScale * me.currentPageZoom;
          var smallerThanPage = false;

          // New zoom is less than fit page zoom.
          // So, floor it at fit page zoom.
          if (newPageZoom < me.currentPageMinZoom) {
            newPageZoom = me.currentPageMinZoom;
            me.newScale = newPageZoom / parseFloat(me.currentPageZoom);
            me.oldScale = me.newScale;
            smallerThanPage = true;
          }

          me.startRerender(newPageZoom);

          if (_.isUndefined(animate)) {
            animate = true;
          }
          me.snapBack(smallerThanPage, animate);

          if (me.shouldRerender) {
            me.clearPages(me.c.$e);
            var zoomedPages = me.getVisibleZoomedPages();

            // check if we can skip rendering any of the pages because they aren't visible
            if (zoomedPages.length < me.nPagesPerWrapper) {
              me.pagesRendering = zoomedPages;
            }
            // it's important that we have the current page(s) at the beginning of the visible pages array
            // because these are the ones we want to render first
            me.docViewer.updateView();
          }

          var vwLeft = me.vwxPos;

          var wrapperIndex = me.pageToWrapper(me.currentPageIndex);

          // Swipe when scrolling too far to one side.
          if (-vwLeft + me.vWOffset > exports.document.body.clientWidth / 2 && wrapperIndex < me.numberOfWrappers() - 1) {
            me.$wrapper.trigger('swipeleft');
            evt.stopImmediatePropagation();
          } else if (vwLeft - me.vWOffset > exports.document.body.clientWidth / 2 && wrapperIndex > 0) {
            me.$wrapper.trigger('swiperight');
            evt.stopImmediatePropagation();
          } else {
            // Return to original X position after horizontal scrolling.
            me.$viewerWrapper.addClass('animated');

            // Only apply translate if we have actually moved. Page redraws everytime this is applied.
            if (me.vwxPos !== me.vWOffset) {
              me.transform(me.$viewerWrapper, me.vWOffset, 0);
            }
            me.vwxPos = me.vWOffset;
          }

          me.isPinching = false;
          me.shouldRerender = false;
          me.docViewer.trigger('RESUME');
        }, timeoutDelay);
      }
    },

    startRerender: function(newPageZoom) {
      var me = this;

      if (me.shouldRerender) {
        me.pagesRendering = [];
        me.forEachPageInWrapper(me.currentPageIndex, function(idx) {
          me.docViewer.setPageZoom(idx, newPageZoom);
          me.pagesRendering.push(idx);
        });

        // clone the auxiliary canvas so it can be displayed while rerendering the annotations
        var auxiliaryCanvas = me.c.$e.find('.auxiliary');
        var auxiliaryClone = auxiliaryCanvas[0].cloneNode(true);
        auxiliaryClone.className = 'auxiliaryClone';
        var ctx = auxiliaryClone.getContext('2d');
        ctx.drawImage(auxiliaryCanvas[0], 0, 0);
        me.c.$e.append(auxiliaryClone);

        auxiliaryCanvas.hide();

        me.rerenderPages = function(progressive) {
          me.rerenderPages = null;

          if (fCmp(newPageZoom, me.currentPageMinZoom)) {
            me.zoomedWrapper = null;
            me.transformOffset = null;
          }

          me.c.$e.removeClass('animated');

          var prevWidth = parseFloat(me.c.$e[0].style.width);
          var prevHeight = parseFloat(me.c.$e[0].style.height);

          var left = me.c.tX - (me.newScale * prevWidth) / 2 + prevWidth / 2;
          var top = me.c.tY - (me.newScale * prevHeight) / 2 + prevHeight / 2;

          // translate and resize the pagewrapper
          me.c.tX = left;
          me.c.tY = top;
          me.transform(me.c.$e, left, top, 1);

          me.c.$e.width(prevWidth * me.newScale);
          me.c.$e.height(prevHeight * me.newScale);

          var pageIndexes = [];
          me.c.$e.find('[id^=pageContainer]').each(function() {
            var width = parseFloat(this.style.width);
            var height = parseFloat(this.style.height);

            var $this = $(this);
            // ids are of the form pageContainer# so we want to slice off the number to get the page index
            var pageIndex = parseInt($this.attr('id').slice('pageContainer'.length), 10);
            pageIndexes.push(pageIndex);

            $this.width(width * me.newScale).height(height * me.newScale);
            $this.find('[id^=thumb]').width(width * me.newScale).height(height * me.newScale);

            var pageData = me.getPageData(pageIndex);
            me.transform($this, pageData.x, pageData.y);
          });

          // translate the canvas to the edge of the viewport
          me.transform(me.c.$e.children('canvas'), -left - me.vWOffset, -top);
          me.transform($(me.canvasToAppend), -left - me.vWOffset, -top);

          var sortedPages = pageIndexes.sort(function(a, b) {
            return a - b;
          });
          var lastPage = sortedPages[sortedPages.length - 1];

          me.appendCanvas(me.c.$e, lastPage, progressive);
          me.c.$e.find('.auxiliary').show();

          me.c.$e.find('[id^=pageWidgetContainerClone]').remove();
          me.c.$e.find('.auxiliaryClone').remove();

          me.currentPageZoom = newPageZoom;
          me.newScale = 1;
          me.oldScale = me.newScale;
          me.snapComplete = false;
          me.shouldRerender = false;
        };

        if (!fCmp(newPageZoom, me.currentPageMinZoom)) {
          me.zoomedWrapper = me.c;
        }

        me.recentlyZoomed = true;
        clearTimeout(me.zoomTimeout);
        me.zoomTimeout = setTimeout(function() {
          me.recentlyZoomed = false;
        }, 500);
      }
    },

    getSnapLocation: function(left, top, width, height) {
      var me = this;
      var offset = -me.vWOffset;

      // Snap to bottom.
      if (top < 0 && top + height <= exports.document.body.clientHeight) {
        // Line up pc with the bottom of the viewport.
        top = exports.document.body.clientHeight - height;
      }
      // Snap to top.
      if (top + height > exports.document.body.clientHeight && top > 0) {
        // Line up pc with the top of the viewport.
        top = 0;
      }
      // Snap to right.
      if (left < offset && left + width <= (exports.document.body.clientWidth + offset)) {
        // Line up pc with the right of the viewport.
        left = offset + exports.document.body.clientWidth - width;
      }
      // Snap to left.
      if (left + width > offset + exports.document.body.clientWidth && left > offset) {
        // Line up pc with the left of the viewport.
        left = offset;
      }
      // Center top and left if smaller than fit page.
      if (height <= exports.document.body.clientHeight) {
        top = (exports.document.body.clientHeight - height) / 2;
      }
      if (width <= exports.document.body.clientWidth) {
        left = offset + (exports.document.body.clientWidth - width) / 2;
      }

      return {
        top: top,
        left: left
      };
    },

    snapBack: function(smallerThanPage, animate) {
      // on iOS when the virtual keyboard if we select a form field and the virtual keyboard becomes visible it can scroll the page
      // in this case we don't want to snap back
      // in iOS7 in landscape mode the scroll top value will often be 20 which is a bug!
      // For now it's simplest just to explicitly check for 20
      var scrollAmount = $(window).scrollTop();
      var isScrolled = scrollAmount > 1 && scrollAmount !== 20;

      // on android browsers we don't want to snap back if we are selecting input fields because
      // the virtual keyboard will be shown which causes the window height to change
      if (isScrolled || (this.isAndroid && $(document.activeElement).is('textarea, input'))) {
        return;
      }

      var me = this;
      var width = parseFloat(me.c.$e.get(0).style.width);
      var height = parseFloat(me.c.$e.get(0).style.height);

      var owidth = width;
      var oheight = height;

      var left = me.c.tX - (me.newScale * owidth) / 2 + owidth / 2;
      var top = me.c.tY - (me.newScale * oheight) / 2 + oheight / 2;

      width *= me.newScale;
      height *= me.newScale;

      var firstPageInWrapper = Math.max(0, me.adjustedPageIndex(me.currentPageIndex));
      if (me.docViewer.getRightToLeftPages()) {
        if (!me.isCoverMode || firstPageInWrapper > 0) {
          firstPageInWrapper = Math.min(firstPageInWrapper + me.nPagesPerWrapper - 1, me.nPages - 1);
        }
      }

      var pageData = me.getPageData(firstPageInWrapper);

      // use the x and y offsets of the page relative to the wrapper to calculate where the page would snap to if
      // it was not inside the wrapper
      var pt = me.getSnapLocation(left + pageData.x, top + pageData.y, pageData.totalWidth, pageData.maxHeight);

      // after getting where the page would snap to we need to subtract the page offsets so that we get the location that
      // the wrapper needs to be at
      pt.left -= pageData.x;
      pt.top -= pageData.y;

      var oldtX = me.c.tX;
      var oldtY = me.c.tY;

      me.c.tX = pt.left + (me.newScale * owidth) / 2 - owidth / 2;
      me.c.tY = pt.top + (me.newScale * oheight) / 2 - oheight / 2;

      var willNotAnimate = !animate || (fCmp(oldtX, me.c.tX) && fCmp(oldtY, me.c.tY) && !smallerThanPage);
      if (willNotAnimate) {
        // No animation will occur so snap is completed immediately
        me.snapComplete = true;
      } else {
        var animEnd = function() {
          me.snapComplete = true;
          if (!me.pagesRendering.length && me.rerenderPages) {
            me.rerenderPages();
          }
          me.c.$e.get(0).removeEventListener('webkitTransitionEnd', animEnd, false);
          me.c.$e.get(0).removeEventListener('transitionend', animEnd, false);
        };
        // TODO: feature detection for correct transition event
        me.c.$e.get(0).addEventListener('webkitTransitionEnd', animEnd, false);
        me.c.$e.get(0).addEventListener('transitionend', animEnd, false);

        me.c.$e.addClass('animated');
      }

      me.transform(me.c.$e, me.c.tX, me.c.tY, me.newScale);

      me.transformOffset = {
        left: left,
        top: top
      };
    },

    getVisibleZoomedPages: function() {
      var me = this;

      var pageIndexes = [];
      var page;

      var viewportTop = exports.pageYOffset;
      var viewportBottom = viewportTop + exports.document.body.clientHeight;
      var viewportLeft = exports.pageXOffset;
      var viewportRight = viewportLeft + exports.document.body.clientWidth;

      me.forEachPageInWrapper(me.currentPageIndex, function(pageIndex) {
        page = me.doc.getPageInfo(pageIndex);

        var pt1 = me.displayMode.pageToWindowNoRotate({
          x: 0,
          y: 0
        }, pageIndex);
        var pt2 = me.displayMode.pageToWindowNoRotate({
          x: page.width,
          y: page.height
        }, pageIndex);

        if ((pt1.x < pt2.x ? pt1.x : pt2.x) < viewportRight
                    && (pt1.x < pt2.x ? pt2.x : pt1.x) > viewportLeft
                    && (pt1.y < pt2.y ? pt1.y : pt2.y) < viewportBottom
                    && (pt1.y < pt2.y ? pt2.y : pt1.y) > viewportTop) {
          pageIndexes.push(pageIndex);
        }
      }, true);
      return pageIndexes;
    },

    searchText: function(pattern, searchUp) {
      var pageResults = [];

      var me = this;
      if (pattern !== '') {
        var mode = me.docViewer.SearchMode.e_page_stop | me.docViewer.SearchMode.e_highlight;
        if (searchUp) {
          mode |= me.docViewer.SearchMode.e_search_up;
        }

        me.docViewer.textSearchInit(pattern, mode, false,
          // onSearchCallback
          function(result) {
            if (result.resultCode === Text.ResultCode.e_found) {
              pageResults.push(result.page_num);

              me.docViewer.displaySearchResult(result, _(me.jumpToFound).bind(me));
            } else if (result.resultCode === Text.ResultCode.e_done) {
              me.docViewer.trigger('notify', 'endOfDocumentSearch');
            }
          });
      }
    },

    fullSearch: function(pattern, searchUp) {
      var me = this;

      var pageResults = [];
      if (pattern !== '') {
        var mode = me.docViewer.SearchMode.e_page_stop | me.docViewer.SearchMode.e_highlight;
        if (searchUp) {
          mode |= me.docViewer.SearchMode.e_search_up;
        }

        me.docViewer.textSearchInit(pattern, mode, true,
          // onSearchCallback
          function(result) {
            if (result.resultCode === Text.ResultCode.e_found) {
              var pageIndex = result.page_num;
              pageResults.push(result.page_num);

              me.docViewer.displaySearchResult(result, function() {
                me.jumpToFound(pageIndex, result.quads);
              });
            } else if (result.resultCode === Text.ResultCode.e_done) {
              alert(i18n.t('endOfDocument'));
            }
          });
      }
    },

    jumpToFound: function(pageIndex, quads) {
      var me = this;

      if (me.currentPageIndex !== pageIndex) {
        me.setCurrentPage(pageIndex);
      }

      // don't align if we're at fit page zoom
      if (me.currentPageZoom === me.getFitPageZoom(me.currentPageIndex)) {
        return;
      }

      if (quads.length > 0) {
        var firstPoints = quads[0].getPoints();
        // x4y4 is top-left
        // x2y2 is bot-right
        var quadsTop = firstPoints.y4;
        var quadsLeft = firstPoints.x4;
        var quadsBot = firstPoints.y2;
        var quadsRight = firstPoints.x2;
        for (var i = 1; i < quads.length; i++) {
          var points = quads[i].getPoints();

          if (points.x4 < quadsLeft) {
            quadsLeft = points.x4;
          }
          if (points.y4 < quadsTop) {
            quadsTop = points.y4;
          }
          if (points.x2 > quadsRight) {
            quadsRight = points.x2;
          }
          if (points.y2 > quadsBot) {
            quadsBot = points.y2;
          }
        }

        var viewportTop = exports.pageYOffset;
        var viewportBottom = viewportTop + document.documentElement.clientHeight;
        var viewportLeft = exports.pageXOffset;
        var viewportRight = viewportLeft + document.documentElement.clientWidth;

        var wPt1 = this.displayMode.pageToWindow({
          x: quadsLeft,
          y: quadsTop
        }, pageIndex);
        var wPt2 = this.displayMode.pageToWindow({
          x: quadsRight,
          y: quadsBot
        }, pageIndex);

        var topLeftPt = {
          x: (wPt1.x < wPt2.x ? wPt1.x : wPt2.x),
          y: (wPt1.y < wPt2.y ? wPt1.y : wPt2.y)
        };
        var botRightPt = {
          x: (wPt1.x > wPt2.x ? wPt1.x : wPt2.x),
          y: (wPt1.y > wPt2.y ? wPt1.y : wPt2.y)
        };

        // Check that all quads are entirely visible.
        if (topLeftPt.x < viewportLeft || topLeftPt.y < viewportTop || botRightPt.x > viewportRight || botRightPt.y > viewportBottom) {
          // Quad not visible.
          var pageQuadWidth = botRightPt.x - topLeftPt.x;
          var pageQuadHeight = botRightPt.y - topLeftPt.y;

          var cLeft = me.c.tX;
          var cTop = me.c.tY;

          var left = cLeft - topLeftPt.x + parseInt(exports.document.body.clientWidth / 2, 10) - pageQuadWidth / 2;
          var top = cTop - topLeftPt.y + parseInt(exports.document.body.clientHeight / 2, 10) - pageQuadHeight / 2;

          var width = me.c.$e.width();
          var height = me.c.$e.height();

          var offset = -me.vWOffset;

          // If pc leaves greyspace.
          if (top < 0 && top + height <= exports.document.body.clientHeight) {
            // Line up pc with the bottom of the viewport.
            top = exports.document.body.clientHeight - height;
          }
          if (top + height > exports.document.body.clientHeight && top > 0) {
            // Line up pc with the top of the viewport.
            top = 0;
          }
          if (left < offset && left + width <= (exports.document.body.clientWidth + offset)) {
            // Line up pc with the right of the viewport.
            left = offset + exports.document.body.clientWidth - width;
          }
          if (left + width > offset + exports.document.body.clientWidth && left > offset) {
            // Line up pc with the left of the viewport.
            left = offset;
          }

          me.c.tX = left;
          me.c.tY = top;

          me.shouldRerender = true;
          me.cancelPageRenders();

          // simulate the touch end event so that the page will be rerendered
          me.onTouchEnd({
            originalEvent: {
              touches: []
            }
          });
        }
      }
    },

    onBookmarkSelect: function(evt) {
      var me = this;

      var pageData = evt.currentTarget.getAttribute('data-bookmark-page');
      if (pageData !== null) {
        // for now check if the page data is a number otherwise assume it's a link
        // should switch to using displayBookmark instead
        var pageNum = parseInt(pageData, 10);
        if (!isNaN(pageNum)) {
          me.setCurrentPage(pageNum - 1);
        } else {
          window.open(pageData);
        }
      } else {
        // no page number was selected, probably a navigation event
        var bookmarkLevel = evt.currentTarget.getAttribute('data-bookmark-level');
        me.createBookmarkList(bookmarkLevel);
        var $bookmarkList = me.$bookmarkList;
        $bookmarkList.listview('refresh');
      }
    },

    onToolMouseDown: function(evt) {
      this.closeEditPopup();

      this.touchedPoint = {
        x: evt.pageX,
        y: evt.pageY
      };

      if (this.docViewer.getToolMode() !== this.toolModeMap[ToolMode.TextSelect]) {
        return;
      }

      // in iOS jquery mobile will hide the header and footer when the keyboard is open
      // if we're in annotation mode then tap toggling is disabled so we need to reshow
      // the bars if we're in text select mode and we have touched the page
      this.reshowMenu();

      return false;
    },

    onToolMouseUp: function(evt) {
      this.showAnnotationEditPopup(evt);

      if (this.docViewer.getToolMode() !== this.toolModeMap[ToolMode.TextSelect]) {
        return;
      }

      // select clipboard
      var clipboard = this.$clipboard.get(0);
      clipboard.focus();
      clipboard.selectionStart = 0;
      clipboard.setSelectionRange(0, this.$clipboard.get(0).value.length);
    },

    setTextareaReadonly: function($textarea, readonly) {
      $textarea.prop('readonly', readonly);
    },

    showAnnotationList: function() {
      var me = this;

      var $annotContainer = $('.annotContainer');
      $annotContainer.find('.annotlist-editButton').show();
      $annotContainer.find('.annotlist-replyButton').show();
      $annotContainer.find('.annotlist-deleteButton').hide();
      $annotContainer.find('.annotlist-doneButton').hide();
      $annotContainer.find('.annotlist-viewButton').show();


      this.$annotList.children('li').each(function() {
        var $this = $(this);
        // make sure all note text is shown but disabled
        $this.show();
        var $annotContainer = $this.find('.annotContainer');
        $annotContainer.attr('data-mode', 'list').show();

        var $textarea = $annotContainer.find('textarea');
        $textarea.removeClass('ui-focus').hide();

        me.setTextareaReadonly($textarea, true);
      });

      if (me.annotationManager.getAnnotationsList().length > 0) {
        me.$noAnnotations.hide();
      } else {
        me.$noAnnotations.show();
      }

      this.$annotList.attr('data-last-mode', 'list');
      this.refreshAnnotationList();
    },

    getAnnotationNoteContainer: function(annotation, root) {
      var me = this;

      function getSelector(annot) {
        return 'li[data-id="' + annot.Id + '"]';
      }

      root = root || annotation;
      var container = me.$annotList.children(getSelector(root));
      if (annotation === root) {
        return container;
      }

      // if the annotation is not at the root it could be in any number of nested levels
      // so use find instead of children
      return container.find(getSelector(annotation));
    },

    createAnnotationListItem: function(annotation, parent, root) {
      var me = this;

      var $li = $('<li>')
        .attr('data-id', annotation.Id)
        .addClass('needstouch');
      $li.click(function(e) {
        var mode = me.$annotList.attr('data-mode');
        if (mode !== 'single') {
          if ($(e.target).hasClass('jumpToPage')) {
            me.annotationManager.deselectAllAnnotations();
            me.annotationManager.selectAnnotation(annotation);

            me.changeVisiblePage('viewerPage');
            me.showAnnotationEditPopup();
          }
        }
      });
      var parentContainer = root ? me.getAnnotationNoteContainer(parent, root) : me.$annotList;

      $li.data('pagenumber', annotation.PageNumber);
      var isReply = !!root;

      var message = "<div class='annotContainer'>";
      var subject = annotation.Subject;
      if (subject === 'Sticky') {
        subject = 'Comment';
      }
      message += "<a class='subject jumpToPage'>" + subject + '</a>';
      message += '</div>';

      var $annotContainer = $(message);
      $annotContainer.attr('data-mode', 'list'); // default to list mode

      var mode = me.$annotList.attr('data-mode');
      if (mode === 'single') {
        $annotContainer.hide();
      }

      // shared buttons
      var $doneButton = $('<a class="noteButton annotlist-doneButton">(<span data-i18n="annotationPopup.buttonDone"></span>)</a>');
      $doneButton.hide();
      $annotContainer.append($doneButton);

      $doneButton.on('click', function(e) {
        e.stopImmediatePropagation();
        me.annotationManager.setNoteContents(annotation, $comment.val());

        if (annotation instanceof Annotations.FreeTextAnnotation) {
          me.annotationManager.drawAnnotationsFromList([annotation]);
        }

        var returnMode = me.$annotList.attr('data-return-mode');
        if (returnMode === 'thread') {
          if (annotation) {
            me.viewAnnotsThreadMode(annotation);
            return;
          }
        }
        me.viewAnnotsListMode();
      });


      var editable = me.mayEditAnnotation(annotation);
      if (editable) {
        var $deleteButton = $('<a class="noteButton annotlist-deleteButton">(<span class="needsclick" data-i18n="annotationPopup.buttonDelete"></span>)</a>');
        $deleteButton.hide();
        $annotContainer.append($deleteButton);

        // use mousedown so the event happens before the blur event (click happens after)
        $deleteButton.on('mousedown', function(e) {
          e.stopImmediatePropagation();
          if (annotation.isReply()) {
            var returnMode = me.$annotList.attr('data-return-mode');
            if (returnMode === 'thread') {
              if (annotation) {
                me.viewAnnotsThreadMode(annotation);
              } else {
                me.viewAnnotsListMode();
              }
            } else {
              me.viewAnnotsListMode();
            }
          } else {
            // deleting the root
            me.viewAnnotsListMode();
          }
          me.annotationManager.deleteAnnotation(annotation);
        });


        var $editButton = $('<a class="noteButton annotlist-editButton">(<span data-i18n="annotationPopup.buttonEdit"></span>)</a>');
        $annotContainer.append($editButton);

        $editButton.on('click', function(e) {
          e.stopImmediatePropagation();
          me.viewAnnotsSingleMode(annotation);
        });
      } else {
        $annotContainer.append($doneButton);
        // read only
        var $viewButton = $('<a class="noteButton annotlist-viewButton">(<span data-i18n="annotationPopup.buttonView"></span>)</a>');

        $annotContainer.append($viewButton);
        $viewButton.on('click', function(e) {
          e.stopImmediatePropagation();
          me.viewAnnotsSingleMode(annotation);
        });
      }

      // can't reply in readonly mode
      if (!me.isReadOnly()) {
        var $replyButton = $('<a class="noteButton annotlist-replyButton">(<span data-i18n="annotationPopup.buttonReply"></span>)</a>');
        $annotContainer.append($replyButton);

        $replyButton.on('click', function(e) {
          e.stopImmediatePropagation();
          var annotReply = me.annotationManager.createAnnotationReply(annotation);
          me.viewAnnotsSingleMode(annotReply);
        });
      }

      // add created date
      $("<div class='lastmodified'></div>").appendTo($annotContainer);

      var $comment = $('<textarea>').addClass('comment-text');
      me.setTextareaReadonly($comment, true);

      $comment.textinput();
      $comment.on('keyup', function() {
        // throttle the change event for text modifications
        clearTimeout(me.noteModifyTimeout);
        me.noteModifyTimeout = setTimeout(function() {
          me.annotationManager.setNoteContents(annotation, $comment.val());

          if (annotation instanceof Annotations.FreeTextAnnotation) {
            me.annotationManager.drawAnnotationsFromList([annotation]);
          }
        }, 500);
      });

      $comment.hide();
      var $commentContent = $('<div class="comment-content">');

      $commentContent.append('<span class="annot-type-image"></span>');

      var authorText = annotation.Author ? annotation.Author + ': ' : '';
      $commentContent.append("<span class='author'>" + authorText + '</span>');
      $commentContent.append('<span class="comment-text"></span>');
      $commentContent.append($comment);
      $annotContainer.append($commentContent);

      $annotContainer.i18n();

      if (isReply) {
        $annotContainer.addClass('reply');
      }
      $li.append($annotContainer);

      // append in order of page number
      var lastElement = null;
      var $allitems = parentContainer.find('li');
      var isInserted = false;

      for (var i = 0; i < $allitems.length; i++) {
        var $ele = $($allitems[i]);
        var pn = $ele.data('pagenumber');
        if (typeof pn === 'undefined') {
          continue;
        }

        if (annotation.PageNumber >= pn) {
          lastElement = $ele;
        } else {
          $ele.before($li);
          isInserted = true;
          break;
        }
      }
      if (!isInserted && lastElement) {
        lastElement.after($li);
      } else if (!isInserted) {
        parentContainer.append($li);
      }
      // refresh the view with model
      me.refreshAnnotationItem(annotation, $li);

      return $li;
    },
    refreshAnnotationItem: function(annotation, $li) {
      var commentString = annotation.getContents() || '';
      var $annotContainer = $li.children('.annotContainer');
      $annotContainer.find('span.comment-text').text(commentString);
      $annotContainer.find('textarea.comment-text').val(commentString);
      if (annotation.DateCreated) {
        $annotContainer.find('.lastmodified').text('Created: ' + annotation.DateCreated.toLocaleString());
      }
    },
    refreshAnnotationList: function() {
      this.$annotList.listview('refresh');
    },
    viewAnnotsListMode: function() {
      var me = this;
      this.threadAnnot = null;
      this.$annotList.attr('data-mode', 'list');
      this.$annotList.attr('data-return-mode', 'list');

      $('.showAllAnnotButton').hide();
      var $annotContainer = $('.annotContainer');
      $annotContainer.find('.annotlist-editButton').show();
      $annotContainer.find('.annotlist-replyButton').show();
      $annotContainer.find('.annotlist-deleteButton').hide();
      $annotContainer.find('.annotlist-doneButton').hide();
      $annotContainer.find('.annotlist-viewButton').show();

      this.$annotList.children('li').each(function() {
        var $this = $(this);
        // make sure all note text is shown but disabled
        $this.show();
        var $annotContainer = $this.find('.annotContainer');
        $annotContainer.attr('data-mode', 'list').show();

        var $textarea = $annotContainer.find('textarea');
        $textarea.removeClass('ui-focus').hide();

        me.setTextareaReadonly($textarea, true);
      });


      if (this.annotationManager.getAnnotationsList().length > 0) {
        this.$noAnnotations.hide();
      } else {
        this.$noAnnotations.show();
      }

      this.$annotList.attr('data-last-mode', 'list');
      this.refreshAnnotationList();
    },

    viewAnnotsThreadMode: function(annotation) {
      var me = this;

      this.$annotList.attr('data-mode', 'thread');
      this.$annotList.attr('data-return-mode', 'thread');
      $('.showAllAnnotButton').show();
      var $annotContainer = $('.annotContainer');
      $annotContainer.find('.annotlist-editButton').show();
      $annotContainer.find('.annotlist-replyButton').show();
      $annotContainer.find('.annotlist-deleteButton').hide();
      $annotContainer.find('.annotlist-doneButton').hide();
      $annotContainer.find('.annotlist-viewButton').show();

      var rootAnnot = me.annotationManager.getRootAnnotation(annotation);
      this.threadAnnot = rootAnnot;
      // var item = this.getAnnotationNoteContainer(rootAnnot);
      this.$annotList.children('li').each(function() {
        var $this = $(this);
        var annotId = $this.attr('data-id');

        if (rootAnnot.Id === annotId) {
          // this is the thread we want.
          // make sure all note text is shown but disabled
          $this.show();
          var $annotContainer = $this.find('.annotContainer');
          $annotContainer.attr('data-mode', 'thread').show();

          var $textarea = $annotContainer.find('textarea');
          $textarea.removeClass('ui-focus').hide();

          me.setTextareaReadonly($textarea, true);
        } else {
          // we want to hide these;
          $this.hide();
        }
      });

      if (me.annotationManager.getAnnotationsList().length > 0) {
        me.$noAnnotations.hide();
      } else {
        me.$noAnnotations.show();
      }
      this.$annotList.attr('data-last-mode', 'thread');
      this.refreshAnnotationList();
      this.changeVisiblePage('annotationDialog');
    },

    viewAnnotsSingleMode: function(annotation, returnMode) {
      this.threadAnnot = null;
      $('.showAllAnnotButton').hide();
      this.$annotList.attr('data-mode', 'single');
      if (returnMode) {
        this.$annotList.attr('data-return-mode', returnMode);
      }
      var rootAnnot = this.annotationManager.getRootAnnotation(annotation);
      this.editAnnotationNote(annotation, rootAnnot);
    },

    editAnnotationNote: function(annotation, root) {
      var me = this;

      root = root || annotation;
      // hide every annotation but current one so that touch events won't mistakenly go to the wrong textarea
      var item = me.getAnnotationNoteContainer(annotation, root);
      var rootItem = me.getAnnotationNoteContainer(root);

      // hide all other annotations that are not part of reply chain
      me.$annotList.children().not(rootItem).hide();

      // hide all other messages in the reply chain
      var annotContainer = item.children('.annotContainer');
      rootItem.find('.annotContainer').not(annotContainer).hide();
      var $textarea = annotContainer.find('textarea.comment-text');
      $textarea.show();

      annotContainer.attr('data-mode', 'single');

      var $editButton = annotContainer.children('.annotlist-editButton');
      var $doneButton = annotContainer.children('.annotlist-doneButton');
      var $deleteButton = annotContainer.children('.annotlist-deleteButton');
      var $replyButton = annotContainer.children('.annotlist-replyButton');

      if (me.mayEditAnnotation(annotation)) {
        // can edit
        annotContainer.addClass('edit')
          .removeClass('view');

        // enable the textarea
        me.setTextareaReadonly($textarea, false);
        $textarea.textinput('option', 'autogrow', true).textinput('refresh');

        $editButton.hide();
        $doneButton.show();
        $deleteButton.show();
        $replyButton.hide();

        // after clicking edit wait until the comment loses focus and then reshow the annotation list
        $textarea.on('blur', function() {
          $textarea.off('blur');
          $(this).closest('.annotContainer').children('.annotlist-doneButton').click();
          me.refreshAnnotationItem(annotation, $textarea.closest('li'));

          // scroll last edited annotation to the top
          $('#annotationDialog .ui-content').scrollTop(rootItem.position().top);
        });
      } else {
        // no edit
        annotContainer.addClass('view')
          .removeClass('edit');

        $doneButton.show();
        $deleteButton.show();
        $replyButton.hide();
        var $viewButton = annotContainer.children('.annotlist-viewButton');
        $viewButton.hide();

        me.setTextareaReadonly($textarea, true);
        $textarea.textinput('option', 'autogrow', true).textinput('refresh');
      }

      me.changeVisiblePage('annotationDialog');

      if (exports.utils.ie) {
        // if we don't focus with a delay in IE then the keyboard is shown
        // but for some reason the cursor isn't in the textarea so you can't start typing
        setTimeout(function() {
          $textarea.focus();
        }, 100);
      } else {
        $textarea.focus();
      }
    },

    showAnnotationEditPopup: function(evt) {
      var me = this;

      var selectedAnnotations = me.annotationManager.getSelectedAnnotations();
      if (selectedAnnotations.length === 1) {
        var annotation = selectedAnnotations[0];

        if (!me.mayEditAnnotation(annotation)) {
          me.$annotEditButtons.find('a').hide();
          me.$annotEditButtons.find('#editDoneButton').show();
          me.$annotEditButtons.find('#editNoteButton').show();
        } else {
          // reshow all the buttons
          me.$annotEditButtons.find('a').show();

          if (annotation instanceof Annotations.StampAnnotation) {
            me.$annotEditButtons.find('#editStyleButton').hide();
          }
        }

        me.$annotEditButtons.controlgroup();

        me.setEditPopupLocation(annotation);

        if (me.annotationManager.isAnnotationRedactable(annotation)) {
          me.$annotEditButtons.find('#applyRedactButton').show();
        } else {
          me.$annotEditButtons.find('#applyRedactButton').hide();
        }

        // so the event won't close the popup right away
        if (evt) {
          evt.preventDefault();
        }
      } else if (selectedAnnotations.length > 1) {
        me.$annotEditButtons.find('a').hide();
        me.$annotEditButtons.find('#editDoneButton').show();

        var someEditable = false;
        // find out if at least one of the selected annotations is editable
        for (var i = 0; i < selectedAnnotations.length; ++i) {
          if (me.mayEditAnnotation(selectedAnnotations[i])) {
            someEditable = true;
            break;
          }
        }

        if (someEditable) {
          me.$annotEditButtons.find('#editDeleteButton').show();
        }

        me.$annotEditButtons.controlgroup();

        me.setEditPopupLocation(selectedAnnotations[0]);
      }
    },

    setEditPopupLocation: function(annotation) {
      var me = this;

      var annotPageNumber = annotation.getPageNumber() - 1;
      var verticalOffset = 20;

      var pageX = annotation.getX() + (annotation.getWidth() / 2);
      var pageY = annotation.getY() - verticalOffset;

      // convert to window coordinates
      var location = me.displayMode.pageToWindow({
        x: pageX,
        y: pageY
      }, annotPageNumber);

      // remove this class because jQuery mobile adds it and it sets the height and width to 1px which messes up the height calculation
      me.$annotEditPopup.parent().removeClass('ui-popup-truncate');

      var height = me.$annotEditPopup.height();

      // if it's too close to the top
      if (location.y < height) {
        var newPageY = annotation.getY() + annotation.getHeight() + verticalOffset;

        // show it below the annotation
        var newLocation = me.displayMode.pageToWindow({
          x: 0,
          y: newPageY
        }, annotPageNumber);

        location.y = newLocation.y;

        me.$annotEditPopup.popup('option', 'arrow', 't');
      } else {
        me.$annotEditPopup.popup('option', 'arrow', 'b');
      }

      // seems like we need to close before opening because if the popup was already opened the position doesn't seem to change
      me.$annotEditPopup.popup('close');
      me.$annotEditPopup.popup('open', {
        x: location.x,
        y: location.y
      });
    },

    closeEditPopup: function() {
      this.$annotEditPopup.popup('close');
      this.$annotEditButtons.show();
      // hide the properties
      this.$annotEditPopup.find('#annotEditProperties').hide();
      this.$addNewColor.hide();
      this.$signatureSelectionContainer.hide();
      this.$textSelectionContainer.hide();
    },

    deleteSelectedAnnotations: function() {
      this.annotationManager.deleteAnnotations(this.annotationManager.getSelectedAnnotations());
      this.closeEditPopup();
    },

    mayEditAnnotation: function(annotation) {
      return this.annotationManager.canModify(annotation);
    },

    createBookmarkList: function(level) {
      var me = this;
      me.doc.getBookmarks().then(function(bookmarks) {
        var $bookmarkList = me.$bookmarkList;

        if (bookmarks === null || bookmarks.length < 1) {
          var bookmarkString = '<li data-i18n="mobile.bookmarks.noBookmarks"></li>';
          $bookmarkList.html(bookmarkString);
          $bookmarkList.i18n();
          $bookmarkList.listview();
          $bookmarkList.listview('refresh');
          return;
        }

        var bookmarkFragment = document.createDocumentFragment();

        if (_.isUndefined(level) || level === '') {
          // Top level
          level = '';
        } else {
          // not top level
          var lvlArray = level.split(',');

          for (var i = 0; i < lvlArray.length; i++) {
            var levelIndex = lvlArray[i];
            bookmarks = bookmarks[levelIndex].getChildren();
          }

          lvlArray.pop();
          var levelString = (lvlArray > 1 ? lvlArray.join(',') : lvlArray.toString());
          var bookmarkListItem = $('<li data-role="list-divider" class="ui-icon-arrow-u" data-theme="a" style="-webkit-transform: translateZ(0)">');
          var bookmarkLink = $('<a data-i18n="mobile.bookmarks.upOneLevel"></a>').attr('data-bookmark-level', levelString);
          bookmarkListItem.append(bookmarkLink);
          bookmarkFragment.appendChild(bookmarkListItem[0]);

          if (lvlArray !== null) {
            level += ',';
          }
        }

        for (var j = 0; j < bookmarks.length; j++) {
          var bm = bookmarks[j];
          var pageData = bm.getPageNumber() ? bm.getPageNumber() : bm.getURL();

          var childCount = bm.getChildren().length;
          var bookmarkName = $('<span></span>');
          bookmarkName.text(bm.getName());

          var listItem = $('<li style="-webkit-transform: translateZ(0)" data-icon="false" class="bookmark-item">');
          listItem.attr('data-pagenumber', pageData);

          var link;
          if (childCount > 0) {
            link = $('<a href="#viewerPage" class="unselectable">').attr('data-bookmark-page', pageData);
            link.append(bookmarkName);
            listItem.append(link);

            var childLink = $('<a data-shadow="false" data-theme="a">').attr('data-bookmark-level', level + j);
            listItem.append(childLink);
          } else {
            link = $('<a href="#viewerPage" class="unselectable" data-transition="none">').attr('data-bookmark-page', pageData);
            link.append(bookmarkName);
            listItem.append(link);
          }
          bookmarkFragment.appendChild(listItem[0]);
        }

        $bookmarkList.empty().append(bookmarkFragment);
        $bookmarkList.i18n();
        $bookmarkList.listview();
        $bookmarkList.listview('refresh');
      });
    },

    initBookmarkView: function() {
      var me = this;
      me.createBookmarkList();
    },

    colorToHex: function(color) {
      var colorName = color.toHexString();
      if (!colorName) {
        colorName = 'transparent';
      }
      return colorName;
    },

    colorHexToRGB: function(hexString) {
      if (hexString === 'transparent') {
        return new Annotations.Color(255, 255, 255, 0);
      }
      return new Annotations.Color(hexString);
    },

    // JavaScript wrapper (WebViewer.js) function definitions
    setCurrentPageNumber: function(pageNumber) {
      this.setCurrentPage(pageNumber - 1);
    },

    goToFirstPage: function() {
      this.setCurrentPage(0);
    },

    goToLastPage: function() {
      var i = this.docViewer.getPageCount() - 1;
      if (i <= 0) {
        return;
      }
      this.setCurrentPage(i);
    },

    goToNextPage: function() {
      var i = this.docViewer.getCurrentPage();
      if (i >= this.docViewer.getPageCount()) {
        return;
      }
      this.setCurrentPage(i);
    },

    goToPrevPage: function() {
      var i = this.docViewer.getCurrentPage() - 2;
      if (i < 0) {
        return;
      }
      this.setCurrentPage(i);
    },

    getZoomLevel: function() {
      return this.currentPageZoom;
    },

    setZoomLevel: function(zoomLevel, animate) {
      // simulate the end of a pinch zoom action
      this.newScale = zoomLevel / this.currentPageZoom;
      this.shouldRerender = true;

      if (animate) {
        this.c.$e.addClass('animated');
      }

      this.onTouchEnd({
        originalEvent: {
          touches: []
        }
      }, animate);
    },

    setLayoutMode: function(layoutMode) {
      this.isCoverMode = layoutMode === exports.CoreControls.DisplayModes.Cover;
      this.docViewer.setPagesPerCanvas(this.nPagesPerWrapper, this.isCoverMode);
      if (this.docViewer.getDocument()) {
        this.docViewer.removeContent();
        this.setCurrentPage(this.currentPageIndex);
      }
    },

    setSearchInLeftPanel: function() {
      console.warn('setSearchInLeftPanel is not applicable in mobile viewer.');
    },

    /**
     * Enables/disables text search tool from UI
     * @param enable
     */
    enableCopyAndTextSelection: function(enable) {
      if (!enable) {
        $('#textSelectButton').remove();
      }
    }
  };

  exports.ReaderControl.prototype = $.extend({}, exports.BaseReaderControl.prototype, exports.ReaderControl.prototype);
})(window);

$(function() {
  $(document).one('viewerLoaded', function() {
    // initially hidden
    $('#ui-display').show();
  });

  window.ControlUtils.initialize(function() {
    alert(i18n.t('mobile.unsupportedBrowser'));
  });
});