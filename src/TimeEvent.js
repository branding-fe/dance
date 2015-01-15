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
    var global = require('./global');
    var util = require('./util');
    var events = require('./events');
    var EventDispatcher = require('./EventDispatcher');
    var TINY_NUMBER = global.TINY_NUMBER;

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
        this._duration = Infinity;

        /**
         * 时间缩放比例
         * @param {number}
         */
        this._scale = 1;

        /**
         * 绑定的时间轴
         * @type {Timeline}
         */
        this.timeline;

        /**
         * 是否处于暂停状态
         * @type {boolean}
         */
        this.isPaused = false;


        /**
         * 是否处于运行状态
         * @type {boolean}
         */
        this.isActive = true;

        /**
         * 是否处于永久运行状态，这个的值会影响 isActive
         * @type {boolean}
         */
        this.isAlwaysActive = false;

        /**
         * 当前时间或帧数(相对于自身startPoint)
         * @type {number}
         */
        this.time = -TINY_NUMBER;

        /**
         * 记录计算的当前时间或帧数
         */
        this.localPlayhead = -TINY_NUMBER;

        /**
         * 是否逆向
         * @type {boolean}
         */
        this.isReversed = false;
    }
    util.inherits(TimeEvent, EventDispatcher);

    TimeEvent.prototype.getStartPoint = function() {
        return this.startPoint;
    };

    TimeEvent.prototype.getDuration = function() {
        return this._duration;
    };

    TimeEvent.prototype.getScale = function() {
        return this._scale;
    };

    TimeEvent.prototype.getTime = function() {
        return this.time;
    };

    TimeEvent.prototype.duration = function(duration) {
        this._duration = duration;
        return this;
    };

    TimeEvent.prototype.scale = function(scale) {
        this._scale = scale;
        // TODO; scale pauseTime ?
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

    // TimeEvent.prototype.at
    //     = TimeEvent.prototype.when
    //     = function(timeOrFrame) {
    //         if (this.timeline) {
    //             this.time = timeOrFrame + this.getStartPoint();
    //         }

    //         return this;
    //     };

    TimeEvent.prototype.delay
        = TimeEvent.prototype.after
        = function(timeOrFrame) {
            this.delay = timeOrFrame;

            return this;
        };

    /**
     * 渲染
     * 1. opt_forceRender=true(例如seek(xxx)) 不触发开始或者结束事件，那么需要在下一次移动时触发
     * 2. opt_forceRender=false 那么立即触发事件
     */
    TimeEvent.prototype.render = function(playhead, opt_forceRender) {
        this.time = playhead;

        if (!opt_forceRender && this.isPaused) {
            return this;
        }

        // TODO: zero-duration case
        // 如果时zero-duration的move，如果正好落在此处，有两种情况

        var duration = this.getDuration();
        // 限定在 0 ~ Infinity 之间
        var localPlayhead = Math.max(playhead, -TINY_NUMBER);

        // 不处于激活状态或者跟上一次相同，不需要渲染
        var lastLocalPlayhead = this.localPlayhead;
        if (!this.isActive || localPlayhead === lastLocalPlayhead) {
            return this;
        }

        // 从区域内离开都是"完成"
        var isFinished = false;
        if (!opt_forceRender) {
            if (localPlayhead >= duration && lastLocalPlayhead < duration
                || localPlayhead <= 0 && lastLocalPlayhead > 0
            ) {
                isFinished = true;
                if (localPlayhead === 0) {
                    localPlayhead = -TINY_NUMBER;
                }
                else if (localPlayhead === duration) {
                    localPlayhead = duration + TINY_NUMBER;
                }
            }
            // 从区域外进入区域内都是"开始"
            else if (localPlayhead >= 0
                && localPlayhead <= duration
                && (lastLocalPlayhead < 0 || lastLocalPlayhead > duration)
            ) {
                this.trigger(events.BEFORE_START);
            }
        }

        // 如果是逆向，playhead 反转
        var realPlayhead = this.isReversed ? duration - localPlayhead : localPlayhead;
        this.internalRender(realPlayhead, opt_forceRender);

        if (isFinished) {
            this.deactivate();
            this.trigger(events.AFTER_FINISH);
        }

        this.localPlayhead = localPlayhead;

        return this;
    };

    TimeEvent.prototype.internalRender = function(realPlayhead, opt_forceRender) {};

    TimeEvent.prototype.activate = function() {
        this.isActive = true;
    };

    TimeEvent.prototype.deactivate = function() {
        if (!this.isAlwaysActive) {
            this.isActive = false;
        }
    };

    /**
     * 时光逆流
     * @param {number} opt_reversePoint 反向时间点，如果没有指定就用当前时间点
     */
    TimeEvent.prototype.reverse = function(opt_reversePoint) {
        this.isReversed = !this.isReversed;
        if (!this.timeline) {
            return this;
        }
        var duration = this.getDuration();
        var reversePoint = opt_reversePoint != null
            ? opt_reversePoint
            : this.localPlayhead;
        // 限制 reversePoint 到 0 ~ duration 中
        var played = Math.min(Math.max(reversePoint, 0), duration);

        // 反转之后的已播放时长
        var playedNow = duration - played;
        this.startPoint = this.timeline.getTime() - playedNow / this.getScale();
        // FIXME: 边界情况？reverse(0) 之类的
        this.localPlayhead = playedNow;
        this.rearrange();

        return this;
    };

    TimeEvent.prototype.seek = function(targetPoint) {
        var duration = this.getDuration();
        // 限制 targetPoint 到 0 ~ duration 中
        var played = Math.min(Math.max(targetPoint, 0), duration);

        this.startPoint = this.timeline.getTime() - played / this.getScale();
        if (this.isPaused) {
            this.pausePoint = played;
        }
        this.rearrange();

        this.render(played, true);

        return this;
    };

    TimeEvent.prototype.play = function(opt_playhead) {
        if (this.isPaused) {
            if (opt_playhead != null) {
                this.seek(opt_playhead);
            }
            this.resume();
        }
        else {
            this.seek(opt_playhead || 0);
        }

        return this;
    };

    TimeEvent.prototype.stop = function() {
        this.seek(0);
        this.pause();

        return this;
    };

    TimeEvent.prototype.pause = function(opt_playhead) {
        if (opt_playhead != null) {
            this.seek(opt_playhead);
        }
        this.pausePoint = this.localPlayhead;
        this.isPaused = true;

        return this;
    };

    TimeEvent.prototype.resume = function() {
        if (!this.isPaused) {
            return this;
        }

        var duration = this.getDuration();
        // 限制到 0 ~ duration 中
        var played = Math.min(Math.max(this.pausePoint, 0), duration);
        this.startPoint = this.timeline.getTime() - played / this.getScale();
        this.isPaused = false;
        this.pausePoint = null;

        this.seek(played);
    };

    return TimeEvent;
});



















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
