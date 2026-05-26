window.addEventListener('DOMContentLoaded', async () => {
  const textarea = document.getElementById('note');
  const titleInput = document.getElementById('note-title');
  const saveBtn = document.getElementById('save');
  const saveAsBtn = document.getElementById('save-as');
  const openFileBtn = document.getElementById('open-file');
  const newNoteBtn = document.getElementById('new-note');
  const noteList = document.getElementById('note-list');
  const statusEl = document.getElementById('save_status');

  // STATE
  let notes = [];
  let currentNoteId = null;
  let lastSavedContent = '';
  let debounceTimer = null;

  // LOAD NOTES ON STARTUP
  notes = await window.electronAPI.getNotes();

  if (notes.length > 0) {
    const mostRecent = notes.reduce((a, b) =>
      new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b
    );
    await switchNote(mostRecent.id);
  } else {
    newNoteBtn.click();
  }

  renderNoteList();

  // RENDER LIST
  function renderNoteList() {
    noteList.innerHTML = '';

    notes.forEach(note => {
      const item = document.createElement('div');
      item.className =
        'note-item' + (note.id === currentNoteId ? ' active' : '');

      item.innerHTML = `
        <button class="note-item-delete" data-id="${note.id}">x</button>
        <div class="note-item-title">${note.title || 'Untitled'}</div>
        <div class="note-item-date">
          ${new Date(note.updatedAt).toLocaleDateString()}
        </div>
      `;

      item.addEventListener('click', async (e) => {
        if (e.target.classList.contains('note-item-delete')) return;
        await switchNote(note.id);
      });

      item.querySelector('.note-item-delete').addEventListener(
        'click',
        async (e) => {
          e.stopPropagation();
          await deleteNote(note.id);
        }
      );

      noteList.appendChild(item);
    });
  }

  // SWITCH NOTE
  async function switchNote(id) {
    if (textarea.value !== lastSavedContent) {
      const result = await window.electronAPI.newNote();
      if (!result.confirmed) return;
    }

    const note = notes.find(n => n.id === id);
    if (!note) return;

    currentNoteId = note.id;
    titleInput.value = note.title || '';
    textarea.value = note.content || '';
    lastSavedContent = note.content || '';
    statusEl.textContent = '';

    renderNoteList();
  }

  // SAVE CURRENT NOTE
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
      notes[index] = {
        ...notes[index],
        ...note
      };
    }

    renderNoteList();
    statusEl.textContent = 'Saved ✔';
  }

  // DELETE NOTE
  async function deleteNote(id) {
    const result = await window.electronAPI.newNote();
    if (!result.confirmed) return;

    await window.electronAPI.deleteNote(id);
    notes = notes.filter(n => n.id !== id);

    if (currentNoteId === id) {
      currentNoteId = null;
      titleInput.value = '';
      textarea.value = '';
      lastSavedContent = '';
    }

    renderNoteList();
  }


  // AUTO-SAVE (DEBOUNCE)

  textarea.addEventListener('input', () => {
    statusEl.textContent = 'Unsaved changes...';
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveCurrentNote, 3000);
  });

  titleInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveCurrentNote, 3000);
  });

  // BUTTONS
  saveBtn.addEventListener('click', async () => {
    await saveCurrentNote();
    alert('Saved!');
  });

  newNoteBtn.addEventListener('click', async () => {
    const newNote = {
      id: Date.now().toString(),
      title: 'Untitled',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await window.electronAPI.saveNoteJson(newNote);

    notes.unshift(newNote);
    currentNoteId = newNote.id;

    titleInput.value = '';
    textarea.value = '';
    lastSavedContent = '';

    renderNoteList();
  });

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
      statusEl.textContent = `Opened: ${result.filePath}`;
    }
  });

  // MENU EVENTS
  window.electronAPI.onMenuAction('menu-new-note', () => {
    newNoteBtn.click();
  });

  window.electronAPI.onMenuAction('menu-open-file', () => {
    openFileBtn.click();
  });

  window.electronAPI.onMenuAction('menu-save', () => {
    saveBtn.click();
  });

  window.electronAPI.onMenuAction('menu-save-as', () => {
    saveAsBtn.click();
  });
});