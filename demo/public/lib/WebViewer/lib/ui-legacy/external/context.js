/*
 * Context.js
 * Copyright Jacob Kelley
 * MIT License
 */

var context = context || (function () {
	"use strict";

	var options = {
		fadeSpeed: 100,
		filter: function ($obj) {
			// Modify $obj, Do not return
		},
		above: 'auto',
		preventDoubleContext: true,
		compress: false,
		minWidth: true
	};

	var contextIds = {};
	var element = null;

	function hideMenu(options) {
		$('.dropdown-menu').fadeOut(options.fadeSpeed, function() {
			$('.dropdown-menu').css({display:''}).find('.drop-left').removeClass('drop-left');
		});
	}

	function initialize(opts) {

		options = $.extend({}, options, opts);

		$(document).on('click', 'html', function () {
			hideMenu(options);
		});
		if(options.preventDoubleContext){
			$(document).on('contextmenu', '.dropdown-menu', function (e) {
				e.preventDefault();
			});
		}
		$(document).on('mouseenter', '.dropdown-submenu', function(){
			var $sub = $(this).find('.dropdown-context-sub:first'),
				subWidth = $sub.width(),
				subLeft = $sub.offset().left,
				collision = (subWidth+subLeft) > window.innerWidth;
			if(collision){
				$sub.addClass('drop-left');
			}
		});

	}

	function updateOptions(opts) {
		options = $.extend({}, options, opts);
	}

	function buildMenu(data, id, subMenu) {
		var subClass = (subMenu) ? ' dropdown-context-sub' : '',
			compressed = options.compress ? ' compressed-context' : '',
			contextArrow = options.right ? '' : ' dropdown-context',
			$menu = $('<ul class="dropdown-menu' + contextArrow + subClass + compressed + '" id="dropdown-' + id + '"></ul>');
			if (!options.minWidth) {
				$menu.css('min-width', 0);
			}

		if (_.isElement(data)) {
			$menu.append(data);
			return $menu;
		}

        var i = 0, linkTarget = '', $sub;
        for(i; i<data.length; i++) {
        	if (typeof data[i].divider !== 'undefined') {
				$menu.append('<li class="divider"></li>');
			} else if (typeof data[i].header !== 'undefined') {
				$menu.append('<li class="nav-header" data-i18n="' + data[i].header + '"></li>');
			} else {
				if (typeof data[i].href == 'undefined') {
					data[i].href = '#';
				}
				if (typeof data[i].target !== 'undefined') {
					linkTarget = ' target="'+data[i].target+'"';
				}
				if (typeof data[i].subMenu !== 'undefined') {
					$sub = ('<li class="dropdown-submenu"><a tabindex="-1" href="' + data[i].href + '">' + data[i].text + '</a></li>');
				} else {
					$sub = $('<li><a tabindex="-1" href="' + data[i].href + '"'+linkTarget+' data-i18n="' + data[i].text + '"></a></li>');
				}
				if (typeof data[i].action !== 'undefined') {
					var actiond = new Date(),
						actionID = 'event-' + actiond.getTime() * Math.floor(Math.random()*100000),
						eventAction = data[i].action;
					$sub.find('a').attr('id', actionID);
					$('#' + actionID).addClass('context-event');
					$(document).on('click', '#' + actionID, eventAction);
				}
				$menu.append($sub);
				if (typeof data[i].subMenu != 'undefined') {
					var subMenuData = buildMenu(data[i].subMenu, id, true);
					$menu.find('li:last').append(subMenuData);
				}
			}
			if (typeof options.filter == 'function') {
				options.filter($menu.find('li:last'));
			}
		}
		return $menu;
	}

	function addContext(selector, data) {

		var id = _.uniqueId(),
			$menu = buildMenu(data, id);

		$('body').append($menu);

		contextIds[id] = {
			options: $.extend({}, options),
			attachedElement: $(selector)
		};
		element = $menu;

		function getHandler(id) {
			return function handler(e) {
				if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
					return;
				}

				e.preventDefault();
				e.stopPropagation();

				$('.dropdown-context:not(.dropdown-context-sub)').hide();

				var $dd = $('#dropdown-' + id);

				if (contextIds[id].options.click && $dd.is(':visible')) {
					// toggle with click button
					hideMenu(contextIds[id].options);
					return;
				}

				if (contextIds[id].options.right) {
					var height = contextIds[id].attachedElement.height();
					var width = contextIds[id].attachedElement.width();
					var offset = contextIds[id].attachedElement.offset();

					$dd.css({
						top: offset.top + height,
						right: window.innerWidth - (offset.left + width),
						left: 'auto'
					}).fadeIn(contextIds[id].options.fadeSpeed);
					return;
				}

				if (typeof contextIds[id].options.above === 'boolean' && contextIds[id].options.above) {
					$dd.addClass('dropdown-context-up').css({
						top: e.pageY - 20 - $('#dropdown-' + id).height(),
						left: e.pageX - 13
					}).fadeIn(contextIds[id].options.fadeSpeed);
				} else if (typeof contextIds[id].options.above === 'string' && contextIds[id].options.above === 'auto') {
					$dd.removeClass('dropdown-context-up');
					var autoH = $dd.height() + 12;

					if ((e.pageY + autoH) > $('html').height()) {
						$dd.addClass('dropdown-context-up').css({
							top: e.pageY - 20 - autoH,
							left: e.pageX - 13
						}).fadeIn(contextIds[id].options.fadeSpeed);
					} else {
						$dd.css({
							top: e.pageY + 10,
							left: e.pageX - 13
						}).fadeIn(contextIds[id].options.fadeSpeed);
					}
				}
			};
		}

		if (contextIds[id].options.click) {
			contextIds[id].attachedElement.on('click', getHandler(id));
		} else {
			$(document).on('contextmenu', selector, getHandler(id));
		}
	}

	function destroyContext(selector) {
		$(document).off('contextmenu', selector).off('click', '.context-event');
	}

	function getElement() {
		return element;
	}

	return {
		init: initialize,
		settings: updateOptions,
		attach: addContext,
		destroy: destroyContext,
		getElement: getElement
	};
})();