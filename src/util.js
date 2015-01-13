/***************************************************************************
 * 
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * 
 **************************************************************************/
 
 
/*
 * path:    src/util.js
 * desc:    
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2014/12/11 13:03:24$
 */

define(function(require) {
    var util = {};

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

    util.breaker = {};
    util.each = function(array, iterator, context) {
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

    util.isPlainObject = function(target) {
        return Object.prototype.toString.call(target) === '[object Object]';
    };

    util.isArray = function(target) {
        return Object.prototype.toString.call(target) === '[object Array]';
    };

    util.isString = function(target) {
        return Object.prototype.toString.call(target) === '[object String]';
    };

    util.isNumber = function(target) {
        return Object.prototype.toString.call(target) === '[object Number]';
    };

    util.toCamelCase = function(source) {
        if (source.indexOf('-') < 0 && source.indexOf('_') < 0) {
            return source;
        }
        return source.replace(/[-_][^-_]/g, function (match) {
            return match.charAt(1).toUpperCase();
        });
    };

    util.getComputedStyle = function(element, key) {
        var doc = element.nodeType === 9 ? element : element.ownerDocument;

        if (doc.defaultView && doc.defaultView.getComputedStyle) {
            var computed = doc.defaultView.getComputedStyle(element, null);
            if (computed) {
                return computed[key] || computed.getPropertyValue(key);
            }
        }
        return '';
    };

    util.getStyle = function(element, key) {
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
        }
        return value;
    };

    util.setStyle = function(element, key, value) {
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

    util.setStyles = function(element, styles) {
        for (var key in styles) {
            util.setStyle(element, key, styles[key]);
        }
        return element;
    };

    return util;
});



















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
