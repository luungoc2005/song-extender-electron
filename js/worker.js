//const ipc = require('electron').ipcRenderer
// const remote = require('electron').remote
//const window = require('electron').BrowserWindow
const path = require('path')
const fs = require('fs')

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
    //dialog.showErrorBox('Error', err)
}

process.on('message', function (data)
{
    openFile(data.fileName);
})

function openFile(file)
{
    var buffer = Buffer.alloc(65536);
    var stream = fs.createReadStream(file);
    var reader;
    switch (path.extname(file).toLowerCase())
    {
        case '.mp3':
            var lame = require('lame');
            reader = new lame.Decoder();
            break;
        case '.wav':
            var wav = require('wav');
            reader = new wav.Reader();
            break;
        default:
            break;
    }
    reader.on('format', function (format)
    {
        var Speaker = require('speaker');
        var AudioDownsampler = require('./stream/audioDownsampler.js');
        var StereoToMonoReader = require('./stream/stereoToMonoReader.js');
        var FFTWriter = require('./stream/fftWriter.js');
        var FFTAnalyser = require('./analyser.js');

        var transform = new StereoToMonoReader(format);
        var downsample = new AudioDownsampler(format);
        //var speaker = new Speaker(format);
        var fft = new FFTWriter(format, 2048);
        var analyser = new FFTAnalyser(format, 2048);
        
        //sendToMainWindow('fft-clear', []);

        analyser.on('calc-progress', function(progress)
            {
                sendToMainWindow('calc-progress', progress);
            });

        analyser.on('paths-calculated', function(results)
            {
                //console.log(JSON.stringify(results));
                sendToMainWindow('analyse-result', results);
            });

        fft.on('fft', function (fftResult)
            {
                onHandledError(`FFT: ${file}`);
                analyser.fftAvailable(fftResult);
                //sendToMainWindow('fft', fftResult);
            });
        
        fft.on('finish', function()
            {
                onHandledError(`Analysing: ${file}`);
                analyser.calculateScores();
            });
            
        onHandledError(`File opened: ${file}`);
        //onHandledError(format);
        reader.pipe(transform).pipe(downsample).pipe(fft);
    });

    stream.pipe(reader);
}