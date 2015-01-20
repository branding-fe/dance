define('global', ['require'], function (require) {
    var global = {
            defaults: {},
            TINY_NUMBER: 1e-8
        };
    return global;
});

define('util', ['require'], function (require) {
    var util = {};
    util.ie = /msie (\d+\.\d)/i.test(navigator.userAgent) ? document.documentMode || +RegExp['$1'] : /Trident\/\d+\.\d.*rv:(\d+\.\d)/.test(navigator.userAgent) ? document.documentMode || +RegExp['$1'] : null;
    var nativeBind = Function.prototype.bind;
    util.bind = nativeBind ? function (fn) {
        return nativeBind.apply(fn, [].slice.call(arguments, 1));
    } : function (fn, context) {
        var extraArgs = [].slice.call(arguments, 2);
        return function () {
            var args = extraArgs.concat([].slice.call(arguments));
            return fn.apply(context, args);
        };
    };
    var dontEnumBug = !{ toString: 1 }.propertyIsEnumerable('toString');
    util.inherits = function (type, superType) {
        var Empty = function () {
        };
        Empty.prototype = superType.prototype;
        var proto = new Empty();
        var originalPrototype = type.prototype;
        type.prototype = proto;
        for (var key in originalPrototype) {
            proto[key] = originalPrototype[key];
        }
        if (dontEnumBug) {
            if (originalPrototype.hasOwnProperty('toString')) {
                proto.toString = originalPrototype.toString;
            }
            if (originalPrototype.hasOwnProperty('valueOf')) {
                proto.valueOf = originalPrototype.valueOf;
            }
        }
        type.prototype.constructor = type;
        return type;
    };
    util.breaker = {};
    util.each = function (array, iterator, context) {
        if (array == null) {
            return array;
        }
        var actualIterator = context == null ? iterator : util.bind(iterator, context);
        for (var i = 0, len = array.length; i < len; i++) {
            if (actualIterator(array[i], i, array) === util.breaker) {
                break;
            }
        }
    };
    util.isPlainObject = function (target) {
        return Object.prototype.toString.call(target) === '[object Object]';
    };
    util.isArray = function (target) {
        return Object.prototype.toString.call(target) === '[object Array]';
    };
    util.isString = function (target) {
        return Object.prototype.toString.call(target) === '[object String]';
    };
    util.isFunction = function (target) {
        return Object.prototype.toString.call(target) === '[object Function]';
    };
    util.isNumber = function (target) {
        return Object.prototype.toString.call(target) === '[object Number]';
    };
    util.toCamelCase = function (source) {
        if (source.indexOf('-') < 0 && source.indexOf('_') < 0) {
            return source;
        }
        return source.replace(/[-_][^-_]/g, function (match) {
            return match.charAt(1).toUpperCase();
        });
    };
    util.getComputedStyle = function (element, key) {
        var doc = element.nodeType === 9 ? element : element.ownerDocument;
        if (doc.defaultView && doc.defaultView.getComputedStyle) {
            var computed = doc.defaultView.getComputedStyle(element, null);
            if (computed) {
                return computed[key] || computed.getPropertyValue(key);
            }
        }
        return '';
    };
    util.getStyle = function (element, key) {
        key = util.toCamelCase(key);
        var value = element.currentStyle && element.currentStyle[key] || util.getComputedStyle(element, key) || element.style[key];
        if (!value || value === 'auto') {
            if (key === 'opacity' && util.ie && util.ie <= 8) {
                var filter = element.style.filter;
                value = filter && filter.indexOf('opacity=') >= 0 ? parseFloat(filter.match(/opacity=([^)]*)/)[1]) / 100 + '' : '1';
            }
        }
        return value;
    };
    util.setStyle = function (element, key, value) {
        key = util.toCamelCase(key);
        if (util.isNumber(value) && !/zIndex|fontWeight|opacity|zoom|lineHeight/i.test(key)) {
            value = value + 'px';
        }
        var style = element.style;
        if (key === 'opacity' && util.ie && util.ie <= 8) {
            style.filter = (style.filter || '').replace(/alpha\([^\)]*\)/gi, '') + (value == 1 ? '' : 'alpha(opacity=' + value * 100 + ')');
            style.zoom = 1;
        } else {
            style[key] = value;
        }
        return element;
    };
    util.setStyles = function (element, styles) {
        for (var key in styles) {
            util.setStyle(element, key, styles[key]);
        }
        return element;
    };
    return util;
});

define('events', ['require'], function (require) {
    var events = {
            'TICK': 'tick',
            'START': 'start',
            'AFTER_FINISH': 'after_finish',
            'BEFORE_UPDATE': 'before_update',
            'AFTER_UPDATE': 'after_update',
            'PROGRESS': 'progress'
        };
    return events;
});

