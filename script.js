// script.js

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
    populateStudentSelect();
    bindMarkingTabButtons();
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

// --- Temporary State ---
let editingIndex = null;
let currentStudent = null;
let currentObjectiveScore = 0;
let currentEssayScores = [];
let currentEssayScore = 0;

// --- Tab Navigation ---
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- Teacher's Answer Tab Customization ---
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

// --- Render Answer Forms ---
function renderObjectiveKeyForm() {
  const c = document.getElementById('objective-answer-form');
  c.innerHTML = '';
  c.classList.add('two-col-form');
  const count = Math.max(DataManager.answerKey.objective.length, 50);
  for (let i = 1; i <= count; i++) {
    const existing = DataManager.answerKey.objective.find(o => Number(o.questionNo) === i);
    const ans = existing ? existing.answer : '';
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Q${i}:</label>
      <input type="text" name="q_${i}" value="${ans}" />
    `;
    c.appendChild(div);
  }
}

function renderEssayKeyForm() {
  const c = document.getElementById('essay-answer-form');
  c.innerHTML = '';
  const count = 20;
  for (let i = 1; i <= count; i++) {
    const existing = DataManager.answerKey.essay[i - 1] || {};
    const qNo = existing.questionNo || '';
    const mark = existing.mark || '';
    const ans = existing.answer || '';
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Set ${i}:</label>
      <input type="text" name="qno_${i}" placeholder="Question No." value="${qNo}" />
      <input type="number" name="mark_${i}" placeholder="Mark allotted" value="${mark}" />
      <textarea name="ans_${i}" placeholder="Correct answer">${ans}</textarea>
    `;
    c.appendChild(div);
  }
}

// --- Bind Answer Save & Upload Handlers ---
function bindAnswerSaveButton() {
  const btn = document.getElementById('save-answers-btn');
  btn.textContent = 'Save Answers';
  btn.addEventListener('click', saveAnswerData);
}

function bindUploadHandlers() {
  document.getElementById('upload-objective-answer')
    .addEventListener('change', handleObjectiveUpload);
  document.getElementById('upload-essay-answer')
    .addEventListener('change', handleEssayUpload);
}

// --- File Upload Parsers ---
function handleObjectiveUpload(e) {
  /* unchanged */
}
function handleEssayUpload(e) {
  /* unchanged */
}

// --- Save Teacher's Answers ---
function saveAnswerData() {
  /* unchanged */
}

// --- Student Database Section ---
function initDBEssaySection() {
  const c = document.getElementById('db-essay-form');
  c.innerHTML = '';
  addDBEssaySet();
}

function addDBEssaySet(qNo = '', answer = '') {
  /* unchanged */
}

function bindStudentButtons() {
  const saveBtn = document.getElementById('save-student-btn');
  saveBtn.textContent = 'Add Student';
  const updateBtn = document.getElementById('update-student-btn');
  if (!updateBtn) {
    const btn = document.createElement('button');
    btn.id = 'update-student-btn';
    btn.type = 'button';
    btn.textContent = 'Update Student';
    btn.style.display = 'none';
    saveBtn.insertAdjacentElement('afterend', btn);
  }
  saveBtn.addEventListener('click', async () => {
    await saveStudentData();
    populateStudentSelect();
  });
  document.getElementById('update-student-btn').addEventListener('click', async () => {
    await updateStudentData();
    populateStudentSelect();
  });
}

function bindClearStudentsButton() {
  document.getElementById('clear-students-btn')
    .addEventListener('click', () => {
      if (!confirm('Clear all student records?')) return;
      DataManager.students = [];
      DataManager.saveStudents();
      updateStudentAnswerInfo();
      populateStudentSelect();
    });
}

async function saveStudentData() {
  /* unchanged except after saving: */
  DataManager.saveStudents();
  updateStudentAnswerInfo();
  // ...
}

