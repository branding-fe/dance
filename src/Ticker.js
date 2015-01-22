/***************************************************************************
 *
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * @author: songao(songao@baidu.com)
 * @file: src/Ticker.js
 *
 **************************************************************************/


/*
 * path:    src/Ticker.js
 * desc:    节拍器
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2014/12/11 13:02:04$
 */

define(function (require) {
    var global = require('./global');
    var util = require('./util');
    var events = require('./events');
    var EventDispatcher = require('./EventDispatcher');

    // detect if RAF supported
    var requestAnimationFrame = window.requestAnimationFrame;
    var cancelAnimationFrame = window.cancelAnimationFrame;
    var vendors = ['ms', 'webkit', 'moz', 'o'];
    for (var i = 0; i < vendors.length && (!requestAnimationFrame || !cancelAnimationFrame); i++) {
        requestAnimationFrame = window[vendors[i] + 'RequestAnimationFrame'];
        cancelAnimationFrame = window[vendors[i] + 'CancelAnimationFrame']
            || window[vendors[i] + 'CancelRequestAnimationFrame'];
    }
    var isRAFSupported = requestAnimationFrame && cancelAnimationFrame;

    /**
     * Ticker类，控制时间节拍和帧率
     *
     * @param {?number} fps 帧率
     * @param {Object=} optOptions 选项
     * @param {boolean} optOptions.enableRAF 是否启用requestAnimationFrame
     * @constructor
     */
    function Ticker(fps, optOptions) {
        EventDispatcher.call(this);

        /**
         * 选项
         * @type {Object}
         */
        var options = optOptions || {};

        /**
         * 时间原点
         * 取值是世界绝对时间
         * @type {number}
         */
        this.startTime = this.now();

        /**
         * 当前时间
         * 相对于时间原点的相对时间
         * @type {number}
         */
        this.time = 0;

        /**
         * 当前帧数
         * @type {number}
         */
        this.frame = 0;

        /**
         * 是否启用requestAnimationFrame
         * @type {boolean}
         */
        this.enableRAF = options.enableRAF !== false && isRAFSupported;

        /**
         * 允许的最大抖动阈值
         * @type {number}
         */
        this.lagThreshold = 400;

        /**
         * 预设抖动调整值
         * 当tick间隔超过最大抖动阈值时，使用此值来代替tick间隔
         * @type {number}
         */
        this.lagPreset = 33;

        /**
         * 帧率
         * @type {?number}
         */
        this.fps;

        /**
         * tick间隔
         * 根据帧率算出来，关系如下：interval = 1 / fps
         * @type {number}
         */
        this.interval = 1000 / 60;

        /**
         * 下一动画帧请求函数
         * @type {Function}
         */
        this.requestNextFrame;

        /**
         * 取消动画帧请求函数
         * @type {Function}
         */
        this.cancelNextFrame;

        /**
         * 下一帧的预期时间(相对时间)
         *
         * 帧和tick的间隔时间的区别：
         *     帧的间隔时间是由人指定的，是期望的每次刷新操作的间隔时间，是理想值
         *     tick的间隔时间是由：
         *     1. 机器(支持requestAnimationFrame的情况)决定，性能好就可能tick间隔小
         *     2. 或帧率(不支持requestAnimationFrame的情况)决定的
         *
         * @type {number}
         */
        this.nextFrameTime = this.interval;

        /**
         * 记录最后一次tick的时间(绝对时间)
         * @type {number}
         */
        this.lastTickTime = this.startTime;

        /**
         * 下一帧定时器ID
         * @type {number}
         */
        this.nextFrameTimer;

        /**
         * 检测ticker是否活着的定时器ID
         * @type {number}
         */
        this.aliveCheckTimer;

        /**
         * ticker是否正在运行当中
         * @type {boolean}
         */
        this.isTicking = false;

        /**
         * 绑定了作用域的tick函数
         * @type {Function}
         */
        this.boundTick = util.bind(this.tick, this);

        /**
         * 等待执行的函数
         * @type {Array.<Function>}
         */
        this.waiting = [];

        // 默认启动ticker
        this.wake();
    }
    util.inherits(Ticker, EventDispatcher);


    /**
     * 一次节拍
     */
    Ticker.prototype.tick = function () {
        var now = this.now();

        // 从上一次tick到现在这次tick消耗的时间
        var elapsed = now - this.lastTickTime;
        // 当延迟超过某个限度，即认为动画暂停过，这个时候需要调整时间轴的起始时间，让人感觉时间停顿过
        // 而低于此限度时，可以认为动画没有停顿，是出现卡顿了，忽略掉这部分时间
        if (elapsed > this.lagThreshold) {
            this.startTime = this.startTime + elapsed - this.lagPreset;
        }
        this.time = now - this.startTime;

        // 当前时间和预期的下一帧的时间之间的差异
        var overlap = this.time - this.nextFrameTime;

        // 1. 没有设置fps
        //    (1) 支持requestAnimationFrame，那么使用的是浏览器帧率
        //    (2) 不支持，使用的是60fps
        // 2. fps为0
        //    不会自动ticking，需要手工调用tick，帧率由外部调用者决定
        // 3. fps为正常值
        //    按正常帧率ticking
        if (!this.fps || overlap > 0) {
            this.frame++;
            // overlap > 0表示动画delay了，delay了就得赶进度
            // 一种是能赶上的(overlap < interval)，一种是不能赶上的(overlap >= interval)
            // 不能赶上只能找个就近的时间点赶紧进行一次动画(+4ms)
            this.nextFrameTime += overlap >= this.interval ? overlap + 4 : this.interval;
            if (this.fps !== 0) {
                this.nextFrameTimer = this.requestNextFrame(this.boundTick);
            }
            this.trigger(events.TICK, this.time, this.frame);
            if (this.waiting.length) {
                for (var i = this.waiting.length - 1; i >= 0; i--) {
                    this.waiting[i]();
                    // 只删除一个，有可能在回调里又往队列里添加了元素
                    this.waiting.splice(i, 1);
                }
            }
        }

        this.lastTickTime = now;
    };

    /**
     * 让ticker暂停
     */
    Ticker.prototype.sleep = function () {
        if (this.isTicking && this.nextFrameTimer) {
            this.cancelNextFrame(this.nextFrameTimer);
        }
        this.isTicking = false;
        this.aliveCheckTimer && clearTimeout(this.aliveCheckTimer);
        this.aliveCheckTimer = null;
    };

    /**
     * 唤醒ticker
     */
    Ticker.prototype.wake = function () {
        if (this.isTicking) {
            this.sleep();
        }
        if (this.fps === 0) {
            this.requestNextFrame = null;
            this.cancelNextFrame = null;
        }
        else {
            var self = this;
            if (this.enableRAF && requestAnimationFrame) {
                this.requestNextFrame = function () {
                    requestAnimationFrame.apply(window, arguments);
                };
                this.cancelNextFrame = function () {
                    cancelAnimationFrame.apply(window, arguments);
                };
            }
            else {
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

    /**
     * 获取当前现实时间
     * @return {number}
     */
    Ticker.prototype.now = function () {
        return Date.now ? Date.now() : new Date().getTime();
    };

    /**
     * 设置帧率
     * @param {number} fps 帧率
     */
    Ticker.prototype.setFps = function (fps) {
        this.fps = fps;
        this.interval = 1000 / (this.fps || 60);
        this.nextFrameTime = this.time + this.interval;
        this.wake();
    };

    /**
     * 获取帧率
     * @return {number}
     */
    Ticker.prototype.getFps = function () {
        return this.fps;
    };

    /**
     * 检测是否tick正常运行
     *
     * 1. 有些浏览器，例如iOS 6 下的Safari偶尔出现requestAnimationFrame一开始就不能工作的情况
     *    这个时候需要回退到setTimeout的方式来支持动画
     * 2. 有些浏览器例如iOS，在切换不同TAB然后再次切回来时，偶尔会丢失requestAnimationFrame
     *    这里不停查看两次tick的时延来检查是否出现这种情况，如果出现立即调用wake
     */
    Ticker.prototype.aliveCheck = function () {
        var self = this;
        // 有可能帧率极低，需要根据帧率调整检测间隔
        var timeout = Math.max(2000, this.interval * 3);
        function check(skip) {
            if (!skip
                && self.isTicking && self.now() - self.lastTickTime > 1200
            ) {
                if (self.enableRAF && requestAnimationFrame
                    && (!self.nextFrameTimer || self.frame < 5)
                ) {
                    self.enableRAF = false;
                }
                self.wake();
            }
            self.aliveCheckTimer = setTimeout(check, timeout);
        }
        check(true);
    };

    /**
     * 增加下一次 tick 时需要执行的函数
     * @param {Function} fn 要执行的函数
     */
    Ticker.prototype.nextTick = function (fn) {
        this.waiting.push(fn);
    };

    // 实例化 Ticker
    global.ticker = new Ticker();

    return Ticker;
});



















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
