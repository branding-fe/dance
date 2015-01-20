
var Dance = require('Dance');
var Ticker = require('Ticker');
var global = require('global');
Dance.Ticker = Ticker;
Dance.ticker = global.ticker;

var wave = require('wave');
Dance.wave = wave;

_global['Dance'] = Dance;

})(window);
