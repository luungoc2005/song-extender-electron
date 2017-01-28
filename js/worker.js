//const ipc = require('electron').ipcRenderer
// const remote = require('electron').remote
//const window = require('electron').BrowserWindow
const path = require('path')
const fs = require('fs')

const Speaker = require('speaker');
const AudioDownsampler = require('./stream/audioDownsampler.js');
const StereoToMonoReader = require('./stream/stereoToMonoReader.js');
const FFTWriter = require('./stream/fftWriter.js');
const FFTAnalyser = require('./analyser.js');

let transform;
let downsample;
let fft;
let analyser;
let fftCount;
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
    //dialog.showErrorBox('Error', err)
}

process.on('message', function (data)
{
    openFile(data.fileName);
})

process.stdin.on('data', function(data){
    console.log('stdin:'+data);
});

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
        analyser = new FFTAnalyser(format, 2048);
        fftCount = 0;

        var analysed = false;
        
        //sendToMainWindow('fft-clear', []);
        setTimeout(function() {
            if (!analysed)
            {
                analysed = true;
                console.log("File timed out");
                onHandledError(`Analysing ...`);
                analyser.calculateScores();
            }
        }, 10000);

        analyser.on('calc-progress', function(progress)
            {
                sendToMainWindow('calc-progress', progress);
            });

        analyser.on('paths-calculated', function(results)
            {
                //console.log(JSON.stringify(results));
                sendToMainWindow('analyse-result', results);
            });

        fft.on('finish', function()
            {
                if (!analysed)
                {
                    analysed = true;
                    console.log("Finish reading file");
                    // onHandledError(`Analysing: ${file}`);
                    onHandledError(`Analysing ...`);
                    analyser.calculateScores();
                }
            });

        fft.on('fft', function (fftResult)
            {
                //fftCount +=1;
                //onHandledError(`FFT: ${file} - ${JSON.stringify(format)} - ${fftCount}`);
                // onHandledError(`FFT: ${file} - ${JSON.stringify(format)}`);
                onHandledError(`Preprocessing ...`);
                analyser.fftAvailable(fftResult);
                //sendToMainWindow('fft', fftResult);
            });

/*        speaker.on('finish', function()
            {                
                onHandledError(`Playing: ${file} - ${JSON.stringify(format)}`);
                console.log("finished");              
            })*/
        
        onHandledError(`File opened: ${file}`);
        //onHandledError(format);
        reader.pipe(transform).pipe(downsample).pipe(fft);
        //reader.pipe(transform).pipe(downsample).pipe(speaker);
        //reader.pipe(transform).pipe(fft);
    });

    stream.pipe(reader);
}