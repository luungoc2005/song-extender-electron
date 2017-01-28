//const ipc = require('electron').ipcRenderer
// const remote = require('electron').remote
//const window = require('electron').BrowserWindow
const path = require('path')
const fs = require('fs')

const FFTAnalyser = require('./analyser.js');

let analyser;
//let speaker;

function sendToMainWindow(event, data) 
{
    //var mainWindow = window.getFocusedWindow();
    //if (mainWindow) mainWindow.webContents.send(event, data);
    process.send({ 
        event: event,
        path: data  
    });
}

function onHandledError(err)
{
    sendToMainWindow('handled-error', err)
}

process.on('message', function (msg)
{
    //openFile(data.fileName);
    switch (msg.path)
    {
        case "format":
            analyser = new FFTAnalyser(msg.data, 2048);
            addAnalyserHanlders();
            console.log(msg);
            break;
        case "fft":
            if (analyser)
            {
                analyser.fftAvailable(msg.data);
            }
            break;
        case "calc":
            if (analyser)
            {
                analyser.calculateScores();
            }
            break;
        default:
            break;
    }
})

process.stdin.on('data', function(data){
    console.log('stdin:'+data);
});

function addAnalyserHanlders()
{
    if (analyser)
    {        
        analyser.on('calc-progress', function(progress)
        {
            sendToMainWindow('calc-progress', progress);
        });

        analyser.on('paths-calculated', function(results)
        {
            sendToMainWindow('paths-calculated', results);
        });
    }
}