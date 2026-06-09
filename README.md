# Quick Note Taker [Extended Edition]

## 5.1 App Description
Quick Note Taker [Extended Edition] is a feature-rich desktop application built with Electron for efficient and organized note-taking. It allows users to create, manage, and categorize notes with a focus on speed and native integration. The app features auto-saving, dark mode, spell checking, and the ability to export notes as PDF or print them directly. With a robust sidebar for navigation and a Trash Bin for data recovery, it provides a seamless desktop experience for personal or professional productivity.

## 5.2 New Features Added

### 1. Export Note as PDF
- **Description:** Allows users to save their current note as a professional PDF file through a native save dialog.
- **Modified Files:** `main.js`, `preload.js`, `renderer.js`, `index.html`

### 2. Native Print Support
- **Description:** Integrates with the system's print dialog to allow direct physical printing of notes.
- **Modified Files:** `main.js`, `preload.js`, `renderer.js`, `index.html`

### 3. Trash Bin (Restore Deleted Notes)
- **Description:** Implements a two-step deletion process where notes are moved to a Trash Bin first, allowing for easy recovery.
- **Modified Files:** `main.js`, `preload.js`, `renderer.js`, `index.html`

### 4. Spell Checker & Context Menu
- **Description:** Utilizes Electron's built-in spell checker with a custom right-click context menu for corrections and dictionary management.
- **Modified Files:** `main.js`

### 5. Native App Menu & System Tray
- **Description:** Provides a native top menu (File/Edit/View) and a system tray icon that allows the app to run in the background.
- **Modified Files:** `main.js`, `preload.js`, `renderer.js`

### 6. Multiple Notes & Sidebar Management
- **Description:** Notes are stored in a structured JSON database, displayed in a sidebar with real-time search, pinning, and categories.
- **Modified Files:** `main.js`, `renderer.js`, `index.html`

### 7. Dark Mode & Font Size Preferences
- **Description:** Users can toggle between Light and Dark themes and adjust the editor's font size, with preferences saved across sessions.
- **Modified Files:** `main.js`, `renderer.js`, `index.html`

### 8. Live Stats (Word & Character Count)
- **Description:** Real-time feedback on note length provided in the status bar.
- **Modified Files:** `renderer.js`, `index.html`

## 5.3 How to Run the App
1. Install Node.js from [https://nodejs.org](https://nodejs.org)
2. Open a terminal in the project folder
3. Run: `npm install`
4. Run: `npm start`

## 5.4 How to Install the App
- **For Windows:** Run the .exe installer from the `dist/` folder (after running `npm run build`).
- **For macOS:** Open the .dmg file and drag the app to Applications.
