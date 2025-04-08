// --- Tab Switching ---
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- Global Data Structures ---
const objectiveLimit = 100;  // maximum number for objective answers
const essayLimit = 20;       // maximum number of essay questions
let answerData = { objectives: {}, essays: {} }; // Stores correct answers entered in Answer Tab
let studentData = []; // Stores students' marking records (max 250 records ideally)

// --- Dynamic Form Creation ---
// Create initial objective form (for answers and marking)
function createObjectiveForm(container, prefix) {
  container.innerHTML = '';
  // Start with 10 rows
  for (let i = 1; i <= 10; i++) {
    const div = document.createElement('div');
    div.innerHTML = `<label>${i}.</label>
      <input type="text" id="${prefix}-${i}" maxlength="1">`;
    container.appendChild(div);
  }
}
// Create dynamic essay form (up to essayLimit)
function createEssayForm(container, prefix) {
  container.innerHTML = '';
  for (let i = 1; i <= essayLimit; i++) {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Q${i}</label>
      <input type="text" id="${prefix}-qn-${i}" placeholder="Question No">
      <input type="number" id="${prefix}-mark-${i}" placeholder="Mark">
      <textarea id="${prefix}-ans-${i}" placeholder="Answer"></textarea>
    `;
    container.appendChild(div);
  }
}

// --- Save Answer Tab Data ---
// Save teacher's answers (from Answer Tab) for both objective and essay forms.
function saveAnswerData() {
  answerData.objectives = {};
  answerData.essays = {};
  // Objective answers
  for (let i = 1; i <= objectiveLimit; i++) {
    const input = document.getElementById(`objective-answer-${i}`);
    if (input && input.value.trim()) {
      answerData.objectives[i] = input.value.trim().toUpperCase();
    }
  }
  // Essay answers; using question number as key
  for (let i = 1; i <= essayLimit; i++) {
    const qn = document.getElementById(`essay-answer-qn-${i}`);
    const mark = document.getElementById(`essay-answer-mark-${i}`);
    const ans = document.getElementById(`essay-answer-ans-${i}`);
    if (qn && mark && ans && qn.value && ans.value) {
      answerData.essays[qn.value.trim()] = {
        mark: parseInt(mark.value),
        answer: ans.value.trim().toLowerCase()
      };
    }
  }
  alert('Answer data saved.');
}

// --- Compare Answers in Marking Tab ---
// Compare the student's answers (entered in the Marking Tab forms) against the stored answerData.
function compareAnswers() {
  const name = document.getElementById('student-name').value;
  const cls = document.getElementById('student-class').value;
  const arm = document.getElementById('student-arm').value;
  
  let scoreObj = 0, scoreEssay = 0;
  // Compare objective answers
  for (let i = 1; i <= objectiveLimit; i++) {
    const input = document.getElementById(`objective-marking-${i}`);
    if (input && input.value.trim()) {
      const stuAns = input.value.trim().toUpperCase();
      if (answerData.objectives[i] && stuAns === answerData.objectives[i]) {
        scoreObj++;
      }
    }
  }
  // Compare essay answers (simple keyword matching)
  for (let i = 1; i <= essayLimit; i++) {
    const qn = document.getElementById(`essay-marking-qn-${i}`);
    const mark = document.getElementById(`essay-marking-mark-${i}`);
    const ans = document.getElementById(`essay-marking-ans-${i}`);
    if (qn && mark && ans && qn.value && ans.value) {
      const key = qn.value.trim();
      const model = answerData.essays[key];
      if (model && ans.value.trim().toLowerCase().includes(model.answer)) {
        scoreEssay += model.mark;
      }
    }
  }
  
  const total = scoreObj + scoreEssay;
  // Add record; (if over 250 records, you could warn or remove oldest entries)
  studentData.push({ name, class: cls, arm, scoreObj, scoreEssay, total });
  updateScoreTable();
  alert('Score saved and added to table.');
}

// --- Update Score Table ---
function updateScoreTable() {
  const tbody = document.querySelector('#score-table tbody');
  tbody.innerHTML = '';
  studentData.forEach(s => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${s.name}</td>
      <td>${s.class}</td>
      <td>${s.arm}</td>
      <td>${s.scoreObj}</td>
      <td>${s.scoreEssay}</td>
      <td>${s.total}</td>
    `;
    tbody.appendChild(row);
  });
}

