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

function sendToMainWindow(event, data) 
{
    var mainWindow = BrowserWindow.getFocusedWindow();
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
        event.sender.send('selected-file', uri);
        //openFile(uri);
/*        if (!workerWindow)
        {
            //workerWindow =  new BrowserWindow({show: false});
            workerWindow =  new BrowserWindow({width: 800, height: 600});
            workerWindow.loadURL(url.format({
                    pathname: path.join(__dirname, 'worker.html'),
                    protocol: 'file:',
                    slashes: true
                }));
                
            workerWindow.webContents.openDevTools();
        }
        workerWindow.webContents.send('open-file', uri);*/
        var cp = ChildProcess.fork('./js/worker.js');
        cp.on('message', function (data)
        {
            console.log(JSON.stringify(data));
            sendToMainWindow(data.event, data.path);
        });
        cp.send({ fileName : uri });
    }
  })
})