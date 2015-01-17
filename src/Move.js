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
        else if (util.isFunction(options)) {
            options = {
                'render': options
            };
        }

        TimeEvent.call(this, options);

        this.element = options['element'];

        this.customRender = options['render'];

        // 性能优化：
        // render函数调用频繁，将render函数放到this上，减少prototype的查找时间
        this.render = Move.prototype.render;

        /**
         * 变化分量
         */
        this.betweens = {};

        /**
         * 缓动函数
         * @type {Function}
         */
        this._ease;
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

    Move.prototype.ease = function(ease) {
        this._ease = ease;

        return this;
    };

    Move.prototype.getProgress = function(timePercent) {
        if (this._ease) {
            return this._ease(timePercent);
        }
        else {
            return timePercent;
        }
    };

    Move.prototype.internalRender = function(realPlayhead, opt_forceRender) {
        // TODO: custom render
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

        this.trigger(events.BEFORE_UPDATE, percent);

        var styles = {};
        for (var key in this.betweens) {
            styles[key] = this.betweens[key].getValue(percent);
        }
        util.setStyles(this.element, styles);

        this.trigger(events.AFTER_UPDATE, percent);
    };

    // --------- 下面是各种静态方法 ----------- //

    Move.create = function(options) {
        var move = new Move(options);

        return move;
    };

    return Move;
});





















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