// --- Reset and Download ---
function resetScores() {
  if (confirm('Are you sure you want to reset all scores?')) {
    studentData = [];
    updateScoreTable();
  }
}
function downloadScores(type) {
  if (type === 'csv') {
    let content = 'Name,Class,Arm,Objective,Essay,Total\n';
    studentData.forEach(s => {
      content += `${s.name},${s.class},${s.arm},${s.scoreObj},${s.scoreEssay},${s.total}\n`;
    });
    downloadFile('scores.csv', content);
  } else if (type === 'doc') {
    let content = '<table border="1"><tr><th>Name</th><th>Class</th><th>Arm</th><th>Objective</th><th>Essay</th><th>Total</th></tr>';
    studentData.forEach(s => {
      content += `<tr>
        <td>${s.name}</td>
        <td>${s.class}</td>
        <td>${s.arm}</td>
        <td>${s.scoreObj}</td>
        <td>${s.scoreEssay}</td>
        <td>${s.total}</td>
      </tr>`;
    });
    content += '</table>';
    const blob = new Blob(['<html><body>' + content + '</body></html>'], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scores.doc';
    a.click();
    URL.revokeObjectURL(url);
  } else if (type === 'xlsx') {
    // Using SheetJS to create an XLSX file from JSON data:
    const ws = XLSX.utils.json_to_sheet(studentData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scores");
    XLSX.writeFile(wb, "scores.xlsx");
  }
}
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- File Upload Handling with SheetJS ---
// This function uses SheetJS to parse the file and auto-populate the respective form.
function handleFileUpload(event, type, prefix) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (type === 'objective') {
      jsonData.forEach((row, idx) => {
        // row[0] should be question number and row[1] is answer
        if (row[0] && row[1] && idx < objectiveLimit) {
          const input = document.getElementById(`${prefix}-${row[0]}`);
          if (input) input.value = row[1];
        }
      });
    } else if (type === 'essay') {
      jsonData.forEach((row, idx) => {
        // row[0] = Question No., row[1] = Mark, row[2] = Answer
        if (row[0] && row[1] && row[2] && idx < essayLimit) {
          const qn = document.getElementById(`${prefix}-qn-${idx + 1}`);
          const mark = document.getElementById(`${prefix}-mark-${idx + 1}`);
          const ans = document.getElementById(`${prefix}-ans-${idx + 1}`);
          if (qn && mark && ans) {
            qn.value = row[0];
            mark.value = row[1];
            ans.value = row[2];
          }
        }
      });
    }
  };
  reader.readAsArrayBuffer(file);
}

// --- Attach File Upload Listeners ---
function setupUploadListeners() {
  document.getElementById('upload-objective-answer').addEventListener('change', 
    (e) => handleFileUpload(e, 'objective', 'objective-answer'));
  document.getElementById('upload-essay-answer').addEventListener('change', 
    (e) => handleFileUpload(e, 'essay', 'essay-answer'));
  document.getElementById('upload-objective-marking').addEventListener('change', 
    (e) => handleFileUpload(e, 'objective', 'objective-marking'));
  document.getElementById('upload-essay-marking').addEventListener('change', 
    (e) => handleFileUpload(e, 'essay', 'essay-marking'));
}

// --- Initialize Forms and Upload Listeners on Page Load ---
window.onload = () => {
  createObjectiveForm(document.getElementById('objective-answer-form'), 'objective-answer');
  createObjectiveForm(document.getElementById('objective-marking-form'), 'objective-marking');
  createEssayForm(document.getElementById('essay-answer-form'), 'essay-answer');
  createEssayForm(document.getElementById('essay-marking-form'), 'essay-marking');
  setupUploadListeners();
};
