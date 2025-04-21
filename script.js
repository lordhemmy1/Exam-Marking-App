// script.js

// --- Data Manager (uses localStorage) ---
const DataManager = {
  answerKey: { objective: [], essay: [] },
  students: [],
  scores: [],
  init() {
    const ak = localStorage.getItem('answerKey');
    const sd = localStorage.getItem('studentsDB');
    const sc = localStorage.getItem('scoresDB');
    if (ak) this.answerKey = JSON.parse(ak);
    if (sd) this.students = JSON.parse(sd);
    if (sc) this.scores = JSON.parse(sc);
    renderObjectiveKeyForm();
    renderEssayKeyForm();
    renderDBEssayForm();
    updateDBReference();
    updateScoreTable();
  },
  saveAnswerKey() {
    localStorage.setItem('answerKey', JSON.stringify(this.answerKey));
  },
  saveStudents() {
    localStorage.setItem('studentsDB', JSON.stringify(this.students));
  },
  saveScores() {
    localStorage.setItem('scoresDB', JSON.stringify(this.scores));
  }
};

// --- Tab Navigation ---
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- Answer‐Key Upload & Render ---
document.getElementById('upload-objective-answer')
  .addEventListener('change', handleObjectiveKeyUpload);

document.getElementById('upload-essay-answer')
  .addEventListener('change', handleEssayKeyUpload);

function handleObjectiveKeyUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const data = new Uint8Array(evt.target.result);
    const wb = XLSX.read(data, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    // read as array of arrays, skip header
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    rows.shift();
    DataManager.answerKey.objective = rows.map(r => ({
      questionNo: r[0],
      answer: String(r[1] || '').trim()
    }));
    DataManager.saveAnswerKey();
    renderObjectiveKeyForm();
    renderDBEssayForm();
  };
  reader.readAsArrayBuffer(file);
}

function handleEssayKeyUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const data = new Uint8Array(evt.target.result);
    const wb = XLSX.read(data, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    rows.shift();
    DataManager.answerKey.essay = rows.map(r => ({
      questionNo: r[0],
      mark: Number(r[1] || 0),
      answer: String(r[2] || '')
    }));
    DataManager.saveAnswerKey();
    renderEssayKeyForm();
    renderDBEssayForm();
  };
  reader.readAsArrayBuffer(file);
}

function renderObjectiveKeyForm() {
  const c = document.getElementById('objective-answer-form');
  c.innerHTML = '';
  DataManager.answerKey.objective.forEach(item => {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Q${item.questionNo}: </label>
      <input type="text" name="q_${item.questionNo}" value="${item.answer}" />
    `;
    c.appendChild(div);
  });
}

function renderEssayKeyForm() {
  const c = document.getElementById('essay-answer-form');
  c.innerHTML = '';
  DataManager.answerKey.essay.forEach(item => {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Q${item.questionNo} (Max ${item.mark}): </label>
      <textarea name="ans_${item.questionNo}" disabled>${item.answer}</textarea>
    `;
    c.appendChild(div);
  });
}

// update DB form with essay fields (student‐side)
function renderDBEssayForm() {
  const c = document.getElementById('db-essay-form');
  c.innerHTML = '';
  DataManager.answerKey.essay.forEach(item => {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Q${item.questionNo} Answer:</label>
      <textarea id="db-essay-q${item.questionNo}"></textarea>
    `;
    c.appendChild(div);
  });
}

// Save key from form into DataManager
function saveAnswerData() {
  // objective
  const inputs = document.querySelectorAll('#objective-answer-form input');
  DataManager.answerKey.objective = Array.from(inputs).map(i => ({
    questionNo: i.name.split('_')[1],
    answer: i.value.trim()
  }));
  // essay keys already in DataManager; no changes here
  DataManager.saveAnswerKey();
  alert('Answer key saved.');
  renderDBEssayForm();
}

// --- Students DB ---
function saveStudentData() {
  const name = document.getElementById('db-student-name').value.trim();
  const cls  = document.getElementById('db-student-class').value.trim();
  const arm  = document.getElementById('db-student-arm').value.trim();
  if (!name || !cls || !arm) {
    alert('Enter Name, Class & Arm.');
    return;
  }
  // objective answers (comma-separated)
  const objRaw = document.getElementById('db-objective-answer').value.trim();
  const objArr = objRaw.split(',').map(s => s.trim());
  // essay answers
  const essayArr = DataManager.answerKey.essay.map(item => {
    const ta = document.getElementById(`db-essay-q${item.questionNo}`);
    return ta ? ta.value.trim() : '';
  });
  DataManager.students.push({
    name, class: cls, arm,
    objectiveAnswers: objArr,
    essayAnswers: essayArr
  });
  DataManager.saveStudents();
  updateDBReference();
  alert('Student saved.');
  document.getElementById('db-student-form').reset();
}

function updateDBReference() {
  const c = document.getElementById('student-db-reference');
  c.innerHTML = '';
  if (!DataManager.students.length) return;
  const tbl = document.createElement('table');
  tbl.innerHTML = `
    <thead><tr><th>Name</th><th>Class</th><th>Arm</th></tr></thead>
    <tbody>
      ${DataManager.students.map(s => `
        <tr><td>${s.name}</td><td>${s.class}</td><td>${s.arm}</td></tr>
      `).join('')}
    </tbody>
  `;
  c.appendChild(tbl);
}

// --- Marking Tab ---
let currentStudent = null;
let currentObjectiveScore = 0;

document.getElementById('upload-student-btn')
  .addEventListener('click', loadStudentForMarking);

function loadStudentForMarking() {
  const name = document.getElementById('student-name').value.trim();
  const cls  = document.getElementById('student-class').value.trim();
  const arm  = document.getElementById('student-arm').value.trim();
  currentStudent = DataManager.students.find(s =>
    s.name===name && s.class===cls && s.arm===arm
  );
  if (!currentStudent) {
    alert('Student not found.');
    return;
  }
  // render objective section
  const cObj = document.getElementById('objective-marking-form');
  cObj.innerHTML = '';
  DataManager.answerKey.objective.forEach((item,i) => {
    const stuAns = currentStudent.objectiveAnswers[i] || '';
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Q${item.questionNo}:</label>
      <span>Correct: ${item.answer}</span>
      <span>Student: ${stuAns}</span>
    `;
    cObj.appendChild(div);
  });
  document.getElementById('objective-marking-details').innerText = '';
  // render essay section
  const cEs = document.getElementById('essay-marking-form');
  cEs.innerHTML = '';
  DataManager.answerKey.essay.forEach((item,i) => {
    const stuAns = currentStudent.essayAnswers[i] || '';
    const div = document.createElement('div');
    div.innerHTML = `
      <p>Q${item.questionNo} (Max ${item.mark}):</p>
      <blockquote>${stuAns}</blockquote>
      <label>Mark awarded:</label>
      <input type="number" name="mark_${item.questionNo}" max="${item.mark}" min="0" />
    `;
    cEs.appendChild(div);
  });
}