function updateStudentAnswerInfo() {
  const c = document.getElementById('student-db-reference');
  c.innerHTML = '';
  if (!DataManager.students.length) return;
  const tbl = document.createElement('table');
  tbl.innerHTML = `
    <thead>
      <tr>
        <th>Student Name</th>
        <th>Objective Answer</th>
        <th>Essay Answer</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${DataManager.students.map((s,i) => `
        <tr>
          <td>${s.name}</td>
          <td>${s.objectiveAnswers.join(', ')}</td>
          <td>${s.essayAnswers.map(e =>
            e.answer.startsWith('data:')
              ? `<img src="${e.answer}" style="width:50px;height:50px;"/>`
              : e.answer
          ).join('; ')}</td>
          <td>
            <button class="edit-student" data-index="${i}">Edit</button>
            <button class="delete-student" data-index="${i}">Delete</button>
          </td>
        </tr>`).join('')}
    </tbody>
  `;
  c.appendChild(tbl);

  tbl.querySelectorAll('.edit-student').forEach(btn =>
    btn.addEventListener('click', () => startEditStudent(+btn.dataset.index))
  );
  tbl.querySelectorAll('.delete-student').forEach(btn =>
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.index;
      if (!confirm(`Delete record for ${DataManager.students[idx].name}?`)) return;
      DataManager.students.splice(idx, 1);
      DataManager.saveStudents();
      updateStudentAnswerInfo();
      populateStudentSelect();
    })
  );
}

function startEditStudent(idx) {
  /* unchanged */
}

async function updateStudentData() {
  /* unchanged */
}

