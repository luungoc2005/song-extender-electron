var RANGE = [20, 40, 80, 160, 300, 511];

var fftResult = [];
var scores = [];
var ranges = RANGE.length;
var samples = 0; // samples to compare per second of playback
var minDistance = 25; // 5 samples difference
var analyseDist = 4; // compare 5 seconds

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
    return fftResult.slice(sec * samples, (sec + 1) * samples + analyseDist);
}

var FFTAnalyser = function (format, fftSize)
{
    samples = Math.floor(format.sampleRate / fftSize);
    fftResult = [];
    scores = [];
    similar = [];

    maxScore = 0;
    minScore = 0;
    avgScore = 0;
}
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
    var score = 0;
    for (var i = 0; i < fftResult1.length; i++)
    {
        score += Math.abs(fftResult1[i] - fftResult2[i]);
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
                return true;
            }
        }
    }
    return false;
}

FFTAnalyser.prototype.calculateScores = function() 
{
    var total = totalTime();
    var matchAt = ``;

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
                for (var i = 0; i < samples; i++)
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
                        matchAt = `${a}s and ${b}s`;
                        minScore = score;
                    }
                if (maxScore == 0 || score > maxScore) maxScore = score;
            }
        }
        scores.push(scoresAt);
    }
    avgScore /= (total - 1) * (total - 1);
    console.log(`Max score: ${maxScore}, Min score: ${minScore}, Average score: ${avgScore} - min at: ${matchAt}`);

    var cutOff = minScore + ((maxScore - minScore) * 0.05)
    for (var x = 0; x < total; x++)
    {
        for (var y = 0; y < total; y++)
        {
            if (Math.abs(x - y) >= minDistance)
            {
                if (scores[x][y] != 0 && scores[x][y] <= cutOff)
                {
                    var time1 = x;
                    var time2 = y;
                    if (!timeExists(time1, time2)) similar.push([time1, time2]);
                }
            }
        }
    }
    return similar;
    //return scores;
}