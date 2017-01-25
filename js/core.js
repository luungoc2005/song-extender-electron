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

var cp = ChildProcess.fork('./js/worker.js');
var mainWindow;

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

cp.on('message', function (data)
{
    //console.log(JSON.stringify(data));
    sendToMainWindow(data.event, data.path);
});

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
        cp.send({ fileName : uri });
    }
  })
})