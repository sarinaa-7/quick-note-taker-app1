const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, Tray, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// FIX: Disable hardware acceleration and set cache path to prevent "Access denied" errors
app.disableHardwareAcceleration();

// FIX: Set cache path to user data folder (has write permissions)
const cachePath = path.join(app.getPath('userData'), 'cache');
app.setPath('cache', cachePath);

let mainWindow;
let tray;
const NOTES_FILE = path.join(app.getPath('userData'), 'notes_v2.json');
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
    if (fs.existsSync(SETTINGS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
        } catch (e) {
            return { darkMode: false, fontSize: 18 };
        }
    }
    return { darkMode: false, fontSize: 18 };
}

function saveSettings(settings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings));
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            spellcheck: true
        }
    });

    // FIX: Use absolute path to load index.html
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    const template = [
        {
            label: 'File',
            submenu: [
                { label: 'New Note', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu-new-note') },
                { label: 'Open File', accelerator: 'CmdOrCtrl+O', click: () => openExternalFile() },
                { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu-save-note') },
                { type: 'separator' },
                { label: 'Quit', role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { label: 'Toggle Dark Mode', click: () => mainWindow.webContents.send('toggle-dark-mode') }
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    mainWindow.webContents.on('context-menu', (event, params) => {
        const menu = new Menu();
        for (const suggestion of params.dictionarySuggestions) {
            menu.append(new MenuItem({
                label: suggestion,
                click: () => mainWindow.webContents.replaceMisspelling(suggestion)
            }));
        }
        if (params.misspelledWord) {
            menu.append(new MenuItem({
                label: 'Add to dictionary',
                click: () => mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
            }));
        }
        if (menu.items.length > 0) menu.popup();
    });
}

function createTray() {
    const iconPath = path.join(__dirname, 'icon.png');
    const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show App', click: () => mainWindow.show() },
        { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('Quick Note Taker');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => mainWindow.show());
}

async function openExternalFile() {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });
    if (!canceled) {
        const content = fs.readFileSync(filePaths[0], 'utf-8');
        mainWindow.webContents.send('external-file-opened', content);
    }
}

app.whenReady().then(() => {
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Note Storage functions
function loadNotesFromFile() {
    if (fs.existsSync(NOTES_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf-8'));
        } catch (e) { return []; }
    }
    return [];
}

function saveNotesToFile(notes) {
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8');
}

// IPC Handlers
ipcMain.handle('save-note', async (event, { content, filePath }) => {
    let targetPath = filePath;
    
    if (!targetPath) {
        const { canceled, filePath: savePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Note',
            defaultPath: path.join(app.getPath('documents'), 'note.txt'),
            filters: [{ name: 'Text Files', extensions: ['txt'] }]
        });
        if (canceled) return { success: false };
        targetPath = savePath;
    }

    fs.writeFileSync(targetPath, content, 'utf-8');
    return { success: true, filePath: targetPath };
});

ipcMain.handle('open-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });
    if (canceled) return null;
    const content = fs.readFileSync(filePaths[0], 'utf-8');
    return { content, filePath: filePaths[0] };
});

// Trash Bin logic
const TRASH_FILE = path.join(app.getPath('userData'), 'trash.json');
function loadTrash() {
    if (fs.existsSync(TRASH_FILE)) return JSON.parse(fs.readFileSync(TRASH_FILE, 'utf-8'));
    return [];
}

ipcMain.handle('get-trash', async () => loadTrash());

ipcMain.handle('move-to-trash', async (event, note) => {
    const trash = loadTrash();
    trash.push({ ...note, deletedAt: Date.now(), id: Date.now().toString() });
    fs.writeFileSync(TRASH_FILE, JSON.stringify(trash));
    return { success: true };
});

ipcMain.handle('permanent-delete', async (event, id) => {
    let trash = loadTrash();
    trash = trash.filter(n => n.id !== id);
    fs.writeFileSync(TRASH_FILE, JSON.stringify(trash));
    return { success: true };
});

ipcMain.handle('restore-from-trash', async (event, id) => {
    let trash = loadTrash();
    const note = trash.find(n => n.id === id);
    trash = trash.filter(n => n.id !== id);
    fs.writeFileSync(TRASH_FILE, JSON.stringify(trash));
    return note;
});

ipcMain.handle('get-settings', async () => loadSettings());
ipcMain.handle('save-settings', async (event, settings) => saveSettings(settings));

ipcMain.handle('print-note', async (event) => {
    mainWindow.webContents.print({});
});

ipcMain.handle('export-pdf', async (event) => {
    const pdfPath = await dialog.showSaveDialog(mainWindow, {
        title: 'Export as PDF',
        defaultPath: path.join(app.getPath('documents'), 'note.pdf'),
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (!pdfPath.canceled && pdfPath.filePath) {
        const data = await mainWindow.webContents.printToPDF({
            printBackground: true,
            marginsType: 0
        });

        fs.writeFileSync(pdfPath.filePath, data);
        return { success: true };
    }
    return { success: false };
});