define('EventDispatcher', ['require'], function (require) {
    function EventDispatcher() {
        this._listeners = {};
    }
    EventDispatcher.prototype.addListener = function (eventType, listener) {
        if (!this._listeners[eventType]) {
            this._listeners[eventType] = [];
        }
        this._listeners[eventType].push(listener);
    };
    EventDispatcher.prototype.removeListener = function (eventType, listener) {
        if (!this._listeners[eventType]) {
            return;
        }
        var list = this._listeners[eventType];
        for (var i = list.length - 1; i >= 0; i--) {
            if (list[i] === listener) {
                list[i] = null;
                break;
            }
        }
    };
    EventDispatcher.prototype.trigger = function (eventType, var_args) {
        if (!this._listeners[eventType]) {
            return true;
        }
        var args = Array.prototype.slice.call(arguments, 1);
        var result = true;
        for (var i = 0; i < this._listeners[eventType].length; i++) {
            var fn = this._listeners[eventType][i];
            if (fn) {
                if (false === fn.apply(this, args)) {
                    result = false;
                }
            }
        }
        return result;
    };
    EventDispatcher.prototype.dispose = function () {
        this._listeners = {};
    };
    EventDispatcher._registry = [];
    EventDispatcher.prototype.registerListener = function (eventType, listener) {
        var registry = EventDispatcher._registry;
        registry.push({
            'eventType': eventType,
            'subscriber': this,
            'listener': listener
        });
    };
    EventDispatcher.prototype.unregisterListener = function (eventType, listener) {
        var registry = EventDispatcher._registry;
        for (var i = registry.length - 1; i >= 0; i--) {
            var item = registry[i];
            if (item['subscriber'] === this && (!eventType || eventType && item['eventType'] === eventType) && (!listener || listener && item['listener'] === listener)) {
                registry.splice(i, 1);
            }
        }
    };
    EventDispatcher.prototype.publish = function (eventType, var_args) {
        var registry = EventDispatcher._registry;
        var args = Array.prototype.slice.call(arguments, 1);
        var result = true;
        for (var i = 0; i < registry.length; i++) {
            var item = registry[i];
            if (item['eventType'] === eventType && false === item['listener'].apply(item['subscriber'], args)) {
                result = false;
            }
        }
        return result;
    };
    return EventDispatcher;
});

define('TimeEvent', [
    'require',
    './global',
    './util',
    './events',
    './EventDispatcher'
], function (require) {
    var global = require('./global');
    var util = require('./util');
    var events = require('./events');
    var EventDispatcher = require('./EventDispatcher');
    function TimeEvent(options) {
        EventDispatcher.call(this);
        options = options || {};
        this.isInFrame = options['isInFrame'] || false;
        this.startPoint = options['startPoint'] || 0;
        this.delay = options['delay'];
        this._duration = options['duration'] != null ? options['duration'] : Infinity;
        this._scale = options['scale'] || 1;
        this.timeline = options['timeline'];
        this._ease = options['ease'];
        this.isPaused = false;
        this.isActive = true;
        this.isAlwaysActive = false;
        this.playhead = 0;
        this.isPlayheadDirty = true;
        this.isReversed = false;
        this.isRealReversed = false;
    }
    util.inherits(TimeEvent, EventDispatcher);
    TimeEvent.prototype.getStartPoint = function () {
        return this.startPoint;
    };
    TimeEvent.prototype.getDuration = function () {
        return this._duration;
    };
    TimeEvent.prototype.getScale = function () {
        return this._scale;
    };
    TimeEvent.prototype.getTime = function () {
        return this.playhead;
    };
    TimeEvent.prototype.duration = function (duration) {
        this._duration = duration;
        return this;
    };
    TimeEvent.prototype.scale = function (scale) {
        this._scale = scale;
        return this;
    };
    TimeEvent.prototype.setTimeline = function (timeline) {
        this.timeline = timeline;
    };
    TimeEvent.prototype.setStartPoint = function (startPoint) {
        this.startPoint = startPoint;
    };
    TimeEvent.prototype.isAttached = function () {
        return !!this.timeline;
    };
    TimeEvent.prototype.detach = function () {
        if (this.timeline) {
            this.timeline.remove(this);
        }
        return this;
    };
    TimeEvent.prototype.attach = function () {
        if (this.timeline) {
            this.timeline.add(this, this.startPoint - this.delay);
        }
        return this;
    };
    TimeEvent.prototype.delay = TimeEvent.prototype.after = function (timeOrFrame) {
        this.delay = timeOrFrame;
        return this;
    };
    TimeEvent.prototype.ease = function (ease) {
        this._ease = ease;
        return this;
    };
    TimeEvent.prototype.getProgress = function (timePercent) {
        if (this._ease) {
            return this._ease(timePercent);
        }
        return timePercent;
    };
    TimeEvent.prototype.render = function (playhead, opt_forceRender) {
        var lastPlayhead = this.playhead;
        this.playhead = playhead;
        var isPlayheadDirty = this.isPlayheadDirty;
        this.isPlayheadDirty = false;
        if (!opt_forceRender && this.isPaused) {
            return this;
        }
        var duration = this.getDuration();
        if (!this.isActive || playhead === lastPlayhead) {
            return this;
        }
        var isFinished = false;
        var isNeedRender = true;
        if (!opt_forceRender) {
            if (playhead < 0) {
                if (isPlayheadDirty) {
                    isNeedRender = false;
                } else {
                    if (playhead < lastPlayhead) {
                        isFinished = true;
                    } else {
                        isNeedRender = false;
                    }
                }
            } else if (playhead > duration) {
                if (isPlayheadDirty) {
                    isNeedRender = false;
                } else {
                    if (playhead > lastPlayhead) {
                        isFinished = true;
                    } else {
                        isNeedRender = false;
                    }
                }
            } else {
                if (lastPlayhead != null && (lastPlayhead < 0 || lastPlayhead > duration)) {
                    this.trigger(events.START);
                }
            }
        }
        var realPlayhead = this.isReversed ? duration - playhead : playhead;
        if (this.isAlwaysActive || isNeedRender) {
            this.internalRender(realPlayhead, opt_forceRender);
        }
        if (isFinished) {
            this.deactivate();
            this.trigger(events.AFTER_FINISH);
        }
        return this;
    };
    TimeEvent.prototype.internalRender = function (realPlayhead, opt_forceRender) {
    };
    TimeEvent.prototype.activate = function () {
        this.isActive = true;
        return this;
    };
    TimeEvent.prototype.deactivate = function () {
        if (!this.isAlwaysActive) {
            this.isPlayheadDirty = true;
            this.isActive = false;
        }
        return this;
    };
    TimeEvent.prototype.setRealReverse = function (opt_parentRealReversed) {
        if (opt_parentRealReversed != null) {
            if (this.isReversed) {
                this.isRealReversed = !opt_parentRealReversed;
            }
        } else {
            this.isRealReversed = !this.isRealReversed;
        }
    };
    TimeEvent.prototype.reverse = function (opt_reversePoint) {
        this.isReversed = !this.isReversed;
        this.setRealReverse();
        if (!this.timeline) {
            return this;
        }
        var duration = this.getDuration();
        var reversePoint = opt_reversePoint != null ? opt_reversePoint : this.isPaused ? this.pausePoint : this.playhead;
        var played = Math.min(Math.max(reversePoint, 0), duration);
        var playedNow = duration - played;
        this.startPoint = this.timeline.getTime() - playedNow / this.getScale();
        this.playhead = playedNow;
        this.rearrange();
        return this;
    };
    TimeEvent.prototype.seek = function (targetPoint) {
        var duration = this.getDuration();
        var played = Math.min(Math.max(targetPoint, 0), duration);
        this.startPoint = this.timeline.getTime() - played / this.getScale();
        if (this.isPaused) {
            this.pausePoint = played;
        }
        this.rearrange();
        this.render(played, true);
        return this;
    };
    TimeEvent.prototype.seekProgress = function (progress, opt_reverseConsidered) {
        var duration = this.getDuration();
        var actualProgress = opt_reverseConsidered && this.isReversed ? 1 - progress : progress;
        this.seek(duration * actualProgress);
        return this;
    };
    TimeEvent.prototype.play = function (opt_target, opt_options) {
        if (this.isPaused) {
            if (opt_target != null) {
                this.seek(opt_target);
            }
            this.resume();
        } else {
            var duration = this.getDuration();
            if (this.playhead < 0 || this.playhead >= duration) {
                this.seek(opt_target || 0);
            }
        }
        return this;
    };
    TimeEvent.prototype.playForward = function () {
        if (this.isRealReversed) {
            this.reverse().play(0);
        } else {
            this.play(0);
        }
        return this;
    };
    TimeEvent.prototype.playBackward = function () {
        if (this.isRealReversed) {
            this.play(0);
        } else {
            this.reverse().play(0);
        }
        return this;
    };
    TimeEvent.prototype.stop = function () {
        this.seek(0);
        this.pause();
        return this;
    };
    TimeEvent.prototype.pause = function (opt_playhead) {
        if (opt_playhead != null) {
            this.seek(opt_playhead);
        }
        if (!this.isPaused) {
            this.pausePoint = this.playhead;
            this.isPaused = true;
        }
        return this;
    };
    TimeEvent.prototype.resume = function () {
        if (!this.isPaused) {
            return this;
        }
        var duration = this.getDuration();
        var played = Math.min(Math.max(this.pausePoint, 0), duration);
        this.startPoint = this.timeline.getTime() - played / this.getScale();
        this.isPaused = false;
        this.pausePoint = null;
        this.seek(played);
    };
    return TimeEvent;
});

