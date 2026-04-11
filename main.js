const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow () {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    frame: false, 
    backgroundColor: '#121212',
    icon: path.join(__dirname, 'assets/media/icon.png'),

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, 
      webSecurity: false 
    }
  });

  win.loadFile('home.html');
}

ipcMain.on('close-app', () => { app.quit(); });

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.quit();
});

ipcMain.on('minimize-app', (event) => {
  BrowserWindow.fromWebContents(event.sender).minimize();
});

ipcMain.on('maximize-app', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.on('show-asset-menu', (event, assetPath) => {
  const template = [
    { label: 'Open in Default Viewer', click: () => shell.openPath(assetPath) },
    { label: 'Show in File Explorer', click: () => shell.showItemInFolder(assetPath) },
    { type: 'separator' },
    {
      label: 'Save Copy As...',
      click: async () => {
        const { filePath } = await dialog.showSaveDialog({
          defaultPath: path.basename(assetPath),
          title: 'Save Asset'
        });
        if (filePath) {
          fs.copyFileSync(assetPath, filePath);
        }
      }
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  menu.popup(BrowserWindow.fromWebContents(event.sender));
});

app.whenReady().then(() => { createWindow(); });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});