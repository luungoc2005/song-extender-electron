const EventEmitter = require('events').EventEmitter;
const howler = require('howler');
const util = require('util');

let howlerObject;
let timeGroups;
let currentPos = 0;
let spriteCount = 0;
let seeking = false;
let self;

var audioPlayer = function(fileName, data)
{
    EventEmitter.call(this);

    //initialize variables
    self = this;
    currentPos = 0;
    spriteCount = 0;
    seeking = false;

    timeGroups = data.groups;
    var compareFunc = function (a, b, prop) 
    {
        if (a[prop] > b[prop])
            return 1;
        else if (a[prop] < b[prop])
            return -1;
        else return 0;
    }
    
    var sprites = {};
    var count = 0;
    if (timeGroups.length > 0)
    {
        timeGroups = timeGroups.slice(0).sort(function (a, b) { return compareFunc(a, b, 'time1'); });
        //var sortedBySecond = timeGroups.slice(0).sort(function (a, b) { return compareFunc(a, b, 'time2'); });

        sprites[`part${count++}`] = [0, timeGroups[0].time2];
        for (var i = 0; i < timeGroups.length; i++)
        {
            if ((i + 1) < timeGroups.length) // this item isn't last item
            {
                sprites[`part${count++}`] = [timeGroups[i].time1, timeGroups[i].time2 - timeGroups[i].time1];
                sprites[`part${count++}`] = [timeGroups[i].time1, timeGroups[i + 1].time2 - timeGroups[i].time1];
            }
            else // for last item
            {
                var lastEndTime = timeGroups[i].time2;
                sprites[`part${count++}`] = [lastEndTime, Math.ceil(data.total) - lastEndTime];
            }
        }
    }

    // convert to miliseconds
    spriteCount = count - 1;
    for (var a = 0; a < spriteCount; a++)
    {
        sprites[`part${a}`][0] *= 1000;
        sprites[`part${a}`][1] *= 1000;
    }
    
    howlerObject = new Howl(
        {
            src: [fileName],
            sprite: sprites,
            onend: function ()
                {
                    if (!seeking)
                    {
                        howlerObject.play(`part${currentPos++}`);
                        console.log(`Current pos: ${currentPos}`);
                    }
                }
        });
    console.log(sprites);
}

util.inherits(audioPlayer, EventEmitter);
module.exports = audioPlayer;

audioPlayer.prototype.startPlay = function (spritePos)
{
    spritePos = spritePos || currentPos;
    if (!howlerObject.playing(0) && howlerObject)
    {
        howlerObject.play(`part${spritePos++}`);
    }
}

audioPlayer.prototype.togglePlay = function (action)
{
    if (!howlerObject) return;
    action = action || 0;
    switch (action)
    {
        case "play":
            howlerObject.play();
            break;
        case "pause":
            howlerObject.pause();
            break;
        default:
            if (howlerObject.playing(0))
                howlerObject.pause();
            else
                howlerObject.play();
            break;
    }
}

audioPlayer.prototype.getCurrentPos = function ()
{
    if (!howlerObject)
        return -1;
    else
        return howlerObject.seek();
}

audioPlayer.prototype.seekPos = function (pos)
{
    seeking = true;
    if (!howlerObject) return;
    pos = pos || 0;
    var minDistance = -1;
    var minPos = -1;
    for (var a = 0; a < timeGroups.length; a++)
    {
        if ((timeGroups[a].time2) > pos)
        {
            var currentDistance = timeGroups[a].time2 - pos;
            if (minPos == -1 || currentDistance < minDistance)
            {
                minPos = a;
                minDistance = currentDistance;
            }
        }
    }
    
    var time = timeGroups[minPos].time1;
    //var minError = -1;
    minPos = -1;
    // find the sprite with the corresponding time1 value
    for (var b = 0; b < spriteCount; b++)
    {
        var currentError = Math.abs(howlerObject._sprite[`part${b}`][0] / 1000 - time);
        if (currentError == 0)
        {
            minPos = b;
            break;
        }
    }

    currentPos = minPos;
    // play the selected pos index
    howlerObject.stop(); // to end the current sprite if needed
    howlerObject.play(`part${currentPos++}`);
    howlerObject.seek(pos);
    seeking = false;
    //howlerObject.play();
}

audioPlayer.prototype.stop = function ()
{
    if (howlerObject) howlerObject.stop();
}