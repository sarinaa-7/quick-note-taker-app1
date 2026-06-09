window.addEventListener('DOMContentLoaded', async () => {
    // Select UI elements from the DOM
    const textarea = document.getElementById('note');
    const saveStatus = document.getElementById('save_status');
    const charCount = document.getElementById('char-count');
    const wordCount = document.getElementById('word-count');
    const saveBtn = document.getElementById('save');
    const openBtn = document.getElementById('open-file');
    const newBtn = document.getElementById('new-note');
    const deleteBtn = document.getElementById('delete-note');
    const trashBtn = document.getElementById('trash-bin');
    const printBtn = document.getElementById('print');
    const exportPdfBtn = document.getElementById('export-pdf');
    const trashModal = document.getElementById('trash-modal');
    const trashList = document.getElementById('trash-list');
    const closeTrashBtn = document.getElementById('close-trash');
    const overlay = document.getElementById('modal-overlay');

    // Track the current file path and content to manage save states and changes
    let currentFilePath = null;
    let lastSavedContent = '';

    // Initialize Settings (Dark Mode) - Loads user preferences from the main process
    const settings = await window.electronAPI.getSettings();
    if (settings.darkMode) document.body.classList.add('dark-mode');

    // Updates character and word counts based on current textarea value
    function updateStats() {
        const text = textarea.value.trim();
        charCount.textContent = `${text.length} chars`;
        wordCount.textContent = `${text ? text.split(/\s+/).length : 0} words`;
    }

    /**
     * Saves the current note to a .txt file.
     * @param {boolean} manual - True if triggered by a button click, false if by auto-save.
     */
    async function saveNote(manual = false) {
        const content = textarea.value;
        // Invoke IPC handler to save content; if currentFilePath is null, it triggers a 'Save As' dialog
        const result = await window.electronAPI.saveNote({ content, filePath: currentFilePath });
        
        if (result.success) {
            currentFilePath = result.filePath;
            lastSavedContent = content;
            const now = new Date().toLocaleTimeString();
            saveStatus.textContent = manual ? `Saved manually to ${currentFilePath}` : `Auto-saved at ${now}`;
            // Show a native desktop notification for manual saves
            if (manual) new Notification('Note Taker', { body: 'Note saved successfully as .txt' });
        }
    }

    // Auto-save logic: saves 5 seconds after the user stops typing
    let debounceTimer;
    textarea.addEventListener('input', () => {
        updateStats();
        saveStatus.textContent = 'Changes detected...';
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => saveNote(false), 5000);
    });

    // Manual save button trigger
    saveBtn.addEventListener('click', () => saveNote(true));

    // Open existing .txt file
    openBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.openFile();
        if (result) {
            textarea.value = result.content;
            currentFilePath = result.filePath;
            lastSavedContent = result.content;
            updateStats();
            saveStatus.textContent = `Opened: ${currentFilePath}`;
        }
    });

    // Clear the editor for a new note
    newBtn.addEventListener('click', () => {
        if (textarea.value !== lastSavedContent) {
            if (!confirm('You have unsaved changes. Clear anyway?')) return;
        }
        textarea.value = '';
        currentFilePath = null;
        lastSavedContent = '';
        updateStats();
        saveStatus.textContent = 'New note started';
    });

    // Move current note content to the Trash Bin snapshot system
    deleteBtn.addEventListener('click', async () => {
        if (!textarea.value) return;
        if (confirm('Move this note snapshot to Trash?')) {
            await window.electronAPI.moveToTrash({ content: textarea.value, title: currentFilePath || 'Unsaved Note' });
            textarea.value = '';
            currentFilePath = null;
            updateStats();
            alert('Note snapshot moved to Trash Bin');
        }
    });

    // Display the Trash Bin modal with deleted note snapshots
    trashBtn.addEventListener('click', async () => {
        const trash = await window.electronAPI.getTrash();
        trashList.innerHTML = '';
        trash.forEach(note => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="flex:1">
                    <strong>${note.title || 'Untitled'}</strong><br>
                    <small>${new Date(note.deletedAt).toLocaleString()}</small>
                </div>
                <div style="display:flex; gap:5px">
                    <button onclick="restoreFromTrash('${note.id}')">Restore</button>
                    <button class="delete" onclick="permanentDelete('${note.id}')">Delete Forever</button>
                </div>
            `;
            trashList.appendChild(li);
        });
        trashModal.style.display = 'block';
        overlay.style.display = 'block';
    });

    // Restore a note from trash back into the editor
    window.restoreFromTrash = async (id) => {
        const note = await window.electronAPI.restoreFromTrash(id);
        if (note) {
            textarea.value = note.content;
            updateStats();
            trashModal.style.display = 'none';
            overlay.style.display = 'none';
        }
    };

    // Permanently remove a note snapshot from the project
    window.permanentDelete = async (id) => {
        if (confirm('Are you sure you want to permanently delete this from the project? This cannot be undone.')) {
            await window.electronAPI.permanentDelete(id);
            trashBtn.click(); // Refresh the trash list
        }
    };

    closeTrashBtn.addEventListener('click', () => {
        trashModal.style.display = 'none';
        overlay.style.display = 'none';
    });

    // Native printing and PDF export
    printBtn.addEventListener('click', () => window.electronAPI.printNote());
    exportPdfBtn.addEventListener('click', () => window.electronAPI.exportPDF());

    // Native Menu Listeners (from main process)
    window.electronAPI.onMenuNewNote(() => newBtn.click());
    window.electronAPI.onMenuSaveNote(() => saveBtn.click());
    window.electronAPI.onToggleDarkMode(() => document.body.classList.toggle('dark-mode'));
    window.electronAPI.onExternalFileOpened((content) => {
        textarea.value = content;
        updateStats();
    });
});
