const EventEmitter = require('events').EventEmitter;
const util = require('util');

const RANGE = [20, 40, 80, 160, 300, 511];
//const RANGE = [40, 80, 120, 180, 300];
var ranges = RANGE.length;

const minDistanceSecs = 7; // 7 secs distance between points
const analyseDistSecs = 2; // compare 2 secs

var fftResult = [];
//var fftRawData = [];
var minEnergy = [];
var totalEnergy = [];
var isBeat = [];
var scores = [];
var correction = []; // score correction - by average or standard deviation

// score correction by variance and sum of strengths
var pow_ = [];
var avg_ = []; //average frequency
//var sum_sqr = [];
//var initial = [];
//var n_ = [];

var fft_size = 0;
var sample_rate = 0;
var samples = 0; // samples to compare per second of playback
var minDistance = 3;
var analyseDist = 3;
var snapDistance = 3; // 3 samples error correction

var avgScore = 0;
var minScore = 0;
var maxScore = 0;

var similar = [];
var similarGroups = [];

function getIndex(value)
{
    var i = 0;
    while (RANGE[i] < value) i++;
    return i;
}

function getTime(value)
{
    return ((value * fft_size) / sample_rate);//  + minEnergy[value]? for correction?
}

function snapToHighest(value)
{
    var maxIdx = -1;
    for (var i = Math.max(value - snapDistance, 0); i < Math.min(value + snapDistance, totalEnergy.length); i++)
    {
        if (maxIdx == -1 || totalEnergy[maxIdx] < totalEnergy[i]) maxIdx = i;
    }
    return (maxIdx == -1) ? value : maxIdx;
/*    for (var i = 0; i < snapDistance; i++) //snap to beat
    {
        var time1 = Math.max(value - i, 0);
        if (isBeat[time1] == 1) return time1;
        var time2 = Math.min(value + i, isBeat.length);
        if (isBeat[time2] == 1) return time2;
    }*/
    //return value;
}

function snapToLowest(value)
{
    var minIdx = -1;
    for (var i = Math.max(value - snapDistance, 0); i < Math.min(value + snapDistance, totalEnergy.length); i++)
    {
        if (minIdx == -1 || totalEnergy[minIdx] > totalEnergy[i]) minIdx = i;
    }
    return (minIdx == -1) ? value : minIdx;
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
    fft_size = fftSize;
    sample_rate = format.sampleRate;

    samples = format.sampleRate / fftSize;

    fftResult = [];
    scores = [];
    similar = [];
    correction = createArray(ranges);
    pow_ = createArray(ranges);
    avg_ = createArray(ranges);
    //sum_sqr = createArray(ranges);
    //n_ = createArray(ranges);
    initial = createArray(ranges);

    //initialize initial array
    for (var i = 0; i < initial.length; i++)
    {
        initial[i] = -1;
    }

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
    var fftData = data.fft;
    for (var i = 0; i < fftData.length; i++)
    {
        var idx = getIndex(i);
        if (idx < ranges) 
        {
            pow_[idx] += fftData[i];
            if (fftData[i] > scores[idx])
            {
                //var x = i;
                freqs[idx] = i;
                scores[idx] = fftData[i];
            }
        }
    }
    fftResult.push(freqs);
    totalEnergy.push(data.total);
    //fftRawData.push(fftData);
    //if (data.min > 0) console.log(fftResult.length);
    //minEnergy.push(data.min);
}
    
FFTAnalyser.prototype.fftClear = function() 
{
    fftResult = [];
}

// FFTAnalyser.prototype.diffScore = function (pos1, pos2) 
// function diffScore (fftResult1, fftResult2)
function diffScore (pos1, pos2)
{
    var absFunc = Math.abs, // locally scope variable for speed
        corr_ = correction;

    var score = 0;

    for (var a = 0; a < analyseDist; a++)
    {
        var fft1 = fftResult[pos1 + a],
            fft2 = fftResult[pos2 + a];
        for (var b = 0; b < ranges; b++)
        {
            if (corr_[b] != null)
            {
                score += absFunc(fft1[b] - fft2[b]) * corr_[b];
                //TODO: scale this by total energy of the block
                //to account for volume differences
            }
        }
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
    if (array1.length == 0) return false;
    for (var i = 0; i < array1.length; i++)
    {
        if (Math.abs(array1[i] - array2[i]) > minDistance) return false;
        //if (Math.abs(array[i] - array2[i]) < minDistance) return false;
    }
    return true;
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
                return i;
            }
            else if (isArraySimilar(similar[i], [time1, time2]) ||
                     isArraySimilar(similar[i], [time2, time1]))
            {
                return i;
            }
        }
    }
    return -1;
}

FFTAnalyser.prototype.calculateBeats = function()
{
    var averageEnergy = 0;
    var varianceEnergy = 0;
    var lastAverage = 0;
    var window = Math.round(samples);
    var buffer = [];
    
    for (var idx = 0; idx < totalEnergy.length; idx++)
    {
        buffer.push(totalEnergy[idx]);
        if (buffer.length > window)
        {
            buffer.shift();
            for (var a = 0; a < buffer.length; a++)
            {
                averageEnergy += buffer[a];
            }
            averageEnergy /= buffer.length;
            
            for (var b = 0; b < buffer.length; b++)
            {
                var m = buffer[b] - averageEnergy;
                varianceEnergy += m * m;
            }
            varianceEnergy /= buffer.length;

            var sensitivity = (-1E-15 * varianceEnergy) + 1.2596;
            var constant = sensitivity * averageEnergy;
            if (totalEnergy[idx] >= constant)
            {
                isBeat.push(1);
                //console.log(`Beat: ${idx}`);
            }
            else
            {
                isBeat.push(0);
            }
            
            //console.log(`S: ${sensitivity} - C: ${constant} - Avg: ${averageEnergy} - Var: ${varianceEnergy}`);
            //console.log(`${varianceEnergy}`);
        }
        else
        {
            isBeat.push(0);
        }
    }
}

