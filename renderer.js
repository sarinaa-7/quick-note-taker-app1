
window.addEventListener('DOMContentLoaded', async () => {
  const textarea = document.getElementById('note');
  const saveBtn = document.getElementById('save');
  const statusEl = document.getElementById('save_status');

  let lastSavedText = '';
  let currentFilePath = null;

  const savedNote = await window.electronAPI.loadNote();
  textarea.value = savedNote;
  lastSavedText = textarea.value;

  //save
  // UPDATED: Save button now uses currentFilePath
  saveBtn.addEventListener('click', async () => {
    statusEl.textContent = "Clicked!"
    try {
      const result = await window.electronAPI.smartSave(textarea.value, currentFilePath);
      lastSavedText = textarea.value;
      currentFilePath = result.filePath;
      statusEl.textContent = `Saved to: ${result.filePath}`;
      alert('The note saved!');
    } catch (err) {
      console.error('Save failed:', err);
      statusEl.textContent = 'Save failed!';
    }
  });

  //save as 

  saveAsBtn.addEventListener('click', async () => {
    const result = await window.electronAPI.saveAs(textarea.value);

    if (result.success) {
      lastSavedText = textarea.value;
      currnetFilePath = result.filePath; //new
      statusEl.textContent = `Saved to: ${result.filePath}`;
      statusEl.style.color = 'green';
    } else {
      statusEl.textContent = 'Save As cancelled.';
      statusEl.style.color = 'gray';
    }
  });


  const newNoteBtn = document.getElementById('new-note');

  newNoteBtn.addEventListener('click', async () => {

    if (textarea.value === lastSavedText) {
      textarea.value = '';
      lastSavedText = '';
      statusEl.textContent = 'New note started.';
      return;
    }


    const result = await window.electronAPI.newNote();

    if (result) {
      textarea.value = '';
      lastSavedText = '';
      statusEl.textContent = 'New note started.';
    } else {
      statusEl.textContent = 'New note cancelled.';
    }
  });

  const openFileBtn = document.getElementById('open-file');

  openFileBtn.addEventListener('click', async () => {
    const result = await window.electronAPI.openFile();

    if (result.success) {
      textarea.value = result.content;
      lastSavedText = result.content;
      currentFilePath = result.filePath;
      statusEl.textContent = `Opened: ${result.filePath}`;
    } else {
      statusEl.textContent = 'Open cancelled.';
    }
  });


  const deleteBtn = document.getElementById('deleteBtn');

  deleteBtn.addEventListener('click', async () => {
    if (confirm('Really delete ALL notes? This cannot be undone!')) {
      try {
        await window.electronAPI.deleteNote();
        textarea.value = '';
        lastSavedText = '';
        statusEl.textContent = 'All notes deleted!';
        statusEl.style.color = 'red';
      } catch (err) {
        alert('Delete failed!');
      }
    }
    async function autoSave() {
      const currentText = textarea.value;

      if (currentText === lastSavedText) {
        statusEl.textContent = 'No changes to save';
        return;
      }

      try {
        await window.electronAPI.saveNote(currentText);
        lastSavedText = currentText;

        const now = new Date().toLocaleTimeString();
        statusEl.textContent = `Auto-saved at ${now}`;
      } catch (err) {
        console.error('Auto-save failed:', err);
        statusEl.textContent = 'Auto-save error!';
      }
    }

  });

});