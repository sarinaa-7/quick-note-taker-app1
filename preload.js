const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveNote: (data) => ipcRenderer.invoke('save-note', data),
    openFile: () => ipcRenderer.invoke('open-file'),
    getTrash: () => ipcRenderer.invoke('get-trash'),
    moveToTrash: (note) => ipcRenderer.invoke('move-to-trash', note),
    permanentDelete: (id) => ipcRenderer.invoke('permanent-delete', id),
    restoreFromTrash: (id) => ipcRenderer.invoke('restore-from-trash', id),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    printNote: () => ipcRenderer.invoke('print-note'),
    exportPDF: () => ipcRenderer.invoke('export-pdf'),
    
    // Listeners
    onMenuNewNote: (callback) => ipcRenderer.on('menu-new-note', callback),
    onMenuSaveNote: (callback) => ipcRenderer.on('menu-save-note', callback),
    onToggleDarkMode: (callback) => ipcRenderer.on('toggle-dark-mode', callback),
    onExternalFileOpened: (callback) => ipcRenderer.on('external-file-opened', (event, content) => callback(content))
});
