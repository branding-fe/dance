Dance
=============

A lightweight JavaScript animation framework.

## Usage

Loading Dance file:

```javascript
<!-- latest version -->
<script src="http://bcscdn.baidu.com/public03/static/dance.latest.min.js"></script>

<!-- specified version -->
<script src="http://bcscdn.baidu.com/public03/static/dance-0.0.1.min.js"></script>
```

Single move:

```javascript
Dance.move(ele)
    .from({
        'left': '100px'
    })
    .to({
        'left': '200px'
    })
    .duration(1000)
    .ease(Dance.wave('easeInCubic'));
```

Complex dance:

```javascript
// create moves
var move1 = Dance.move(ele1).to({'top': '100px'}).duration(1000);
var move2 = Dance.move(ele2).to({'width': '100px'}).duration(1000);

// add them to dance instance
var waltz = Dance.create()
    .add(move1).at(1000)
    .add(move2).at(2000);

// control the dance
waltz.play();
waltz.pause();
waltz.resume();
waltz.reverse();
waltz.seek(1500);

// you can even add a dance to another dance
var hiphop = Dance.create();
waltz.add(hiphop).at(4000);
```
