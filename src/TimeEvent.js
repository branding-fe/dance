/***************************************************************************
 * 
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * 
 **************************************************************************/
 
 
/*
 * path:    src/TimeEvent.js
 * desc:    时间事件，是所有时间轴、动画片段的基类，任何跟时间相关的对象都可以抽象为时间事件
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2014/12/15 10:55:43$
 */

define(function(require) {
    var util = require('./util');
    var events = require('./events');
    var EventDispatcher = require('./EventDispatcher');

    function TimeEvent(options) {
        EventDispatcher.call(this);

        options = options || {};

        /**
         * 度量单位是时间(ms)还是帧数(frame)
         * @type {boolean}
         */
        this.isInFrame = options['isInFrame'] || false;

        /**
         * 时间事件发生的时间起点或者帧数起点
         * @type {number}
         */
        this.startPoint;

        /**
         * 时间事件开始之前的delay
         * @type {number}
         */
        this.delay;

        /**
         * 持续时间或者持续帧数
         * @type {number}
         */
        this._duration;

        /**
         * 时间缩放比例
         * @param {number}
         */
        this.scale = 1;

        /**
         * 绑定的时间轴
         * @type {Timeline}
         */
        this.timeline;

        /**
         * 是否处于运行状态
         * @type {boolean}
         */
        this.isActive = true;

        /**
         * 当前时间或帧数(相对于自身startPoint)
         */
        this.time = 0;
    }
    util.inherits(TimeEvent, EventDispatcher);

    TimeEvent.prototype.getStartPoint = function() {
        return this.startPoint;
    };

    TimeEvent.prototype.getDuration = function() {
        return this._duration;
    };

    TimeEvent.prototype.getScale = function() {
        return this.scale;
    };

    TimeEvent.prototype.duration = function(duration) {
        this._duration = duration;
        return this;
    };

    TimeEvent.prototype.setTimeline = function(timeline) {
        this.timeline = timeline;
    };

    TimeEvent.prototype.setStartPoint = function(startPoint) {
        this.startPoint = startPoint;
    };

    TimeEvent.prototype.isAttached = function() {
        return !!this.timeline;
    };

    TimeEvent.prototype.detach = function() {
        if (this.timeline) {
            this.timeline.remove(this);
        }
    };

    TimeEvent.prototype.attach = function() {
        if (this.timeline) {
            this.timeline.add(this, this.startPoint - this.delay);
        }
    };

    TimeEvent.prototype.at
        = TimeEvent.prototype.when
        = function(timeOrFrame) {
            if (this.timeline) {
                this.time = timeOrFrame + this.getStartPoint();
            }

            return this;
        };

    TimeEvent.prototype.delay
        = TimeEvent.prototype.after
        = function(timeOrFrame) {
            this.delay = timeOrFrame;

            return this;
        };

    return TimeEvent;
});



















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
