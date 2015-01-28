/***************************************************************************
 *
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 * @file:    src/events.js
 * @author:  songao(songao@baidu.com)
 * @version: $Revision$
 * @date:    $Date: 2014/12/11 19:36:30$
 * @desc:    各种事件
 *
 **************************************************************************/


define(function (require) {
    /**
     * 各种事件
     * @type {Object}
     */
    var events = {
        'TICK': 'tick',
        'START': 'start',
        'AFTER_FINISH': 'after_finish',
        'BEFORE_UPDATE': 'before_update',
        'AFTER_UPDATE': 'after_update',
        'PROGRESS': 'progress'
    };

    return events;
});



















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
