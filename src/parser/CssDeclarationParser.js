/***************************************************************************
 * 
 * Copyright (c) 2015 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * 
 **************************************************************************/
 
 
/*
 * path:    src/parser/CssDeclarationParser.js
 * desc:    
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2015/01/05 00:30:40$
 */

define(function(require) {
    var util = require('../util');

    var CssDeclarationParser = {};

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

    CssDeclarationParser._defaultProcessor = {
        parse: function(value, property) {
            if (util.isNumber(value)) {
                return {
                    value: value,
                    unit: CssDeclarationParser._defaultUnit[property] || ''
                };
            }
            else {
                value = value + '';
                return {
                    value: parseFloat(value),
                    unit: value.replace(/[\d.]+/, '')
                };
            }
        }
    };

    CssDeclarationParser._edgeParse = function(value, portions) {
        var splited = (value + '').split(' ');
        var declarations = {};
        for (var i = 0; i < 4; i++) {
            var portionValue = splited[i] = splited[i] || splited[parseInt((i - 1) / 2, 10)];
            declarations[portions[i]] = portionValue;
        }
        return CssDeclarationParser.parse(declarations);
    };

    CssDeclarationParser._processorMap = {};

    CssDeclarationParser.register = function(property, options) {
        if (util.isArray(property)) {
            util.each(property, function(item, i) {
                CssDeclarationParser._processorMap[item] = options;
            });
        }
        else {
            CssDeclarationParser._processorMap[property] = options;
        }
    };

    CssDeclarationParser.parse = function(declarations) {
        var processorMap = CssDeclarationParser._processorMap;
        var parsed = {};
        for (var property in declarations) {
            var processor = processorMap[property] || CssDeclarationParser._defaultProcessor;
            var result = processor.parse(declarations[property], property);
            if (result.value != null && result.unit != null) {
                parsed[property] = result;
            }
            else {
                for (var key in result) {
                    parsed[key] = result[key];
                }
            }
        }
        return parsed;
    };

    CssDeclarationParser.register('margin', {
        parse: function(value, property) {
            var portions = ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'];
            return CssDeclarationParser._edgeParse(value, portions);
        }
    });

    CssDeclarationParser.register('padding', {
        parse: function(value, property) {
            var portions = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'];
            return CssDeclarationParser._edgeParse(value, portions);
        }
    });

    return CssDeclarationParser;
});




















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
