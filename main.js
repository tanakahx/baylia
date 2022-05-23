const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

let mainWindow;

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

class SingletonWindow {
    constructor(name, html) {
        this.window = null;
        this.enabled = false;
        this.name = name;
        this.html = html;
    }
    show(canvasId) {
        if (!this.window) {
            this.window = new BrowserWindow({
                width: 800,
                height: 600,
                parent: mainWindow,
                modal: false,
                webPreferences: {
                    preload: path.join(app.getAppPath(), 'preload.js'),
                },
            });
            this.window.on('close', (event) => {
                event.preventDefault();
                this.window.hide();
                this.enabled = false;
                mainWindow.send(this.name + '-closed');
            });
            this.window.on('closed', () => {
                this.window = null;
            });
            this.window.loadFile(this.html);
            this.enabled = true;
            mainWindow.send(this.name + '-opened', canvasId);
        } else {
            this.window.show();
            this.window.focus();
            this.enabled = true;
            mainWindow.send(this.name + '-opened', canvasId);
        }
    }
    send(channel, ...args) {
        this.window.send(channel, ...args);
    }
}

histogramWindow = new SingletonWindow('histogram', 'histogram.html');

ipcMain.on('context-menu-show', (event, canvasId) => {
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
            label: 'Histogram',
            enabled: !histogramWindow.enabled,
            click: () => {
                histogramWindow.show(canvasId);
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'Close',
            click: () => {
                mainWindow.send('close', canvasId);
            }
        },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup(BrowserWindow.fromWebContents(event.sender));
});

ipcMain.on('histogram-send', (event, roi) => {
    histogramWindow.send('send', roi);
});