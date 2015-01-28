/***************************************************************************
 *
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 * @file:    src/Dance.js
 * @author:  songao(songao@baidu.com)
 * @version: $Revision$
 * @date:    $Date: 2014/12/11 12:57:29$
 * @desc:    时间轴，同时封装了一些静态方法供外部调用
 *
 **************************************************************************/


define(function (require) {
    var global = require('./global');
    var util = require('./util');
    var Timeline = require('./Timeline');
    var Move = require('./Move');
    var wave = require('wave');

    /**
     * 时间轴
     * @param {Object} options 选项
     * @constructor
     */
    function Dance(options) {
        Timeline.apply(this, arguments);

        // 性能优化：
        // render函数调用频繁，将render函数放到this上，减少prototype的查找时间
        this.render = Dance.prototype.render;
    }
    util.inherits(Dance, Timeline);

    // --------- 下面是各种静态方法 ----------- //

    Dance.dispose = function () {
        global.rootFrameTimeline.dispose();
        global.rootTimeline.dispose();
    };

    /**
     * 配置默认参数
     * @param {string} key 键
     * @param {*} value 值
     */
    Dance.defaults = function (key, value) {
        global.defaults[key] = value;
    };

    /**
     * 创建时间轴
     * @param {Object} options 选项
     * @return {Dance}
     */
    Dance.create = function (options) {
        var dance = new Dance(options);

        if (util.isPlainObject(options)
            && options.isInFrame
        ) {
            global.rootFrameTimeline.add(dance);
        }
        else {
            global.rootTimeline.add(dance);
        }

        return dance;

    };

    /**
     * 创建一个Move，并添加到顶层时间线上
     * @param {Object} options 选项
     * @return {Move}
     */
    Dance.move = function (options) {
        var move = new Move(options);

        if (util.isPlainObject(options)
            && options.isInFrame
        ) {
            global.rootFrameTimeline.add(move);
        }
        else {
            global.rootTimeline.add(move);
        }

        return move;
    };

    /**
     * 对外暴露 Wave
     * @type {Wave}
     */
    Dance.wave = wave;

    return Dance;
});




















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
