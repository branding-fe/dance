
var Dance = require('Dance');
var Ticker = require('Ticker');
Dance.Ticker = Ticker;
var wave = require('wave');
Dance.wave = wave;

_global['Dance'] = Dance;

})(window);