define('Ticker', [
    'require',
    './util',
    './events',
    './EventDispatcher'
], function (require) {
    var util = require('./util');
    var events = require('./events');
    var EventDispatcher = require('./EventDispatcher');
    var requestAnimationFrame = window.requestAnimationFrame;
    var cancelAnimationFrame = window.cancelAnimationFrame;
    var vendors = [
            'ms',
            'webkit',
            'moz',
            'o'
        ];
    for (var i = 0; i < vendors.length && (!requestAnimationFrame || !cancelAnimationFrame); i++) {
        requestAnimationFrame = window[vendors[i] + 'RequestAnimationFrame'];
        cancelAnimationFrame = window[vendors[i] + 'CancelAnimationFrame'] || window[vendors[i] + 'CancelRequestAnimationFrame'];
    }
    var isRAFSupported = requestAnimationFrame && cancelAnimationFrame;
    function Ticker(fps, opt_options) {
        EventDispatcher.call(this);
        var options = opt_options || {};
        this.startTime = this.now();
        this.time = 0;
        this.frame = 0;
        this.enableRAF = options.enableRAF !== false && isRAFSupported;
        this.lagThreshold = 400;
        this.lagPreset = 33;
        this.fps;
        this.interval = 1000 / 60;
        this.requestNextFrame;
        this.cancelNextFrame;
        this.nextFrameTime = this.interval;
        this.lastTickTime = this.startTime;
        this.nextFrameTimer;
        this.aliveCheckTimer;
        this.isTicking = false;
        this.boundTick = util.bind(this.tick, this);
        this.wake();
    }
    util.inherits(Ticker, EventDispatcher);
    Ticker.prototype.tick = function () {
        var now = this.now();
        var elapsed = now - this.lastTickTime;
        if (elapsed > this.lagThreshold) {
            this.startTime = this.startTime + elapsed - this.lagPreset;
        }
        this.time = now - this.startTime;
        var overlap = this.time - this.nextFrameTime;
        if (!this.fps || overlap > 0) {
            this.frame++;
            this.nextFrameTime += overlap >= this.interval ? overlap + 4 : this.interval;
            if (this.fps !== 0) {
                this.nextFrameTimer = this.requestNextFrame(this.boundTick);
            }
            this.trigger(events.TICK, this.time, this.frame);
        }
        this.lastTickTime = now;
    };
    Ticker.prototype.sleep = function () {
        if (this.isTicking && this.nextFrameTimer) {
            this.cancelNextFrame(this.nextFrameTimer);
        }
        this.isTicking = false;
        this.aliveCheckTimer && clearTimeout(this.aliveCheckTimer);
        this.aliveCheckTimer = null;
    };
    Ticker.prototype.wake = function () {
        if (this.isTicking) {
            this.sleep();
        }
        if (this.fps === 0) {
            this.requestNextFrame = null;
            this.cancelNextFrame = null;
        } else {
            var self = this;
            if (this.enableRAF && requestAnimationFrame) {
                this.requestNextFrame = function () {
                    requestAnimationFrame.apply(window, arguments);
                };
                this.cancelNextFrame = function () {
                    cancelAnimationFrame.apply(window, arguments);
                };
            } else {
                this.requestNextFrame = function (nextHandler) {
                    return setTimeout(nextHandler, self.nextFrameTime - self.time + 1);
                };
                this.cancelNextFrame = function (id) {
                    clearTimeout(id);
                };
            }
        }
        this.tick();
        this.isTicking = true;
        this.aliveCheck();
    };
    Ticker.prototype.now = function () {
        return Date.now ? Date.now() : new Date().getTime();
    };
    Ticker.prototype.setFps = function (fps) {
        this.fps = fps;
        this.interval = 1000 / (this.fps || 60);
        this.nextFrameTime = this.time + this.interval;
        this.wake();
    };
    Ticker.prototype.getFps = function () {
        return this.fps;
    };
    Ticker.prototype.aliveCheck = function () {
        var self = this;
        var timeout = Math.max(2000, this.interval * 3);
        function check(skip) {
            if (!skip && self.isTicking && self.now() - self.lastTickTime > 1200) {
                if (self.enableRAF && requestAnimationFrame && (!self.nextFrameTimer || self.frame < 5)) {
                    self.enableRAF = false;
                }
                self.wake();
            }
            self.aliveCheckTimer = setTimeout(check, timeout);
        }
        check(true);
    };
    return Ticker;
});

