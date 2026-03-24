window.addEventListener('DOMContentLoaded', async() => {
    const textarea = document.getElementById('note');
    const saveBtn = document.getElementById('save');

    const savedNote= await window.electronAPI.loadNote();
    textarea.value= savedNote;

    saveBtn.addEventListener('click',async () => {
        await window.electronAPI.saveNote(textarea.value);
        alert('Note saved successfully!')
    });


});