const { app, BrowserWindow, ipcMain, Menu, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const nativeImage = require('electron').nativeImage;

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
    constructor(name, width, height) {
        this.name = name;
        this.width = width;
        this.height = height;
        this.window = null;
        this.enabled = false;
    }
    show(canvasId, url) {
        this.window = new BrowserWindow({
            width: this.width,
            height: this.height,
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
        url += url.indexOf('?') == -1 ? '?' : '&';
        url += `canvasId=${canvasId}`;
        this.window.loadURL('file://' + __dirname + '/' + url);
        this.enabled = true;
        mainWindow.send(this.name + '-opened', canvasId);
    }
    send(channel, ...args) {
        if (this.window) {
            this.window.send(channel, ...args);
        }
    }
}

const profileWindow = new SingletonWindow('profile', 800, 600);
const histogramWindow = new SingletonWindow('histogram', 800, 600);
const propertiesWindow = new SingletonWindow('properties', 320, 300);
let isSingleMode = false;
let isTitleMode = true;

ipcMain.on('context-menu-show', (event, canvasId, viewSize, propertiesUrl) => {
    const template = [
        {
            label: 'Reset',
            click: () => { 
                mainWindow.send('reset');
            }
        },
        {
            label: 'Copy',
            click: async () => {
                let img = await (await mainWindow.capturePage({
                    x: 0,
                    y: 0,
                    width: viewSize.width,
                    height: viewSize.height,
                })).toBitmap();
                clipboard.writeImage(nativeImage.createFromBitmap(img, viewSize));
            }
        },
        {
            type: 'checkbox',
            label: 'Single mode',
            checked: isSingleMode,
            click: () => {
                isSingleMode = !isSingleMode;
                mainWindow.send('single-mode', isSingleMode);
            }
        },
        {
            type: 'checkbox',
            label: 'Titles',
            checked: isTitleMode,
            click: () => {
                isTitleMode = !isTitleMode;
                mainWindow.send('title-mode', isTitleMode);
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'Reload',
            click: () => {
                mainWindow.send('reload', canvasId);
            }
        },
        {
            label: 'Close',
            click: () => {
                mainWindow.send('close', canvasId);
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'Intensity Profile',
            enabled: !profileWindow.enabled,
            click: () => {
                profileWindow.show(canvasId, 'profile.html');
            }
        },
        {
            label: 'Histogram',
            enabled: !histogramWindow.enabled,
            click: () => {
                histogramWindow.show(canvasId, 'histogram.html');
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'Properties',
            enabled: propertiesUrl != null && !propertiesWindow.enabled,
            click: () => {
                propertiesWindow.show(canvasId, propertiesUrl);
            }
        },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup(BrowserWindow.fromWebContents(event.sender));
});

ipcMain.on('histogram-send', (event, roi) => {
    histogramWindow.send('send', roi);
});

ipcMain.on('profile-send', (event, roi) => {
    profileWindow.send('send', roi);
});

ipcMain.on('properties-send', (event, properties) => {
    propertiesWindow.send('send', properties);
})

ipcMain.on('properties-update', (event, properties) => {
    mainWindow.send('properties-update', properties);
});
