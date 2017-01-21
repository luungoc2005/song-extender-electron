const EventEmitter = require('events').EventEmitter;
const util = require('util');

const RANGE = [20, 40, 80, 160, 300, 511];
var ranges = RANGE.length;

const minDistanceSecs = 5;
const analyseDistSecs = 3;

var fftResult = [];
var scores = [];
var correction = []; // score correction
var samples = 0; // samples to compare per second of playback
var minDistance = 2; // 5 secs difference
var analyseDist = 3; // compare 3 secs

var avgScore = 0;
var minScore = 0;
var maxScore = 0;

var similar = [];

function getIndex(value)
{
    var i = 0;
    while (RANGE[i] < value) i++;
    return i;
}

function createArray(length) 
{
    return Array.apply(null, Array(length)).map(Number.prototype.valueOf, 0);
}

function totalTime()
{
    return Math.floor(fftResult.length / samples);
}

function fftArrayAt(sec)
{
    //return fftResult.slice(sec * samples, (sec + 1) * samples + analyseDist);
    return fftResult.slice(sec, sec + analyseDist);
}

var FFTAnalyser = function (format, fftSize)
{
    samples = format.sampleRate / fftSize;
    fftResult = [];
    scores = [];
    similar = [];
    correction = createArray(ranges);

    minDistance = Math.round(samples * minDistanceSecs);
    analyseDist = Math.round(samples * analyseDistSecs);

    maxScore = 0;
    minScore = 0;
    avgScore = 0;

    EventEmitter.call(this);
}
util.inherits(FFTAnalyser, EventEmitter);
module.exports = FFTAnalyser;

FFTAnalyser.prototype.fftAvailable = function (data)
{
    var freqs = createArray(ranges);
    var scores = createArray(ranges);
    for (var i = 0; i < data.length; i++)
    {
        var idx = getIndex(i);
        if (idx < ranges && data[i] > scores[idx]) 
        {
            freqs[idx] = i;
            scores[idx] = data[i];
            correction[idx] += data[i];
        }
    }
    fftResult.push(freqs);
}
    
FFTAnalyser.prototype.fftClear = function() 
{
    fftResult = [];
}

function diffScore (fftResult1, fftResult2) 
{
    var absFunc = Math.abs; // locally scope variable for speed
    var score = 0;
    for (var i = 0; i < fftResult1.length; i++)
    {
        //var reverseIdx = Math.max(ranges - i - 1, 0);
        score += absFunc(fftResult1[i] - fftResult2[i]) * correction[i];
    }
    return score;
}

function isArrayEqual(array1, array2)
{
    if (array1.length != array2.length) return false;
    if (array1.length == 0) return true;
    for (var i = 0; i < array1.length; i++)
    {
        if (array1[i] != array2[i]) return false;
        //if (Math.abs(array[i] - array2[i]) < minDistance) return false;
    }
    return true;
}

function isArraySimilar(array1, array2)
{
    if (array1.length != array2.length) return false;
    if (array1.length == 0) return true;
        for (var i = 0; i < array1.length; i++)
    {
        if (Math.abs(array1[i] - array2[i]) < minDistance) return true;
        //if (Math.abs(array[i] - array2[i]) < minDistance) return false;
    }
    return false;
}

function timeExists(time1, time2)
{
    if (similar.length != 0)
    {
        for (var i = 0; i < similar.length; i++)
        {
            if (isArrayEqual(similar[i], [time2, time1] || 
                isArrayEqual(similar[i], [time1, time2])))
            {
                return true;
            }
            else if (isArraySimilar(similar[i], [time1, time2]) ||
                     isArraySimilar(similar[i], [time2, time1]))
            {
                return true;
            }
        }
    }
    return false;
}

FFTAnalyser.prototype.calculateScores = function() 
{
    //correction vector
    var len = fftResult.length;
    console.log("Calculating correction vector");
    for (var corr = 0; corr < correction.length; corr++)
    {
        correction[corr] = 1 / (correction[corr] / len);
    }
    console.log("Calculating scores");
    //var total = totalTime();
    var total = len - analyseDist;
    var matchAt = ``;

    scores = createArray(total);
    for (var a = 0; a < total; a++)
    {
        var firstFft = fftArrayAt(a);
        var scoresAt = createArray(total);
        for (var b = 0; b < total; b++)
        {
            var secondFft = fftArrayAt(b);
            var score = 0;
            if (b != a)
            {
                for (var i = 0; i < firstFft.length; i++)
                {
                    score += diffScore(firstFft[i], secondFft[i]);
                }
            }
            scoresAt[b] = score;

            // analyse scores
            if (a != b) avgScore += score;
            if (score != 0)
            {
                if (Math.abs(a - b) >= minDistance && (minScore == 0 || score < minScore))
                    {
                        matchAt = `${a / samples}s and ${b / samples}s`;
                        minScore = score;
                    }
                if (maxScore == 0 || score > maxScore) maxScore = score;
            }
        }
        scores[a] = (scoresAt);
        this.emit("calc-progress", (a / total) * 100);
    }
    avgScore /= (total - 1) * (total - 1);
    console.log(`Max score: ${maxScore}, Min score: ${minScore}, Average score: ${avgScore} - min at: ${matchAt}, Samples per second: ${samples}`);

    this.emit('scores-calculated', scores);

    //return scores;
    this.calculatePaths(0.02);
}

FFTAnalyser.prototype.calculatePaths = function (cutOffPercent)
{
    var total = fftResult.length - analyseDist;
    console.log("Calculating paths");
    var cutOff = minScore + ((maxScore - minScore) * cutOffPercent)
    for (var x = 0; x < total; x++)
    {
        for (var y = 0; y < total; y++)
        {
            if (Math.abs(x - y) >= minDistance)
            {
                if (scores[x][y] != 0 && scores[x][y] <= cutOff)
                {
                    var time1 = x / samples;
                    var time2 = y / samples;
                    if (!timeExists(time1, time2)) similar.push([time1, time2]);
                }
            }
        }
    }

    this.emit('paths-calculated', similar);
}