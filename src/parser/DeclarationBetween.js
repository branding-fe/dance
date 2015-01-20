/***************************************************************************
 * 
 * Copyright (c) 2015 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * @author: songao(songao@baidu.com)
 * @file: src/parser/DeclarationBetween.js
 * 
 **************************************************************************/
 
 
/*
 * path:    src/parser/DeclarationBetween.js
 * desc:    
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2015/01/11 16:45:10$
 */


define(function (require) {
    var util = require('../util');
    var CssDeclarationParser = require('./CssDeclarationParser');

    /**
     * 用于处理 CSS 声明的在动画进程中的属性值
     * @param {string} property 属性
     * @param {HTMLElement} element 关联的 DOM 元素
     */
    function DeclarationBetween(property, element) {
        /**
         * 属性名称
         * @type {string}
         */
        this.property = property;

        /**
         * 目标元素
         * @type {HTMLElement}
         */
        this.element = element;

        /**
         * 开始值
         * @type {Object}
         */
        this.start;

        /**
         * 结束值
         * @type {Object}
         */
        this.end;

        /**
         * 单位
         * @type {string}
         */
        this.unit;

        /**
         * 是否可以进行计算了
         * @type {boolean}
         */
        this.isReady = false;
    }

    /**
     * 获取元素当前的属性值
     * @return {Object}
     */
    DeclarationBetween.prototype.getElementDeclaration = function () {
        var property = this.property;
        var value = util.getStyle(this.element, property);
        var styles = {};
        styles[property] = value;
        return CssDeclarationParser.parse(styles)[property];
    };

    /**
     * 设置起点值
     * @param {Object} start 起点值
     */
    DeclarationBetween.prototype.setStart = function (start) {
        this.start = start;
        this.normalize();
        this.isInitialized = false;
        this.isReady = true;
    };

    /**
     * 设置结束值
     * @param {Object} end 结束值
     */
    DeclarationBetween.prototype.setEnd = function (end) {
        this.end = end;
        this.normalize();
        this.isInitialized = false;
        this.isReady = true;
    };

    /**
     * 统一单位
     */
    DeclarationBetween.prototype.normalize = function () {
        // TODO: unit match
        this.start && (this.unit = this.start.unit);
    };

    /**
     * 获取当前进度下的属性取值
     * @param {number} percent 当前动画进程
     * @return {string}
     */
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


















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
