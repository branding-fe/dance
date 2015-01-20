/***************************************************************************
 *
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * @author: songao(songao@baidu.com)
 * @file: src/Move.js
 *
 **************************************************************************/


/*
 * path:    src/Move.js
 * desc:    动作类
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2014/12/11 12:57:35$
 */

define(function (require) {
    var util = require('./util');
    var events = require('./events');
    var TimeEvent = require('./TimeEvent');
    var CssDeclarationParser = require('./parser/CssDeclarationParser');
    var DeclarationBetween = require('./parser/DeclarationBetween');

    /**
     * 动作类，封装一次简单的动画
     * @param {Object|HTMLElement} options 选项
     * @param {HTMLElement} options.element 目标元素
     * @param {Function} options.render 自定义渲染函数
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

        /**
         * 动画的目标元素
         * @type {HTMLElement}
         */
        this.element = options['element'];

        /**
         * 自定义渲染函数
         * @type {Function}
         */
        this.customRender = options['render'];

        // 性能优化：
        // render函数调用频繁，将render函数放到this上，减少prototype的查找时间
        this.render = Move.prototype.render;

        /**
         * 变化分量
         * @type {Object.<string, DeclarationBetween>}
         */
        this.betweens = {};
    }
    util.inherits(Move, TimeEvent);

    /**
     * 设定动作的结束点的CSS样式
     * @param {Object} dest 结束点CSS样式
     * @return {Move}
     */
    Move.prototype.to = function (dest) {
        var declarationSet = CssDeclarationParser.parse(dest);
        for (var key in declarationSet) {
            var bt = this.betweens[key] || new DeclarationBetween(key, this.element);
            bt.setEnd(declarationSet[key]);
            this.betweens[key] = bt;
        }

        return this;
    };

    /**
     * 设定动作的起始点的CSS样式
     * @param {Object} src 起始点CSS样式
     * @return {Move}
     */
    Move.prototype.from = function (src) {
        var declarationSet = CssDeclarationParser.parse(src);
        for (var key in declarationSet) {
            var bt = this.betweens[key] || new DeclarationBetween(key, this.element);
            bt.setStart(declarationSet[key]);
            this.betweens[key] = bt;
        }

        return this;
    };

    /**
     * 同时设定动作的起始点和结束点的CSS样式
     * @param {Object} src 起始点CSS样式
     * @param {Object} dest 结束点CSS样式
     * @return {Move}
     */
    Move.prototype.between = function (src, dest) {
        this.from(src).to(dest);

        return this;
    };

    /**
     * 渲染函数
     * @param {number} realPlayhead 实际播放位置
     * @param {boolean=} opt_forceRender 是否强制渲染
     * @return {Move}
     */
    Move.prototype.internalRender = function (realPlayhead, opt_forceRender) {
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

    /**
     * 创建 Move 对象
     * @param {Object} options 选项
     * @return {Move}
     */
    Move.create = function (options) {
        var move = new Move(options);

        return move;
    };

    return Move;
});





















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
