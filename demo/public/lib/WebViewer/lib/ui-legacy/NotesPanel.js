$(function() {
  'use strict';

  var $doc = $(document);
  var queryParams = window.ControlUtils.getQueryStringMap();
  if (queryParams.getBoolean('hideAnnotationPanel', false)) {
    return;
  }

  var Note = function(annotation, editable, replyable, deletable) {
    this._editable = editable;
    this._replyable = replyable;
    this._deletable = deletable;
    this._isEditing = false;
    this._stayUncollapsed = false;
    this._annotation = annotation;
    this._parent = null;

    this.$container = $('<div class="noteContainer">');

    this.createContainer();
  };

  Note.prototype = {
    COLLAPSE_HEIGHT: 120,

    createContainer: function() {
      var me = this;
      var annotation = this.getAnnotation();
      var $container = this.getContainer();
      $container.data('annot', annotation);

      var viewDataOverride = {
        userImage: {},
        author: null,
        subject: null,
        createdTime: null
      };
      $doc.triggerHandler('notePopupCreate', { annotation: annotation, viewData: viewDataOverride });
      var noteHeader = $('<div class="noteHeader">');
      var table = $('<table>');
      var row = $('<tr>');
      var imageCol = $('<td>');
      var userImage = new Image();
      userImage.height = 32;
      userImage.width = 32;

      userImage.src = viewDataOverride.userImage.src || './Resources/user.png';
      userImage.alt = viewDataOverride.userImage.alt || userImage.alt;

      imageCol.append(userImage);
      imageCol.addClass('user-image-col');
      row.append(imageCol);

      var textCol = $('<td class="noteAuthorAndTime">');
      var author = $('<span class="noteAuthor">').text(viewDataOverride.author || annotation.Author);
      var subject = $('<span class="noteSubject">').text(viewDataOverride.subject || annotation.Subject);
      textCol.append(author);
      textCol.append('<span> - </span>');
      textCol.append(subject);

      var dateFormat = 'h:mm A MMM D';
      if (annotation.DateCreated && new Date().getFullYear() !== annotation.DateCreated.getFullYear()) {
        dateFormat = 'h:mm A MMM D YYYY';
      }

      var createdText = viewDataOverride.createdTime || (annotation.DateCreated ? moment(annotation.DateCreated).format(dateFormat) : '');
      var time = $('<div class="noteTime">').text(createdText);
      textCol.append(time);
      row.append(textCol);

      table.append(row);
      noteHeader.append(table);
      $container.append(noteHeader);

      this.$staticNoteContents = $('<div class="staticNoteContents">').text(annotation.getContents());
      $container.append(this.$staticNoteContents);

      this.$collapseButtonsContainer = $('<div class="collapseButtonsContainer">');
      this.$showMoreButton = $('<a class="notesLink" data-i18n="notesPanel.showMore"></a>');
      this.$showMoreButton.on('click', function() {
        me._stayUncollapsed = true;
        me.$staticNoteContents.removeClass('noteCollapsed');
        me.$showMoreButton.hide();
        me.$showLessButton.show();
      });
      this.$showLessButton = $('<a class="notesLink" data-i18n="notesPanel.showLess"></a>');
      this.$showLessButton.on('click', function() {
        me._stayUncollapsed = false;
        me.$staticNoteContents.addClass('noteCollapsed');
        me.$showMoreButton.show();
        me.$showLessButton.hide();
      });

      this.$collapseButtonsContainer.append(this.$showMoreButton);
      this.$collapseButtonsContainer.append(this.$showLessButton);
      $container.append(this.$collapseButtonsContainer);

      this.$editButtonsContainer = $('<div class="editButtonsContainer">');
      this.$editButton = $('<a class="notesLink" data-i18n="notesPanel.edit"></a>');
      this.$editButton.on('click', function() {
        me.switchToEditingMode();
        me.trigger('update');
      });
      this.$deleteButton = $('<a class="notesLink" data-i18n="notesPanel.delete"></a>');
      this.$deleteButton.on('click', function() {
        me.showDeleteConfirmation();
      });

      this.$editButtonsContainer.append(this.$editButton);
      this.$editButtonsContainer.append(this.$deleteButton);
      $container.append(this.$editButtonsContainer);

      if (!this._editable) {
        this.$editButton.hide();
      }
      if (!this._deletable) {
        this.$deleteButton.hide();
      }

      this.$noteContents = $('<div class="noteContents">').hide();
      this.$textarea = $('<textarea class="panelElementFont">');
      this.$textarea.on('update', function() {
        me._updateSaveButtonStatus();
        $doc.trigger('noteTextAreaOnUpdate', { context: me });
      });
      this._handleKeyboardSaveShortcut(this.$textarea, function() {
        me.$saveButton.trigger('click');
      });
      this.$noteContents.append(this.$textarea);
      $container.append(this.$noteContents);

      var buttonsContainer = $('<div class="noteButtonsContainer">');
      this.$saveButton = $('<button type="button" class="roundedCornerButton" data-i18n="notesPanel.save"></button>');
      this.$saveButton.on('click', function() {
        me.save();
      });
      var cancelButton = $('<button type="button" class="roundedCornerButton" data-i18n="notesPanel.cancel"></button>');
      cancelButton.on('click', function() {
        me.cancel(true);
      });
      buttonsContainer.append(this.$saveButton);
      buttonsContainer.append(cancelButton);
      this.$noteContents.append(buttonsContainer);

      $container.i18n();
      $doc.trigger('notePopupReady', { context: me, container: $container, annotation: annotation });
    },

    getContainer: function() {
      return this.$container;
    },

    getAnnotation: function() {
      return this._annotation;
    },

    setParent: function(parent) {
      this._parent = parent;
    },

    getText: function() {
      return this.getAnnotation().getContents() || '';
    },

    isEditing: function() {
      return this._isEditing;
    },

    forceUncollapsed: function() {
      this._stayUncollapsed = true;
    },

    unforceUncollapsed: function() {
      this._stayUncollapsed = false;
    },

    collapseContents: function() {
      this.$staticNoteContents.removeClass('noteCollapsed');

      if (this.staticTextHeight > this.COLLAPSE_HEIGHT) {
        if (this._stayUncollapsed) {
          this.$showMoreButton.hide();
          this.$showLessButton.show();
        } else {
          this.$staticNoteContents.addClass('noteCollapsed');
          this.$showMoreButton.show();
          this.$showLessButton.hide();
        }
      } else {
        this.$showMoreButton.hide();
        this.$showLessButton.hide();
      }
    },

    collapseAllContents: function() {
      this.collapseContents();
      for (var i = 0; i < this._replies.length; ++i) {
        this._replies[i].collapseContents();
      }
    },

    isEmpty: function() {
      var contents = this.getAnnotation().getContents();
      return contents === '' || typeof contents === 'undefined';
    },

    save: function() {
      this.showTextBox();
      this.trigger('save', this.$textarea.val());
    },

    cancel: function(triggerEvent) {
      this.setTextareaToNoteText();
      this.showTextBox();
      if (triggerEvent) {
        this.trigger('cancel');
      }
    },

    highlightText: function(text) {
      if (!text) {
        this.updateText();
        return;
      }

      var regex = new RegExp('(' + text + ')', 'ig');
      this.$staticNoteContents.html(this.getText().replace(regex, "<span class='highlight'>$1</span>"));
    },

    setEditable: function(isEditable) {
      this._editable = isEditable;
      if (isEditable) {
        this.$editButton.show();
      } else {
        if (this._isEditing) {
          this.showTextBox();
        }
        this.$editButton.hide();
      }
    },

    setDeletable: function(isDeletable) {
      this._deletable = isDeletable;
      if (isDeletable) {
        this.$deleteButton.show();
      } else {
        this.$deleteButton.hide();
      }
    },

    setReplyable: function(isReplyable) {
      this._replyable = isReplyable;
      if (!isReplyable && this.$replyContainer) {
        this.$replyContainer.hide();
      }
    },

    _updateButtonStatus: function($textarea, $button) {
      if ($textarea.val() === '') {
        $button.prop('disabled', true);
      } else {
        $button.prop('disabled', false);
      }
    },

    _updateSaveButtonStatus: function() {
      this._updateButtonStatus(this.$textarea, this.$saveButton);
    },

    _setFlexible: function($textarea) {
      $textarea.flexible();
      var me = this;
      // listen for height changes after initialization
      $textarea.off('heightChanged').on('heightChanged', function() {
        me.trigger('update');
      });
    },

    initFlexibleTextarea: function() {
      this._setFlexible(this.$textarea);
    },

    remove: function() {
      if (this._parent) {
        this._parent.replyRemoved(this);
      }
      this.$textarea.flexible('remove');
      this.getContainer().remove();
      // unbind all handlers
      this.off();
    },

    select: function() {},
    deselect: function() {},

    focusInput: function(selectAll) {
      this.$textarea.focus();
      if (selectAll) {
        this.$textarea.select();
      }
    },

    // show the editable textarea
    showEditBox: function() {
      this._isEditing = true;
      this.$staticNoteContents.hide();
      this.$editButtonsContainer.hide();
      this.$collapseButtonsContainer.hide();
      this.$noteContents.show();
      this.initFlexibleTextarea();
      this.$textarea.trigger('updateHeight');
    },

    // show the non-editable text box
    showTextBox: function() {
      this._stayUncollapsed = true;
      this._isEditing = false;
      this.$noteContents.hide();
      this.$staticNoteContents.show();
      this.$editButtonsContainer.show();
      this.$collapseButtonsContainer.show();
      $doc.trigger('textBoxReady', { editButtonsContainer: this.$editButtonsContainer });
    },

    // default for focus is true
    switchToEditingMode: function(selectAll, noFocus) {
      this.setTextareaToNoteText();
      this._updateSaveButtonStatus();
      this.showEditBox();
      if (!noFocus) {
        this.focusInput(selectAll);
      }
    },

    // checks if ctrl+enter is pressed and if the textarea isn't empty
    _handleKeyboardSaveShortcut: function($textarea, callback) {
      var enterKey = 13;

      $textarea.on('keydown', function(e) {
        var ctrlDown = e.metaKey || e.ctrlKey;

        if (ctrlDown && e.which === enterKey) {
          var text = $textarea.val();
          if (text) {
            callback(text);
          }
        }
      });
    },

    _createDeleteConfirmationElement: function(translation, deleteCallback) {
      var me = this;
      var confirmDeleteContainer = $('<div class="noteDeleteShadow">');

      var confirmMessage = $('<div class="deleteConfirmText">');
      confirmMessage.attr('data-i18n', translation);
      confirmDeleteContainer.append(confirmMessage);

      deleteCallback = deleteCallback || function() {};
      var deleteButton = $('<button type="button" class="roundedCornerButton" data-i18n="notesPanel.delete"></button>');
      deleteButton.on('click', function() {
        deleteCallback();
        me.removeDeleteConfirmation();
        me.trigger('delete');
      });
      var cancelButton = $('<button type="button" class="roundedCornerButton" data-i18n="notesPanel.cancel"></button>');
      cancelButton.on('click', function() {
        me.removeDeleteConfirmation();
      });
      confirmDeleteContainer.append(deleteButton);
      confirmDeleteContainer.append(cancelButton);
      confirmDeleteContainer.i18n();

      return confirmDeleteContainer;
    },

    showDeleteConfirmation: function() {
      var element = this._createDeleteConfirmationElement('notesPanel.deleteComment');
      this.getContainer().append(element);
    },

    removeDeleteConfirmation: function() {
      this.getContainer().find('.noteDeleteShadow').remove();
    },

    setTextareaToNoteText: function() {
      this.$textarea.val(this.getText());
      this.$textarea.trigger('updateHeight');
    },

    updateText: function() {
      var text = this.getText();
      // escape text
      text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      this.$staticNoteContents.html(Autolinker.link(text));
      this.updateStaticTextHeight();
    },

    updateStaticTextHeight: function() {
      this.staticTextHeight = this.$staticNoteContents[0].scrollHeight;
    }
  };

  $.extend(Note.prototype, window.utils.eventHandler);

  var RootNote = function() {
    Note.apply(this, arguments);

    this._topValue = null;
    this._height = null;
    this._replies = [];

    var me = this;
    this.$rootElement = $('<div class="panelElement panelElementFont">');
    this.$rootElement.on('click', function() {
      me.showReplyBox();
      me.trigger('clicked');
      me.trigger('update');
    });

    this.$rootElement.append(this.getContainer());

    this.$replyContainer = $('<div class="replyContainer">').hide();
    this.$replyTextarea = $('<textarea class="panelElementFont replyTextarea" data-i18n="[placeholder]notesPanel.enterReply"></textarea>');
    this.$replyTextarea.on('update', function() {
      me._updateReplyButtonStatus();
    });
    this.$replyTextarea.on('focus', function() {
      me._updateReplyButtonStatus();
      me.$replyButtonsContainer.show();
      me.trigger('update');
    });
    this.$replyTextarea.on('blur', function() {
      if (me.$replyTextarea.val() === '') {
        me.$replyButtonsContainer.hide();
        me.trigger('update');
      }
    });
    this._handleKeyboardSaveShortcut(this.$replyTextarea, function(text) {
      me.trigger('reply', text);
      me.$replyTextarea.focus();
    });
    this.$replyContainer.append(this.$replyTextarea);
    this.$replyButtonsContainer = $('<div class="replyButtonsContainer">').hide();
    this.$replyButton = $('<button type="button" class="roundedCornerButton" data-i18n="notesPanel.reply"></button>');
    this.$replyButton.on('click', function() {
      me.trigger('reply', me.$replyTextarea.val());
    });
    var cancelReplyButton = $('<button type="button" class="roundedCornerButton" data-i18n="notesPanel.cancel"></button>');
    cancelReplyButton.on('click', function() {
      me._resetReplyBox();
      me.trigger('update');
    });
    this.$replyButtonsContainer.append(this.$replyButton);
    this.$replyButtonsContainer.append(cancelReplyButton);

    this.$replyContainer.append(this.$replyButtonsContainer);

    this.$rootElement.append(this.$replyContainer);
    this.$rootElement.i18n();
  };

  RootNote.prototype = {
    getElement: function() {
      return this.$rootElement;
    },

    getTop: function() {
      return this._topValue;
    },

    setTop: function(value) {
      this._topValue = value;
    },

    updateTopPosition: function() {
      this.getElement().css('top', this.getTop());
    },

    getHeight: function() {
      return this._height;
    },

    recalculateHeight: function() {
      this._height = this.getElement().outerHeight();
    },

    show: function() {
      this.getElement().show();
    },

    hide: function() {
      this.getElement().hide();
    },

    select: function(canModify) {
      this.getElement().addClass('selectedNote');

      if (canModify && this.isEmpty()) {
        this.switchToEditingMode(false, true);
      }
    },

    deselect: function(triggerEvent) {
      this.getElement().removeClass('selectedNote');

      // automatically save/cancel notes when the note is unselected
      var notes = [this].concat(this._replies);
      notes.forEach(function(note) {
        if (note.isEditing()) {
          if (note.$textarea.val() === '') {
            note.cancel(triggerEvent);
          } else {
            note.save();
          }
        }
      });
    },

    isVisible: function() {
      return this.getElement().css('display') !== 'none';
    },

    remove: function() {
      this._replies = null;
      Note.prototype.remove.call(this);
      this.$replyTextarea.flexible('remove');
      this.getElement().remove();
    },

    replyRemoved: function(reply) {
      if (this._replies) {
        this._replies.remove(reply);
      }
    },

    _disableAnimations: function() {
      this.getElement().addClass('noTransition');
    },

    _enableAnimations: function() {
      this.getElement().removeClass('noTransition');
    },

    switchToEditingMode: function() {
      this.show();
      Note.prototype.switchToEditingMode.apply(this, arguments);
    },

    startAddingReply: function() {
      this.show();
      this.showReplyBox();
      this.$replyTextarea.focus();
    },

    showDeleteConfirmation: function() {
      var me = this;

      var confirmationText = this.isEmpty() ? 'notesPanel.deleteAnnotation' : 'notesPanel.deleteCommentThread';
      var element = this._createDeleteConfirmationElement(confirmationText, function() {
        me._resetReplyBox();
        me.hideReplyBox();
      });

      this.getElement().append(element);
    },

    removeDeleteConfirmation: function() {
      this.getElement().children('.noteDeleteShadow').remove();
    },

    removeAllDeleteConfirmations: function() {
      this.getElement().find('.noteDeleteShadow').remove();
    },

    _updateReplyButtonStatus: function() {
      this._updateButtonStatus(this.$replyTextarea, this.$replyButton);
    },

    showReplyBox: function() {
      if (this._replyable) {
        this.$replyContainer.show();
        this._setFlexible(this.$replyTextarea);
        // if the textarea is focused then show the buttons as well
        var textareaFocused = document.activeElement === this.$replyTextarea[0];
        if (textareaFocused) {
          this.$replyButtonsContainer.show();
        }
      }
    },

    hideReplyBox: function() {
      if (this.$replyTextarea.val() === '') {
        this.$replyContainer.hide();
        this.$replyButtonsContainer.hide();
      }
    },

    _resetReplyBox: function() {
      this._clearReplyText();
      this.$replyButtonsContainer.hide();
    },

    _clearReplyText: function() {
      this.$replyTextarea.val('');
      this.$replyTextarea.trigger('updateHeight');
    },

    addReply: function(note, imported) {
      note.setParent(this);
      this._replies.push(note);

      if (!imported) {
        this._resetReplyBox();
      }
      note.getContainer().addClass('replyContainer');

      // sort the replies by the creation date
      var $children = this.getElement().children('.noteContainer.replyContainer').add(note.getContainer());
      $children.sort(function(a, b) {
        return $(a).data('annot').DateCreated - $(b).data('annot').DateCreated;
      });
      this.$replyContainer.before($children);
    }
  };

  RootNote.prototype = $.extend({}, Note.prototype, RootNote.prototype);

  var FocusConnector = function() {
    this.$horizontalLine1 = $('<div>').addClass('noteLine horizontal');
    this.$horizontalLine2 = $('<div>').addClass('noteLine horizontal');
    this.$verticalLine = $('<div>').addClass('noteLine vertical');

    this.$elements = $([this.$horizontalLine1[0], this.$horizontalLine2[0], this.$verticalLine[0]]);
  };

  FocusConnector.prototype = {
    getElements: function() {
      return this.$elements;
    },

    hide: function() {
      // remove the class so that it disappears right away
      // and when shown it will be re-added and animate back
      this.$elements.removeClass('pointerTransition');
      this.$elements.css('opacity', 0);
    },

    show: function() {
      this.$elements.addClass('pointerTransition');
      this.$elements.css('opacity', 0.5);
    },

    // noteYDiff is the difference in y position between the note and its annotation
    updatePosition: function(totalWidth, notePosition, noteYDiff) {
      if (Math.abs(noteYDiff) < 1) {
        this.$elements.hide();

        this.$horizontalLine1.css({
          'width': totalWidth,
          'top': notePosition.top,
          'right': notePosition.right
        }).show();
      } else {
        this.$elements.show();
        var firstWidth = totalWidth * 0.75;

        this.$horizontalLine1.css({
          'width': firstWidth,
          'top': notePosition.top,
          'right': notePosition.left
        });

        this.$horizontalLine2.css({
          'width': totalWidth - firstWidth,
          'top': notePosition.top + noteYDiff,
          'right': notePosition.left + firstWidth
        });

        var horizontalLineBorder = parseInt(this.$horizontalLine2.css('border-top-width'), 10);

        this.$verticalLine.css({
          'height': Math.abs(noteYDiff),
          'top': notePosition.top + noteYDiff + horizontalLineBorder,
          'right': notePosition.left + firstWidth
        });
      }
      $doc.triggerHandler('noteUpdatePosition', { notePosition: notePosition, horizontalLine1: this.$horizontalLine1 });
    }
  };

  var AnnotLine = function(annotation, clickedCallback) {
    this.annotation = annotation;
    this.$element = $('<div class="annotLine">');
    this.$element.attr('data-i18n', '[title]notesPanel.annotLineDesc');
    this.$element.data('i18n-options', {
      pageNumber: annotation.PageNumber,
      subject: annotation.Subject,
      author: annotation.Author
    });
    this.$element.i18n();
    this.$element.on('click', clickedCallback);
  };

  AnnotLine.prototype = {
    getElement: function() {
      return this.$element;
    },

    getAnnotation: function() {
      return this.annotation;
    },

    hide: function() {
      this.getElement().hide();
    },

    show: function() {
      this.getElement().show();
    },

    update: function(position) {
      this.getElement().css('top', position);
    },

    remove: function() {
      this.getElement().remove();
    }
  };

  var documentPositionSort = {
    showListView: function() {
      return false;
    },

    getTop: function(noteManager, note, displayMode, pageOffset) {
      return noteManager.getAnnotationPosition(note.getAnnotation(), displayMode).y - pageOffset;
    },

    sort: function(notes) {
      return notes.sort(function(a, b) {
        var difference = a.getTop() - b.getTop();
        if (difference === 0) {
          // if the top values are exactly the same then sort by id to have a consistent sort order
          difference = a.getAnnotation().Id < b.getAnnotation().Id ? -1 : 1;
        }
        return difference;
      });
    },

    filter: function(notes) {
      return notes;
    }
  };

  var timeSort = {
    showListView: function() {
      return true;
    },

    getTop: function() {
      // just return 0 because they will be naturally positioned based on the sorting order
      return 0;
    },

    _getDateCreated: function(note) {
      var latest = note.getAnnotation().DateCreated;
      for (var i = 0; i < note._replies.length; ++i) {
        var created = note._replies[i].getAnnotation().DateCreated;
        if (created > latest) {
          latest = created;
        }
      }
      return latest;
    },

    sort: function(notes) {
      return notes.sort(function(a, b) {
        return timeSort._getDateCreated(b) - timeSort._getDateCreated(a);
      });
    },

    filter: function(notes) {
      return notes;
    }
  };

  var searchSort = {
    _searchTerm: '',

    showListView: function() {
      return true;
    },

    getTop: function() {
      return noteOptionsHeight;
    },

    sort: function(notes) {
      return notes;
    },

    setSearchTerm: function(searchTerm) {
      searchSort._searchTerm = searchTerm.toLowerCase();
    },

    _searchAnnot: function(note) {
      var comment = note.getText().toLowerCase();
      var found = comment.indexOf(searchSort._searchTerm) !== -1;
      if (found) {
        note.highlightText(searchSort._searchTerm);
        note.forceUncollapsed();
      } else {
        note.highlightText();
        note.unforceUncollapsed();
        note.collapseContents();
      }
      return found;
    },

    filter: function(notes, filteredCallback) {
      return notes.filter(function(note) {
        var found = searchSort._searchAnnot(note);
        // if the search term wasn't found in the root then check all of the replies
        for (var i = 0; i < note._replies.length; ++i) {
          found = searchSort._searchAnnot(note._replies[i]) || found;
        }

        if (!found) {
          filteredCallback(note);
        }
        return found;
      });
    }
  };

  var NoteManager = function(readerControl, scrollView, notesPanelWrapper, viewerOffset) {
    this.readerControl = readerControl;
    this.docViewer = readerControl.docViewer;
    this.setDefaults();
    this.noteMargin = 10;
    this.viewerOffset = viewerOffset;
    this.$dummyScrollElement = $('<div>').css({
      'position': 'absolute',
      'width': 1,
      'height': 1
    });
    this.$notesPanelWrapper = notesPanelWrapper;
    this.$notesPanel = notesPanelWrapper.find('#notesPanel');
    this.$notesPanel.append(this.$dummyScrollElement);
    this.$notesBar = notesPanelWrapper.find('#notesBar');
    // magic number to approximately align with the scrollbar arrow
    this.annotLinesPadding = 18;
    this.$annotLines = notesPanelWrapper.find('#annotLines');

    this.$scrollView = scrollView;
    this.$docpad = scrollView.find('#docpad');
    var me = this;

    // used so that the two views can be scrolled in sync and not go into a loop
    me.notesScrollingCount = 0;
    me.scrollViewScrollingCount = 0;

    this.$scrollView.on('scroll', function() {
      if (me.notesScrollingCount) {
        --me.notesScrollingCount;
        return;
      }

      me.alignViews();
      if (me.focusedAnnotation) {
        me.updateFocusConnector();
      }
    });

    this.$notesPanel.on('scroll', function() {
      if (me.scrollViewScrollingCount > 0) {
        --me.scrollViewScrollingCount;
        return;
      }

      if (!me.sortStrategy.showListView()) {
        var scrollViewScroll = me.$scrollView.scrollTop();
        var notesPanelScroll = me.$notesPanel.scrollTop();

        if (scrollViewScroll !== notesPanelScroll) {
          ++me.notesScrollingCount;
          me.$scrollView.scrollTop(me.$notesPanel.scrollTop());
        }
      }
      if (me.focusedAnnotation) {
        me.updateFocusConnector();
      }
    });

    this.docViewer.on('displayModeUpdated', function() {
      if (me.docViewer.getDocument() === null) {
        return;
      }
      var displayMode = me.displayModeManager.getDisplayMode();
      // if we have switched to a continuous display mode then we should make sure to unhide the notes
      // that might have been hidden on other pages

      async(function() {
        if (displayMode.isContinuous()) {
          me._showAllNotes();
          me.forAllLines(function(line) {
            line.show();
          });
        } else {
          me.showAnnotLinesVisiblePages();
        }

        me.updatePositionsWithoutAnimations();
        me.updateAllAnnotLines();
      });
    });

    this.docViewer.on('documentUnloaded', function() {
      if (noteManager) {
        noteManager.dispose();
        noteManager.setDefaults();
      }
    });

    this.focusConnector = new FocusConnector();
    this.$scrollView.append(this.focusConnector.getElements());
    this.hideFocusConnector();
  };

  NoteManager.prototype = {
    setDefaults: function() {
      this.annotManager = this.docViewer.getAnnotationManager();
      this.displayModeManager = this.docViewer.getDisplayModeManager();
      this.notes = {};
      this.annotLines = {};
      this.waitingForRootAnnot = {};
      this.focusedAnnotation = null;
      this.sortStrategy = documentPositionSort;
    },

    setSortStrategy: function(strategy) {
      this.sortStrategy = strategy;
      this.$notesPanel.scrollTop(0);
      this.trigger('sortStrategyChanged');
      this.updateAllPositions();
    },

    getSortStrategy: function() {
      return this.sortStrategy;
    },

    _createNote: function(annotation, imported) {
      var me = this;

      var editable = this.annotManager.canModifyContents(annotation);
      var deletable = this.annotManager.canModify(annotation);
      var replyable = !this.annotManager.getReadOnly();

      var i, note, replyNotes;


      if (annotation.isReply()) {
        // replies are added to the root annotation
        note = new Note(annotation, editable, replyable, deletable);
        if (!imported) {
          // if this reply was just created by the user then it shouldn't be collapsed
          note.forceUncollapsed();
        }

        var rootAnnot = this.annotManager.getRootAnnotation(annotation);

        if (rootAnnot === null) {
          this._setupWaitingReplies(note);
        } else {
          this._getOrCreateNote(rootAnnot, imported).addReply(note, imported);

          var rootNote = this._getNote(rootAnnot);
          // if the root note exists now and previously there was a child of this reply added before the root
          // then add those children to the root now
          if (rootNote) {
            replyNotes = this.waitingForRootAnnot[annotation.Id];
            if (replyNotes) {
              for (i = 0; i < replyNotes.length; ++i) {
                rootNote.addReply(replyNotes[i], imported);
              }
            }
          }
        }
      } else {
        note = new RootNote(annotation, editable, replyable, deletable);

        replyNotes = this.waitingForRootAnnot[annotation.Id];
        if (replyNotes) {
          for (i = 0; i < replyNotes.length; ++i) {
            note.addReply(replyNotes[i], imported);
          }
          delete this.waitingForRootAnnot[annotation.Id];
        }

        this.appendNote(note);

        note.on('clicked', function() {
          if (!me.annotManager.isAnnotationSelected(annotation)) {
            me._jumpToAndSelectAnnotation(annotation);
          }

          me.alignViews();

          me.showFocusConnector();
          me.updateFocusConnector();
        });

        note.on('reply', function(e, text) {
          me.annotManager.createAnnotationReply(note.getAnnotation(), text);
        });
      }

      this.notes[annotation.Id] = note;

      note.on('update cancel save', function() {
        me.updateAllPositions();
      });

      note.on('save', function(e, text) {
        me.annotManager.setNoteContents(annotation, text);
        if (annotation instanceof Annotations.FreeTextAnnotation) {
          me.annotManager.drawAnnotationsFromList([annotation]);
        }
        $doc.trigger('noteOnSave');
      });

      note.on('delete', function() {
        // delete will just delete the note, not the actual annotation unless it's a reply
        if (annotation.isReply()) {
          me.annotManager.deleteAnnotation(annotation);
        } else {
          me._deleteAnnotationReplies(annotation);

          if (note.isEmpty()) {
            me.annotManager.deleteAnnotation(annotation);
          } else {
            note.trigger('save', '');
          }
        }
      });

      // have to do this after the note is added to the note list or else we'll go into an infinite loop
      if (!imported && note instanceof RootNote) {
        // automatically start editing sticky notes
        if (annotation instanceof Annotations.StickyAnnotation) {
          setTimeout(function() {
            me.annotManager.selectAnnotation(annotation);
            me.editNote(annotation, true);
          }, 0);
        }
        $doc.trigger('createNoteReady', { context: this, annotation: annotation });
      }

      var noteContainer = note.getContainer();
      var adjustedAuthor = readerControl.docViewer.getAnnotationManager().getDisplayAuthor(annotation);
      $(noteContainer).find('.noteAuthor').text(adjustedAuthor);

      readerControl.fireEvent('noteCreated', [note.getAnnotation(), noteContainer]);

      return note;
    },

    _setupWaitingReplies: function(note) {
      var annotation = note.getAnnotation();

      // if the root note hasn't been created yet then remember that these notes need to be added to it
      if (!this.waitingForRootAnnot[annotation.InReplyTo]) {
        this.waitingForRootAnnot[annotation.InReplyTo] = [];
      }
      this.waitingForRootAnnot[annotation.InReplyTo].push(note);

      // if there were any replies to this annot that were added previously then we should set them
      // all to be waiting for this annotation's root parent
      var replyNotes = this.waitingForRootAnnot[annotation.Id];
      if (replyNotes) {
        var waitingAnnots = this.waitingForRootAnnot[annotation.InReplyTo];
        for (var i = 0; i < replyNotes.length; ++i) {
          waitingAnnots.push(replyNotes[i]);
        }
        delete this.waitingForRootAnnot[annotation.Id];
      }
    },

    // If filteredCallback is passed in then call that callback if the annotation
    // is not from one of the pages in fromPages
    _forAllNotes: function(callback, filteredCallback, fromPages) {
      var note;
      for (var annotId in this.notes) {
        note = this.notes[annotId];

        var isRoot = note instanceof RootNote;
        if (!isRoot) {
          continue;
        }

        if (typeof fromPages !== 'undefined') {
          if (fromPages.indexOf(note.getAnnotation().PageNumber - 1) === -1) {
            filteredCallback.call(this, note);
            continue;
          }
        }

        if (filteredCallback && !note.getAnnotation().isVisible()) {
          filteredCallback.call(this, note);
          continue;
        }

        callback.call(this, note);
      }
    },

    _getNote: function(annotation) {
      return this.notes[annotation.Id];
    },

    _getOrCreateNote: function(annotation, imported) {
      var note = this._getNote(annotation);
      if (!note) {
        note = this._createNote(annotation, imported);
      }
      return note;
    },

    appendNote: function(note) {
      this.$notesPanel.append(note.getElement());
    },

    updateNotePermission: function(annotation) {
      var note = this._getNote(annotation);
      if (note) {
        var newEditable = this.annotManager.canModifyContents(annotation);
        var newDeletable = this.annotManager.canModify(annotation);
        var newReplyable = !this.annotManager.getReadOnly();
        note.setEditable(newEditable);
        note.setDeletable(newDeletable);
        note.setReplyable(newReplyable);
      }
    },

    updateAllNotePermissions: function() {
      var me = this;
      this.annotManager.getAnnotationsList().forEach(function(annotation) {
        if (annotation.Listable) {
          me.updateNotePermission(annotation);
        }
      });
      this.updateAllPositions();
    },

    _jumpToAndSelectAnnotation: function(annotation) {
      this.annotManager.deselectAllAnnotations();
      this.annotManager.jumpToAnnotation(annotation);
      this.annotManager.selectAnnotation(annotation);
    },

    // gets the window position of the top right corner of the annotation
    getAnnotationPosition: function(annotation, displayMode) {
      var pageIndex = annotation.PageNumber - 1;

      var annotationCoordinates = {
        x: annotation.X + annotation.Width, // default value
        y: annotation.Y // default value
      };
      $doc.triggerHandler('getAnnotationPosition', { annotationCoordinates: annotationCoordinates });
      return displayMode.pageToWindow(new Annotations.Point(annotationCoordinates.x, annotationCoordinates.y), pageIndex);
    },

    // pass in the scrollHeight and barHeight so we don't have to calculate it on every call
    // this greatly improves performance in IE and moderately in other browsers
    updateOrCreateLine: function(annotation, scrollHeight, barHeight) {
      if (!annotation.isReply()) {
        var annotLine = this.getLine(annotation);

        if (!annotLine) {
          var me = this;

          annotLine = new AnnotLine(annotation, function() {
            me._jumpToAndSelectAnnotation(annotation);
          });
          this.$annotLines.append(annotLine.getElement());
          this.annotLines[annotation.Id] = annotLine;

          readerControl.fireEvent('annotationLineCreated', [annotation, annotLine.getElement()]);
        }

        var position = this.getAnnotationPosition(annotation, this.displayModeManager.getDisplayMode());
        var percentageThroughDocument = (position.y / scrollHeight);
        // takes into account padding for the scrollbar arrows at the bottom and top
        var notesBarHeight = (barHeight - this.annotLinesPadding * 2);
        var verticalPos = percentageThroughDocument * notesBarHeight + this.annotLinesPadding;

        annotLine.update(verticalPos);
      }
    },

    getLine: function(annotation) {
      return this.annotLines[annotation.Id];
    },

    removeLine: function(annotation) {
      var line = this.getLine(annotation);
      if (line) {
        line.remove();
        delete this.annotLines[annotation.Id];
      }
    },

    forAllLines: function(callback, filteredCallback, fromPages) {
      for (var annotId in this.annotLines) {
        var annotLine = this.annotLines[annotId];
        if (typeof fromPages !== 'undefined') {
          if (fromPages.indexOf(annotLine.getAnnotation().PageNumber - 1) === -1) {
            filteredCallback.call(this, annotLine);
            continue;
          }
        }

        if (filteredCallback && !annotLine.getAnnotation().isVisible()) {
          filteredCallback.call(this, annotLine);
          continue;
        }

        callback.call(this, annotLine);
      }
    },

    updateAllAnnotLines: function() {
      var scrollHeight = this.$scrollView[0].scrollHeight;
      var barHeight = this.$notesBar.height();
      for (var id in this.annotLines) {
        var line = this.annotLines[id];
        this.updateOrCreateLine(line.getAnnotation(), scrollHeight, barHeight);
      }
    },

    showAnnotLinesVisiblePages: function() {
      var fromPages = this.displayModeManager.getDisplayMode().getVisiblePages();

      this.forAllLines(function(line) {
        line.show();
      }, function(line) {
        line.hide();
      }, fromPages);
    },

    hideAllAnnotLines: function() {
      this.$annotLines.hide();
    },

    showAllAnnotLines: function() {
      this.$annotLines.show();
    },

    updateNotes: function(annotationList, imported) {
      var annotation, note;
      var scrollHeight = this.$scrollView[0].scrollHeight;
      var barHeight = this.$notesBar.height();
      for (var i = 0; i < annotationList.length; ++i) {
        annotation = annotationList[i];
        if (!annotation.Listable) {
          continue;
        }

        note = this._getOrCreateNote(annotation, imported);
        note.updateText();

        this.updateOrCreateLine(annotation, scrollHeight, barHeight);
      }

      this.updateAllPositions();
    },

    removeNotes: function(annotationList, imported) {
      var annotation, note;

      for (var i = 0; i < annotationList.length; ++i) {
        annotation = annotationList[i];
        if (!imported) {
          this._deleteAnnotationReplies(annotation);
        }

        note = this._getNote(annotation);
        if (note) {
          note.remove();
          delete this.notes[annotation.Id];
        }

        this.removeLine(annotation);
      }

      this.updateAllPositions();
    },

    _deleteAnnotationReplies: function(annotation) {
      var annotStack = [];
      annotStack.push(annotation);

      while (annotStack.length > 0) {
        var annot = annotStack.pop();

        var replies = annot.getReplies();
        for (var i = 0; i < replies.length; ++i) {
          annotStack.push(replies[i]);
        }

        if (annot !== annotation) {
          this.annotManager.deleteAnnotation(annot, false, true);
        }
      }
    },

    startAddingReply: function(annotation) {
      readerControl.showNotesPanel(true);
      var note = noteManager._getNote(annotation);
      if (note instanceof RootNote) {
        this._checkShouldSwitchSortMode(note);
        note.startAddingReply();
      }
    },

    selectNote: function(annotation) {
      var note = this._getNote(annotation);
      if (note) {
        note.select(this.annotManager.canModifyContents(annotation));
      }
    },

    deselectNote: function(annotation) {
      var note = this._getNote(annotation);
      if (note) {
        note.deselect(true);
      }
    },

    deselectAllNotes: function() {
      this._forAllNotes(function(note) {
        note.deselect(false);
      });
    },

    // switch to editing mode for the note associated with this annotation
    editNote: function(annotation, selectAll) {
      if (!annotation.Listable) {
        return;
      }

      this.readerControl.showNotesPanel(true);

      if (this.annotManager.getReadOnly()) {
        return;
      }

      var note = this._getOrCreateNote(annotation);

      if (!this.annotManager.canModifyContents(annotation)) {
        note.startAddingReply();
      } else {
        this._checkShouldSwitchSortMode(note);

        if (!note.isEditing()) {
          note.switchToEditingMode(selectAll);
        } else {
          note.focusInput();
        }
      }

      this.updateAllPositions();
    },

    _checkShouldSwitchSortMode: function(note) {
      // if we're searching and the note isn't visible then we should switch modes
      // so that all notes are visible again
      if (this.getSortStrategy() === searchSort && !note.isVisible()) {
        this.setSortStrategy(documentPositionSort);
      }
    },

    unhighlightAllNotes: function() {
      for (var annotId in this.notes) {
        this.notes[annotId].updateText();
      }
    },

    // removes the hidden class that is used for forcing a note to be hidden in a non-continuous display mode
    _showAllNotes: function() {
      this._forAllNotes(function(note) {
        note.getElement().removeClass('noteHidden');
      });
    },

    // get a list of notes ordered by the top positions of their annotations from top to bottom
    _getSortedNotes: function(wasResize) {
      var notes = [];
      var pageOffset = this.viewerOffset;

      var fromPages;
      var displayMode = this.displayModeManager.getDisplayMode();
      if (!displayMode.isContinuous()) {
        // if the display mode isn't continuous then we want to filter out annotations that aren't on visible pages
        fromPages = displayMode.getVisiblePages();
      }

      this._showAllNotes();

      function hideNote(note) {
        note.getElement().addClass('noteHidden');
      }

      this._forAllNotes(function(note) {
        if (!note.isVisible()) {
          return;
        }

        var topValue = this.sortStrategy.getTop(this, note, displayMode, pageOffset);
        note.setTop(topValue);
        // update the top position so that the height is more accurate which determines
        // whether the scrollbar is shown or not
        note.updateTopPosition();
        notes.push(note);
      }, hideNote, fromPages);

      notes = this.sortStrategy.filter(notes, hideNote);

      if (wasResize) {
        for (var noteId in this.notes) {
          this.notes[noteId].updateStaticTextHeight();
        }
      }

      // recalculate after only the necessary notes have been shown
      // so the scrollbar is correctly hidden or not
      notes.forEach(function(note) {
        note.collapseAllContents();
      });
      // this is very important that we collapse the notes first before recalculating the height
      // if we interleave collapsing and recalculating this will cause the browser to recalculate the layout
      // for every single note which is expensive
      notes.forEach(function(note) {
        note.recalculateHeight();
      });

      return this.sortStrategy.sort(notes);
    },

    updateBottomMargin: function(notes) {
      var container = this._getLastPageContainer().parent();
      var bottomMargin = parseFloat(container.css('margin-bottom')) || this.docViewer.getMargin();
      var finalMargin;

      var setMargin = false;

      // notes can be undefined in the case where the panel has been quickly hidden then shown again
      // in that case we can arive in this function via the close notification
      // but after then panel has already been made visible again
      if (notes && this._notesPanelVisible()) {
        if (notes.length > 0) {
          var bottomNote = notes[notes.length - 1];
          var lowestPosition = bottomNote.getTop() + bottomNote.getHeight();
          var docpadMargin = parseFloat(this.$docpad.css('margin-bottom'));
          // the natural height of the scroll view when just viewing the document
          var scrollViewHeight = this.$scrollView[0].scrollHeight - Math.max(0, bottomMargin - docpadMargin);

          // see if we need to create extra space to view all the notes
          if (lowestPosition > scrollViewHeight) {
            // docpad margin is added because the bottom of the page might not correspond to the bottom of the view
            // i.e. the page is constrained by horizontal room
            finalMargin = docpadMargin + lowestPosition - scrollViewHeight;
            setMargin = true;
          }
        }
      }

      if (!setMargin || this.sortStrategy.showListView()) {
        finalMargin = this.docViewer.getMargin();
      }

      container.css('margin-bottom', finalMargin);
      // if the margin changes then we need to update the annotation lines since they need to adjust based on the scrollbar height
      if (finalMargin !== this.lastBottomMargin) {
        this.lastBottomMargin = finalMargin;
        this.updateAllAnnotLines();
      }
    },

    updateAllPositions: function(wasResize) {
      if (!this._notesPanelVisible()) {
        return;
      }

      var sortedNotes = this._getSortedNotes(wasResize);
      var focusedNote = this.focusedAnnotation ? this._getNote(this.focusedAnnotation) : null;

      if (focusedNote === null || typeof focusedNote === 'undefined' || !focusedNote.isVisible()) {
        this._adjustPositions(sortedNotes);
        this.hideFocusConnector();
      } else if (this.sortStrategy.showListView()) {
        this._adjustPositions(sortedNotes);
        this.hideFocusConnector();

        var scrollTop = this.$notesPanel.scrollTop();
        var panelHeight = this.$notesPanel.height();
        var noteTop = focusedNote.getTop();

        if (noteTop < scrollTop || noteTop > scrollTop + panelHeight) {
          this.$notesPanel.scrollTop(noteTop);
        }
      } else {
        var focusedIndex = sortedNotes.indexOf(focusedNote);

        // first adjust the positions for all notes up to the focused note
        this._adjustPositions(sortedNotes.slice(0, focusedIndex));
        // next adjust everything upwards before the focused note if necessary
        this._adjustPositionsReverse(sortedNotes.slice(0, focusedIndex + 1));
        // finally adjust everything after the focused note
        this._adjustPositions(sortedNotes.slice(focusedIndex));
      }

      this.updateBottomMargin(sortedNotes);

      if (this.sortStrategy.showListView()) {
        // not list views the notes panel should be its natural height
        this.$dummyScrollElement.css('top', 0);
      } else {
        // makes sure that the scroll bar will always be there (though hidden)
        this.$dummyScrollElement.css('top', this.$scrollView[0].scrollHeight);
      }

      noteManager.alignViews();

      if (focusedNote && focusedNote.isVisible() && this._notesPanelVisible()) {
        this.updateFocusConnector();
        this.showFocusConnector();
      }
    },

    _adjustPositionsReverse: function(notes) {
      var note, prevNote, nextTop;
      for (var i = notes.length - 1; i >= 0; --i) {
        note = notes[i];
        if (i !== notes.length - 1) {
          prevNote = notes[i + 1];
          // check if the previous note should push this note upwards
          nextTop = prevNote.getTop() - note.getHeight() - this.noteMargin;
          if (nextTop < note.getTop()) {
            note.setTop(nextTop);
          } else {
            // if we didn't have to adjust the previous note then the remaining notes are placed ok
            break;
          }
        }

        note.updateTopPosition();
      }
    },

    _adjustPositions: function(notes) {
      var note, prevNote, nextTop;
      for (var i = 0; i < notes.length; ++i) {
        note = notes[i];
        if (i !== 0) {
          prevNote = notes[i - 1];
          // check if the previous note should push this note downwards
          nextTop = prevNote.getTop() + prevNote.getHeight() + this.noteMargin;
          if (nextTop > note.getTop()) {
            note.setTop(nextTop);
          }
        }

        note.updateTopPosition();
      }
    },

    _notesPanelVisible: function() {
      return !this.$notesPanelWrapper.hasClass('hidden');
    },

    showFocusConnector: function() {
      if (!this.sortStrategy.showListView()) {
        this.focusConnector.show();
      }
    },

    hideFocusConnector: function() {
      this.focusConnector.hide();
    },

    updateFocusConnector: function() {
      var displayMode = this.displayModeManager.getDisplayMode();

      if (this.focusedAnnotation) {
        var focusedNote = this._getNote(this.focusedAnnotation);
        if (focusedNote) {
          var annotPosition = this.getAnnotationPosition(focusedNote.getAnnotation(), displayMode);
          // var leftMargin = parseFloat(this.$scrollView.css('margin-left'));
          var leftMargin = parseFloat(this.$scrollView.position().left);
          var leftScroll = this.$scrollView.scrollLeft();
          // add small offset from top of annotation
          var buffer = 5;
          var lineTop = focusedNote.getTop() + this.viewerOffset + buffer;
          var noteLeftMargin = parseFloat(focusedNote.getElement().css('margin-left')) + this.$notesBar.width();

          // check if the annotation is aligned horizontally with the note
          // if not then we need to draw more than one line
          var noteDiff = annotPosition.y - (lineTop - buffer);
          var totalWidth = this.$scrollView.width() + leftScroll + leftMargin + noteLeftMargin - annotPosition.x - 5;
          var noteTop = lineTop - this.$notesPanel.scrollTop();
          var noteRight = this.$notesPanelWrapper.width() - noteLeftMargin;

          this.focusConnector.updatePosition(totalWidth, {
            top: noteTop,
            right: noteRight
          }, noteDiff);
        }
      }
    },

    focusAnnotation: function(annotation) {
      if (this.focusedAnnotation) {
        this.unFocusAnnotation();
      }

      this.focusedAnnotation = annotation;
      if (annotation.Listable) {
        var note = this._getNote(annotation);
        if (note) {
          note.showReplyBox();
        }
      }
      $doc.trigger('annotationOnFocus', { annotation: annotation });
    },

    unFocusAnnotation: function() {
      if (this.focusedAnnotation && this.focusedAnnotation.Listable) {
        var note = this._getNote(this.focusedAnnotation);
        if (note) {
          note.removeAllDeleteConfirmations();
          note.hideReplyBox();
        }
      }
      this.focusedAnnotation = null;
      this.hideFocusConnector();
    },

    updatePositionsWithoutAnimations: function() {
      this._forAllNotes(function(note) {
        note._disableAnimations();
      });

      this.updateAllPositions();

      for (var annotId in this.notes) {
        // reading the offsetHeight is a way to force the repainting of the notes
        // so that the noTransition class will be applied correctly and be removed right after
        // only need to do this on one element so break after the first one
        if (this.notes[annotId].getElement) {
          var element = this.notes[annotId].getElement();
          // eslint-disable-next-line no-unused-expressions
          element[0].offsetHeight;
          break;
        }
      }

      this._forAllNotes(function(note) {
        note._enableAnimations();
      });
    },

    _getLastPageContainer: function() {
      var pageIndex;

      if (this.displayModeManager.getDisplayMode().isContinuous()) {
        pageIndex = this.docViewer.getPageCount() - 1;
      } else {
        pageIndex = this.docViewer.getCurrentPage() - 1;
      }

      return this.$scrollView.find('#pageContainer' + pageIndex);
    },

    getPanelAdjustment: function() {
      if (this.sortStrategy.showListView()) {
        return 0;
      }
      return this.$notesPanel.width() - this.$notesPanel[0].scrollWidth;
    },

    alignViews: function() {
      if (!this.sortStrategy.showListView() && readerControl.notesPanelVisible()) {
        var scrollViewPosition = this.$scrollView.scrollTop();
        var notesPanelPosition = this.$notesPanel.scrollTop();

        if (scrollViewPosition !== notesPanelPosition) {
          ++this.scrollViewScrollingCount;
          this.$notesPanel.scrollTop(this.$scrollView.scrollTop());
        }
      }
    },

    dispose: function() {
      for (var annotId in this.notes) {
        this.notes[annotId].remove();
      }
      this.forAllLines(function(line) {
        line.remove();
      });
    }
  };

  $.extend(NoteManager.prototype, window.utils.eventHandler);


  var $document = $(document);
  var $notesPanelWrapper = $('#notesPanelWrapper');
  var $notesPanel = $notesPanelWrapper.find('#notesPanel');
  var $notesBar = $notesPanelWrapper.find('#notesBar');
  var $panelToggleArrow = $notesBar.find('.toggleNotesButton');
  var $scrollView = $('#DocumentViewer');
  var noteOptionsHeight;

  function setVisibility(newVisibility) {
    if (newVisibility) {
      noteManager.showAllAnnotLines();
      $notesPanelWrapper.resizable('enable');
      $panelToggleArrow.removeClass('chevron-left').addClass('chevron-right');
    } else {
      noteManager.hideAllAnnotLines();
      $notesPanelWrapper.resizable('disable');
      $panelToggleArrow.removeClass('chevron-right').addClass('chevron-left');
    }
  }

  function resizePanel() {
    // cap the width of the panel depending on the window size
    var wrapperWidth = $notesPanelWrapper.width();
    var availableWidth = window.innerWidth;
    var maxWidth = Math.max(availableWidth * 0.45, MIN_PANEL_WIDTH);

    $notesPanelWrapper.resizable('option', 'maxWidth', maxWidth);

    // if we just resized to a smaller width then cap the current size of the panel
    if (wrapperWidth > maxWidth) {
      $notesPanelWrapper.width(maxWidth);
    }
  }

  $panelToggleArrow.on('click', function() {
    readerControl.showNotesPanel(!readerControl.notesPanelVisible());
  });

  var MIN_PANEL_WIDTH = 200;
  var DEFAULT_WIDTH = 300;
  var resizeHidden = false;

  $notesPanelWrapper.resizable({
    handles: 'w',
    resize: function() {
      // workaround issue with jQuery UI resizable (https://groups.google.com/forum/?hl=en#!topic/jquery-ui/Ne09qPX-L0w)
      $notesPanelWrapper.css('left', '');

      if (resizeHidden) {
        // if the panel has been hidden by going below the minimum width then we should ignore future resize events until they stop
        $notesPanelWrapper.width(DEFAULT_WIDTH);
        return;
      }

      readerControl.shiftSidePanel(false);
      noteManager.hideFocusConnector();

      var wrapperWidth = $notesPanelWrapper.width();
      if (wrapperWidth < MIN_PANEL_WIDTH) {
        readerControl.showNotesPanel(false);
        $notesPanelWrapper.width(DEFAULT_WIDTH);
        resizeHidden = true;
      } else {
        var diff = noteManager.getPanelAdjustment();
        $notesPanel.width(wrapperWidth + diff);
      }
    },
    stop: function() {
      docViewer.scrollViewUpdated();
      resize();
      resizeHidden = false;
    }
  });
  // disable it initially
  $notesPanelWrapper.resizable('disable');

  var readerControl, docViewer, annotManager, displayModeManager, noteManager;

  $document.on('viewerLoaded', function() {
    readerControl = window.readerControl;
    docViewer = readerControl.docViewer;
    displayModeManager = docViewer.getDisplayModeManager();

    docViewer.on('fitModeUpdated rotationUpdated', function() {
      async(function() {
        if (noteManager) {
          noteManager.updateAllPositions();
        }
      });
    });

    docViewer.on('pageNumberUpdated', function() {
      var displayMode = displayModeManager.getDisplayMode();
      if (!displayMode.isContinuous()) {
        async(function() {
          noteManager.updatePositionsWithoutAnimations();
          noteManager.showAnnotLinesVisiblePages();
          noteManager.updateAllAnnotLines();
        });
      }
    });

    $('#noteTypeRadio').buttonset();
    var $noteOptions = $('#noteOptions');

    $('#noteOptionsButton').on('click', function() {
      $noteOptions.fadeIn('fast');
    });

    $noteOptions.find('#documentSortButton').on('click', function() {
      noteManager.setSortStrategy(documentPositionSort);
    });

    $noteOptions.find('#timeSortButton').on('click', function() {
      noteManager.setSortStrategy(timeSort);
    });

    var $searchBox = $noteOptions.find('#commentSearchBox');
    $searchBox.on('keyup', _.debounce(function() {
      var searchTerm = $searchBox.val().toLowerCase();
      if (searchTerm === '') {
        noteManager.setSortStrategy(documentPositionSort);
        return;
      }

      searchSort.setSearchTerm(searchTerm);
      noteManager.setSortStrategy(searchSort);
    }, 300));

    var hiding = false;
    var $toggleButton = $noteOptions.find('#toggleAnnotationsButton');
    $toggleButton.on('click', function() {
      var annotManager = readerControl.docViewer.getAnnotationManager();
      if (hiding) {
        annotManager.showAnnotations(annotManager.getAnnotationsList());
        $toggleButton.attr('data-i18n', 'annotations.buttonHide').i18n();
      } else {
        annotManager.hideAnnotations(annotManager.getAnnotationsList());
        $toggleButton.attr('data-i18n', 'annotations.buttonShow').i18n();
      }
      hiding = !hiding;
    });

    $noteOptions.find('#saveAnnotationsButton').on('click', function() {
      noteManager.deselectAllNotes();
      readerControl.saveAnnotations();
    });

    $noteOptions.find('#noteOptionsCloseButton').on('click', function() {
      if (noteManager.getSortStrategy() === searchSort) {
        noteManager.setSortStrategy(documentPositionSort);
      }
      $noteOptions.fadeOut('fast');
    });

    annotManager = docViewer.getAnnotationManager();
    annotManager.on('annotationHidden', function() {
      noteManager.updateAllPositions();
      noteManager.forAllLines(function(line) {
        line.show();
      }, function(line) {
        line.hide();
      });
    });

    annotManager.on('annotationChanged', function(e, annotations, action) {
      if (action === 'add' || action === 'modify') {
        noteManager.updateNotes(annotations, e.imported);
      } else if (action === 'delete') {
        noteManager.removeNotes(annotations, e.imported);
      }
    });

    annotManager.on('annotationDoubleClicked', function(e, annotation) {
      if (!(annotation instanceof Annotations.FreeTextAnnotation) && annotation.Listable) {
        noteManager.editNote(annotation);
      }
      $doc.trigger('annotationDoubleClicked', { noteManager: noteManager, annotation: annotation });
    });

    annotManager.on('annotationSelected', function(e, annotations, action) {
      if (annotations === null && action === 'deselected') {
        noteManager.deselectAllNotes();
      } else {
        for (var i = 0; i < annotations.length; ++i) {
          var annotation = annotations[i];

          if (action === 'selected') {
            noteManager.selectNote(annotation);
          } else {
            noteManager.deselectNote(annotation);
          }
        }
      }


      var selectedAnnots = annotManager.getSelectedAnnotations();
      if (selectedAnnots.length === 1) {
        noteManager.focusAnnotation(selectedAnnots[0]);
      } else {
        noteManager.unFocusAnnotation();
      }

      noteManager.updateAllPositions();
    });
  });

  $document.on('documentLoaded', function() {
    resize();

    if (noteManager) {
      noteManager.dispose();
      noteManager.setDefaults();
    } else {
      var viewerOffset = $('#control').height() + docViewer.getMargin();
      noteManager = new NoteManager(readerControl, $scrollView, $notesPanelWrapper, viewerOffset);
      window.noteManager = noteManager;

      noteManager.on('sortStrategyChanged', function() {
        resize();

        if (noteManager.getSortStrategy() === searchSort) {
          $('#noteTypeRadio input').prop('checked', false).button('refresh');
        } else {
          $('#commentSearchBox').val('');
          noteManager.unhighlightAllNotes();

          if (noteManager.getSortStrategy() === timeSort) {
            $('#noteTypeRadio #timeRadio').prop('checked', true).button('refresh');
          } else if (noteManager.getSortStrategy() === documentPositionSort) {
            $('#noteTypeRadio #documentRadio').prop('checked', true).button('refresh');
          }
        }
      });

      $document.on('notesPanelBecomingVisible', function() {
        // need to resize here so that it happens before the pages are rendered
        // so they can take into account the correct amount of space
        resizePanel();
      });

      $document.on('notesPanelVisibilityChanged', function(e, visible) {
        setVisibility(visible);

        if (visible) {
          noteManager.alignViews();
          resize();
          noteOptionsHeight = $('#noteOptions').outerHeight();
        } else {
          // makes sure that the bottom margin is correct when the panel is closed
          // as it may have been enlarged because of many notes
          noteManager.updateBottomMargin();
          noteManager.hideFocusConnector();
        }
      });

      $document.on('sidePanelVisibilityChanged', function() {
        noteManager.updateAllPositions();
      });
    }
  });

  $document.on('startAddingReply', function(e, annotation) {
    noteManager.startAddingReply(annotation);
  });

  $document.on('updateAnnotationPermission', function(e, annotation) {
    if (noteManager) {
      if (annotation) {
        noteManager.updateNotePermission(annotation);
      } else {
        noteManager.updateAllNotePermissions();
      }
    }
  });

  // call this function asynchronously
  function async(func) {
    setTimeout(func, 0);
  }

  function resize(e) {
    if (e && e.target !== window && !readerControl) {
      return;
    }

    resizePanel();

    $notesPanel.height(readerControl.getViewerHeight());
    $notesPanelWrapper.height(readerControl.getViewerHeight());

    if (readerControl.notesPanelVisible()) {
      if (!$notesPanel.hasClass('hidden')) {
        async(function() {
          var diff = noteManager.getPanelAdjustment();
          $notesPanel.width($notesPanelWrapper.width() - $notesBar.width() + diff);

          noteManager.updateAllPositions(true);
          noteManager.updateAllAnnotLines();
        });
      }
    }
  }

  $(window).on('resize', resize);

  $notesPanel.on('click', function(e) {
    if (e.target === this) {
      annotManager.deselectAllAnnotations();
    }
  });
});
