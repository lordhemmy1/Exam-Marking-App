// Show the corresponding tab
function showTab(tabId) {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

// Handle file upload for Objective answers (Answer Tab)
function uploadObjFile(event) {
    const file = event.target.files[0];
    if (file) {
        readExcelFile(file, (data) => {
            const objForm = document.getElementById('obj-form');
            objForm.innerHTML = ''; // Clear previous form
            data.forEach((answer, index) => {
                if (index < 100) { // Maximum 100 questions
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = `Question ${index + 1}`;
                    input.value = answer;
                    objForm.appendChild(input);
                    objForm.appendChild(document.createElement('br'));
                }
            });
        });
    }
}

// Handle file upload for Essay answers (Answer Tab)
function uploadEssayFile(event) {
    const file = event.target.files[0];
    if (file) {
        readExcelFile(file, (data) => {
            const essayForm = document.getElementById('essay-form');
            essayForm.innerHTML = ''; // Clear previous form
            for (let i = 1; i <= 5; i++) {
                const questionDiv = document.createElement('div');
                questionDiv.innerHTML = `<h4>Question ${i}</h4>`;
                for (let j = 1; j <= 4; j++) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = `${i}${String.fromCharCode(96 + j)} (Sub-question)`;
                    questionDiv.appendChild(input);
                    questionDiv.appendChild(document.createElement('br'));
                }
                essayForm.appendChild(questionDiv);
            }
        });
    }
}

// Handle file upload for Objective answers (Marking Tab)
function uploadMarkObjFile(event) {
    const file = event.target.files[0];
    if (file) {
        readExcelFile(file, (data) => {
            const markObjForm = document.getElementById('mark-obj-form');
            markObjForm.innerHTML = ''; // Clear previous form
            data.forEach((answer, index) => {
                if (index < 100) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = `Student Answer ${index + 1}`;
                    input.value = answer;
                    markObjForm.appendChild(input);
                    markObjForm.appendChild(document.createElement('br'));
                }
            });
        });
    }
}

// Handle file upload for Essay answers (Marking Tab)
function uploadMarkEssayFile(event) {
    const file = event.target.files[0];
    if (file) {
        readExcelFile(file, (data) => {
            const markEssayForm = document.getElementById('mark-essay-form');
            markEssayForm.innerHTML = ''; // Clear previous form
            for (let i = 1; i <= 5; i++) {
                const questionDiv = document.createElement('div');
                questionDiv.innerHTML = `<h4>Question ${i}</h4>`;
                for (let j = 1; j <= 4; j++) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = `${i}${String.fromCharCode(96 + j)} (Student Answer)`;
                    questionDiv.appendChild(input);
                    questionDiv.appendChild(document.createElement('br'));
                }
                markEssayForm.appendChild(questionDiv);
            }
        });
    }
}

// Read Excel/CSV files
function readExcelFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        callback(jsonData);
    };
    reader.readAsBinaryString(file);
}

// Display score table
function displayScores() {
    const scores = JSON.parse(localStorage.getItem('scores')) || [];
    const scoreList = document.getElementById('score-list');
    scoreList.innerHTML = '';

    scores.forEach(score => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${score.studentName}</td>
            <td>${score.studentClass}</td>
            <td>${score.studentArm}</td>
            <td>${score.objScore}</td>
            <td>${score.essayScore}</td>
            <td>${score.totalScore}</td>
        `;
        scoreList.appendChild(row);
    });
}

// Initial display of the first tab (Answer Tab)
document.getElementById('answer-tab').classList.add('active');
