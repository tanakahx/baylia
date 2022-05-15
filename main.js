const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

let mainWindow;
let histogramWindow;
let isHistogramWindowVisible = false;

const createWindow = () => {
    mainWindow = new BrowserWindow({
      webPreferences: {
          preload: path.join(app.getAppPath(), 'preload.js'),
      }
    });
    mainWindow.loadFile('index.html');
    mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length == 0) {
            createWindow();
        }
    });
    app.on('window-all-closed', () => {
        if (process.platform != 'darwin') {
            app.quit();
        }
    })
})

ipcMain.on('context-menu-show', (event, imageFrame) => {
    const template = [
        {
            label: 'Reset',
            click: () => { 
                mainWindow.send('reset');
            }
        },
        {
            type: 'separator'
        },
        {
            type: 'separator'
        },
        {
            label: 'Close',
            click: () => {
                mainWindow.send('close', imageFrame.canvasId);
            }
        },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup(BrowserWindow.fromWebContents(event.sender));
});
