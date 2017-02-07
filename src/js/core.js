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
        //openFile(uri);
        if (!cp) 
        {
            var workerPath = path.join(__dirname, 'worker.js');
            console.log(`Worker module path: ${workerPath}`);
<<<<<<< HEAD:js/core.js
            cp = ChildProcess.fork(workerPath)
=======
            cp = ChildProcess.fork(workerPath, [], { silent: true });
>>>>>>> a37657919e83e0e48ece6e0463cd7bcbccfc28cb:src/js/core.js
            // cp = ChildProcess.spawn('node', [workerPath], {
            //     stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
            // });
            
            cp.on('message', function (data)
            {
                //console.log(JSON.stringify(data));
                sendToMainWindow(data.event, data.path);
            });

            cp.on('close', function (code, signal) 
            {
                console.log(`child process terminated with code ${code} due to receipt of signal ${signal}`);
            });

            cp.on('error', function(error)
            {
                console.log(`child process encountered error ${error}`);
            });
        }
        console.log(`Sending message - ${cp.send({ fileName : uri })}`);
        // cp.send({ fileName : uri })
    }
  })
})