FFTAnalyser.prototype.calculateCorrection = function()
{
    var freq = 0;
    for (var a = 0; a < fftResult.length; a++)
    {
        for (freq = 0; freq < fftResult[a].length; freq++)
        {            
            avg_[freq] += fftResult[a][freq];
        }
    }
    var powLength = fftResult.length * fft_size;
    for (var b = 0; b < avg_.length; b++)
    {
        avg_[b] /= fftResult.length; //average of max frequencies
        pow_[b] /= powLength;
    }
    for (var c = 0; c < fftResult.length; c++)
    {
        for (freq = 0; freq < fftResult[c].length; freq++)
        {
            var K = fftResult[c][freq] - avg_[freq];
            correction[freq] += K * K;
        }
    }
    for (var d = 0; d < correction.length; d++)
    {
        correction[d] /= fftResult.length; //average of max frequencies
        correction[d] = Math.sqrt(correction[d]); // standard deviation
        correction[d] = (1 / correction[d]) * (pow_[d] / pow_[0]);
    }
    console.log(pow_);
}

FFTAnalyser.prototype.calculateScores = function() 
{
    //this.calculateBeats();
    //correction vector
    var len = fftResult.length;
    var absFunc = Math.abs;
    console.log("Calculating correction vector");
    
    this.calculateCorrection();
    
    console.log(`correction: ${JSON.stringify(correction)}`);

    console.log("Calculating scores");
    //var total = totalTime();
    var total = len - analyseDist;
    var matchAt = ``;

    scores = createArray(total);
    for (var a = 0; a < total; a++)
    {
        //var firstFft = fftArrayAt(a);
        var scoresAt = createArray(total);
        for (var b = a + 1; b < total; b++) //Is b=a correct?
        {
            var score = 0;
            if ((b - a) > analyseDist)
            {
                score = diffScore(a, b);
                avgScore += score;
                scoresAt[b] = score;
            }
            // calculate min/max/average scores
            if (score != 0)
            {
                if (b - a >= analyseDist && (minScore == 0 || score < minScore))
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
    //console.log(minEnergy);

    var count = 1;
    //return scores;
    for (count = 1; count < 20; count++) // 1 to maximum 20% cutoff
    {
        if (this.calculatePaths(count / 100) >= 5) break; // 5 points difference minimum
    }

    this.emit('paths-calculated', 
    {
        groups: similar.sort(function (a,b) 
            {
                if (a.time2 > b.time2)
                    return 1;
                else if (a.time2 < b.time2)
                    return -1;
                else return 0;
            }),
        total: Math.round(fftResult.length / samples),
        cutoff: count
    });

    //console.log(minEnergy);
}

FFTAnalyser.prototype.calculatePaths = function (cutOffPercent)
{
    var absFunc = Math.abs;
    similarGroups = [];
    similar = [];
    var total = fftResult.length - analyseDist;
    var cutOff = minScore + ((maxScore - minScore) * cutOffPercent);
    console.log(`Calculating paths - Cut off: ${minScore} - ${maxScore} => ${cutOff} (${cutOffPercent})`);
    //console.log(isArraySimilar([ 159, 356 ],[ 67, 260 ]) + ' - minDistance: ' + minDistance);
    for (var x = 0; x < total; x++)
    {
        for (var y = x + 1; y < total; y++)
        {
            if ((y - x) > minDistance && scores[x][y] && scores[x][y] <= cutOff)
            {
                var time1 = x;
                var time2 = y;
                var newTime = [time1, time2];
                // add to similar groups
                if (!similarGroups)
                {
                    similarGroups.push([newTime]);
                }
                else
                {
                    var added = false;
                    for (var a = 0; a < similarGroups.length; a++)
                    {
                        for (var b = 0; b < similarGroups[a].length; b++)
                        {
                            if (isArraySimilar(similarGroups[a][b], newTime))
                            {
                                //console.log(`is simlar? - ${similarGroups[a][b]}; ${newTime}`);
                                similarGroups[a].push(newTime);
                                added = true;
                                break;
                            }
                            if (added) break;
                        }
                    }
                    if (!added) // similar group not found, add new group
                    {
                        similarGroups.push([newTime]);
                    }
                }
                    //if (timeExists(time1, time2) == -1) similar.push([time1, time2]);
                // }
            }
        }
    }
    //console.log(similarGroups);
    //find smallest score from similar groups
    if (similarGroups.length > 0)
    {
        for (var item = 0; item < similarGroups.length; item++)
        {
            var min_idx = -1;
            var min_score = -1;
            for (var i = 0; i < similarGroups[item].length; i++)
            {
                var time = similarGroups[item][i];
                if (min_score == -1 || scores[time[0]][time[1]] < min_score)
                {
                    min_score = scores[time[0]][time[1]];
                    min_idx = i;
                }
            }
            var timeToAdd = similarGroups[item][min_idx];
            //console.log(JSON.stringify(similarGroups[item][0]) + '-' + JSON.stringify(timeToAdd));
            similar.push(
                {
                    time1 : getTime(timeToAdd[0]), 
                    time2 : getTime(timeToAdd[1])
                });
        }
    }
    console.log(similar);
    return similar.length;
}