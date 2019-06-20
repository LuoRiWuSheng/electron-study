(function(window) {
	var IE_10		= !!window.navigator.msPointerEnabled,
		// Check below can mark as IE11+ also other browsers which implements pointer events in future
		// that is not issue, because touch capability is tested in IF statement bellow.
		IE_11_PLUS	= !!window.navigator.pointerEnabled;

	// Only pointer enabled browsers without touch capability.
	if (IE_10 || (IE_11_PLUS && !('ontouchstart' in window))) {
		var document = window.document,
			POINTER_DOWN	= IE_11_PLUS ? "pointerdown" : "MSPointerDown",
			POINTER_UP 		= IE_11_PLUS ? "pointerup" : "MSPointerUp",
			POINTER_MOVE	= IE_11_PLUS ? "pointermove" : "MSPointerMove",
			POINTER_OUT		= IE_11_PLUS ? "pointerout" : "MSPointerOut",
			GESTURE_START	= "MSGestureStart",
			GESTURE_CHANGE	= "MSGestureChange",
			GESTURE_END		= "MSGestureEnd",
			TOUCH_ACTION	= IE_11_PLUS ? "touchAction" : "msTouchAction",
			createEvent = function (eventName, target, params) {
				var k,
					event = document.createEvent("Event");

				event.initEvent(eventName, true, true);
				for (k in params) {
					event[k] = params[k];
				}
				target.dispatchEvent(event);
			},
			/**
			 * ECMAScript 5 accessors to the rescue
			 * @see http://perfectionkills.com/how-ecmascript-5-still-does-not-allow-to-subclass-an-array/
			 */
			makeSubArray = (function() {
				var MAX_SIGNED_INT_VALUE = Math.pow(2, 32) - 1,
					hasOwnProperty = Object.prototype.hasOwnProperty;

				function ToUint32(value) {
					return value >>> 0;
				}

				function getMaxIndexProperty(object) {
					var maxIndex = -1,
						isValidProperty,
						prop;

					for (prop in object) {

						isValidProperty = (
							String(ToUint32(prop)) === prop &&
								ToUint32(prop) !== MAX_SIGNED_INT_VALUE &&
								hasOwnProperty.call(object, prop));

						if (isValidProperty && prop > maxIndex) {
							maxIndex = prop;
						}
					}
					return maxIndex;
				}

				return function(methods) {
					var length = 0;
					methods = methods || { };

					methods.length = {
						get: function() {
							var maxIndexProperty = +getMaxIndexProperty(this);
							return Math.max(length, maxIndexProperty + 1);
						},
						set: function(value) {
							var constrainedValue = ToUint32(value);
							if (constrainedValue !== +value) {
								throw new RangeError();
							}
							for (var i = constrainedValue, len = this.length; i < len; i++) {
								delete this[i];
							}
							length = constrainedValue;
						}
					};
					methods.toString = {
						value: Array.prototype.join
					};
					return Object.create(Array.prototype, methods);
				};
			})(),
			// methods passed to TouchList closure method to extend Array
			touchListMethods = {
				/**
				 * Returns touch by id. This method fulfill the TouchList interface.
				 * @param {Number} id
				 * @returns {Touch}
				 */
				identifiedTouch: {
					value: function (id) {
						var length = this.length;
						while (length--) {
							if (this[length].identifier === id) return this[length];
						}
						return undefined;
					}
				},
				/**
				 * Returns touch by index. This method fulfill the TouchList interface.
				 * @param {Number} index
				 * @returns {Touch}
				 */
				item: {
					value: function (index) {
						return this[index];
					}
				},
				/**
				 * Returns touch index
				 * @param {Touch} touch
				 * @returns {Number}
				 */
				_touchIndex: {
					value: function (touch) {
						var length = this.length;
						while (length--) {
							if (this[length].pointerId == touch.pointerId) return length;
						}
						return -1;
					}
				},

				/**
				 * Add all events and convert them to touches
				 * @param {Event[]} events
				 */
				_addAll: {
					value: function(events) {
						var i = 0,
							length = events.length;

						for (; i < length; i++) {
							this._add(events[i]);
						}
					}
				},

				/**
				 * Add and MSPointer event and convert it to Touch like object
				 * @param {Event} event
				 */
				_add: {
					value: function(event) {
						var index = this._touchIndex(event);

						index = index < 0 ? this.length : index;

						//normalizing Pointer to Touch
						event.type = POINTER_MOVE;
						event.identifier = event.pointerId;
						//in DOC is mentioned that it is 0..255 but actually it returns 0..1 value
						//returns 0.5 for mouse down buttons in IE11, should it be issue?
						event.force = event.pressure;
						//default values for Touch which we cannot obtain from Pointer
						event.radiusX = event.radiusY = 1;
						event.rotationAngle = 0;

						this[index] = event;
					}
				},

				/**
				 * Removes an event from this touch list.
				 * @param {Event} event
				 */
				_remove: {
					value: function(event) {
						var index = this._touchIndex(event);

						if (index >= 0) {
							this.splice(index,1);
						}
					}
				}
			},

			/**
			 * This class store touches in an list which can be also accessible as array which is
			 * little bit bad because TouchList have to extend Array. Because we are aiming on
			 * IE10+ we can use ECMAScript5 solution.
			 * @extends Array
			 * @see http://www.w3.org/TR/2011/WD-touch-events-20110913/#touchlist-interface
			 * @see https://developer.mozilla.org/en-US/docs/DOM/TouchList
			 */
			TouchList = (function(methods) {
				return function() {
					var arr = makeSubArray(methods);
					if (arguments.length === 1) {
						arr.length = arguments[0];
					}
					else {
						arr.push.apply(arr, arguments);
					}
					return arr;
				};
			})(touchListMethods),

			/**
			 * list of all touches running during life cycle
			 * @type TouchList
			 */
			generalTouchesHolder,

			/**
			 * Storage of link between pointer {id} and original target
			 * @type Object
			 */
			pointerToTarget = {},

			/**
			 * General gesture object which fires MSGesture events whenever any associated MSPointer event changed.
			 */
			gesture = window.MSGesture ? new MSGesture() : null,

			/**
			 * Storage of targets and anonymous MSPointerStart handlers for later
			 * unregistering
			 * @type Array
			 */
			attachedPointerStartMethods = [],

			/**
			 * Checks if node is some of parent children or sub-children
			 * @param {HTMLElement|Document} parent
			 * @param {HTMLElement} node
			 * @returns {Boolean}
			 */
			checkSameTarget = function (parent, node) {
				if (node) {
					if (parent === node) {
						return true;
					} else {
						return checkSameTarget(parent, node.parentNode);
					}
				} else {
					return false;
				}
			},

			/**
			 * Main function which is rewriting the MSPointer event to touch event
			 * and preparing all the necessary lists of touches.
			 * @param {Event} evt
			 */
			pointerListener = function (evt) {
				var type,
					i,
					target = evt.target,
					originalTarget,
					changedTouches,
					targetTouches;

				if (evt.type === POINTER_DOWN) {
					generalTouchesHolder._add(evt);
					pointerToTarget[evt.pointerId] = evt.target;

					type = "touchstart";

					// Commented out the following code because WP8 is throwing an InvalidStateError from the addPointer call

					// Fires MSGesture event when we have at least two pointers in our holder
					// (adding pointers to gesture object immediately fires Gesture event)
					// if (generalTouchesHolder.length > 1) {
					// 	gesture.target = evt.target;
					// 	for (i = 0; i < generalTouchesHolder.length; i++) {
					// 		gesture.addPointer(generalTouchesHolder[i].pointerId);
					// 	}
					// }
				}

				if (evt.type === POINTER_MOVE && generalTouchesHolder.identifiedTouch(evt.pointerId)) {
					generalTouchesHolder._add(evt);

					type = "touchmove";
				}

				//Preparation of touch lists have to be done before pointerup/MSPointerUp where we delete some information

				//Which touch fired this event, because we know that MSPointer event is fired for every
				//changed pointer than we create a list only with actual pointer
				changedTouches = document.createTouchList(evt);
				//Target touches is list of touches which started on (touchstart) on target element, they
				//are in this array even if these touches have coordinates outside target elements
				targetTouches = document.createTouchList();
				for (i = 0; i < generalTouchesHolder.length; i++) {
					//targetTouches._add(generalTouchesHolder[i]);
					//check if the pointerTarget is in the target
					if (checkSameTarget(target, pointerToTarget[generalTouchesHolder[i].identifier])) {
						targetTouches._add(generalTouchesHolder[i]);
					}
				}
				originalTarget = pointerToTarget[evt.pointerId];

				if (evt.type === POINTER_UP || (evt.type === POINTER_OUT && evt.relatedTarget === null)) {
					generalTouchesHolder._remove(evt);

					// normally MSPointerUp is followed by MSPointerOut so we only need to remove the touch once
					// sometimes Up is never triggered but Out is which is why we need to check both
					// we also won't want to remove the touch is out's relatedTarget is null
					if (typeof pointerToTarget[evt.pointerId] !== "undefined") {
						pointerToTarget[evt.pointerId] = null;

						delete pointerToTarget[evt.pointerId];
						type = "touchend";

						// Fires MSGestureEnd event when there is only one ore zero touches:
						if (generalTouchesHolder.length <= 1) {
							gesture.stop();
						}
					} else {
						return;
					}
				}
	//log("+", evt.type, generalTouchesHolder.length, evt.target.nodeName+"#"+evt.target.id);
				if (type && originalTarget) {
					// added which: 0 to event because there are tools that check for that property
					createEvent(type, originalTarget, {touches: generalTouchesHolder, changedTouches: changedTouches, targetTouches: targetTouches, which: 0});
				}
			},

			/**
			 * Main function which is rewriting the MSGesture event to gesture event.
			 * @param {Event} evt
			 */
			gestureListener = function (evt) {
				//TODO: check first, other than IE (FF?), browser which implements pointer events how to make gestures from pointers. Maybe it would be mix of pointer/gesture events.
				var type;
				if (evt.type === GESTURE_START) {type = "gesturestart"}
				else if (evt.type === GESTURE_CHANGE) {type = "gesturechange"}
				else if (evt.type === GESTURE_END) {type = "gestureend"}

				createEvent(type, evt.target, {scale: evt.scale, rotation: evt.rotation, screenX: evt.screenX, screenY: evt.screenY});
			},

			/**
			 * This method augments event listener methods on given class to call
			 * our own method which attach/detach the MSPointer events handlers
			 * when user tries to attach touch events.
			 * @param {Function} elementClass Element class like HTMLElement or Document
			 */
			augmentEventListener = function(elementClass) {
				var customAddEventListener = attachTouchEvents,
					customRemoveEventListener = removeTouchEvents,
					oldAddEventListener = elementClass.prototype.addEventListener,
					oldRemoveEventListener = elementClass.prototype.removeEventListener;

				elementClass.prototype.addEventListener = function(type, listener, useCapture) {
					//"this" is HTML element
					customAddEventListener.call(this, type, listener, useCapture);
					oldAddEventListener.call(this, type, listener, useCapture);
				};

				elementClass.prototype.removeEventListener = function(type, listener, useCapture) {
					customRemoveEventListener.call(this, type, listener, useCapture);
					oldRemoveEventListener.call(this, type, listener, useCapture);
				};
			},
			/**
			 * This method attach event handler for MSPointer / MSGesture events when user
			 * tries to attach touch / gesture events.
			 * @param {String} type
			 * @param {Function} listener
			 * @param {Boolean} useCapture
			 */
			attachTouchEvents = function (type, listener, useCapture) {
				var that = this,
					func;
				
			var doc = this.ownerDocument || this;
				
				if (type.indexOf("touchstart") === 0) {
					func = function() {
						if (checkSameTarget(that, arguments[0].target)) {
							pointerListener.apply(this, arguments);
						}
					};
					attachedPointerStartMethods.push({node: this, func: func});
					doc.addEventListener(POINTER_DOWN, func, useCapture);
				}
				if (type.indexOf("touchmove") === 0) {
					doc.addEventListener(POINTER_MOVE, pointerListener, useCapture);
				}
				if (type.indexOf("touchend") === 0) {
					doc.addEventListener(POINTER_UP, pointerListener, useCapture);
					doc.addEventListener(POINTER_OUT, pointerListener, useCapture);
				}
				if (type.indexOf("gesturestart") === 0) {
					doc.addEventListener(GESTURE_START, gestureListener, useCapture);
				}
				if (type.indexOf("gesturechange") === 0) {
					doc.addEventListener(GESTURE_CHANGE, gestureListener, useCapture);
				}
				if (type.indexOf("gestureend") === 0) {
					doc.addEventListener(GESTURE_END, gestureListener, useCapture);
				}

				// e.g. Document has no style and doesn't have needstouch class
				if (this.style && typeof this.style[TOUCH_ACTION] != "undefined" && !(/\bneedstouch\b/).test(this.className)) {
					this.style[TOUCH_ACTION] = "none";
				}
			},
			/**
			 * This method detach event handler for MSPointer / MSGesture events when user
			 * tries to detach touch / gesture events.
			 * @param {String} type
			 * @param {Function} listener
			 * @param {Boolean} useCapture
			 */
			removeTouchEvents = function (type, listener, useCapture) {
				var func,
					i;
				//stores this,type,listener, to know what to call in pointerListener
				var doc = this.ownerDocument || this;
				if (type.indexOf("touchstart") === 0) {
					i = attachedPointerStartMethods.length;
					while(i--) {
						if (attachedPointerStartMethods[i].node === this) {
							doc.removeEventListener(POINTER_DOWN, func, useCapture);
							attachedPointerStartMethods.splice(i, 1);
							break;
						}
					}
				}
				if (type.indexOf("touchmove") === 0) {
					doc.removeEventListener(POINTER_MOVE, pointerListener, useCapture);
				}
				if (type.indexOf("touchend") === 0) {
					doc.removeEventListener(POINTER_UP, pointerListener, useCapture);
					doc.removeEventListener(POINTER_OUT, pointerListener, useCapture);
				}
				if (type.indexOf("gesturestart") === 0) {
					doc.removeEventListener(GESTURE_START, gestureListener, useCapture);
				}
				if (type.indexOf("gesturechange") === 0) {
					doc.removeEventListener(GESTURE_CHANGE, gestureListener, useCapture);
				}
				if (type.indexOf("gestureend") === 0) {
					doc.removeEventListener(GESTURE_END, gestureListener, useCapture);
				}
			};


		/*
		 * Adding DocumentTouch interface
		 * @see http://www.w3.org/TR/2011/WD-touch-events-20110505/#idl-def-DocumentTouch
		 */

		/**
		 * Create touches list from array or touches or given touch
		 * @param {Touch[]|Touch} touches
		 * @returns {TouchList}
		 */
		document.createTouchList = function(touches) {
			var touchList = new TouchList();
			if (touches) {
				if (touches.length) {
					touchList._addAll(touches);
				} else {
					touchList._add(touches);
				}
			}
			return touchList;
		};

		/*******  Fakes which persuade other code to use touch events ********/

		/**
		 * AbstractView is class for document.defaultView === window
		 * @param {AbstractView} view
		 * @param {EventTarget} target
		 * @param {Number} identifier
		 * @param {Number} pageX
		 * @param {Number} pageY
		 * @param {Number} screenX
		 * @param {Number} screenY
		 * @return {Touch}
		 */
		document.createTouch = function(view, target, identifier, pageX, pageY, screenX, screenY) {
			return {
				identifier: identifier,
				screenX: screenX,
				screenY: screenY,
				//clientX: clientX,
				//clientY: clientY,
				pageX: pageX,
				pageY: pageY,
				target: target
			};
		};
		//Fake Modernizer touch test
		//http://modernizr.github.com/Modernizr/touch.html
		if (!window.ontouchstart) window.ontouchstart = 1;

		/*******  End of fakes ***********************************/

		generalTouchesHolder = document.createTouchList();

		// Overriding HTMLElement and HTMLDocument to hand over touch handler to MSPointer event handler
		augmentEventListener(HTMLElement);
		augmentEventListener(Document);
	}
}(window));