define('Timeline', [
    'require',
    './global',
    './util',
    './events',
    './TimeEvent',
    './Ticker'
], function (require) {
    var global = require('./global');
    var util = require('./util');
    var events = require('./events');
    var TimeEvent = require('./TimeEvent');
    var Ticker = require('./Ticker');
    function Timeline() {
        TimeEvent.apply(this, arguments);
        this.render = Timeline.prototype.render;
        this._lastTimeEvent;
        this.listHead = null;
        this.listTail = null;
        this.isAlwaysActive = true;
    }
    util.inherits(Timeline, TimeEvent);
    Timeline.prototype.add = function (timeEvent) {
        if (!timeEvent instanceof TimeEvent) {
            throw 'Only TimeEvent could be added to Timeline!';
        }
        if (timeEvent.isInFrame !== this.isInFrame) {
            throw 'Can not add a TimeEvent with ' + (timeEvent.isInFrame ? 'frame' : 'time') + ' in a Timeline with ' + (this.isInFrame ? 'frame' : 'time');
        }
        if (timeEvent.isAttached()) {
            timeEvent.detach();
        }
        timeEvent.setTimeline(this);
        timeEvent.setStartPoint(this.playhead);
        timeEvent.setRealReverse(this.isRealReversed);
        this._lastTimeEvent = timeEvent;
        this.enqueue(timeEvent);
        this.rearrange();
        return this;
    };
    Timeline.prototype.traverse = function (callback) {
        if (this.listHead) {
            var timeEvent = this.listHead;
            while (timeEvent) {
                var ret = callback(timeEvent);
                if (ret === util.breaker) {
                    break;
                }
                timeEvent = timeEvent.next;
            }
        }
    };
    Timeline.prototype.reverseTraverse = function (callback) {
        if (this.listTail) {
            var timeEvent = this.listTail;
            while (timeEvent) {
                var ret = callback(timeEvent);
                if (ret === util.breaker) {
                    break;
                }
                timeEvent = timeEvent.prev;
            }
        }
    };
    Timeline.prototype.outInTraverse = function (point, callback) {
        var isBreaked = false;
        var ret;
        var timeEvent;
        if (this.listHead) {
            timeEvent = this.listHead;
            while (timeEvent) {
                if (point < timeEvent.getStartPoint() || !this.isRealReversed && point === timeEvent.getStartPoint()) {
                    break;
                }
                ret = callback(timeEvent);
                if (ret === util.breaker) {
                    isBreaked = true;
                    break;
                }
                timeEvent = timeEvent.next;
            }
        }
        if (isBreaked) {
            return this;
        }
        if (this.listTail) {
            timeEvent = this.listTail;
            while (timeEvent) {
                if (point > timeEvent.getStartPoint() || this.isRealReversed && point === timeEvent.getStartPoint()) {
                    break;
                }
                ret = callback(timeEvent);
                if (ret === util.breaker) {
                    break;
                }
                timeEvent = timeEvent.prev;
            }
        }
        return this;
    };
    Timeline.prototype.enqueue = function (timeEvent) {
        if (this.listTail == null) {
            this.listHead = timeEvent;
            this.listTail = timeEvent;
            timeEvent.prev = null;
            timeEvent.next = null;
        } else {
            var that = this;
            var startPoint = timeEvent.getStartPoint();
            var isFound = false;
            this.reverseTraverse(function (item) {
                if (startPoint >= item.getStartPoint()) {
                    isFound = true;
                    timeEvent.prev = item;
                    timeEvent.next = item.next;
                    item.next = timeEvent;
                    return util.breaker;
                }
            });
            if (!isFound) {
                timeEvent.prev = null;
                timeEvent.next = that.listHead;
                that.listHead = timeEvent;
            }
            if (timeEvent.next) {
                timeEvent.next.prev = timeEvent;
            } else {
                this.listTail = timeEvent;
            }
        }
    };
    Timeline.prototype.dequeue = function (timeEvent) {
        if (timeEvent.timeline === this) {
            if (timeEvent.prev) {
                timeEvent.prev.next = timeEvent.next;
            } else if (this.listHead === timeEvent) {
                this.listHead = timeEvent.next;
            }
            if (timeEvent.next) {
                timeEvent.next.prev = timeEvent.prev;
            } else if (this.listTail === timeEvent) {
                this.listTail = timeEvent.prev;
            }
            timeEvent.prev = null;
            timeEvent.next = null;
            timeEvent.setTimeline(null);
        }
        if (this._lastTimeEvent === timeEvent) {
            this._lastTimeEvent = null;
        }
    };
    Timeline.prototype.at = function (timeOrFrame) {
        if (this._lastTimeEvent) {
            this._lastTimeEvent.setStartPoint(timeOrFrame);
            this.rearrange();
        }
        return this;
    };
    Timeline.prototype.remove = function (target) {
        this.dequeue(target);
        this.rearrange();
        return this;
    };
    Timeline.prototype.scale = function (scale) {
        TimeEvent.prototype.scale.apply(this, arguments);
        this.rearrange();
        return this;
    };
    Timeline.prototype.rearrange = function () {
        var maxRelativeEndPoint = -Infinity;
        this.traverse(function (timeEvent) {
            var relativeEndPoint = timeEvent.getStartPoint() + timeEvent.getDuration() / timeEvent.getScale();
            if (relativeEndPoint > maxRelativeEndPoint) {
                maxRelativeEndPoint = relativeEndPoint;
            }
        });
        this._duration = Math.max(0, maxRelativeEndPoint);
        if (this.timeline) {
            this.timeline.rearrange();
        }
        this.activate();
        return this;
    };
    Timeline.prototype.internalRender = function (realPlayhead, opt_forceRender) {
        var that = this;
        var traverse = opt_forceRender ? util.bind(this.outInTraverse, this, realPlayhead) : this.isRealReversed ? this.reverseTraverse : this.traverse;
        var duration = this.getDuration();
        var progress = Math.max(Math.min(realPlayhead, duration), 0) / duration;
        if (this._ease && realPlayhead >= 0 && realPlayhead <= duration) {
            progress = this.getProgress(progress);
            realPlayhead = realPlayhead * progress;
        }
        traverse.call(this, function (timeEvent) {
            if (!timeEvent.isActive) {
                return;
            }
            var scaledElapsed = (realPlayhead - timeEvent.getStartPoint()) * timeEvent.getScale();
            timeEvent.render(scaledElapsed, opt_forceRender);
        });
        this.trigger(events.PROGRESS, progress, this.playhead);
    };
    Timeline.prototype.setRealReverse = function () {
        TimeEvent.prototype.setRealReverse.apply(this, arguments);
        this.traverse(function (timeEvent) {
            timeEvent.setRealReverse();
        });
    };
    Timeline.prototype.reverse = function () {
        TimeEvent.prototype.reverse.apply(this, arguments);
        this.seek(this.playhead);
        return this;
    };
    Timeline.prototype.childEase = function (ease) {
        this.traverse(function (timeEvent) {
            timeEvent.ease(ease);
        });
        return this;
    };
    Timeline.prototype.activate = function () {
        TimeEvent.prototype.activate.apply(this, arguments);
        this.traverse(function (timeEvent) {
            timeEvent.activate();
        });
        return this;
    };
    Timeline.prototype.setPlaybackRate = Timeline.prototype.speed = function (scale) {
        this.scale(scale);
        return this;
    };
    global.ticker = new Ticker();
    global.rootTimeline = new Timeline();
    global.rootFrameTimeline = new Timeline({ 'isInFrame': true });
    global.ticker.addListener(events.TICK, function (time, frame) {
        global.rootTimeline.render(time);
        global.rootFrameTimeline.render(frame);
    });
    return Timeline;
});

