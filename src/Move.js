/***************************************************************************
 * 
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * 
 **************************************************************************/
 
 
/*
 * path:    src/Move.js
 * desc:    
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2014/12/11 12:57:35$
 */

define(function(require) {
    var util = require('./util');
    var events = require('./events');
    var TimeEvent = require('./TimeEvent');
    var CssDeclarationParser = require('./parser/CssDeclarationParser');
    var DeclarationBetween = require('./parser/DeclarationBetween');

    /**
     * 动作类，封装一次简单的动画
     * @constructor
     */
    function Move(options) {
        options = options || {};
        if (options instanceof Element) {
            options = {
                'element': options
            };
        }

        TimeEvent.call(this, options);

        this.element = options['element'];

        // 性能优化：
        // render函数调用频繁，将render函数放到this上，减少prototype的查找时间
        this.render = Move.prototype.render;

        /**
         * 变化分量
         */
        this.betweens = {};

        /**
         * 关联时间轴
         * @type {Timeline}
         */
        this.timeline;
    }
    util.inherits(Move, TimeEvent);

    Move.prototype.to = function(dest) {
        var declarationSet = CssDeclarationParser.parse(dest);
        for (var key in declarationSet) {
            var bt = this.betweens[key] || new DeclarationBetween(key, this.element);
            bt.setEnd(declarationSet[key]);
            this.betweens[key] = bt;
        }

        return this;
    };

    Move.prototype.from = function(src) {
        var declarationSet = CssDeclarationParser.parse(src);
        for (var key in declarationSet) {
            var bt = this.betweens[key] || new DeclarationBetween(key, this.element);
            bt.setStart(declarationSet[key]);
            this.betweens[key] = bt;
        }

        return this;
    };

    Move.prototype.between = function(src, dest) {
        this.from(src).to(dest);

        return this;
    };

    Move.prototype.getProgress = function(timePercent) {
        if (this.ease) {
            return this.ease(timePercent);
        }
        else {
            return timePercent;
        }
    };

    /**
     * 渲染动画
     *
     * @param {number} playhead 当前播放位置，相对于此动作的开始时间或者开始帧
     */
    // Move.prototype.render = function(playhead, opt_supressEvent) {
    //     var lastPlayhead = this.time;

    //     TimeEvent.prototype.render.apply(this, arguments);

    //     // 如果是逆向，playhead反转
    //     var duration = this.getDuration();
    //     if (this.isReversed) {
    //         playhead = duration - playhead;
    //     }
    //     var percent;

    //     // TODO: zero-duration case
    //     // 如果时zero-duration的move，如果正好落在此处，有两种情况
    //     // 1. supressEvent=true(例如seek(xxx)) 不触发开始或者结束事件，那么需要在下一次移动时触发
    //     // 2. supressEvent=false 那么立即触发事件
    //     // TODO: 开始结束事件理一理
    //     if (playhead >= duration) {
    //         // 越过终点，就进入不活动状态
    //         if (this.isActive
    //             && lastPlayhead < duration
    //         ) {
    //             percent = this.getProgress(1);
    //             this.trigger(events.AFTER_FINISH);
    //             this.deactivate();
    //         }
    //     }
    //     else if (playhead >= 0) {
    //         // 越过起始点
    //         if (!this.isActive) {
    //             this.trigger(events.BEFORE_START);
    //             this.activate();
    //         }
    //         percent = this.getProgress(playhead / duration);
    //     }

    //     if (percent != null) {
    //         this.trigger(events.BEFORE_UPDATE, percent);

    //         var styles = {};
    //         for (var key in this.betweens) {
    //             styles[key] = this.betweens[key].getValue(percent);
    //         }
    //         util.setStyles(this.element, styles);

    //         this.trigger(events.AFTER_UPDATE, percent);
    //     }

    //     return this;
    // };

    Move.prototype.internalRender = function(realPlayhead, opt_supressEvent) {
        var percent;
        var duration = this.getDuration();
        if (realPlayhead >= duration) {
            percent = this.getProgress(1);
        }
        else if (realPlayhead <= 0) {
            percent = this.getProgress(0);
        }
        else {
            percent = this.getProgress(realPlayhead / duration);
        }

        if (!opt_supressEvent) {
            this.trigger(events.BEFORE_UPDATE, percent);
        }

        var styles = {};
        for (var key in this.betweens) {
            styles[key] = this.betweens[key].getValue(percent);
        }
        util.setStyles(this.element, styles);

        this.trigger(events.AFTER_UPDATE, percent);

    };

    /*
    Move.prototype.move = function(options) {
        var move = new Move(options);

        if (this.timeline) {
            this.timeline.add(move);
        }

        return move;
    };

    Move.prototype.play = function(timeEvent) {
        if (this.timeline) {
            this.timeline.add(timeEvent);
        }

        return timeEvent;
    };
    */

    // --------- 下面是各种静态方法 ----------- //

    Move.create = function(options) {
        var move = new Move(options);

        return move;
    };

    return Move;
});





















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
