const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  Tray
} = require('electron');

const path = require('node:path');
const fs = require('node:fs');

// =========================
// File paths
// =========================
const notesFilePath = path.join(app.getPath('userData'), 'notes.json');
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');

// =========================
// Globals
// =========================
let tray = null;
let win = null;

// =========================
// Helpers
// =========================
function readNotes() {
  if (!fs.existsSync(notesFilePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(notesFilePath, 'utf-8'));
  } catch {
    return [];
  }
}

function writeNotes(notes) {
  fs.writeFileSync(notesFilePath, JSON.stringify(notes, null, 2), 'utf-8');
}

function readSettings() {
  if (!fs.existsSync(settingsFilePath)) {
    return { fontSize: 16, darkMode: false };
  }
  try {
    return JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'));
  } catch {
    return { fontSize: 16, darkMode: false };
  }
}

function writeSettings(settings) {
  fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
}

// =========================
// Window
// =========================
function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');

  win.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      win.hide();
    }
  });
}

// =========================
// App ready
// =========================
app.whenReady().then(() => {
  createWindow();

  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CmdOrCtrl+N',
          click: () => win.webContents.send('menu-new-note')
        },
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: () => win.webContents.send('menu-open-file')
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => win.webContents.send('menu-save')
        },
        {
          label: 'Save As',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => win.webContents.send('menu-save-as')
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.isQuiting = true;
            app.quit();
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  tray = new Tray(path.join(__dirname, 'icon.png'));

  tray.setToolTip('Quick Note Taker');

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show App', click: () => win.show() },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]));

  tray.on('double-click', () => {
    win.isVisible() ? win.hide() : win.show();
  });
});

// =========================
// NOTES IPC
// =========================
ipcMain.handle('get-notes', () => readNotes());

ipcMain.handle('delete-note', (event, id) => {
  const notes = readNotes().filter(n => n.id !== id);
  writeNotes(notes);
  return { success: true };
});

ipcMain.handle('save-note-json', (event, note) => {
  const notes = readNotes();
  const index = notes.findIndex(n => n.id === note.id);
  const now = new Date().toISOString();

  if (index === -1) {
    notes.push({ ...note, createdAt: now, updatedAt: now });
  } else {
    notes[index] = { ...notes[index], ...note, updatedAt: now };
  }

  writeNotes(notes);
  return { success: true };
});

// =========================
// PIN FEATURE
// =========================
ipcMain.handle('toggle-pin', (event, id) => {
  const notes = readNotes();
  const index = notes.findIndex(n => n.id === id);

  if (index === -1) return { success: false };

  notes[index].pinned = !notes[index].pinned;
  writeNotes(notes);

  return {
    success: true,
    pinned: notes[index].pinned
  };
});

// =========================
// SETTINGS IPC
// =========================
ipcMain.handle('get-settings', () => readSettings());

ipcMain.handle('save-settings', (event, settings) => {
  const current = readSettings();
  writeSettings({ ...current, ...settings });
  return { success: true };
});

// =========================
// FILE SYSTEM (FIXED SECTION)
// =========================

// SAVE AS
ipcMain.handle('save-as', async (event, data) => {
  const result = await dialog.showSaveDialog(win, {
    title: 'Save File As',
    defaultPath: 'note.txt',
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { success: false };
  }

  fs.writeFileSync(result.filePath, data, 'utf-8');

  return {
    success: true,
    filePath: result.filePath
  };
});

// OPEN FILE
ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false };
  }

  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');

  return {
    success: true,
    content,
    filePath
  };
});