define('parser/CssDeclarationParser', [
    'require',
    '../util'
], function (require) {
    var util = require('../util');
    var CssDeclarationParser = {};
    CssDeclarationParser._defaultUnit = {
        'top': 'px',
        'bottom': 'px',
        'left': 'px',
        'right': 'px',
        'margin-top': 'px',
        'margin-bottom': 'px',
        'margin-left': 'px',
        'margin-right': 'px',
        'padding-top': 'px',
        'padding-bottom': 'px',
        'padding-left': 'px',
        'padding-right': 'px',
        'width': 'px',
        'height': 'px',
        'font-size': 'px',
        'perspective': 'px',
        'line-height': ''
    };
    CssDeclarationParser._defaultProcessor = {
        parse: function (value, property) {
            if (util.isNumber(value)) {
                return {
                    value: value,
                    unit: CssDeclarationParser._defaultUnit[property] || ''
                };
            } else {
                value = value + '';
                return {
                    value: parseFloat(value),
                    unit: value.replace(/[\d.]+/, '')
                };
            }
        }
    };
    CssDeclarationParser._edgeParse = function (value, portions) {
        var splited = (value + '').split(' ');
        var declarations = {};
        for (var i = 0; i < 4; i++) {
            var portionValue = splited[i] = splited[i] || splited[parseInt((i - 1) / 2, 10)];
            declarations[portions[i]] = portionValue;
        }
        return CssDeclarationParser.parse(declarations);
    };
    CssDeclarationParser._processorMap = {};
    CssDeclarationParser.register = function (property, options) {
        if (util.isArray(property)) {
            util.each(property, function (item, i) {
                CssDeclarationParser._processorMap[item] = options;
            });
        } else {
            CssDeclarationParser._processorMap[property] = options;
        }
    };
    CssDeclarationParser.parse = function (declarations) {
        var processorMap = CssDeclarationParser._processorMap;
        var parsed = {};
        for (var property in declarations) {
            var processor = processorMap[property] || CssDeclarationParser._defaultProcessor;
            var result = processor.parse(declarations[property], property);
            if (result.value != null && result.unit != null) {
                parsed[property] = result;
            } else {
                for (var key in result) {
                    parsed[key] = result[key];
                }
            }
        }
        return parsed;
    };
    CssDeclarationParser.register('margin', {
        parse: function (value, property) {
            var portions = [
                    'margin-top',
                    'margin-right',
                    'margin-bottom',
                    'margin-left'
                ];
            return CssDeclarationParser._edgeParse(value, portions);
        }
    });
    CssDeclarationParser.register('padding', {
        parse: function (value, property) {
            var portions = [
                    'padding-top',
                    'padding-right',
                    'padding-bottom',
                    'padding-left'
                ];
            return CssDeclarationParser._edgeParse(value, portions);
        }
    });
    return CssDeclarationParser;
});

