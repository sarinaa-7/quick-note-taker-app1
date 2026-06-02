const {
    contextBridge,
    ipcRenderer
} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
saveNote: (note) => ipcRenderer.invoke('save-note', note),
loadNote: () => ipcRenderer.invoke('load-note'),
saveAs: (text) => ipcRenderer.invoke('save-as', text),
deleteNote: () => ipcRenderer.invoke('delete-note'),
newNote: () => ipcRenderer.invoke('new-note'),
openFile: () => ipcRenderer.invoke('open-file'),
togglePin: (id) => ipcRenderer.invoke('toggle-pin', id),

smartSave: (text, filePath) =>
    ipcRenderer.invoke('smart-save', text, filePath),

onMenuAction: (channel, callback) =>
    ipcRenderer.on(channel, callback),

// NEW: JSON notes methods
getNotes: () => ipcRenderer.invoke('get-notes'),

saveNoteJson: (note) =>
    ipcRenderer.invoke('save-note-json', note),

deleteNoteJson: (id) =>
    ipcRenderer.invoke('delete-note', id),

// NEW: settings methods
getSettings: () => ipcRenderer.invoke('get-settings'),

saveSettings: (settings) =>
    ipcRenderer.invoke('save-settings', settings)


});
