window.addEventListener('DOMContentLoaded', async () => {
  const textarea = document.getElementById('note');
  const titleInput = document.getElementById('note-title');

  const saveBtn = document.getElementById('save');
  const saveAsBtn = document.getElementById('save-as');
  const openFileBtn = document.getElementById('open-file');
  const newNoteBtn = document.getElementById('new-note');

  const noteList = document.getElementById('note-list');
  const statusEl = document.getElementById('save_status');

  const fontIncreaseBtn = document.getElementById('font-increase');
  const fontDecreaseBtn = document.getElementById('font-decrease');

  const darkModeBtn = document.getElementById('dark-mode-toggle');
  const searchInput = document.getElementById('search');

  // ✅ WORD COUNT ELEMENT (MAKE SURE YOU HAVE THIS IN HTML)
  const wordCountEl = document.getElementById('word-count');

  // STATE
  let notes = [];
  let currentNoteId = null;
  let lastSavedContent = '';
  let debounceTimer = null;

  let currentFontSize = 16;
  let isDarkMode = false;

  // =========================
  // WORD + CHARACTER COUNT
  // =========================
  function updateWordCount() {
    const text = textarea.value;

    const characters = text.length;
    const words =
      text.trim() === ''
        ? 0
        : text.trim().split(/\s+/).length;

    if (wordCountEl) {
      wordCountEl.textContent = `Words: ${words} | Characters: ${characters}`;
    }
  }

  // =========================
  // FONT SIZE
  // =========================
  function applyFontSize(size) {
    currentFontSize = Math.min(32, Math.max(10, size));
    textarea.style.fontSize = `${currentFontSize}px`;
  }

  fontIncreaseBtn.addEventListener('click', async () => {
    applyFontSize(currentFontSize + 2);
    await window.electronAPI.saveSettings({ fontSize: currentFontSize });
  });

  fontDecreaseBtn.addEventListener('click', async () => {
    applyFontSize(currentFontSize - 2);
    await window.electronAPI.saveSettings({ fontSize: currentFontSize });
  });

  // =========================
  // DARK MODE
  // =========================
  function applyDarkMode(enabled) {
    isDarkMode = enabled;

    if (enabled) {
      document.body.classList.add('dark-mode');
      darkModeBtn.textContent = 'Light Mode';
    } else {
      document.body.classList.remove('dark-mode');
      darkModeBtn.textContent = 'Dark Mode';
    }
  }

  darkModeBtn.addEventListener('click', async () => {
    applyDarkMode(!isDarkMode);
    await window.electronAPI.saveSettings({ darkMode: isDarkMode });
  });

  // =========================
  // SEARCH
  // =========================
  searchInput.addEventListener('input', () => {
    renderNoteList(searchInput.value);
  });

  // =========================
  // LOAD SETTINGS + NOTES
  // =========================
  const settings = await window.electronAPI.getSettings();
  applyFontSize(settings.fontSize || 16);
  applyDarkMode(settings.darkMode || false);

  notes = await window.electronAPI.getNotes();

  if (notes.length > 0) {
    const mostRecent = notes.reduce((a, b) =>
      new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b
    );
    await switchNote(mostRecent.id);
  } else {
    newNoteBtn.click();
  }

  renderNoteList(searchInput.value);

  // =========================
  // RENDER NOTES
  // =========================
  function renderNoteList(filter = '') {
    noteList.innerHTML = '';

    let filtered =
      filter.trim() === ''
        ? [...notes]
        : notes.filter(note =>
            (note.title || '').toLowerCase().includes(filter.toLowerCase()) ||
            (note.content || '').toLowerCase().includes(filter.toLowerCase())
          );

    filtered.sort((a, b) => {
      if ((a.pinned ?? false) && !b.pinned) return -1;
      if (!a.pinned && (b.pinned ?? false)) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    filtered.forEach(note => {
      const item = document.createElement('div');

      item.className =
        'note-item' + (note.id === currentNoteId ? ' active' : '');

      const isPinned = note.pinned || false;

      item.innerHTML = `
        <button class="note-item-delete">x</button>
        <button class="note-item-pin">
          ${isPinned ? '📌' : '📍'}
        </button>

        <div class="note-item-title">
          ${isPinned ? '📌 ' : ''}${note.title || 'Untitled'}
        </div>

        <div class="note-item-date">
          ${new Date(note.updatedAt).toLocaleDateString()}
        </div>
      `;

      item.addEventListener('click', async (e) => {
        if (
          e.target.classList.contains('note-item-delete') ||
          e.target.classList.contains('note-item-pin')
        ) return;

        await switchNote(note.id);
      });

      item.querySelector('.note-item-delete').addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteNote(note.id);
      });

      item.querySelector('.note-item-pin').addEventListener('click', async (e) => {
        e.stopPropagation();

        const result = await window.electronAPI.togglePin(note.id);

        if (result.success) {
          const index = notes.findIndex(n => n.id === note.id);
          if (index !== -1) {
            notes[index].pinned = result.pinned;
          }

          renderNoteList(searchInput.value);
        }
      });

      noteList.appendChild(item);
    });
  }

  // =========================
  // SWITCH NOTE
  // =========================
  async function switchNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    currentNoteId = note.id;
    titleInput.value = note.title || '';
    textarea.value = note.content || '';
    lastSavedContent = note.content || '';

    statusEl.textContent = '';

    updateWordCount(); // ✅ ADD HERE

    renderNoteList(searchInput.value);
  }

  // =========================
  // SAVE NOTE
  // =========================
  async function saveCurrentNote() {
    if (!currentNoteId) return;

    const note = {
      id: currentNoteId,
      title: titleInput.value || 'Untitled',
      content: textarea.value,
      updatedAt: new Date().toISOString()
    };

    await window.electronAPI.saveNoteJson(note);

    lastSavedContent = textarea.value;

    const index = notes.findIndex(n => n.id === currentNoteId);
    if (index !== -1) {
      notes[index] = { ...notes[index], ...note };
    }

    renderNoteList(searchInput.value);
    statusEl.textContent = `Saved at ${new Date().toLocaleTimeString()}`;
  }

  // =========================
  // DELETE NOTE
  // =========================
  async function deleteNote(id) {
    await window.electronAPI.deleteNote(id);
    notes = notes.filter(n => n.id !== id);

    if (currentNoteId === id) {
      currentNoteId = null;
      titleInput.value = '';
      textarea.value = '';
    }

    renderNoteList(searchInput.value);
  }

  // =========================
  // AUTO SAVE + WORD COUNT
  // =========================
  textarea.addEventListener('input', () => {
    statusEl.textContent = 'Unsaved changes...';

    updateWordCount(); // ✅ ADD

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveCurrentNote, 3000);
  });

  titleInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveCurrentNote, 3000);
  });

  // =========================
  // BUTTONS
  // =========================
  saveBtn.addEventListener('click', saveCurrentNote);

  saveAsBtn.addEventListener('click', async () => {
    const result = await window.electronAPI.saveAs(textarea.value);
    if (result.success) {
      statusEl.textContent = `Saved: ${result.filePath}`;
    }
  });

  openFileBtn.addEventListener('click', async () => {
    const result = await window.electronAPI.openFile();
    if (result.success) {
      textarea.value = result.content;
      updateWordCount(); // ✅ ADD
      statusEl.textContent = `Opened: ${result.filePath}`;
    }
  });

  newNoteBtn.addEventListener('click', async () => {
    const newNote = {
      id: Date.now().toString(),
      title: 'Untitled',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false
    };

    await window.electronAPI.saveNoteJson(newNote);

    notes.unshift(newNote);
    currentNoteId = newNote.id;

    titleInput.value = '';
    textarea.value = '';

    updateWordCount(); // ✅ ADD

    renderNoteList(searchInput.value);
  });

  // =========================
  // MENU EVENTS
  // =========================
  window.electronAPI.onMenuAction('menu-new-note', () => newNoteBtn.click());
  window.electronAPI.onMenuAction('menu-open-file', () => openFileBtn.click());
  window.electronAPI.onMenuAction('menu-save', () => saveBtn.click());
  window.electronAPI.onMenuAction('menu-save-as', () => saveAsBtn.click());
});