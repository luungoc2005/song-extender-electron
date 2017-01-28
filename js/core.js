// const $ = require('jQuery')
// System dialogues
const ipc = require('electron').ipcMain
const dialog = require('electron').dialog
// const remote = require('electron').remote
const BrowserWindow = require('electron').BrowserWindow
const ChildProcess = require('child_process');
const path = require('path')
const fs = require('fs')

const url = require('url')

let cp;
let mainWindow;

// audio file ops
const Speaker = require('speaker');
const AudioDownsampler = require('./stream/audioDownsampler.js');
const StereoToMonoReader = require('./stream/stereoToMonoReader.js');
const FFTWriter = require('./stream/fftWriter.js');
const FFTAnalyser = require('./analyser.js');

let transform;
let downsample;
let fft;
let fftCount;

function sendToMainWindow(event, data) 
{
    if (!mainWindow) mainWindow = BrowserWindow.getFocusedWindow();
    if (mainWindow) mainWindow.webContents.send(event, data);
}

function onHandledError(err)
{
    sendToMainWindow('handled-error', err)
    //dialog.showErrorBox('Error', err)
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
        var baseName = encodeURIComponent(path.basename(uri));
        var dirName = path.dirname(uri);
        event.sender.send('selected-file', path.join(dirName, baseName));
        // console.log(`Sending message - ${cp.send({ fileName : uri })}`);
        openFile(uri);
    }
  })
})

function addChildHandlers()
{
    if (!cp)
    {        
        // cp = ChildProcess.fork(workerPath)
        cp.on('close', function (code, signal) 
        {
            console.log(`child process terminated with code ${code} due to receipt of signal ${signal}`);
        });

        cp.on('error', function(error)
        {
            console.log(`child process encountered error ${error}`);
        });
        
        cp.on('message', function (data)
        {
            sendToMainWindow(data.event, data.path);
        });
    }
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
        transform = new StereoToMonoReader(format);
        downsample = new AudioDownsampler(format);
        speaker = new Speaker(format);
        fft = new FFTWriter(format, 2048);
        fftCount = 0;
        var fftBuffer = [];
        var workerPath = path.join(__dirname, 'worker.js');

        fft.on('finish', function()
        {
            console.log("Finish reading file");
            onHandledError(`Analysing ...`);
            
            var childMessage = function (_path, _data) { return { path: _path, data: _data }; }

            cp = ChildProcess.fork(workerPath);
            addChildHandlers();            
            cp.send(childMessage('format', format));
            for (var i = 0; i < fftBuffer.length; i++)
            {
                cp.send(childMessage('fft', fftBuffer[i]));
            }
            cp.send(childMessage('calc', null));
        });

        fft.on('fft', function (fftResult)
        {
            onHandledError(`Preprocessing ...`);
            fftBuffer.push(fftResult);
        });
        
        onHandledError(`File opened: ${file}`);
        reader.pipe(transform).pipe(downsample).pipe(fft);
    });

    stream.pipe(reader);
}