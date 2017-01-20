// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const $ = require('jQuery')
const ipc = require('electron').ipcRenderer

const selectDirBtn = $('.open-file-btn')
const player = $("#player");
const player2 = $("#player2");

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

// FFT functions

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

ipc.on('analyse-result', function (event, timeStamps)
{
    player.data("result", timeStamps);
    player.data("pos", 0);
    player.data("playing", 0);

    var timeUpdate = function ()
    {
        var playing = player.data("playing");
        var pos = player.data("pos");
        var result = player.data("result");
        if (pos < result.length)
        {
            var time1 = result[pos][0];
            var time2 = result[pos][1];
            if (player.prop("currentTime") >= time2)
            {
                if (playing == 0)
                {
                    player.data("pos", pos + 1);
                    player.data("playing", 1);

                    player.prop("currentTime", time1);
                    player2.prop("currentTime", time1);

                    player.trigger("pause");
                    player2.trigger("play");
                }
                else
                {
                    player.data("pos", pos + 1);
                    player.data("playing", 0);

                    player.prop("currentTime", time1);
                    player2.prop("currentTime", time1);

                    player.trigger("play");
                    player2.trigger("pause");
                }
                //player.trigger("seek", time1);
            }
        }
    }

    player.on("timeupdate", timeUpdate);
    player2.on("timeupdate", timeUpdate);
    player.trigger("play");
})