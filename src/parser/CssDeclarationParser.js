/***************************************************************************
 *
 * Copyright (c) 2015 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * @author: songao(songao@baidu.com)
 * @file: src/parser/CssDeclarationParser.js
 *
 **************************************************************************/


/*
 * path:    src/parser/CssDeclarationParser.js
 * desc:    样式声明解析器
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2015/01/05 00:30:40$
 */

define(function (require) {
    var util = require('../util');

    /**
     * parser 对象
     * @type {Object}
     */
    var CssDeclarationParser = {};

    /**
     * 默认单位
     * @type {Object.<string, string>}
     */
    CssDeclarationParser._defaultUnit = {
        'top': 'px',
        'bottom': 'px',
        'left': 'px',
        'right': 'px',
        'margin-top': 'px',
        'margin-bottom': 'px',
        'margin-left': 'px',
        'margin-right': 'px',
        'padding-top': 'px',
        'padding-bottom': 'px',
        'padding-left': 'px',
        'padding-right': 'px',
        'width': 'px',
        'height': 'px',
        'font-size': 'px',
        'perspective': 'px',
        'line-height': ''
    };

    /**
     * CSS声明默认处理器
     * @type {Object}
     */
    CssDeclarationParser._defaultProcessor = {
        parse: function (value, property) {
            if (util.isNumber(value)) {
                return {
                    value: value,
                    unit: CssDeclarationParser._defaultUnit[property] || ''
                };
            }
            value = value + '';
            return {
                value: parseFloat(value),
                unit: value.replace(/-?[\d.]+/, '')
            };
        }
    };

    /**
     * 解析四个像素分量的值
     * @param {string} value 值
     * @param {Array.<string>} portions 分量的名称
     * @return {Object}
     */
    CssDeclarationParser._edgeParse = function (value, portions) {
        var splited = (value + '').split(' ');
        var declarations = {};
        for (var i = 0; i < 4; i++) {
            var portionValue = splited[i] = splited[i] || splited[parseInt((i - 1) / 2, 10)];
            declarations[portions[i]] = portionValue;
        }
        return CssDeclarationParser.parse(declarations);
    };

    /**
     * 处理器 Map
     * @type {Object.<string, Object>}
     */
    CssDeclarationParser._processorMap = {};

    /**
     * 注册一个处理器
     * @param {string} property 属性
     * @param {Object} options 选项
     */
    CssDeclarationParser.register = function (property, options) {
        if (util.isArray(property)) {
            util.each(property, function (item, i) {
                CssDeclarationParser._processorMap[item] = options;
            });
        }
        else {
            CssDeclarationParser._processorMap[property] = options;
        }
    };

    /**
     * 解析 CSS 的声明
     * @param {Object.<string, *>} declarations 声明
     * @return {Object}
     */
    CssDeclarationParser.parse = function (declarations) {
        var processorMap = CssDeclarationParser._processorMap;
        var parsed = {};
        for (var property in declarations) {
            if (declarations.hasOwnProperty(property)) {
                var processor = processorMap[property] || CssDeclarationParser._defaultProcessor;
                var result = processor.parse(declarations[property], property);
                if (result.value != null && result.unit != null) {
                    parsed[property] = result;
                }
                else {
                    for (var key in result) {
                        if (result.hasOwnProperty(key)) {
                            parsed[key] = result[key];
                        }
                    }
                }
            }
        }
        return parsed;
    };

    // 注册 margin 的处理
    CssDeclarationParser.register('margin', {
        parse: function (value, property) {
            var portions = ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'];
            return CssDeclarationParser._edgeParse(value, portions);
        }
    });

    // 注册 padding 的处理
    CssDeclarationParser.register('padding', {
        parse: function (value, property) {
            var portions = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'];
            return CssDeclarationParser._edgeParse(value, portions);
        }
    });

    // TODO: 需要补充

    return CssDeclarationParser;
});




















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
