// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const $ = require('jQuery')
const ipc = require('electron').ipcRenderer

const selectDirBtn = $('.open-file-btn')
const player = $("#player");
const player2 = $("#player2");
const progressbar = $(".progress-bar");

var playDelay = 15; // playing delay time, in ms
var pauseDelay = 0;

// probabilities

selectDirBtn.click(function (event)
{
    ipc.send('open-file-dialog')
})

ipc.on('selected-file', function (event, path)
{
    $('.selected-file').html(`You selected: ${path}`);    
    player.attr("src", path);
    player2.attr("src", path);
})

ipc.on('handled-error', function (event, path)
{
    if (path)
        {
            if (typeof path === 'string')
                {
                    $('.alert').html(path);
                }
            else
                {
                    var errorMsg = 'Error: \n';
                    for(var property in path)
                    {
                        errorMsg += `${property}=${path[property]}\n`;
                    }
                    $('.alert').html(errorMsg);
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
    //console.log(JSON.stringify(colors));
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
    player.data("result", data.groups);
    player.data("pos", 0);
    player.data("playing", 0);

    player.prop("volume", 1);
    player2.prop("volume", 0);
    
    player.css("display", "initial");
    player2.css("display", "none");

    player.trigger("load");
    player2.trigger("load");

    //draw charts
    var chartModule = require('./js/chart.js');
    var chartGroup = chartModule.createChord(data, "svg");

    var togglePlay = function (entity, action)
    {
        switch (action) {
        case "play":
            //entity.prop("volume", 1);
            entity.trigger("play"); //play the new track
            entity.stop(true).animate({volume: 1}, playDelay);
            entity.css("display", "initial");
            break;
        case "pause":
            entity.css("display", "none");
            entity.stop(true).animate({volume: 0}, pauseDelay, 
                function () {
                    entity.trigger("pause");
                });
            //entity.trigger("pause");
            break;
        default:
            break;
		}
    }

    var togglePlayer = function (time1, time2)
    {
        var playing = player.data("playing");
        var pos = +player.data("pos");
        if (playing == 0)
        {
            player.data("playing", 1);
            player2.prop("currentTime", time1);

            togglePlay(player, "pause");
            togglePlay(player2, "play");
            
            //player.prop("currentTime", time1);
        }
        else
        {
            player.data("playing", 0);
            player.prop("currentTime", time1);

            togglePlay(player, "play");
            togglePlay(player2, "pause");

            //player2.prop("currentTime", time1);
        }
    }

    var getCurrentPlayer = function()
    {
        var playing = player.data("playing");
        if (playing == 0)
        {
            return player;
        }
        else
        {
            return player2;
        }
    }

    var getCurrentTime = function()
    {
        return +getCurrentPlayer().prop("currentTime");
    }

    var decideFunc = function(probability)
    {
        return (Math.random() <= probability)
    }

    var timeUpdate = function ()
    {
        var pos = +player.data("pos");
        var result = player.data("result");
        if (pos < result.length)
        {
            var time1 = +result[pos].time1;
            var time2 = +result[pos].time2;
            var currentTime = +getCurrentTime();
            chartModule.setChartTime(chartGroup, Math.round(currentTime));
            if (currentTime >= time2)
            {
                var delay = currentTime - time2;
                //console.log(`Delay: ${delay}s`)
                time1 -= (delay);
                togglePlayer(time1, time2);
                if (pos + 1 >= result.length)
                {
                    player.data("pos", 0);
                }
                else
                {
                    player.data("pos", pos + 1);                    
                }
            }
        }
    }

    //player.on("timeupdate", timeUpdate);
    //player2.on("timeupdate", timeUpdate);
    setInterval(timeUpdate, 1000/60);
    player.trigger("play");
})