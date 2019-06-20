(function($) {
    $.fn.doubletap = function(fn) {
        return fn ? this.bind('doubletap', fn) : this.trigger('doubletap');
    };

    var DOUBLETAP_TIME = 500;
    // half the size of the square around the first tap that the second tap can be in to be counted as a double tap
    var DIST_THRESHOLD = 20;

    var lastLoc = { x: 0, y: 0 };

    $.event.special.doubletap = {
        setup: function(data, namespaces) {
            $(this).bind('touchstart', $.event.special.doubletap.handler);
        },

        teardown: function(namespaces) {
            $(this).unbind('touchstart', $.event.special.doubletap.handler);
        },

        handler: function(event) {
            if (event.originalEvent.touches.length <= 1) {
                var action;

                clearTimeout(action);

                var validLoc = true;
                var loc;
                if (event.originalEvent.changedTouches) {
                    loc = {x: event.originalEvent.changedTouches[0].clientX, y: event.originalEvent.changedTouches[0].clientY};
                    validLoc = Math.abs(loc.x - lastLoc.x) < DIST_THRESHOLD && Math.abs(loc.y - lastLoc.y) < DIST_THRESHOLD;
                }

                var now = new Date().getTime();
                //the first time this will make delta a negative number
                var lastTouch = $(this).data('lastTouch') || now + 1;
                var delta = now - lastTouch;
                var delay = delay == null ? DOUBLETAP_TIME : delay;

                if (!validLoc) {
                    $(this).data('lastTouch', now);
                    lastLoc = loc;
                    return;
                }

                if (delta < delay && delta > 0) {
                    // After we detct a doubletap, start over
                    $(this).data('lastTouch', null);

                    // set event type to 'doubletap'
                    event.type = 'doubletap';

                    // let jQuery handle the triggering of "doubletap" event handlers
                    $(this).trigger(event, arguments);
                } else {
                    $(this).data('lastTouch', now);

                    action = setTimeout(function(evt) {
                        // set event type to 'doubletap'
                        event.type = 'tap';

                        // let jQuery handle the triggering of "doubletap" event handlers
                        $(this).trigger(event, arguments);

                        clearTimeout(action); // clear the timeout
                    }, delay, [event]);
                }
            }
        }
    };
})(jQuery);