const { app, BrowserWindow, ipcMain, Menu, shell, dialog, session, protocol, net } = require('electron');
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
      nodeIntegration: false, 
      contextIsolation: true,
      webSecurity: true, 
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
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

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.on('show-asset-menu', (event, assetPath) => {
  let realPath = assetPath;
  if (assetPath.startsWith('comic://')) {
      const basePath = app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname;
      const portablePath = path.join(basePath, assetPath.slice(8));
      const asarPath = path.join(__dirname, assetPath.slice(8));
      realPath = fs.existsSync(portablePath) ? portablePath : asarPath;
  } else {
      realPath = path.join(__dirname, assetPath);
  }

  const template = [
    { label: 'Open in Default Viewer', click: () => shell.openPath(realPath) },
    { label: 'Show in File Explorer', click: () => shell.showItemInFolder(realPath) },
    { type: 'separator' },
    {
      label: 'Save Copy As...',
      click: async () => {
        const { filePath } = await dialog.showSaveDialog({
          defaultPath: path.basename(realPath),
          title: 'Save Asset'
        });
        if (filePath) fs.copyFileSync(realPath, filePath);
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
    protocol.registerFileProtocol('comic', (request, callback) => {
      const url = request.url.slice(8);
      const basePath = app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname;
      
      const portablePath = path.join(basePath, url);
      const asarPath = path.join(__dirname, url);

      if (fs.existsSync(portablePath)) {
        callback({ path: portablePath });
      } else {
        callback({ path: asarPath });
      }
    });

    app.on('web-contents-created', (event, contents) => {
      contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        if (parsedUrl.protocol !== 'file:') {
          event.preventDefault();
          console.warn('Blocked unauthorized navigation to:', navigationUrl);
        }
      });

      contents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) {
          shell.openExternal(url);
        }
        return { action: 'deny' };
      });
    });

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

ipcMain.on('check-for-updates', async (event) => {
    const sendStatus = (msg, color = '#aaa') => event.reply('update-status', msg, color);
    sendStatus('Checking for updates...');

    const APP_REPO_URL = 'https://raw.githubusercontent.com/BlairFruit/unofficialdacollection/refs/heads/main/';
    const CONTENT_REPO_URL = 'https://raw.githubusercontent.com/Scinio/Scinio.github.io/refs/heads/main/';
    const basePath = app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname;
    const LOCAL_DATA_PATH = path.join(basePath, 'assets', 'data.json');

    try {
        const nocache = `?t=${new Date().getTime()}`;

        let localVersionData = { version: "0.0.0" };
        try { localVersionData = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')); } catch (e) {}
        
        const versionRes = await fetch(APP_REPO_URL + 'package.json' + nocache, { cache: 'no-store' });
        let remoteVersionData = null;
        if (versionRes.ok) {
            remoteVersionData = await versionRes.json();
            const isNewer = (remote, local) => {
                const r = remote.split('.').map(Number);
                const l = local.split('.').map(Number);
                for (let i = 0; i < Math.max(r.length, l.length); i++) {
                    if ((r[i] || 0) > (l[i] || 0)) return true;
                    if ((r[i] || 0) < (l[i] || 0)) return false;
                }
                return false;
            };

            if (isNewer(remoteVersionData.version, localVersionData.version)) {
                sendStatus(`App Update v${remoteVersionData.version} found on GitHub. Please download the new release!`, 'gold');
                return; 
            }
        }

        const response = await fetch(CONTENT_REPO_URL + 'assets/data.json' + nocache, { cache: 'no-store' });
        if (!response.ok) throw new Error("Could not connect to Comic Data repository.");
        const remoteData = await response.json();

        let localData = { pages: {} };
        try { localData = JSON.parse(fs.readFileSync(LOCAL_DATA_PATH, 'utf8')); } catch (e) {}
        
        let hasChanges = false;
        let downloadQueue = [];

        for (let p in localData.pages) {
            if (!remoteData.pages[p]) {
                delete localData.pages[p];
                hasChanges = true;
            }
        }

        for (let p in remoteData.pages) {
            let remotePageBlocks = remoteData.pages[p];
            let mappedPageBlocks = JSON.parse(JSON.stringify(remotePageBlocks));
            let assetCounter = 1;

            mappedPageBlocks.forEach(block => {
                if (block.type === 'image' || block.type === 'video') {
                    let ext = path.extname(block.value);
                    block.value = `assets/media/p${p}-${assetCounter}${ext}`;
                    assetCounter++;
                }
            });

            let isDifferent = !localData.pages[p] || JSON.stringify(localData.pages[p]) !== JSON.stringify(mappedPageBlocks);

            if (isDifferent) {
                assetCounter = 1;
                remotePageBlocks.forEach(block => {
                    if (block.type === 'image' || block.type === 'video') {
                        let remotePath = block.value;
                        let ext = path.extname(remotePath);
                        
                        let safeFileName = `p${p}-${assetCounter}${ext}`;
                        let localSavePath = path.join(basePath, 'assets', 'media', safeFileName);
                        
                        if (localSavePath.startsWith(path.join(basePath, 'assets', 'media'))) {
                            downloadQueue.push({ url: CONTENT_REPO_URL + remotePath + nocache, savePath: localSavePath });
                        }
                        assetCounter++;
                    }
                });
                localData.pages[p] = mappedPageBlocks;
                hasChanges = true;
            }
        }

        if (downloadQueue.length > 0) {
            for (let i = 0; i < downloadQueue.length; i++) {
                let item = downloadQueue[i];
                sendStatus(`Downloading media ${i + 1} of ${downloadQueue.length}...`);
                fs.mkdirSync(path.dirname(item.savePath), { recursive: true });
                let fileRes = await fetch(item.url);
                let buffer = Buffer.from(await fileRes.arrayBuffer());
                fs.writeFileSync(item.savePath, buffer);
            }
        }

        if (hasChanges) {
            fs.mkdirSync(path.dirname(LOCAL_DATA_PATH), { recursive: true });
            
            fs.writeFileSync(LOCAL_DATA_PATH, JSON.stringify(localData, null, 2));
        }

        if (hasChanges || downloadQueue.length > 0) {
            sendStatus("Content updated successfully!", "#00ff00");
        } else {
            sendStatus("You are completely up to date!", "#00ff00");
        }

    } catch (err) {
        console.error(err);
        sendStatus("Update Failed: Connection dropped or data corrupted.", "#ff3333");
    }
});

ipcMain.handle('get-comic-data', () => {
    const basePath = app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname;
    const PORTABLE_DATA = path.join(basePath, 'assets', 'data.json');
    const ASAR_DATA = path.join(__dirname, 'assets', 'data.json');
    
    try {
        if (fs.existsSync(PORTABLE_DATA)) return JSON.parse(fs.readFileSync(PORTABLE_DATA, 'utf8'));
        if (fs.existsSync(ASAR_DATA)) return JSON.parse(fs.readFileSync(ASAR_DATA, 'utf8'));
    } catch (err) {
        console.error(err);
    }
    return null;
});