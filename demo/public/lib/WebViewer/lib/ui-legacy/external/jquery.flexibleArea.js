/*!
* flexibleArea.js v1.2
* A jQuery plugin that dynamically updates textarea's height to fit the content.
* http://flaviusmatis.github.com/flexibleArea.js/
*
* Copyright 2012, Flavius Matis
* Released under the MIT license.
* http://flaviusmatis.github.com/license.html
*/

(function($){
	var methods = {
		init : function() {

			var styles = [
				'paddingTop',
				'paddingRight',
				'paddingBottom',
				'paddingLeft',
				'fontSize',
				'lineHeight',
				'fontFamily',
				'width',
				'fontWeight',
				'border-top-width',
				'border-right-width',
				'border-bottom-width',
				'border-left-width',
				'-moz-box-sizing',
				'-webkit-box-sizing',
				'box-sizing'
			];

			return this.each(function() {

				// only initialize this once
				if (this.initialized) {
					return;
				}
				this.initialized = true;

				if (this.type !== 'textarea')	return false;
					
				var $textarea = $(this).css({'resize': 'none', overflow: 'hidden'});

				var	$clone = $('<div></div>').css({
					'position' : 'absolute',
					'display' : 'none',
					'word-wrap' : 'break-word',
					'white-space' : 'pre-wrap',
					'border-style' : 'solid'
				}).appendTo(document.body);

				$textarea.data("clone", $clone);

				function copyStyles() {
					var copiedStyles = {};
					var currentStyles = $textarea.css(styles);
					for (var i = 0; i < styles.length; i++) {
						copiedStyles[styles[i]] = currentStyles[styles[i]];
					}
					$clone.css(copiedStyles);
				}

				// Apply textarea styles to clone
				copyStyles();

				var hasBoxModel = $textarea.css('box-sizing') == 'border-box' || $textarea.css('-moz-box-sizing') == 'border-box' || $textarea.css('-webkit-box-sizing') == 'border-box';
				var heightCompensation = parseInt($textarea.css('border-top-width')) + parseInt($textarea.css('padding-top')) + parseInt($textarea.css('padding-bottom')) + parseInt($textarea.css('border-bottom-width'));
				var textareaHeight = parseInt($textarea.css('height'), 10);
				var lineHeight = parseInt($textarea.css('line-height'), 10) || parseInt($textarea.css('font-size'), 10);
				var minheight = lineHeight * 2;// > textareaHeight ? lineHeight * 2 : textareaHeight;
				var maxheight = parseInt($textarea.css('max-height'), 10) > -1 ? parseInt($textarea.css('max-height'), 10) : Number.MAX_VALUE;

				function updateHeight() {
					var textareaContent = $textarea.val().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;').replace(/\n/g, '<br/>');
					// Adding an extra white space to make sure the last line is rendered.
					$clone.html(textareaContent + '&nbsp;');
					setHeightAndOverflow();
				}

				function setHeightAndOverflow() {
					// need to update width because it will be incorrect for percentage widths
					$clone.css('width', $textarea.width());
					var cloneHeight = $clone.height();
					var overflow = 'hidden';
					var height = hasBoxModel ? cloneHeight + lineHeight + heightCompensation : cloneHeight + lineHeight;
					if (height > maxheight) {
						height = maxheight;
						overflow = 'auto';
					} 
					else if (height < minheight) {
						height = minheight;
					}

					if (parseFloat($textarea.css('height')) !== height) {
						$textarea.css({'overflow': overflow, 'height': height + 'px'});
						$textarea.trigger('heightChanged');
					}
				}

				// Update textarea size on keyup, change, cut and paste
				function update() {
					updateHeight();
					$textarea.trigger('update');
				}

				$textarea.bind('keyup change cut paste', function(e) {
					if (e.type === 'paste') {
						setTimeout(update, 0);
					} else {
						update();
					}
				});

				/* this isn't necessary since our popups stay the same size regardless of the window size */
				// Update textarea on window resize
				// $(window).bind('resize', function(){
				// 	var cleanWidth = parseInt($textarea.width(), 10);
				// 	if ($clone.width() !== cleanWidth) {
				// 		$clone.css({'width': cleanWidth + 'px'});
				// 		updateHeight();
				// 	}
				// });

				// Update textarea on blur
				$textarea.bind('blur',function(){
					setHeightAndOverflow();
				});

				// Update textarea when needed
				$textarea.bind('updateHeight', function(){
					copyStyles();
					updateHeight();
				});

				// Wait until DOM is ready to fix IE7+ stupid bug
				$(function(){
					updateHeight();
				});
			});
		},

		remove: function() {
			// clean up the clone when the textarea is removed
			this.unbind();

			this.each(function() {
				if (this.initialized) {
					// "this" is the current textarea we're looking at
					var $this = $(this);
					var $clone = $this.data("clone");
					$clone.remove();

					$this.removeData("clone");
				}
			});
		}
	};

	$.fn.flexible = function(method) {
		// Method calling logic
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || ! method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error('Method ' + method + ' does not exist on jQuery.flexible');
		}
	};

})(jQuery);