define('parser/DeclarationBetween', [
    'require',
    '../util',
    './CssDeclarationParser'
], function (require) {
    var util = require('../util');
    var CssDeclarationParser = require('./CssDeclarationParser');
    function DeclarationBetween(property, element) {
        this.property = property;
        this.element = element;
        this.start;
        this.end;
        this.unit;
        this.isReady = false;
    }
    DeclarationBetween.prototype.getElementDeclaration = function () {
        var property = this.property;
        var value = util.getStyle(this.element, property);
        var styles = {};
        styles[property] = value;
        return CssDeclarationParser.parse(styles)[property];
    };
    DeclarationBetween.prototype.setStart = function (start) {
        this.start = start;
        this.normalize();
        this.isInitialized = false;
        this.isReady = true;
    };
    DeclarationBetween.prototype.setEnd = function (end) {
        this.end = end;
        this.normalize();
        this.isInitialized = false;
        this.isReady = true;
    };
    DeclarationBetween.prototype.normalize = function () {
        this.start && (this.unit = this.start.unit);
    };
    DeclarationBetween.prototype.getValue = function (percent) {
        if (!this.isReady) {
            return null;
        }
        if (!this.isInitialized) {
            if (this.start == null) {
                this.setStart(this.getElementDeclaration());
            }
            if (this.end == null) {
                this.setEnd(this.getElementDeclaration());
            }
            this.isInitialized = true;
        }
        var value = this.start.value + (this.end.value - this.start.value) * percent;
        return value + this.unit;
    };
    return DeclarationBetween;
});

define('Move', [
    'require',
    './util',
    './events',
    './TimeEvent',
    './parser/CssDeclarationParser',
    './parser/DeclarationBetween'
], function (require) {
    var util = require('./util');
    var events = require('./events');
    var TimeEvent = require('./TimeEvent');
    var CssDeclarationParser = require('./parser/CssDeclarationParser');
    var DeclarationBetween = require('./parser/DeclarationBetween');
    function Move(options) {
        options = options || {};
        if (options instanceof Element) {
            options = { 'element': options };
        } else if (util.isFunction(options)) {
            options = { 'render': options };
        }
        TimeEvent.call(this, options);
        this.element = options['element'];
        this.customRender = options['render'];
        this.render = Move.prototype.render;
        this.betweens = {};
    }
    util.inherits(Move, TimeEvent);
    Move.prototype.to = function (dest) {
        var declarationSet = CssDeclarationParser.parse(dest);
        for (var key in declarationSet) {
            var bt = this.betweens[key] || new DeclarationBetween(key, this.element);
            bt.setEnd(declarationSet[key]);
            this.betweens[key] = bt;
        }
        return this;
    };
    Move.prototype.from = function (src) {
        var declarationSet = CssDeclarationParser.parse(src);
        for (var key in declarationSet) {
            var bt = this.betweens[key] || new DeclarationBetween(key, this.element);
            bt.setStart(declarationSet[key]);
            this.betweens[key] = bt;
        }
        return this;
    };
    Move.prototype.between = function (src, dest) {
        this.from(src).to(dest);
        return this;
    };
    Move.prototype.internalRender = function (realPlayhead, opt_forceRender) {
        var percent;
        var duration = this.getDuration();
        if (realPlayhead >= duration) {
            percent = this.getProgress(1);
        } else if (realPlayhead <= 0) {
            percent = this.getProgress(0);
        } else {
            percent = this.getProgress(realPlayhead / duration);
        }
        this.trigger(events.BEFORE_UPDATE, percent);
        var styles = {};
        for (var key in this.betweens) {
            styles[key] = this.betweens[key].getValue(percent);
        }
        util.setStyles(this.element, styles);
        this.trigger(events.AFTER_UPDATE, percent);
    };
    Move.create = function (options) {
        var move = new Move(options);
        return move;
    };
    return Move;
});