// --- Populate Student Select for Marking ---
function populateStudentSelect() {
  const select = document.getElementById('mark-student-select');
  if (!select) return;
  select.innerHTML = '<option value="">Select student</option>';
  DataManager.students.forEach((s, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
}

// --- Marking Tab ---
function bindMarkingTabButtons() {
  const select = document.getElementById('mark-student-select');
  select.addEventListener('change', () => {
    const idx = select.value;
    if (idx === '') {
      alert('Please select a student');
      return;
    }
    const stud = DataManager.students[idx];
    if (!stud) {
      alert('Student not found');
      return;
    }
    currentStudent = stud;
    fillMarkingInfo();
  });

  document.getElementById('populate-objective-btn')
    .addEventListener('click', () => {
      if (!currentStudent) return alert('Select a student first');
      populateObjectiveMarkingForm();
    });

  document.getElementById('mark-objective-btn')
    .addEventListener('click', markObjectiveOnly);

  document.getElementById('essay-marking-form').addEventListener('click', handleEssayMarkingClick);
}

function fillMarkingInfo() {
  document.getElementById('mark-student-name').value = currentStudent.name;
  document.getElementById('mark-student-class').value = currentStudent.class;
  document.getElementById('mark-student-arm').value = currentStudent.arm;
  // clear previous
  document.getElementById('objective-marking-form').innerHTML = '';
  document.getElementById('objective-marking-details').textContent = '';
  document.querySelector('#essay-marking-form tbody').innerHTML = '';
  document.getElementById('essay-marking-details').textContent = '';
  currentObjectiveScore = 0;
  currentEssayScores = [];
  currentEssayScore = 0;
}

function populateObjectiveMarkingForm() {
  const container = document.getElementById('objective-marking-form');
  container.innerHTML = '';
  const teacherLen = DataManager.answerKey.objective.length;
  const studentLen = currentStudent.objectiveAnswers.length;
  let count = Math.max(50, teacherLen, studentLen);
  count = Math.min(count, 100);
  for (let i = 1; i <= count; i++) {
    const studAns = currentStudent.objectiveAnswers[i - 1] || '';
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Q${i}:</label>
      <input type="text" name="mark_q_${i}" value="${studAns}" />
    `;
    container.appendChild(div);
  }
}

function markObjectiveOnly() {
  if (!currentStudent) return alert('Select a student first');
  const inputs = Array.from(document.querySelectorAll('#objective-marking-form input'));
  const teacher = DataManager.answerKey.objective.map(o => o.answer.trim());
  currentObjectiveScore = 0;
  teacher.forEach((ans, idx) => {
    const stud = (inputs[idx]?.value || '').trim();
    if (stud.toLowerCase() === ans.toLowerCase()) {
      currentObjectiveScore++;
    }
  });
  document.getElementById('objective-marking-details').textContent =
    `Objective Score: ${currentObjectiveScore} / ${teacher.length}`;
}

function handleEssayMarkingClick(e) {
  const tr = e.target.closest('tr');
  if (!tr || !tr.dataset.idx) return;
  const idx = +tr.dataset.idx;
  const teacherMark = Number(DataManager.answerKey.essay[idx].mark) || 0;

  if (e.target.classList.contains('essay-correct')) {
    currentEssayScores[idx] = teacherMark;
  } else if (e.target.classList.contains('essay-incorrect')) {
    currentEssayScores[idx] = 0;
  } else if (e.target.classList.contains('essay-custom-btn')) {
    tr.querySelector('.essay-custom-input').style.display = '';
    tr.querySelector('.essay-custom-done').style.display = '';
  } else if (e.target.classList.contains('essay-custom-done')) {
    const val = Number(tr.querySelector('.essay-custom-input').value) || 0;
    currentEssayScores[idx] = val;
    tr.querySelector('.essay-custom-input').style.display = 'none';
    tr.querySelector('.essay-custom-done').style.display = 'none';
  } else if (e.target.classList.contains('essay-erase')) {
    currentEssayScores[idx] = 0;
  } else return;

  currentEssayScore = currentEssayScores.reduce((a, b) => a + (b || 0), 0);
  document.getElementById('essay-marking-details').textContent =
    `Essay Score: ${currentEssayScore}`;
}

function populateEssayMarkingSection() {
  const tbody = document.querySelector('#essay-marking-form tbody');
  tbody.innerHTML = '';
  DataManager.answerKey.essay.forEach((t, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.idx = idx;
    const stud = currentStudent.essayAnswers.find(e => e.questionNo === t.questionNo) || {};
    const studHTML = stud.answer && stud.answer.startsWith('data:')
      ? `<img src="${stud.answer}" style="width:75px;"/>`
      : `<div>${stud.answer || ''}</div>`;
    tr.innerHTML = `
      <td>${t.questionNo}</td>
      <td>${t.mark}</td>
      <td>${t.answer}</td>
      <td>${studHTML}</td>
      <td>
        <button type="button" class="essay-correct">✓</button>
        <button type="button" class="essay-incorrect">✕</button>
        <button type="button" class="essay-custom-btn">✎</button>
        <input type="number" class="essay-custom-input" style="width:50px;display:none;"/>
        <button type="button" class="essay-custom-done" style="display:none;">✔</button>
        <button type="button" class="essay-erase">⎌</button>
      </td>
    `;
    tbody.appendChild(tr);
    currentEssayScores[idx] = 0;
  });
  document.getElementById('essay-marking-details').textContent = `Essay Score: 0`;
}

function recordMark() {
  if (!currentStudent) return alert('Complete marking first');
  if (!document.querySelector('#essay-marking-form tbody').childElementCount) {
    populateEssayMarkingSection();
  }
  DataManager.scores.push({
    name: currentStudent.name,
    class: currentStudent.class,
    arm: currentStudent.arm,
    objective: currentObjectiveScore,
    essay: currentEssayScore,
    total: currentObjectiveScore + currentEssayScore
  });
  DataManager.saveScores();
  updateScoreTable();
  alert('Marks recorded');
}

// --- Score Tab Logic ---
function updateScoreTable() {
  const tbody = document.querySelector('#score-table tbody');
  tbody.innerHTML = '';
  DataManager.scores.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.name}</td>
      <td>${r.class}</td>
      <td>${r.arm}</td>
      <td>${r.objective}</td>
      <td>${r.essay}</td>
      <td>${r.total}</td>
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
  if (!confirm('This will wipe EVERYTHING. Continue?')) return;
  localStorage.clear();
  location.reload();
}

window.addEventListener('DOMContentLoaded', () => DataManager.init());
