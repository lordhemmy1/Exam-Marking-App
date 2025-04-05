// Show the correct tab
function showTab(tabId) {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
}

// Populate the Objective Answer Form (1-100)
function populateObjectiveForm() {
    const objForm = document.getElementById('obj-answers-form');
    objForm.innerHTML = '';  // Clear any previous form elements

    for (let i = 1; i <= 100; i++) {
        objForm.innerHTML += `
            <label for="obj${i}">Answer ${i}:</label>
            <input type="text" id="obj${i}" name="obj${i}" /><br>
        `;
    }
}

// Populate the Essay Answer Form (1-5 with sub-questions)
function populateEssayForm() {
    const essayForm = document.getElementById('essay-answers-form');
    essayForm.innerHTML = '';  // Clear any previous form elements

    for (let i = 1; i <= 5; i++) {
        essayForm.innerHTML += `
            <label for="essay${i}">Question ${i}:</label><br>
            <label for="essay${i}a">${i}a:</label>
            <input type="text" id="essay${i}a" name="essay${i}a" /><br>
            <label for="essay${i}b">${i}b:</label>
            <input type="text" id="essay${i}b" name="essay${i}b" /><br>
            <label for="essay${i}c">${i}c:</label>
            <input type="text" id="essay${i}c" name="essay${i}c" /><br>
            <label for="essay${i}d">${i}d:</label>
            <input type="text" id="essay${i}d" name="essay${i}d" /><br><br>
        `;
    }
}

// Handle file upload and populate answers for Objective Questions
function uploadObjectiveAnswers(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        // Handle file parsing (you can use libraries like SheetJS to parse CSV/XLSX files)
        alert('File uploaded successfully');
    };
    reader.readAsText(file);
}

// Handle file upload and populate answers for Essay Questions
function uploadEssayAnswers(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        // Handle file parsing (you can use libraries like SheetJS to parse CSV/XLSX files)
        alert('File uploaded successfully');
    };
    reader.readAsText(file);
}

// Save answers into localStorage
function saveAnswers() {
    const answers = {
        objective: {},
        essay: {}
    };

    // Collect Objective answers
    for (let i = 1; i <= 100; i++) {
        answers.objective[`obj${i}`] = document.getElementById(`obj${i}`).value;
    }

    // Collect Essay answers
    for (let i = 1; i <= 5; i++) {
        answers.essay[`essay${i}a`] = document.getElementById(`essay${i}a`).value;
        answers.essay[`essay${i}b`] = document.getElementById(`essay${i}b`).value;
        answers.essay[`essay${i}c`] = document.getElementById(`essay${i}c`).value;
        answers.essay[`essay${i}d`] = document.getElementById(`essay${i}d`).value;
    }

    localStorage.setItem('answers', JSON.stringify(answers));
    alert('Answers saved successfully');
}

// Mark answers based on stored data
function markAnswers() {
    const savedAnswers = JSON.parse(localStorage.getItem('answers'));

    if (!savedAnswers) {
        alert('No answers saved to mark against!');
        return;
    }

    // Perform marking logic and save to localStorage
    // Assuming simple scoring for now

    alert('Answers marked successfully');
}

// Download scores as JSON file
function downloadScores() {
    const scores = JSON.parse(localStorage.getItem('scores')) || [];
    const blob = new Blob([JSON.stringify(scores, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'scores.json';
    link.click();
}

// Initially populate forms
populateObjectiveForm();
populateEssayForm();
