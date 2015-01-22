/***************************************************************************
 *
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * @author: songao(songao@baidu.com)
 * @file: src/EventDispatcher.js
 *
 **************************************************************************/


/*
 * path:    src/EventDispatcher.js
 * desc:    事件派发器
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2014/12/11 13:40:36$
 */

define(function (require) {
    /**
     * 事件派发器，需要实现事件的类从此类继承
     * @constructor
     */
    function EventDispatcher() {
        this._listeners = {};
    }

    /**
     * 添加监听器
     * @param {string} eventType 事件类型.
     * @param {Function} listener 监听器.
     */
    EventDispatcher.prototype.addListener = function (eventType, listener) {
        if (!this._listeners[eventType]) {
            this._listeners[eventType] = [];
        }
        this._listeners[eventType].push(listener);
    };

    /**
     * 移除监听器
     *
     * @param {string} eventType 事件类型.
     * @param {Function} listener 监听器.
     */
    EventDispatcher.prototype.removeListener = function (eventType, listener) {
        if (!this._listeners[eventType]) {
            return;
        }
        var list = this._listeners[eventType];
        for (var i = list.length - 1; i >= 0; i--) {
            if (list[i] === listener) {
                // 将被删除的回调置空代替删除
                // 因为删除会引起_listeners[eventType]长度的变化，在trigger的时候执行remove可能会导致问题
                list[i] = null;
                break;
            }
        }
    };

    /**
     * 触发事件
     *
     * @param {string} eventType 事件类型.
     * @param {...*} varArgs 自定义参数.
     * @return {boolean} 返回值.
     */
    EventDispatcher.prototype.trigger = function (eventType, varArgs) {
        if (!this._listeners[eventType]) {
            return true;
        }
        var args = Array.prototype.slice.call(arguments, 1);
        var result = true;
        for (var i = 0; i < this._listeners[eventType].length; i++) {
            var fn = this._listeners[eventType][i];
            if (fn) {
                if (false === fn.apply(this, args)) {
                    result = false;
                }
            }
        }
        return result;
    };

    /**
     * 删除所有的事件监听处理逻辑.
     */
    EventDispatcher.prototype.dispose = function () {
        this._listeners = {};
    };

    /**
     * @type {Array.<Object>}
     *
     * 保存全局监听器的数组
     */
    EventDispatcher._registry = [];

    /**
     * 注册全局事件监听器
     *
     * @param {string} eventType 事件类型.
     * @param {Function} listener 监听器.
     */
    EventDispatcher.prototype.registerListener = function (eventType, listener) {
        var registry = EventDispatcher._registry;
        registry.push({
            eventType: eventType,
            subscriber: this,
            listener: listener
        });
    };

    /**
     * 注销全局事件监听器
     *
     * @param {string} eventType 事件类型.
     * @param {Function} listener 监听器.
     */
    EventDispatcher.prototype.unregisterListener = function (eventType, listener) {
        var registry = EventDispatcher._registry;
        for (var i = registry.length - 1; i >= 0; i--) {
            var item = registry[i];
            if (item.subscriber === this
                && (!eventType || eventType && item.eventType === eventType)
                && (!listener || listener && item.listener === listener)
            ) {
                registry.splice(i, 1);
            }
        }
    };


    /**
     * 向已注册的全局监听器发布事件
     *
     * @param {string} eventType 事件类型.
     * @param {...*} varArgs 自定义参数.
     * @return {boolean} 返回值.
     */
    EventDispatcher.prototype.publish = function (eventType, varArgs) {
        var registry = EventDispatcher._registry;
        var args = Array.prototype.slice.call(arguments, 1);
        var result = true;
        for (var i = 0; i < registry.length; i++) {
            var item = registry[i];
            if (item.eventType === eventType
                && false === item.listener.apply(item.subscriber, args)
            ) {
                result = false;
            }
        }

        return result;
    };

    return EventDispatcher;
});




















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
