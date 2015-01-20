/***************************************************************************
 *
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * @author: songao(songao@baidu.com)
 * @file: src/Timeline.js
 *
 **************************************************************************/


/*
 * path:    src/Timeline.js
 * desc:    时间轴基类
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2014/12/11 12:58:06$
 */

define(function (require) {
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

        /**
         * 保存最近一次添加的时间事件
         * @type {TimeEvent}
         */
        this._lastTimeEvent;

        /**
         * 双向链表的头指针
         * @type {TimeEvent}
         */
        this.listHead = null;

        /**
         * 双向链表的尾指针
         * @type {TimeEvent}
         */
        this.listTail = null;

        /**
         * 是否永久处于激活状态，对于时间轴来说是永久激活的，所以这里是true
         * @type {boolean}
         */
        this.isAlwaysActive = true;
    }
    util.inherits(Timeline, TimeEvent);

    /**
     * 往时间轴上添加时间事件
     * 允许添加任何TimeEvent类型的对象，例如Move、PauseEvent等，甚至可以添加时间轴对象Timeline
     *
     * @param {TimeEvent} timeEvent 时间事件
     * @return {Timeline}
     */
    Timeline.prototype.add = function (timeEvent) {
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
        // FIXME: this.startPoint 同样需要更新
        timeEvent.setTimeline(this);
        timeEvent.setStartPoint(this.playhead);
        timeEvent.setRealReverse(this.isRealReversed);
        this._lastTimeEvent = timeEvent;
        this.enqueue(timeEvent);
        this.rearrange();
        return this;
    };

    /**
     * 从链表的头部开始遍历
     * @param {Function} callback 回调
     */
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

    /**
     * 从链表的尾部开始遍历
     * @param {Function} callback 回调
     */
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

    /**
     * 从链表的两边往指定位置遍历
     * @param {number} point 指定位置
     * @param {Function} callback 回调
     */
    Timeline.prototype.outInTraverse = function (point, callback) {
        var isBreaked = false;
        var ret;
        var timeEvent;
        if (this.listHead) {
            timeEvent = this.listHead;
            // FIXME: 临界点
            while (timeEvent) {
                if (point < timeEvent.getStartPoint()
                    || (!this.isRealReversed
                        && point === timeEvent.getStartPoint()
                    )
                ) {
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
                if (point > timeEvent.getStartPoint()
                    || (this.isRealReversed
                        && point === timeEvent.getStartPoint()
                    )
                ) {
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

    /**
     * 往链表上添加时间事件，按开始事件先后进行摆放
     * @param {TimeEvent} timeEvent 时间事件
     */
    Timeline.prototype.enqueue = function (timeEvent) {
        if (this.listTail == null) {
            this.listHead = timeEvent;
            this.listTail = timeEvent;
            timeEvent.prev = null;
            timeEvent.next = null;
        }
        else {
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
            }
            else {
                this.listTail = timeEvent;
            }
        }
    };

    /**
     * 往链表上删除时间事件
     * @param {TimeEvent} timeEvent 时间事件
     */
    Timeline.prototype.dequeue = function (timeEvent) {
        if (timeEvent.timeline === this) {
            if (timeEvent.prev) {
                timeEvent.prev.next = timeEvent.next;
            }
            else if (this.listHead === timeEvent) {
                this.listHead = timeEvent.next;
            }
            if (timeEvent.next) {
                timeEvent.next.prev = timeEvent.prev;
            }
            else if (this.listTail === timeEvent) {
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

    /**
     * 给前一个刚添加的时间事件设置在时间轴上的放置位置
     * @param {number} timeOrFrame 放置时间点
     * @return {Timeline}
     */
    Timeline.prototype.at = function (timeOrFrame) {
        if (this._lastTimeEvent) {
            this._lastTimeEvent.setStartPoint(timeOrFrame);
            this.rearrange();
        }

        return this;
    };

    /**
     * 从时间轴上移除某个时间事件
     * @param {TimeEvent} target 目标时间事件
     * @return {Timeline}
     */
    Timeline.prototype.remove = function (target) {
        this.dequeue(target);
        this.rearrange();

        return this;
    };

    /**
     * 对时间轴进行缩放：即快放或者慢放
     * @param {number} scale 缩放比例
     * @return {Timeline}
     */
    Timeline.prototype.scale = function (scale) {
        TimeEvent.prototype.scale.apply(this, arguments);

        this.rearrange();

        return this;
    };

    /**
     * 对时间轴进行整理，计算有动画的时长
     * @return {Timeline}
     */
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

    /**
     * 渲染函数
     * @param {number} realPlayhead 实际播放位置
     * @param {boolean=} opt_forceRender 是否强制渲染
     * @return {Timeline}
     */
    Timeline.prototype.internalRender = function (realPlayhead, opt_forceRender) {
        var that = this;
        var traverse = opt_forceRender
            ? util.bind(this.outInTraverse, this, realPlayhead)
            : (this.isRealReversed ? this.reverseTraverse : this.traverse);
        var duration = this.getDuration();
        var progress = Math.max(Math.min(realPlayhead, duration), 0) / duration;
        // 只在合法的区间内使用 ease 函数
        // XXX: 虽然时间轴支持 ease，但谨慎使用，不要使用有回弹和超出范围的缓动函数，否则会出现问题
        if (this._ease && realPlayhead >= 0 && realPlayhead <= duration) {
            progress = this.getProgress(progress);
            realPlayhead = realPlayhead * progress;
        }
        traverse.call(this, function (timeEvent) {
            if (!timeEvent.isActive) {
                return;
            }
            // TODO: scale delay from startPoint?
            var scaledElapsed = (realPlayhead - timeEvent.getStartPoint()) * timeEvent.getScale();
            timeEvent.render(scaledElapsed, opt_forceRender);
        });
        this.trigger(events.PROGRESS, progress, this.playhead);
    };

    /**
     * 设置真实逆转状态
     */
    Timeline.prototype.setRealReverse = function () {
        TimeEvent.prototype.setRealReverse.apply(this, arguments);

        this.traverse(function (timeEvent) {
            timeEvent.setRealReverse();
        });
    };

    /**
     * 反转时间轴
     * @return {Timeline}
     */
    Timeline.prototype.reverse = function () {
        TimeEvent.prototype.reverse.apply(this, arguments);

        this.seek(this.playhead);

        return this;
    };

    /**
     * 批量设置时间轴上的时间事件的缓动函数
     * @param {Function} ease 缓动函数
     * @return {Timeline}
     */
    Timeline.prototype.childEase = function (ease) {
        this.traverse(function (timeEvent) {
            timeEvent.ease(ease);
        });

        return this;
    };

    /**
     * 激活时间轴上所有的动画
     * @return {Timeline}
     */
    Timeline.prototype.activate = function () {
        TimeEvent.prototype.activate.apply(this, arguments);

        this.traverse(function (timeEvent) {
            timeEvent.activate();
        });

        return this;
    };

    /**
     * 设定时间轴速度
     * @param {number} scale 缩放比例
     * @return {Timeline}
     */
    Timeline.prototype.setPlaybackRate
        = Timeline.prototype.speed
        = function (scale) {
            this.scale(scale);

            return this;
        };

    // 实例化 Ticker
    global.ticker = new Ticker();
    // 生成两个默认时间轴
    // 一个是毫秒计数的，一个是帧数计数的
    global.rootTimeline = new Timeline();
    global.rootFrameTimeline = new Timeline({
        'isInFrame': true
    });
    global.ticker.addListener(events.TICK, function (time, frame) {
        global.rootTimeline.render(time);
        global.rootFrameTimeline.render(frame);
    });

    return Timeline;
});




















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
