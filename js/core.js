// const $ = require('jQuery')
// System dialogues
const ipc = require('electron').ipcMain
const dialog = require('electron').dialog
// const remote = require('electron').remote
const window = require('electron').BrowserWindow
const path = require('path')
const fs = require('fs')

function sendToMainWindow(event, data) 
{
    var mainWindow = window.getFocusedWindow();
    if (mainWindow) mainWindow.webContents.send(event, data);
}

function onHandledError(err)
{
    sendToMainWindow('handled-error', err)
    //dialog.showErrorBox('Error', err)
}

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
        var fft = new FFTWriter(format, 4096);
        var analyser = new FFTAnalyser(format, 4096);

        //sendToMainWindow('fft-clear', []);

        fft.on('fft', function (fftResult)
            {
                analyser.fftAvailable(fftResult);
                //sendToMainWindow('fft', fftResult);
            });
        
        fft.on('finish', function()
            {
                var scores = analyser.calculateScores();
                console.log(JSON.stringify(scores));
                sendToMainWindow('analyse-result', scores);
            });

        //onHandledError(format);
        reader.pipe(transform).pipe(downsample).pipe(fft);
    });
    stream.pipe(reader);
}

ipc.on('open-file-dialog', function (event) 
{
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
        {name: 'Audio files', extensions: ['mp3', 'ogg', 'wav']}
    ]
  }, function (files) {
    if (files)
    {
        var uri = path.normalize(files[0]);
        event.sender.send('selected-file', uri);
        openFile(uri);
    }
  })
})