function markObjectiveOnly() {
  if (!currentStudent) { alert('Load a student first.'); return; }
  let score = 0;
  DataManager.answerKey.objective.forEach((item,i) => {
    const stuAns = (currentStudent.objectiveAnswers[i]||'').toUpperCase();
    if (stuAns === String(item.answer).toUpperCase()) score++;
  });
  currentObjectiveScore = score;
  document.getElementById('objective-marking-details')
    .innerText = `Objective Score: ${score} / ${DataManager.answerKey.objective.length}`;
}

function finalizeMarking() {
  if (currentObjectiveScore == null) {
    alert('Please mark objective first.');
    return;
  }
  // sum essay
  let essayScore = 0;
  DataManager.answerKey.essay.forEach(item => {
    const val = parseFloat(
      document.querySelector(`input[name="mark_${item.questionNo}"]`).value
    )||0;
    essayScore += val;
  });
  const total = currentObjectiveScore + essayScore;
  DataManager.scores.push({
    name: currentStudent.name,
    class: currentStudent.class,
    arm: currentStudent.arm,
    objective: currentObjectiveScore,
    essay: essayScore,
    total
  });
  DataManager.saveScores();
  updateScoreTable();
  document.getElementById('marking-notification')
    .innerText = `Saved: Obj ${currentObjectiveScore}, Essay ${essayScore}, Total ${total}`;
}

// --- Score Tab ---
function updateScoreTable() {
  const tbody = document.querySelector('#score-table tbody');
  tbody.innerHTML = '';
  DataManager.scores.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.name}</td><td>${r.class}</td><td>${r.arm}</td>
      <td>${r.objective}</td><td>${r.essay}</td><td>${r.total}</td>
    `;
    tbody.appendChild(tr);
  });
}

function resetScores() {
  if (!confirm('Clear all scores?')) return;
  DataManager.scores = [];
  DataManager.saveScores();
  updateScoreTable();
}

function resetAllData() {
  if (!confirm('This will wipe EVERYTHING and reload. Continue?')) return;
  localStorage.clear();
  location.reload();
}

// --- Download Utilities ---
function downloadCSV() {
  if (!DataManager.scores.length) { alert('No scores to download.'); return; }
  const headers = ['Name','Class','Arm','Objective','Essay','Total'];
  const rows = DataManager.scores.map(r =>
    [r.name,r.class,r.arm,r.objective,r.essay,r.total]
  );
  const csv = [headers.join(','), ...rows.map(r=>r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'scores.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadXLSX() {
  if (!DataManager.scores.length) { alert('No scores to download.'); return; }
  const ws = XLSX.utils.json_to_sheet(DataManager.scores);
  const wb = { Sheets: { 'Scores': ws }, SheetNames: ['Scores'] };
  XLSX.writeFile(wb, 'scores.xlsx');
}

function downloadDOC() {
  if (!DataManager.scores.length) { alert('No scores to download.'); return; }
  const html = `
    <table border="1">
      <tr><th>Name</th><th>Class</th><th>Arm</th>
          <th>Objective</th><th>Essay</th><th>Total</th></tr>
      ${DataManager.scores.map(r=>`
        <tr>
          <td>${r.name}</td><td>${r.class}</td><td>${r.arm}</td>
          <td>${r.objective}</td><td>${r.essay}</td><td>${r.total}</td>
        </tr>
      `).join('')}
    </table>
  `;
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'scores.doc';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadScores(type) {
  if (type === 'csv') downloadCSV();
  else if (type === 'xlsx') downloadXLSX();
  else if (type === 'doc') downloadDOC();
}

// --- Init on Load ---
window.addEventListener('DOMContentLoaded', () => {
  DataManager.init();
});
