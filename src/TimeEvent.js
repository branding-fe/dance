/***************************************************************************
 *
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * @author: songao(songao@baidu.com)
 * @file: src/TimeEvent.js
 *
 **************************************************************************/


/*
 * path:    src/TimeEvent.js
 * desc:    时间事件，是所有时间轴、动画片段的基类，任何跟时间相关的对象都可以抽象为时间事件
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2014/12/15 10:55:43$
 */

define(function (require) {
    var global = require('./global');
    var util = require('./util');
    var events = require('./events');
    var EventDispatcher = require('./EventDispatcher');

    /**
     * 时间事件，是所有时间轴、动作的基类
     * @param {Object} options 选项
     * @param {boolean} options.isInFrame 时间单位是否是帧
     * @param {number} options.startPoint 动画时间起点
     * @param {number} options.delay 初始延迟
     * @param {number} options.duration 动画时长
     * @param {number} options.scale 时间缩放比例
     * @param {Timeline} options.timeline 所属时间轴
     * @param {Function} options.ease 缓动函数
     * @constructor
     */
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
        this.startPoint = options['startPoint'] || 0;

        /**
         * 时间事件开始之前的delay
         * @type {number}
         */
        this.delay = options['delay'];

        /**
         * 持续时间或者持续帧数
         * @type {number}
         */
        this._duration = options['duration'] != null ? options['duration'] : Infinity;

        /**
         * 时间缩放比例
         * @param {number}
         */
        this._scale = options['scale'] || 1;

        /**
         * 绑定的时间轴
         * @type {Timeline}
         */
        this.timeline = options['timeline'];

        /**
         * 缓动函数
         * @type {Function}
         */
        this._ease = options['ease'];

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
        this.playhead = 0;

        /**
         * 上一次记录的当前时间或帧数是否可信
         * @type {boolean}
         */
        this.isPlayheadDirty = true;

        /**
         * 是否逆向 (相对于父时间轴)
         * @type {boolean}
         */
        this.isReversed = false;

        /**
         * 是否真实逆向 (综合考虑了所有顶层时间轴的逆向)
         * @type {boolean}
         */
        this.isRealReversed = false;
    }
    util.inherits(TimeEvent, EventDispatcher);

    /**
     * 获取开始时间点
     * @return {number}
     */
    TimeEvent.prototype.getStartPoint = function () {
        return this.startPoint;
    };

    /**
     * 获取时长
     * @return {number}
     */
    TimeEvent.prototype.getDuration = function () {
        return this._duration;
    };

    /**
     * 获取时间缩放比例
     * @return {number}
     */
    TimeEvent.prototype.getScale = function () {
        return this._scale;
    };

    /**
     * 获取当前时间(相对于自身起点)
     * @return {number}
     */
    TimeEvent.prototype.getTime = function () {
        return this.playhead;
    };

    /**
     * 设置时长
     * @param {number} duration 时长
     * @return {TimeEvent}
     */
    TimeEvent.prototype.duration = function (duration) {
        this._duration = duration;
        return this;
    };

    /**
     * 设置时间缩放比例
     * @param {number} scale 缩放比例
     * @return {TimeEvent}
     */
    TimeEvent.prototype.scale = function (scale) {
        this._scale = scale;
        // TODO; scale pauseTime ?
        return this;
    };

    /**
     * 设置所属时间轴
     * @param {Timeline} timeline 所属时间轴
     */
    TimeEvent.prototype.setTimeline = function (timeline) {
        this.timeline = timeline;
    };

    /**
     * 设置起始时间点
     * @param {number} startPoint 起始时间点
     */
    TimeEvent.prototype.setStartPoint = function (startPoint) {
        this.startPoint = startPoint;
    };

    /**
     * 是否已经绑定了时间轴
     * @return {boolean}
     */
    TimeEvent.prototype.isAttached = function () {
        return !!this.timeline;
    };

    /**
     * 解绑时间轴
     * @return {TimeEvent}
     */
    TimeEvent.prototype.detach = function () {
        if (this.timeline) {
            this.timeline.remove(this);
        }

        return this;
    };

    /**
     * 绑定时间轴
     * @return {TimeEvent}
     */
    TimeEvent.prototype.attach = function () {
        if (this.timeline) {
            this.timeline.add(this, this.startPoint - this.delay);
        }

        return this;
    };

    /**
     * 设置 delay 时长
     * @param {number} timeOrFrame delay 时长
     * @return {TimeEvent}
     */
    TimeEvent.prototype.delay
        = TimeEvent.prototype.after
        = function (timeOrFrame) {
            this.delay = timeOrFrame;

            return this;
        };

    /**
     * 设置 ease 函数
     * @param {Function} ease 缓动函数
     * @return {TimeEvent}
     */
    TimeEvent.prototype.ease = function (ease) {
        this._ease = ease;

        return this;
    };

    /**
     * 通过已播放时长百分比用 ease 计算播放进度
     * @param {number} timePercent 已播放时长百分比
     * @return {number}
     */
    TimeEvent.prototype.getProgress = function (timePercent) {
        if (this._ease) {
            return this._ease(timePercent);
        }
        return timePercent;
    };

    /**
     * 渲染
     * 1. opt_forceRender=true(例如seek(xxx)) 不触发开始或者结束事件，那么需要在下一次移动时触发
     * 2. opt_forceRender=false 那么立即触发事件
     * @param {number} playhead 当前时间点
     * @param {boolean=} opt_forceRender 是否强制渲染，为 true 则忽略一些限制
     * @return {TimeEvent}
     */
    TimeEvent.prototype.render = function (playhead, opt_forceRender) {
        var lastPlayhead = this.playhead;
        this.playhead = playhead;
        var isPlayheadDirty = this.isPlayheadDirty;
        this.isPlayheadDirty = false;

        if (!opt_forceRender && this.isPaused) {
            return this;
        }

        // TODO: zero-duration case
        // 如果时zero-duration的move，如果正好落在此处，有两种情况

        var duration = this.getDuration();
        // 不处于激活状态或者跟上一次相同，不需要渲染
        if (!this.isActive || playhead === lastPlayhead) {
            return this;
        }

        // 不在区域内并且是离开的方向就是"完成"
        var isFinished = false;
        var isNeedRender = true;
        if (!opt_forceRender) {
            if (playhead < 0) {
                if (isPlayheadDirty) {
                    isNeedRender = false;
                }
                else {
                    if (playhead < lastPlayhead) {
                        isFinished = true;
                    }
                    else {
                        isNeedRender = false;
                    }
                }
            }
            else if (playhead > duration) {
                if (isPlayheadDirty) {
                    isNeedRender = false;
                }
                else {
                    if (playhead > lastPlayhead) {
                        isFinished = true;
                    }
                    else {
                        isNeedRender = false;
                    }
                }
            }
            else {
                if (lastPlayhead != null
                    && (lastPlayhead < 0 || lastPlayhead > duration)
                ) {
                    this.trigger(events.START);
                }
            }
        }

        // 如果是逆向，playhead 反转
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

    /**
     * 内部渲染函数：真正干活的，继承类去实现
     * @param {number} realPlayhead 播放指针实际位置
     * @param {boolean=} opt_forceRender 是否强制渲染
     */
    TimeEvent.prototype.internalRender = function (realPlayhead, opt_forceRender) {};

    /**
     * 激活时间事件
     * @return {TimeEvent}
     */
    TimeEvent.prototype.activate = function () {
        this.isActive = true;
        return this;
    };

    /**
     * 停止时间事件
     * @return {TimeEvent}
     */
    TimeEvent.prototype.deactivate = function () {
        if (!this.isAlwaysActive) {
            this.isPlayheadDirty = true;
            this.isActive = false;
        }
        return this;
    };

    /**
     * 设置实际逆转状态
     * @param {boolean=} opt_parentRealReversed 父时间轴是否逆转
     */
    TimeEvent.prototype.setRealReverse = function (opt_parentRealReversed) {
        if (opt_parentRealReversed != null) {
            if (this.isReversed) {
                this.isRealReversed = !opt_parentRealReversed;
            }
        }
        else {
            this.isRealReversed = !this.isRealReversed;
        }
    };

    /**
     * 时光逆流
     * @param {number=} opt_reversePoint 反向时间点，如果没有指定就用当前时间点
     * @return {TimeEvent}
     */
    TimeEvent.prototype.reverse = function (opt_reversePoint) {
        this.isReversed = !this.isReversed;
        this.setRealReverse();
        if (!this.timeline) {
            return this;
        }
        var duration = this.getDuration();
        var reversePoint = opt_reversePoint != null
            ? opt_reversePoint
            : (this.isPaused ? this.pausePoint : this.playhead);
        // 限制 reversePoint 到 0 ~ duration 中
        var played = Math.min(Math.max(reversePoint, 0), duration);

        // 反转之后的已播放时长
        var playedNow = duration - played;
        this.startPoint = this.timeline.getTime() - playedNow / this.getScale();
        // FIXME: 边界情况？reverse(0) 之类的
        this.playhead = playedNow;
        this.rearrange();

        return this;
    };

    /**
     * 直接跳到指定时间点播放动画
     * @param {number} targetPoint 指定的时间点
     * @return {TimeEvent}
     */
    TimeEvent.prototype.seek = function (targetPoint) {
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

    /**
     * 按指定进度挪动指针
     * @param {number} progress 进度
     * @param {boolean} opt_reverseConsidered 是否考虑反转。
     *       提供的 progress 有两种可能：
     *       1. progress 表示已播放的百分比，不管是否处于反转状态 (opt_reverseConsidered = false)
     *       2. progress 表示实际指针位置 (opt_reverseConsidered = true)
     * @return {TimeEvent}
     */
    TimeEvent.prototype.seekProgress = function (progress, opt_reverseConsidered) {
        var duration = this.getDuration();
        var actualProgress = opt_reverseConsidered && this.isReversed
            ? 1 - progress
            : progress
        this.seek(duration * actualProgress);

        return this;
    };

    /**
     * 播放
     * @param {number=} opt_target 指定的时间点
     * @param {Object=} opt_options 选项
     * @return {TimeEvent}
     */
    TimeEvent.prototype.play = function (opt_target, opt_options) {
        if (this.isPaused) {
            if (opt_target != null) {
                this.seek(opt_target);
            }
            this.resume();
        }
        else {
            var duration = this.getDuration();
            if (this.playhead < 0 || this.playhead >= duration) {
                this.seek(opt_target || 0);
            }
        }

        return this;
    };

    /**
     * 向前播放
     * @return {TimeEvent}
     */
    TimeEvent.prototype.playForward = function () {
        if (this.isRealReversed) {
            this.reverse().play(0);
        }
        else {
            this.play(0);
        }
        return this;
    };

    /**
     * 向后播放
     * @return {TimeEvent}
     */
    TimeEvent.prototype.playBackward = function () {
        if (this.isRealReversed) {
            this.play(0);
        }
        else {
            this.reverse().play(0);
        }
        return this;
    };

    /**
     * 停止
     * @return {TimeEvent}
     */
    TimeEvent.prototype.stop = function () {
        this.seek(0);
        this.pause();

        return this;
    };

    /**
     * 暂停
     * @param {number=} opt_playhead 指定位置
     * @return {TimeEvent}
     */
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

    /**
     * 继续
     * @return {TimeEvent}
     */
    TimeEvent.prototype.resume = function () {
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
