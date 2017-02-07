// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const $ = require('jquery')
const ipc = require('electron').ipcRenderer

const selectDirBtn = $('.open-file-btn');
const progressbar = $(".progress-bar");
const playBtn = $(".play-btn");

var currentFile = '';

var playDelay = 15; // playing delay time, in ms
var pauseDelay = 0;

let audioPlayer;

const audioModule = require('./js/audioPlayer.js');
const chartModule = require('./js/chart.js');

// probabilities

selectDirBtn.click(function (event)
{
    ipc.send('open-file-dialog')
})

ipc.on('selected-file', function (event, path)
{
    $('.selected-file').html(`${decodeURIComponent(path)}`);
    currentFile = path;
    // playBtn.attr("disabled", true);
    playBtn.addClass("disabled");
    if (audioPlayer) audioPlayer.stop();
})

ipc.on('handled-error', function (event, path)
{
    if (path)
        {
            if (typeof path === 'string')
                {
                    $('.alert-message').html(path);
                }
            else
                {
                    var errorMsg = 'Error: \n';
                    for(var property in path)
                    {
                        errorMsg += `${property}=${path[property]}\n`;
                    }
                    $('.alert-message').html(errorMsg);
                }
        }
})

// FFT spectrum analyser

/*var currentHeight = 0;
ipc.on('fft', function (sender, data) 
{
    var canvas = document.getElementById('fft');
    var ctx = canvas.getContext('2d');
    var xlength = 3; ylength = 2;
    //var currentHeight = canvas.height;

    //canvas.height = currentHeight + ylength;
    //console.log(currentHeight);
    currentHeight += ylength;

    var idx = 0;
    var freq = 0;
    for (var item in data)
    {
        //var mag = Math.floor((data[item] * 128) / maxValue); //scaled magnitude
        //colors.push(mag);
        var mag = Math.round(Math.log(data[freq] + 1) * 10);
        //mag *= -1 * Math.log((2048 - item) * (0.5 / 2048)) * 4096;
        ctx.fillStyle = `rgb(0, ${mag}, ${mag * 2})`;
        ctx.fillRect(idx * xlength, currentHeight, xlength, ylength);
        idx++;

        //linear scale: freq++;
        var logMode = Math.log10(idx) * Math.log10(idx);
        if (logMode > 1) 
        {
            freq += Math.round(logMode);
        }
        else
        {
            freq++;
        }
    }
    //canvas.width = Math.max(xlength * (pos + 1), 4096);
})

ipc.on('fft-clear', function (sender, data) 
{
    var canvas = document.getElementById('fft');
    var ctx = canvas.getContext('2d');
    canvas.width = 4096;
    canvas.height = 10000;
    ctx.fillStyle = '#FFF';
    ctx.fillRect(0,0,4096,10000);
    currentHeight = 0;
})*/

ipc.on('calc-progress', function(event, progress)
{
    var prg = Math.round(progress, 2);
    progressbar.html(`${prg}%`);
    progressbar.css("width", `${prg}%`);
    progressbar.attr("aria-valuenow", prg);
})

ipc.on('analyse-result', function (event, data)
{
    $('.alert-message').html(""); // empty out alert message
    audioPlayer = null; //remove old reference
    audioPlayer = new audioModule(currentFile, data);

    //draw charts
    var chartGroup = null; //remove old reference
    var chartGroup = new chartModule(data, "svg");

    chartGroup.on('click', function (time)
    {
        audioPlayer.seekPos(time);
    });

    var updateChartTime = function()
    {
        var pos = Math.round(audioPlayer.getCurrentPos());
        chartGroup.setChartTime(pos);
        requestAnimationFrame(updateChartTime);
    }
    requestAnimationFrame(updateChartTime);

    //togglePlay(getCurrentPlayer(), "play");
    // playBtn.attr("disabled", false);
    playBtn.removeClass("disabled");
    audioPlayer.startPlay();
})

playBtn.on("click", function()
{
    if (audioPlayer) audioPlayer.togglePlay();
})