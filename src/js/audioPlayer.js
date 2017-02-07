const EventEmitter = require('events').EventEmitter;
// const howler = require('howler');
const howler = require('./howler.js');
const util = require('util');
const url = require('url');
const path = require('path');

let howlerObject;
let timeGroups;
let currentPos = 0;
let spriteCount = 0;
let seeking = false;
let self;
let playingId = -1;

function onSpriteEnd()
{
    if (!seeking)
    {
        if (currentPos > spriteCount - 1)
        {
            currentPos = 0;
        }
        playingId = howlerObject.play(`part${currentPos++}`);
        console.log(`Current pos: ${currentPos}`);
    }
}

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

        for (var i = 0; i < timeGroups.length; i++)
        {            
            if ((i + 1) < timeGroups.length) // this item isn't last item
            {                
                if (i == 0)
                {
                    sprites[`part${count++}`] = [0, timeGroups[i].time2];
                }
                else
                {
                    sprites[`part${count++}`] = [timeGroups[i].time1, timeGroups[i].time2 - timeGroups[i].time1];
                }

                sprites[`part${count++}`] = [timeGroups[i].time1, timeGroups[i + 1].time2 - timeGroups[i].time1];
            }
            else // for last item
            {
                //var lastEndTime = timeGroups[i].time2;
                sprites[`part${count++}`] = [timeGroups[i].time1, Math.ceil(data.total) - timeGroups[i].time1];
            }
        }
    }
    console.log(timeGroups);
    // convert to miliseconds
    spriteCount = count;
    for (var a = 0; a < spriteCount; a++)
    {
        sprites[`part${a}`][0] *= 1000;
        sprites[`part${a}`][1] *= 1000;
    }
    
    var sourceUri = url.format({
                    pathname: fileName.replace(new RegExp('\\' + path.sep, 'g'), '/'),
                    protocol: 'file:',
                    slashes: true
                });
    console.log(`Opening file ${sourceUri}`);
    howlerObject = new howler.Howl(
        {
            src: sourceUri,
            sprite: sprites,
            onend: onSpriteEnd,
            onloaderror: function(id, message) { alert(`Unable to load audio: ${message}`); }
        });
    console.log(sprites);
}

util.inherits(audioPlayer, EventEmitter);
module.exports = audioPlayer;

audioPlayer.prototype.startPlay = function (spritePos)
{
    currentPos = spritePos || currentPos;
    if (howlerObject && !howlerObject.playing(playingId))
    {
        playingId = howlerObject.play(`part${currentPos++}`);
        console.log(`Current pos: ${currentPos}`);
    }
}

audioPlayer.prototype.togglePlay = function (action)
{
    if (!howlerObject) return;
    action = action || 0;
    switch (action)
    {
        case "play":
            playingId = howlerObject.play();
            break;
        case "pause":
            howlerObject.pause();
            break;
        default:
            if (howlerObject.playing(playingId))
                howlerObject.pause();
            else
                playingId = howlerObject.play();
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
    if (!howlerObject) return;
    seeking = true;
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
    console.log(`Selected group ${minPos}`);
    if (minPos == -1) // last part of the song
    {
        currentPos = spriteCount - 1;

        howlerObject.stop(); // to end the current sprite if needed
        playingId = howlerObject.play(`part${currentPos++}`);
        howlerObject.seek(pos);
    }
    else
    {
        var time = timeGroups[minPos].time1;
        minPos = -1;
        //var minError = -1;
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

        howlerObject.stop(); // to end the current sprite if needed
        playingId = howlerObject.play(`part${currentPos - 1}`);
        howlerObject.seek(pos);
    }
    console.log(`Selected sprite ${currentPos}`);

    // play the selected pos index
    seeking = false;
    //howlerObject.play();
}

audioPlayer.prototype.stop = function ()
{
    if (howlerObject) howlerObject.stop();
}