const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveNote: (note) => ipcRenderer.invoke('save-note', note),
    loadNote: () => ipcRenderer.invoke('load-note'),
    saveAs: (text)=> ipcRenderer.invoke('save-as', text),
    deleteNote: () => ipcRenderer.invoke('delete-note'),
    newNote: () => ipcRenderer.invoke('new-note'),
    openFile: () => ipcRenderer.invoke('open-file'),
    smartSave: (text, filePath) => ipcRenderer.invoke('smart-save',text, filePath)
});
