// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const $ = require('jQuery')
const ipc = require('electron').ipcRenderer

const selectDirBtn = $('.open-file-btn')

selectDirBtn.click(function (event) {
  ipc.send('open-file-dialog')
})

ipc.on('selected-file', function (event, path)
    {
        $('.selected-file').html(`You selected: ${path}`)
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
