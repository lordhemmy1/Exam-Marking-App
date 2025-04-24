// --- script.js (Updated) ---

// --- Data Manager (uses localStorage) ---
const DataManager = {
  answerKey: { objective: [], essay: [] },
  students: [],
  scores: [],

  init() {
    // load persisted data
    const ak = localStorage.getItem('answerKey');
    const sd = localStorage.getItem('studentsDB');
    const sc = localStorage.getItem('scoresDB');
    if (ak) this.answerKey = JSON.parse(ak);
    if (sd) this.students = JSON.parse(sd);
    if (sc) this.scores = JSON.parse(sc);

    // initialize UI
    renameAnswerTab();
    insertAnswerTabDescription();
    renderObjectiveKeyForm();
    renderEssayKeyForm();
    bindAnswerSaveButton();
    bindUploadHandlers();
    initDBEssaySection();
    bindStudentButtons();
    bindClearStudentsButton();
    updateStudentAnswerInfo();
    updateScoreTable();
    bindDownloadButton();

    // new marking tab bindings
    bindMarkingTab();
  },

  saveAnswerKey() { localStorage.setItem('answerKey', JSON.stringify(this.answerKey)); },
  saveStudents()   { localStorage.setItem('studentsDB', JSON.stringify(this.students)); },
  saveScores()     { localStorage.setItem('scoresDB', JSON.stringify(this.scores)); }
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

// --- Answer Tab Customization ---
function renameAnswerTab() {
  const btn = document.querySelector('.tab-button[data-tab="answer"]');
  if (btn) btn.textContent = "Teacher's Answer Tab";
}

function insertAnswerTabDescription() {
  const section = document.getElementById('answer');
  const desc = document.createElement('p');
  desc.textContent = 'Upload or manually type your objective answers into the objective form section and the essay section.';
  desc.style.fontSize = '1rem';
  section.insertBefore(desc, document.getElementById('objective-answer-container'));
}

// --- Render Answer Forms with dynamic hiding and total display ---
function renderObjectiveKeyForm() {
  const c = document.getElementById('objective-answer-form');
  c.innerHTML = '';
  const answers = DataManager.answerKey.objective || [];

  // Display total count
  let totalDisplay = document.getElementById('objective-total');
  if (!totalDisplay) {
    totalDisplay = document.createElement('div');
    totalDisplay.id = 'objective-total';
    c.parentNode.insertBefore(totalDisplay, c);
  }
  totalDisplay.textContent = `Total Objective Items: ${answers.length}`;

  // Render each
  answers.forEach(o => {
    const div = document.createElement('div');
    div.innerHTML = `<label>Q${o.questionNo}:</label> <input type="text" name="q_${o.questionNo}" value="${o.answer}" />`;
    c.appendChild(div);
  });
}

function renderEssayKeyForm() {
  const c = document.getElementById('essay-answer-form');
  c.innerHTML = '';
  const sets = DataManager.answerKey.essay || [];

  // Display total essay marks
  let totalDisplay = document.getElementById('essay-total');
  if (!totalDisplay) {
    totalDisplay = document.createElement('div');
    totalDisplay.id = 'essay-total';
    c.parentNode.insertBefore(totalDisplay, c);
  }
  const totalMarks = sets.reduce((sum, s) => sum + Number(s.mark || 0), 0);
  totalDisplay.textContent = `Total Essay Marks: ${totalMarks}`;

  // Render each
  sets.forEach(s => {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Q${s.questionNo} [${s.mark}]:</label>
      <textarea readonly>${s.answer}</textarea>
    `;
    c.appendChild(div);
  });
}

// --- Bind Teacher-Answer Save / Upload ---
// (Upload handlers and save logic remain unchanged)

// --- Students Database Tab Improvements ---
function updateStudentAnswerInfo() {
  const c = document.getElementById('student-db-reference');
  c.innerHTML = '';
  if (!DataManager.students.length) return;

  const tbl = document.createElement('table');
  tbl.id = 'student-db-table';
  tbl.innerHTML = `
    <thead>
      <tr>
        <th>Student Name</th>
        <th>Class</th>
        <th>Arm</th>
        <th>Objective Answers</th>
        <th>Essay Answers</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${DataManager.students.map((s, i) => {
        const obj = s.objectiveAnswers.join(', ');
        const essay = s.essayAnswers.map(e => (
          e.answer.startsWith('data:')
            ? `<img src="${e.answer}" style="width:50px;height:50px;"/>`
            : e.answer
        )).join(', ');
        return `
          <tr>
            <td>${s.name}</td>
            <td>${s.class}</td>
            <td>${s.arm}</td>
            <td>${obj}</td>
            <td>${essay}</td>
            <td>
              <button class="edit-student" data-index="${i}">Edit</button>
              <button class="delete-student" data-index="${i}">Delete</button>
            </td>
          </tr>
        `;
      }).join('')}
    </tbody>
  `;
  c.appendChild(tbl);
  // (Bindings for edit/delete remain unchanged)
}

// --- Marking Tab Improvements ---
function populateStudentObjectiveAnswers() {
  if (markingStudentIndex === null) {
    alert('Please search and select a student first');
    return;
  }
  const student = DataManager.students[markingStudentIndex];
  const form = document.getElementById('objective-marking-form');
  form.innerHTML = '';
  form.classList.add('two-col-form');
  DataManager.answerKey.objective.forEach(o => {
    const val = student.objectiveAnswers[o.questionNo - 1] || '';
    const div = document.createElement('div');
    div.innerHTML = `<label>Q${o.questionNo}:</label><input type="text" name="obj_q_${o.questionNo}" value="${val}" />`;
    form.appendChild(div);
  });
}

function populateStudentEssaySection() {
  const container = document.getElementById('essay-marking-container');
  container.innerHTML = '';
  const key = DataManager.answerKey.essay;
  const student = DataManager.students[markingStudentIndex];
  const tbl = document.createElement('table');
  tbl.innerHTML = `
    <thead>
      <tr>
        <th>Teacher's Answer</th>
        <th>Student's Answer</th>
        <th>Awarded Mark</th>
        <th>Tools</th>
      </tr>
    </thead>
    <tbody>
      ${key.map(k => {
        const stud = student.essayAnswers.find(e => e.questionNo === k.questionNo) || {};
        const ans = stud.answer || '';
        const display = ans.startsWith('data:')
          ? `<img src="${ans}" style="width:100px;height:100px;"/>`
          : ans;
        return `
          <tr data-qno="${k.questionNo}" data-mark="${k.mark}" data-score="">
            <td>Q${k.questionNo} [${k.mark}]: ${k.answer}</td>
            <td>${display}</td>
            <td class="awarded-mark"></td>
            <td>
              <button class="btn-correct">✓</button>
              <button class="btn-incorrect">✗</button>
              <button class="btn-custom">☆</button>
              <button class="btn-erase">🗑</button>
            </td>
          </tr>
        `;
      }).join('')}
    </tbody>
  `;
  container.appendChild(tbl);

  const details = document.getElementById('essay-scoring-details');
  details.innerHTML = '';

  // Add sum button
  let sumBtn = document.getElementById('sum-essay-score-btn');
  if (!sumBtn) {
    sumBtn = document.createElement('button');
    sumBtn.id = 'sum-essay-score-btn';
    sumBtn.textContent = 'Sum Essay Score';
    details.parentNode.insertBefore(sumBtn, details.nextSibling);
  }

  tbl.querySelectorAll('tr[data-qno]').forEach(row => {
    const awardCell = row.querySelector('.awarded-mark');
    const updateScore = () => {
      const scores = Array.from(tbl.querySelectorAll('tr[data-qno]'))
        .map(r => parseFloat(r.dataset.score) || 0);
      currentEssayScore = scores.reduce((a,b) => a+b, 0);
      const totalTeacher = DataManager.answerKey.essay.reduce((sum,s) => sum + Number(s.mark), 0);
      details.textContent = `Essay Score: ${currentEssayScore} / ${totalTeacher}`;
    };

    row.querySelector('.btn-correct').addEventListener('click', () => {
      row.dataset.score = row.dataset.mark;
      awardCell.textContent = row.dataset.mark;
      updateScore();
    });
    row.querySelector('.btn-incorrect').addEventListener('click', () => {
      row.dataset.score = 0;
      awardCell.textContent = '0';
      updateScore();
    });
    row.querySelector('.btn-custom').addEventListener('click', () => {
      if (row.querySelector('.custom-input')) return;
      const inp = document.createElement('input'); inp.type = 'number'; inp.className = 'custom-input'; inp.placeholder = 'Mark';
      const done = document.createElement('button'); done.textContent = 'Done';
      done.addEventListener('click', () => {
        const v = parseFloat(inp.value);
        if (!isNaN(v)) {
          row.dataset.score = v;
          awardCell.textContent = v;
          updateScore();
          inp.remove(); done.remove();
        }
      });
      row.lastElementChild.append(inp, done);
    });
    row.querySelector('.btn-erase').addEventListener('click', () => {
      delete row.dataset.score;
      awardCell.textContent = '';
      updateScore();
    });
  });

  sumBtn.onclick = () => {
    // trigger score update by simulating a control click
    tbl.querySelector('tr[data-qno]').dispatchEvent(new Event('click'));
  };
}

// --- Score Download Button ---
function bindDownloadButton() {
  const container = document.querySelector('.score-download');
  container.innerHTML = `
    <select id="download-format">
      <option value="csv">CSV</option>
      <option value="xlsx">Excel (XLSX)</option>
      <option value="pdf">PDF</option>
      <option value="doc">Word (.doc)</option>
    </select>
    <button id="download-score-btn">Download</button>
  `;
  document.getElementById('download-score-btn')
    .addEventListener('click', downloadScores);
}

function downloadScores() {
  const fmt = document.getElementById('download-format').value;
  const data = DataManager.scores;
  if (!data.length) return alert('No scores to download');

  if (fmt === 'csv') {
    const header = ['Name','Class','Arm','Objective','Essay','Total'];
    const rows = data.map(r => [r.name, r.class, r.arm, r.objective, r.essay, r.total]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'scores.csv'; a.click();
  } else if (fmt === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Scores');
    XLSX.writeFile(wb, 'scores.xlsx');
  } else if (fmt === 'pdf') {
    window.print();
  } else if (fmt === 'doc') {
    const tbl = document.querySelector('#score-table');
    const html = `<html><body>${tbl.outerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'scores.doc'; a.click();
  }
}

// initialize
window.addEventListener('DOMContentLoaded', () => DataManager.init());
