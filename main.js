const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const DiscordRPC = require('discord-rpc');
const clientId = '1012842910946963486'; 
DiscordRPC.register(clientId);

const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const startTimestamp = new Date();

let lastRpcUpdateTime = 0;
let rpcUpdateTimeout = null;
let isRpcReady = false;

let currentRPCState = null; 

async function processRpcUpdate() {
    if (!rpc || !clientId || !isRpcReady || !currentRPCState) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - lastRpcUpdateTime;
    const cooldown = 15000;

    if (timeSinceLastUpdate >= cooldown) {
        try {
            await rpc.setActivity({
                details: currentRPCState.details,
                state: currentRPCState.state,
                startTimestamp,
                largeImageKey: 'icon',
                largeImageText: 'THE UNOFFICIAL DEAXS ADVENTURE COLLECTION',
                instance: false,
            });
            console.log("Successfully pushed to Discord:", currentRPCState.state);
            lastRpcUpdateTime = Date.now();
        } catch (err) {
            console.error('Discord RPC Error:', err);
        }
    } else {
        if (rpcUpdateTimeout) clearTimeout(rpcUpdateTimeout);
        rpcUpdateTimeout = setTimeout(() => {
            processRpcUpdate();
        }, cooldown - timeSinceLastUpdate);
    }
}

rpc.on('ready', () => {
    isRpcReady = true;
    processRpcUpdate();
});

rpc.login({ clientId }).catch(console.error);

ipcMain.on('update-rpc', (event, args) => {
    if (args && args.state) {
        currentRPCState = {
            details: args.details,
            state: args.state
        };
        processRpcUpdate();
    }
});

const windowStateKeeper = require('electron-window-state');

function createWindow () {
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1000,
    defaultHeight: 800
  });

  const win = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    
    frame: false, 
    backgroundColor: '#121212',
    icon: path.join(__dirname, 'assets/media/icon.png'),

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, 
      webSecurity: false,
      sandbox: false
    }
  });

  mainWindowState.manage(win);

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

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => { 
    createWindow(); 
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
    console.error('Fatal App Crash:', error);
    app.quit(); 
});