/***************************************************************************
 *
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * @author: songao(songao@baidu.com)
 * @file: src/util.js
 *
 **************************************************************************/


/*
 * path:    src/util.js
 * desc:    工具集
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2014/12/11 13:03:24$
 */

define(function (require) {
    var util = {};

    /**
     * IE 版本号
     * @type {?number}
     */
    util.ie = /msie (\d+\.\d)/i.test(navigator.userAgent)
        ? document.documentMode || +RegExp['$1']
        : (/Trident\/\d+\.\d.*rv:(\d+\.\d)/.test(navigator.userAgent)
            ? document.documentMode || +RegExp['$1']
            : null
        );

    var nativeBind = Function.prototype.bind;

    /**
     * 固定函数的`this`变量和若干参数
     *
     * @param {Function} fn 操作的目标函数
     * @param {*} context 函数的`this`变量
     * @param {*...} args 固定的参数
     * @return {Function} 固定了`this`变量和若干参数后的新函数对象
     */
    util.bind = nativeBind
        ? function (fn) {
            return nativeBind.apply(fn, [].slice.call(arguments, 1));
        }
        : function (fn, context) {
            var extraArgs = [].slice.call(arguments, 2);
            return function () {
                var args = extraArgs.concat([].slice.call(arguments));
                return fn.apply(context, args);
            };
        };

    var dontEnumBug = !(({ toString: 1 }).propertyIsEnumerable('toString'));

    /**
     * 设置继承关系
     *
     * @param {Function} type 子类
     * @param {Function} superType 父类
     * @return {Function} 子类
     */
    util.inherits = function (type, superType) {
        var Empty = function () {};
        Empty.prototype = superType.prototype;
        var proto = new Empty();

        var originalPrototype = type.prototype;
        type.prototype = proto;

        for (var key in originalPrototype) {
            proto[key] = originalPrototype[key];
        }
        if (dontEnumBug) {
            if (originalPrototype.hasOwnProperty('toString')) {
                proto.toString = originalPrototype.toString;
            }
            if (originalPrototype.hasOwnProperty('valueOf')) {
                proto.valueOf = originalPrototype.valueOf;
            }
        }
        type.prototype.constructor = type;

        return type;
    };

    /**
     * 遍历回调里使用的 breaker 对象，抛出之后可用于判定是否应该中断遍历
     * @type {Object}
     */
    util.breaker = {};

    /**
     * 遍历数组
     * @param {Array.<*>} array 数组
     * @param {Function} iterator 遍历回调
     * @param {*} context 回调需要的作用域
     */
    util.each = function (array, iterator, context) {
        if (array == null) {
            return array;
        }
        var actualIterator = context == null
            ? iterator
            : util.bind(iterator, context);
        for (var i = 0, len = array.length; i < len; i++) {
            if (actualIterator(array[i], i, array) === util.breaker) {
                break;
            }
        }
    };

    /**
     * 检查是否是简单对象
     * @param {*} target 目标
     * @return {boolean}
     */
    util.isPlainObject = function (target) {
        return Object.prototype.toString.call(target) === '[object Object]';
    };

    /**
     * 检查是否是数组
     * @param {*} target 目标
     * @return {boolean}
     */
    util.isArray = function (target) {
        return Object.prototype.toString.call(target) === '[object Array]';
    };

    /**
     * 检查是否是字符串
     * @param {*} target 目标
     * @return {boolean}
     */
    util.isString = function (target) {
        return Object.prototype.toString.call(target) === '[object String]';
    };

    /**
     * 检查是否是函数
     * @param {*} target 目标
     * @return {boolean}
     */
    util.isFunction = function (target) {
        return Object.prototype.toString.call(target) === '[object Function]';
    };

    /**
     * 检查是否是数字
     * @param {*} target 目标
     * @return {boolean}
     */
    util.isNumber = function (target) {
        return Object.prototype.toString.call(target) === '[object Number]';
    };

    /**
     * 转换成驼峰形势
     * @param {string} source 目标
     * @return {string}
     */
    util.toCamelCase = function (source) {
        if (source.indexOf('-') < 0 && source.indexOf('_') < 0) {
            return source;
        }
        return source.replace(/[-_][^-_]/g, function (match) {
            return match.charAt(1).toUpperCase();
        });
    };

    /**
     * 获取元素的 computedStyle
     * @param {HTMLElement} element 目标元素
     * @param {string} key 目标样式key
     * @return {string|number}
     */
    util.getComputedStyle = function (element, key) {
        var doc = element.nodeType === 9 ? element : element.ownerDocument;

        if (doc.defaultView && doc.defaultView.getComputedStyle) {
            var computed = doc.defaultView.getComputedStyle(element, null);
            if (computed) {
                return computed[key] || computed.getPropertyValue(key);
            }
        }
        return '';
    };

    /**
     * 获取元素的样式
     * @param {HTMLElement} element 目标元素
     * @param {string} key 目标样式key
     * @return {string|number}
     */
    util.getStyle = function (element, key) {
        key = util.toCamelCase(key);
        var value = element.currentStyle && element.currentStyle[key]
            || util.getComputedStyle(element, key)
            || element.style[key];

        if (!value || value === 'auto') {
            if (key === 'opacity'
                && util.ie && util.ie <= 8
            ) {
                var filter = element.style.filter;
                value = filter && filter.indexOf('opacity=') >= 0
                    ? (parseFloat(filter.match(/opacity=([^)]*)/)[1]) / 100) + '' : '1';

            }
            else {
                value = 0;
            }
        }
        return value;
    };

    /**
     * 设置元素的样式
     * @param {HTMLElement} element 目标元素
     * @param {string} key 目标样式key
     * @param {string} value 样式值
     * @return {HTMLElement}
     */
    util.setStyle = function (element, key, value) {
        key = util.toCamelCase(key);

        if (util.isNumber(value)
            && !/zIndex|fontWeight|opacity|zoom|lineHeight/i.test(key)
        ) {
            value = value + 'px';
        }

        var style = element.style;
        if (key === 'opacity'
            && util.ie && util.ie <= 8
        ) {
            style.filter = (style.filter || '').replace(/alpha\([^\)]*\)/gi, '')
                + (value == 1 ? '' : 'alpha(opacity=' + value * 100 + ')');
            style.zoom = 1;
        }
        else {
            style[key] = value;
        }

        return element;
    };

    /**
     * 批量设置元素的样式
     * @param {HTMLElement} element 目标元素
     * @param {Object} styles 样式
     * @return {HTMLElement}
     */
    util.setStyles = function (element, styles) {
        for (var key in styles) {
            util.setStyle(element, key, styles[key]);
        }
        return element;
    };

    return util;
});



















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
