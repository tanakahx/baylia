const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');

contextBridge.exposeInMainWorld('api', {
    // send a message to main process
    send: (channel, ...args) => {
        ipcRenderer.send(channel, ...args);
    },
    // receive a message from main process
    receive: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    // open file and return its content as blob
    readFile: (path) => {
        return fs.promises.readFile(path);
    }
});