define('wave/Bezier', ['require'], function (require) {
    function Bezier(var_args) {
        var args = [].slice.call(arguments, 0);
        if (Object.prototype.toString.call(args[0]) === '[object Array]') {
            args = args[0];
        }
        if (args.length % 2) {
            throw 'coordinate count should be even.';
        }
        this.points = [];
        for (var i = 0; i < args.length; i += 2) {
            this.points.push({
                x: args[i],
                y: args[i + 1]
            });
        }
        this.actualPoints = this.points.slice(0);
        this.actualPoints.unshift({
            x: 0,
            y: 0
        });
        this.actualPoints.push({
            x: 1,
            y: 1
        });
        this.sampleCache = {};
        this.factorialCache = {};
        this.order = this.actualPoints.length - 1;
        this.splineSampleCount = 11;
        this.splineSamples = [];
        this.splineInterval = 1 / (this.splineSampleCount - 1);
        this.calcSplineSamples();
    }
    Bezier.consts = {
        NEWTON_ITERATIONS: 4,
        NEWTON_MIN_SLOPE: 0.001,
        SUBDIVISION_PRECISION: 1e-7,
        SUBDIVISION_MAX_ITERATIONS: 10
    };
    Bezier.prototype.calcSplineSamples = function () {
        for (var i = 0; i < this.splineSampleCount; i++) {
            this.splineSamples[i] = this.getFromT(i * this.splineInterval);
        }
    };
    Bezier.prototype.get = function (x) {
        var guessT = this.getTFromX(x);
        return this.getFromT(guessT).y;
    };
    Bezier.prototype.getTFromX = function (x) {
        var tStart = 0;
        var index = 0;
        for (var i = 1; i < this.splineSampleCount; i++) {
            if (i === this.splineSampleCount - 1 || this.splineSamples[i].x > x) {
                tStart = this.splineInterval * (i - 1);
                index = i - 1;
                break;
            }
        }
        var tPossible = tStart + this.splineInterval * (x - this.splineSamples[index].x) / (this.splineSamples[index + 1].x - this.splineSamples[index].x);
        var derivative = this.getDerivativeFromT(tPossible);
        if (derivative.x >= Bezier.consts.NEWTON_MIN_SLOPE) {
            return this.runNewtonRaphsonIterate(x, tPossible);
        } else if (derivative.x == 0) {
            return tPossible;
        } else {
            return this.runBinarySubdivide(x, tStart, tStart + this.splineInterval);
        }
    };
    Bezier.prototype.runNewtonRaphsonIterate = function (x, tPossible) {
        for (var i = 0; i < Bezier.consts.NEWTON_ITERATIONS; i++) {
            var derivative = this.getDerivativeFromT(tPossible);
            if (derivative.x == 0) {
                return tPossible;
            } else {
                var dx = this.getFromT(tPossible).x - x;
                tPossible -= dx / derivative.x;
            }
        }
        return tPossible;
    };
    Bezier.prototype.runBinarySubdivide = function (x, tStart, tEnd) {
        var tPossible;
        for (var i = 0; i < Bezier.consts.SUBDIVISION_MAX_ITERATIONS; i++) {
            tPossible = tStart + (tEnd - tStart) / 2;
            var dx = this.getFromT(tPossible).x - x;
            if (dx <= Bezier.consts.SUBDIVISION_PRECISION) {
                return tPossible;
            } else if (dx > 0) {
                tEnd = tPossible;
            } else {
                tStart = tPossible;
            }
        }
        return tPossible;
    };
    Bezier.prototype.getFromT = function (t) {
        var coeffs = this.getCoefficients();
        var x = 0;
        var y = 0;
        var n = this.order;
        for (var j = 0; j <= n; j++) {
            x += coeffs[j].x * Math.pow(t, j);
            y += coeffs[j].y * Math.pow(t, j);
        }
        return {
            x: x,
            y: y
        };
    };
    Bezier.prototype.getCoefficients = function () {
        if (this.coefficients) {
            return this.coefficients;
        }
        var n = this.order;
        this.coefficients = [];
        for (var j = 0; j <= n; j++) {
            var xsum = 0;
            var ysum = 0;
            for (var i = 0; i <= j; i++) {
                var pcoeff = Math.pow(-1, i + j) / (this.getFactorial(i) * this.getFactorial(j - i));
                xsum += pcoeff * this.actualPoints[i].x;
                ysum += pcoeff * this.actualPoints[i].y;
            }
            var ccoeff = this.getFactorial(n) / this.getFactorial(n - j);
            this.coefficients.push({
                x: ccoeff * xsum,
                y: ccoeff * ysum
            });
        }
        return this.coefficients;
    };
    Bezier.prototype.getFactorial = function (n) {
        if (this.factorialCache[n]) {
            return this.factorialCache[n];
        }
        if (n === 0) {
            return 1;
        } else {
            this.factorialCache[n] = n * this.getFactorial(n - 1);
            return this.factorialCache[n];
        }
    };
    Bezier.prototype.getDerivativeFromT = function (t) {
        var coeffs = this.getCoefficients();
        var x = 0;
        var y = 0;
        var n = this.order;
        for (var j = 1; j <= n; j++) {
            x += j * coeffs[j].x * Math.pow(t, j - 1);
            y += j * coeffs[j].y * Math.pow(t, j - 1);
        }
        return {
            x: x,
            y: y
        };
    };
    Bezier.prototype.getSamples = function (count) {
        if (this.sampleCache[count]) {
            return this.sampleCache[count];
        }
        var samples = [];
        for (var i = 0; i < count; i++) {
            samples.push(this.get(i / (count - 1)));
        }
        this.sampleCache[count] = samples;
    };
    Bezier.prototype.getEasing = function () {
        var me = this;
        return function (x) {
            return me.get(x);
        };
    };
    return Bezier;
});

