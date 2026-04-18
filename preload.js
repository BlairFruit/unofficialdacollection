const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    minimizeApp: () => ipcRenderer.send('minimize-app'),
    maximizeApp: () => ipcRenderer.send('maximize-app'),
    closeApp: () => ipcRenderer.send('close-app'),
    restartApp: () => ipcRenderer.send('restart-app'),
    
    updateRpc: (data) => ipcRenderer.send('update-rpc', data),
    showAssetMenu: (assetPath) => {
        if (assetPath.includes('assets') && !assetPath.includes('..')) {
            ipcRenderer.send('show-asset-menu', assetPath);
        }
    },

    getComicData: () => ipcRenderer.invoke('get-comic-data'),
    getAppPath: () => 'comic://', 
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    checkForUpdates: () => ipcRenderer.send('check-for-updates'),
    onUpdateStatus: (callback) => {
        ipcRenderer.removeAllListeners('update-status');
        ipcRenderer.on('update-status', (event, msg, color) => callback(msg, color));
    }
});