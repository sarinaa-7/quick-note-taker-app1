const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveNote: (note) => ipcRenderer.invoke('save-note', note),
    loadNote: () => ipcRenderer.invoke('load-note')
});