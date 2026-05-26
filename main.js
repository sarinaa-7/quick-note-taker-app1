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
const notesFilePath = path.join(app.getPath('userData'), 'notes.json');

let tray = null;
let win = null;

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
  // Load app
  win.loadFile('index.html');

  // Hide window instead of closing
  win.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      win.hide();
    }
  });


}

app.whenReady().then(() => {
  createWindow();

  // =========================
  // App Menu
  // =========================
  const menuTemplate = [{
    label: 'File',
    submenu: [{
        label: 'New Note',
        accelerator: 'CmdOrCtrl+N',
        click: () => {
          win.webContents.send('menu-new-note');
        }
      },
      {
        label: 'Open File',
        accelerator: 'CmdOrCtrl+O',
        click: () => {
          win.webContents.send('menu-open-file');
        }
      },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click: () => {
          win.webContents.send('menu-save');
        }
      },
      {
        label: 'Save As',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: () => {
          win.webContents.send('menu-save-as');
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.isQuiting = true;
          app.quit();
        }
      }
    ]
  }];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // =========================
  // System Tray
  // =========================
  tray = new Tray(path.join(__dirname, 'icon.png'));

  const trayMenu = Menu.buildFromTemplate([{
      label: 'Show App',
      click: () => {
        win.show();
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Quick Note Taker');
  tray.setContextMenu(trayMenu);

  // Double click tray icon
  tray.on('double-click', () => {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
    }
  });
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// NEW: Helper — read all notes from the JSON file
function readNotes() {
  if (!fs.existsSync(notesFilePath)) {
    return []; // return empty array if file does not exist yet
  }
  const raw = fs.readFileSync(notesFilePath, 'utf-8');
  return JSON.parse(raw);
}

// NEW: Helper — write all notes to the JSON file
function writeNotes(notes) {
  fs.writeFileSync(notesFilePath, JSON.stringify(notes, null, 2), 'utf-8');
}

// =========================
// IPC Handlers
// =========================

ipcMain.handle('save-note', async (event, text) => {
  const filePath = path.join(app.getPath('documents'), 'quicknote.txt');
  fs.writeFileSync(filePath, text, 'utf-8');
  return {
    success: true
  };
});

ipcMain.handle('load-note', async () => {
  const filePath = path.join(app.getPath('documents'), 'quicknote.txt');
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return '';
});

ipcMain.handle('save-as', async (event, text) => {
  const result = await dialog.showSaveDialog({
    title: 'Save Note',
    defaultPath: 'quicknote.txt',
    filters: [{
      name: 'Text Files',
      extensions: ['txt']
    }]
  });

  if (result.canceled || !result.filePath) {
    return {
      success: false
    };
  }

  fs.writeFileSync(result.filePath, text, 'utf-8');

  return {
    success: true,
    filePath: result.filePath
  };
});

ipcMain.handle('new-note', async () => {
  const result = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Discard Changes', 'Cancel'],
    defaultId: 1,
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Start a new note anyway?'
  });

  return {
    confirmed: result.response === 0
  };
});

ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{
      name: 'Text Files',
      extensions: ['txt']
    }]
  });


  if (result.canceled) {
    return {
      success: false
    };
  }

  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');

  return {
    success: true,
    content,
    filePath
  };
});
// NEW: Get all notes
ipcMain.handle('get-notes', async () => {
  return readNotes();
});

// NEW: Delete a note
ipcMain.handle('delete-note', async (event, id) => {
  const notes = readNotes();
  const filtered = notes.filter(n => n.id !== id);
  writeNotes(filtered);
  return {
    success: true
  };
});

// NEW: Save a note (create or update)
ipcMain.handle('save-note-json', async (event, note) => {
  const notes = readNotes();
  const index = notes.findIndex(n => n.id === note.id);
  const now = new Date().toISOString();

  if (index === -1) {
    // Note does not exist yet — create it
    notes.push({
      ...note,
      createdAt: now,
      updatedAt: now
    });
  } else {
    // Note already exists — update it
    notes[index] = {
      ...notes[index],
      ...note,
      updatedAt: now
    };
  }

  writeNotes(notes);
  return {
    success: true
  };
});