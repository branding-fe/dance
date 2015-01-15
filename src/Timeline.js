/***************************************************************************
 * 
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * 
 **************************************************************************/
 
 
/*
 * path:    src/Timeline.js
 * desc:    时间轴基类
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2014/12/11 12:58:06$
 */

define(function(require) {
    var global = require('./global');
    var util = require('./util');
    var events = require('./events');
    var TimeEvent = require('./TimeEvent');
    var Ticker = require('./Ticker');

    /**
     * 时间轴基类
     * 提供基本的时间轴方法，Root Timeline 是此类的实例，而Dance类则封装了更多的时间轴方法
     * @constructor
     */
    function Timeline() {
        TimeEvent.apply(this, arguments);

        // 性能优化：
        // render函数调用频繁，将render函数放到this上，减少prototype的查找时间
        this.render = Timeline.prototype.render;

        this.eventList = [];

        this.isAlwaysActive = true;
    }
    util.inherits(Timeline, TimeEvent);

    /**
     * 往时间轴上添加时间事件
     * 允许添加任何TimeEvent类型的对象，例如Move、PauseEvent等，甚至可以添加时间轴对象Timeline
     *
     * @param {TimeEvent} timeEvent 时间事件
     */
    Timeline.prototype.add = function(timeEvent) {
            if (!timeEvent instanceof TimeEvent) {
                throw 'Only TimeEvent could be added to Timeline!';
            }
            if (timeEvent.isInFrame !== this.isInFrame) {
                throw 'Can not add a TimeEvent with '
                    + (timeEvent.isInFrame ? 'frame' : 'time')
                    + ' in a Timeline with ' + (this.isInFrame ? 'frame' : 'time');
            }
            if (timeEvent.isAttached()) {
                timeEvent.detach();
            }
            timeEvent.setTimeline(this);
            timeEvent.setStartPoint(this.time);
            this._lastTimeEvent = timeEvent;
            this.eventList.push(timeEvent);
            this.rearrange();
            return this;
        };

    Timeline.prototype.at = function(timeOrFrame) {
        if (this._lastTimeEvent) {
            this._lastTimeEvent.setStartPoint(timeOrFrame);
            this.rearrange();
        }

        return this;
    };

    Timeline.prototype.remove = function(target) {
        util.each(this.eventList, function(timeEvent, index, eventList) {
            if (target === timeEvent) {
                eventList.splice(index, 1);
                return util.breaker;
            }
        });
        return this;
    };

    Timeline.prototype.scale = function() {
        TimeEvent.prototype.scale.apply(this, arguments);

        this.rearrange();

        return this;
    };

    Timeline.prototype.rearrange = function() {
        var maxRelativeEndPoint = -Infinity;
        if (!this.eventList.length) {
            maxRelativeEndPoint = 0;
        }
        else {
            util.each(this.eventList, function(timeEvent, index) {
                var relativeEndPoint = timeEvent.getStartPoint() + timeEvent.getDuration() / timeEvent.getScale();
                if (relativeEndPoint > maxRelativeEndPoint) {
                    maxRelativeEndPoint = relativeEndPoint;
                }
            });
        }
        this._duration = maxRelativeEndPoint;
        if (this.timeline) {
            this.timeline.rearrange();
        }
        this.activate();

        return this;
    };

    Timeline.prototype.internalRender = function(realPlayhead, opt_forceRender) {
        var that = this;
        util.each(this.eventList, function(timeEvent, index) {
            if (!timeEvent.isActive) {
                return;
            }
            // TODO: scale delay from startPoint?
            var scaledElapsed = (realPlayhead - timeEvent.getStartPoint()) * timeEvent.getScale();
            timeEvent.render(scaledElapsed, opt_forceRender);
        });
    };

    Timeline.prototype.reverse = function() {
        TimeEvent.prototype.reverse.apply(this, arguments);

        this.seek(this.localPlayhead);

        return this;
    };


    Timeline.prototype.activate = function() {
        TimeEvent.prototype.activate.apply(this, arguments);

        util.each(this.eventList, function(timeEvent, index) {
            timeEvent.activate();
        });

        return this;
    };

    Timeline.prototype.setPlaybackRate
        = Timeline.prototype.speed
        = function() {
            // TODO
        };

    // 实例化 Ticker
    global.ticker = new Ticker();
    // 生成两个默认时间轴
    // 一个是毫秒计数的，一个是帧数计数的
    global.rootTimeline = new Timeline();
    global.rootFrameTimeline = new Timeline({
        'isInFrame': true
    });
    global.ticker.addListener(events.TICK, function(time, frame) {
        global.rootTimeline.render(time);
        global.rootFrameTimeline.render(frame);
    });

    return Timeline;
});




















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
