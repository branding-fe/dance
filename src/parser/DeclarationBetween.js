/***************************************************************************
 * 
 * Copyright (c) 2015 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * 
 **************************************************************************/
 
 
/*
 * path:    src/parser/DeclarationBetween.js
 * desc:    
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2015/01/11 16:45:10$
 */


define(function(require) {
    var util = require('../util');
    var CssDeclarationParser = require('./CssDeclarationParser');

    function DeclarationBetween(property, element) {
        this.property = property;
        this.element = element;
        this.start;
        this.end;
        this.unit;
        this.isReady = false;
    }

    DeclarationBetween.prototype.getElementDeclaration = function() {
        var property = this.property;
        var value = util.getStyle(this.element, property);
        var styles = {};
        styles[property] = value;
        return CssDeclarationParser.parse(styles)[property];
    };

    DeclarationBetween.prototype.setStart = function(start) {
        this.start = start;
        this.normalize();
        this.isInitialized = false;
        this.isReady = true;
    };

    DeclarationBetween.prototype.setEnd = function(end) {
        this.end = end;
        this.normalize();
        this.isInitialized = false;
        this.isReady = true;
    };

    /**
     * 统一单位
     */
    DeclarationBetween.prototype.normalize = function() {
        // TODO: unit match
        this.start && (this.unit = this.start.unit);
    };

    DeclarationBetween.prototype.getValue = function(percent) {
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
        // TODO: color
        var value = this.start.value + (this.end.value - this.start.value) * percent;
        return value + this.unit;
    };

    return DeclarationBetween;
});


















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
