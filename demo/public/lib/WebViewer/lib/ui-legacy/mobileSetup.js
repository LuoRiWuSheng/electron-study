(function() {
  /*! jQuery Mobile v1.3.2 | Copyright 2010, 2014 jQuery Foundation, Inc. | jquery.org/license */
  // This needs to be loaded after jQuery but before jQuery mobile
  $(document).bind('mobileinit', function() {
    // so that parameters can be passed after the '#'
    $.mobile.hashListeningEnabled = false;
    // so that buttons don't get stuck in an active state
    $.mobile.activeBtnClass = 'custom-active';

    $.event.special.tap.emitTapOnTaphold = false;

    // jQuery mobile 1.4 changed swipe events so that they're triggered before letting go of a touch
    // this code is from 1.3.2 and restores the old behavior so that a swipe isn't triggered until the touch ends
    var supportTouch = $.mobile.support.touch;
    var touchStartEvent = supportTouch ? 'touchstart' : 'mousedown';
    var touchStopEvent = supportTouch ? 'touchend' : 'mouseup';
    var touchMoveEvent = supportTouch ? 'touchmove' : 'mousemove';

    $.event.special.swipe = {
      scrollSupressionThreshold: 30, // More than this horizontal displacement, and we will suppress scrolling.
      durationThreshold: 1000, // More time than this, and it isn't a swipe.
      horizontalDistanceThreshold: 30, // Swipe horizontal displacement must be more than this.
      verticalDistanceThreshold: 75, // Swipe vertical displacement must be less than this.

      start: function(event) {
        var data = event.originalEvent.touches ?
          event.originalEvent.touches[0] : event;
        return {
          time: (new Date()).getTime(),
          coords: [data.pageX, data.pageY],
          origin: $(event.target)
        };
      },

      stop: function(event) {
        var data = event.originalEvent.touches ?
          event.originalEvent.touches[0] : event;
        return {
          time: (new Date()).getTime(),
          coords: [data.pageX, data.pageY]
        };
      },

      handleSwipe: function(start, stop) {
        if (stop.time - start.time < $.event.special.swipe.durationThreshold &&
                    Math.abs(start.coords[0] - stop.coords[0]) > $.event.special.swipe.horizontalDistanceThreshold &&
                    Math.abs(start.coords[1] - stop.coords[1]) < $.event.special.swipe.verticalDistanceThreshold) {
          start.origin.trigger('swipe')
            .trigger(start.coords[0] > stop.coords[0] ? 'swipeleft' : 'swiperight');
        }
      },

      setup: function() {
        var thisObject = this,
          $this = $(thisObject);

        $this.bind(touchStartEvent, function(event) {
          var start = $.event.special.swipe.start(event),
            stop;

          function moveHandler(event) {
            if (!start) {
              return;
            }

            stop = $.event.special.swipe.stop(event);

            // prevent scrolling
            if (Math.abs(start.coords[0] - stop.coords[0]) > $.event.special.swipe.scrollSupressionThreshold) {
              event.preventDefault();
            }
          }

          $this.bind(touchMoveEvent, moveHandler)
            .one(touchStopEvent, function() {
              $this.unbind(touchMoveEvent, moveHandler);

              if (start && stop) {
                $.event.special.swipe.handleSwipe(start, stop);
              }
              start = undefined;
              stop = undefined;
            });
        });
      }
    };
  });
})();