define('wave/WaveFragment', [
    'require',
    './Bezier'
], function (require) {
    var easeInCurves = {
            'Quad': function (p) {
                return p * p;
            },
            'Cubic': function (p) {
                return p * p * p;
            },
            'Quart': function (p) {
                return p * p * p * p;
            },
            'Qunit': function (p) {
                return p * p * p * p * p;
            },
            'Expo': function (p) {
                return p * p * p * p * p * p;
            },
            'Sine': function (p) {
                return 1 - Math.cos(p * Math.PI / 2);
            },
            'Circ': function (p) {
                return 1 - Math.sqrt(1 - p * p);
            },
            'Back': function (p) {
                return p * p * (3 * p - 2);
            },
            'Elastic': function (p) {
                return p === 0 || p === 1 ? p : -Math.pow(2, 8 * (p - 1)) * Math.sin(((p - 1) * 80 - 7.5) * Math.PI / 15);
            },
            'Bounce': function (p) {
                var pow2;
                var bounce = 4;
                while (p < ((pow2 = Math.pow(2, --bounce)) - 1) / 11) {
                }
                return 1 / Math.pow(4, 3 - bounce) - 7.5625 * Math.pow((pow2 * 3 - 2) / 22 - p, 2);
            }
        };
    var Bezier = require('./Bezier');
    var fastInCurves = { 'B2ToLinear': new Bezier(0, 0.4, 0.2, 0.4, 0.4, 0.55).getEasing() };
    return {
        'easeInCurves': easeInCurves,
        'fastInCurves': fastInCurves
    };
});

define('wave/util', ['require'], function (require) {
    return {
        repeat: function (easing, repeatCount) {
            var stepCount = repeatCount * 2 - 1;
            return function (p) {
                var tmp = p * stepCount;
                var curStep = Math.floor(tmp);
                var newP = tmp - curStep;
                var result = easing(newP);
                if (curStep % 2) {
                    result = 1 - result;
                }
                return result;
            };
        },
        reverse: function (easing) {
            return function (p) {
                return 1 - easing(1 - p);
            };
        },
        reflect: function (easing) {
            return function (p) {
                return 0.5 * (p < 0.5 ? easing(2 * p) : 2 - easing(2 - 2 * p));
            };
        }
    };
});

define('wave/Wave', [
    'require',
    './Bezier',
    './WaveFragment',
    './util'
], function (require) {
    var Bezier = require('./Bezier');
    var Easings = {
            'linear': function (p) {
                return p;
            },
            'none': function (p) {
                return 0;
            },
            'full': function (p) {
                return 1;
            },
            'reverse': function (p) {
                return 1 - p;
            },
            'swing': function (p) {
                return 0.5 - Math.cos(p * Math.PI) / 2;
            },
            'spring': function (p) {
                return 1 - Math.cos(p * 4.5 * Math.PI) * Math.exp(-p * 6);
            }
        };
    var WaveFragment = require('./WaveFragment');
    var util = require('./util');
    var easeInCurves = WaveFragment['easeInCurves'];
    for (var name in easeInCurves) {
        var fragment = easeInCurves[name];
        Easings['easeIn' + name] = fragment;
        Easings['easeOut' + name] = util.reverse(fragment);
        Easings['easeInOut' + name] = util.reflect(fragment);
        Easings['easeOutIn' + name] = util.reflect(util.reverse(fragment));
    }
    var fastInCurves = WaveFragment['fastInCurves'];
    for (var name in fastInCurves) {
        var fragment = fastInCurves[name];
        Easings['fastIn' + name] = fragment;
        Easings['fastOut' + name] = util.reverse(fragment);
        Easings['fastInOut' + name] = util.reflect(fragment);
        Easings['fastOutIn' + name] = util.reflect(util.reverse(fragment));
    }
    var easingBezierMap = {
            'ease': [
                0.25,
                0.1,
                0.25,
                1
            ],
            'ease-in': [
                0.42,
                0,
                1,
                1
            ],
            'ease-out': [
                0,
                0,
                0.58,
                1
            ],
            'ease-in-out': [
                0.42,
                0,
                0.58,
                1
            ]
        };
    for (var name in easingBezierMap) {
        Easings[name] = new Bezier(easingBezierMap[name]).getEasing();
    }
    function Wave(value) {
        if (!(this instanceof Wave)) {
            return Wave.make(value);
        }
        this.value = value;
        this.easing;
    }
    Wave.prototype.getEasing = function () {
        if (!this.easing) {
            this.easing = Wave.make(this.value);
        }
        return this.easing;
    };
    Wave.make = function (value) {
        if (Object.prototype.toString.call(value) === '[object String]') {
            return Easings[value] || null;
        } else if (Object.prototype.toString.call(value) === '[object Array]') {
            return new Bezier(value).getEasing();
        } else if (Object.prototype.toString.call(value) === '[object Function]') {
            return value;
        } else {
            return null;
        }
    };
    Wave.register = function (name, value) {
        var easing = wave(value);
        if (easing) {
            Easings[name] = easing;
        } else {
            throw 'unregisterable';
        }
    };
    Wave.getMap = function () {
        return Easings;
    };
    return Wave;
});

define('wave', ['wave/Wave'], function ( main ) { return main; });

define('Dance', [
    'require',
    './global',
    './util',
    './Timeline',
    './Move',
    'wave'
], function (require) {
    var global = require('./global');
    var util = require('./util');
    var Timeline = require('./Timeline');
    var Move = require('./Move');
    var wave = require('wave');
    function Dance(options) {
        Timeline.apply(this, arguments);
        this.render = Dance.prototype.render;
    }
    util.inherits(Dance, Timeline);
    Dance.defaults = function (key, value) {
        global.defaults[key] = value;
    };
    Dance.create = function (options) {
        var dance = new Dance(options);
        if (util.isPlainObject(options) && options.isInFrame) {
            global.rootFrameTimeline.add(dance);
        } else {
            global.rootTimeline.add(dance);
        }
        return dance;
    };
    Dance.move = function (options) {
        var move = new Move(options);
        if (util.isPlainObject(options) && options.isInFrame) {
            global.rootFrameTimeline.add(move);
        } else {
            global.rootTimeline.add(move);
        }
        return move;
    };
    Dance.wave = wave;
    return Dance;
});