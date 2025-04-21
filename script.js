// script.js

// --- Data Manager (uses localStorage) ---
const DataManager = {
  answerKey: { objective: [], essay: [] },
  students: [],
  scores: [],

  init() {
    // Load persisted data
    const ak = localStorage.getItem('answerKey');
    const sd = localStorage.getItem('studentsDB');
    const sc = localStorage.getItem('scoresDB');
    if (ak) this.answerKey = JSON.parse(ak);
    if (sd) this.students = JSON.parse(sd);
    if (sc) this.scores = JSON.parse(sc);

    // Initialize UI
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
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const data = evt.target.result;
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length <= 1) return;
    DataManager.answerKey.objective = rows.slice(1).map(r => ({
      questionNo: Number(r[0]) || undefined,
      answer: String(r[1] || '').trim()
    }));
    DataManager.saveAnswerKey();
    renderObjectiveKeyForm();
  };
  reader.readAsArrayBuffer(file);
}

function handleEssayUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const data = evt.target.result;
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length <= 1) return;
    DataManager.answerKey.essay = rows.slice(1, 21).map(r => ({
      questionNo: String(r[0] || '').trim(),
      mark: r[1] != null ? r[1] : '',
      answer: String(r[2] || '').trim()
    }));
    DataManager.saveAnswerKey();
    renderEssayKeyForm();
  };
  reader.readAsArrayBuffer(file);
}

// --- Save Teacher's Answers ---
function saveAnswerData() {
  const objInputs = Array.from(document.querySelectorAll('#objective-answer-form input'));
  if (objInputs.every(i => !i.value.trim())) {
    return alert('Please fill at least one objective answer before saving.');
  }
  DataManager.answerKey.objective = objInputs.map((i, idx) => ({
    questionNo: idx + 1,
    answer: i.value.trim()
  }));

  const essayDivs = Array.from(document.querySelectorAll('#essay-answer-form div'));
  const hasOne = essayDivs.some((div, idx) => {
    const q = div.querySelector(`input[name="qno_${idx+1}"]`).value.trim();
    const m = div.querySelector(`input[name="mark_${idx+1}"]`).value.trim();
    const a = div.querySelector(`textarea[name="ans_${idx+1}"]`).value.trim();
    return q && m && a;
  });
  if (!hasOne) {
    return alert('Please fill at least one essay question (Q No, Mark & Answer).');
  }
  DataManager.answerKey.essay = essayDivs.map((div, idx) => ({
    questionNo: div.querySelector(`input[name="qno_${idx+1}"]`).value.trim(),
    mark: div.querySelector(`input[name="mark_${idx+1}"]`).value.trim(),
    answer: div.querySelector(`textarea[name="ans_${idx+1}"]`).value.trim()
  }));

  DataManager.saveAnswerKey();
  objInputs.forEach(i => i.value = '');
  document.querySelectorAll('#essay-answer-form input, #essay-answer-form textarea')
    .forEach(el => el.value = '');

  let notif = document.getElementById('answer-notification');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'answer-notification';
    document.getElementById('save-answers-btn')
      .insertAdjacentElement('afterend', notif);
  }
  notif.textContent = 'All answers saved successfully';
  notif.style.color = 'green';
}

// --- Student Database Section ---
function initDBEssaySection() {
  const c = document.getElementById('db-essay-form');
  c.innerHTML = '';
  addDBEssaySet();
}

function addDBEssaySet(qNo = '', answer = '') {
  const container = document.getElementById('db-essay-form');
  const set = document.createElement('div');
  set.className = 'db-essay-set';
  set.innerHTML = `
    <input type="text" class="db-essay-qno" value="${qNo}" placeholder="Q No" />
    <textarea class="db-essay-text" placeholder="Answer text">${!answer.startsWith('data:') ? answer : ''}</textarea>
    <input type="file" class="db-essay-file" accept="image/png, image/jpeg" />
    <div class="db-essay-preview"><img style="width:100px;height:100px;display:none;"></div>
    <button type="button" class="db-essay-add">Continue</button>
    <button type="button" class="db-essay-remove">Delete</button>
  `;
  container.appendChild(set);

  const ta = set.querySelector('.db-essay-text');
  const fileInput = set.querySelector('.db-essay-file');
  const img = set.querySelector('img');

  ta.addEventListener('input', () => {
    fileInput.style.display = ta.value.trim() ? 'none' : '';
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      img.src = e.target.result;
      img.style.display = '';
      ta.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });
  set.querySelector('.db-essay-add').addEventListener('click', () => addDBEssaySet());
  set.querySelector('.db-essay-remove').addEventListener('click', () => set.remove());
}

function bindStudentButtons() {
  const saveBtn = document.getElementById('save-student-btn');
  saveBtn.textContent = 'Add Student';
  const updateBtn = document.createElement('button');
  updateBtn.id = 'update-student-btn';
  updateBtn.type = 'button';
  updateBtn.textContent = 'Update Student';
  updateBtn.style.display = 'none';
  saveBtn.insertAdjacentElement('afterend', updateBtn);

  saveBtn.addEventListener('click', saveStudentData);
  updateBtn.addEventListener('click', updateStudentData);
}

function bindClearStudentsButton() {
  document.getElementById('clear-students-btn')
    .addEventListener('click', () => {
      if (!confirm('Clear all student records?')) return;
      DataManager.students = [];
      DataManager.saveStudents();
      updateStudentAnswerInfo();
    });
}

async function saveStudentData() {
  if (DataManager.students.length >= 250) {
    return alert('Maximum of 250 students reached.');
  }
  const name = document.getElementById('db-student-name').value.trim();
  const cls  = document.getElementById('db-student-class').value.trim();
  const arm  = document.getElementById('db-student-arm').value.trim();
  if (!name || !cls || !arm) return alert('Name, Class & Arm are required');

  const objRaw = document.getElementById('db-objective-answer').value.trim();
  if (!objRaw) return alert('Objective answers required');
  const objArr = objRaw.split(',').map(s => s.trim());

  const sets = Array.from(document.querySelectorAll('.db-essay-set'));
  if (!sets.length) return alert('At least one essay answer required');
  const essayData = [];
  for (const setElem of sets) {
    const qno = setElem.querySelector('.db-essay-qno').value.trim();
    if (!qno) return alert('Question number required for each essay answer');
    const ta = setElem.querySelector('.db-essay-text');
    const fileInput = setElem.querySelector('.db-essay-file');
    let ans = '';
    if (ta.style.display !== 'none' && ta.value.trim()) {
      ans = ta.value.trim();
    } else if (fileInput.files.length) {
      ans = await new Promise(res => {
        const fr = new FileReader();
        fr.onload = e => res(e.target.result);
        fr.readAsDataURL(fileInput.files[0]);
      });
    } else {
      return alert(`Provide text or upload image for essay Q${qno}`);
    }
    essayData.push({ questionNo: qno, answer: ans });
  }

  DataManager.students.push({ name, class: cls, arm, objectiveAnswers: objArr, essayAnswers: essayData });
  DataManager.saveStudents();
  updateStudentAnswerInfo();
  alert('Student saved');
  document.getElementById('db-student-form').reset();
  initDBEssaySection();
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
    })
  );
}

function startEditStudent(idx) {
  const s = DataManager.students[idx];
  document.getElementById('db-student-name').value = s.name;
  document.getElementById('db-student-class').value = s.class;
  document.getElementById('db-student-arm').value = s.arm;
  document.getElementById('db-objective-answer').value = s.objectiveAnswers.join(',');
  document.getElementById('db-essay-form').innerHTML = '';
  s.essayAnswers.forEach(item => addDBEssaySet(item.questionNo, item.answer));
  editingIndex = idx;
  document.getElementById('save-student-btn').style.display = 'none';
  document.getElementById('update-student-btn').style.display = '';
}

async function updateStudentData() {
  if (editingIndex === null) return;
  const name = document.getElementById('db-student-name').value.trim();
  const cls  = document.getElementById('db-student-class').value.trim();
  const arm  = document.getElementById('db-student-arm').value.trim();
  if (!name || !cls || !arm) return alert('Name, Class & Arm are required');

  const objRaw = document.getElementById('db-objective-answer').value.trim();
  if (!objRaw) return alert('Objective answers required');
  const objArr = objRaw.split(',').map(s => s.trim());

  const sets = Array.from(document.querySelectorAll('.db-essay-set'));
  const essayData = [];
  for (const setElem of sets) {
    const qno = setElem.querySelector('.db-essay-qno').value.trim();
    if (!qno) return alert('Question number required');
    const ta = setElem.querySelector('.db-essay-text');
    const fileInput = setElem.querySelector('.db-essay-file');
    let ans = '';
    if (ta.style.display !== 'none' && ta.value.trim()) {
      ans = ta.value.trim();
    } else if (fileInput.files.length) {
      ans = await new Promise(res => {
        const fr = new FileReader();
        fr.onload = e => res(e.target.result);
        fr.readAsDataURL(fileInput.files[0]);
      });
    } else {
      return alert(`Provide answer for essay Q${qno}`);
    }
    essayData.push({ questionNo: qno, answer: ans });
  }

  DataManager.students[editingIndex] = { name, class: cls, arm, objectiveAnswers: objArr, essayAnswers: essayData };
  DataManager.saveStudents();
  updateStudentAnswerInfo();
  alert('Student updated');
  document.getElementById('db-student-form').reset();
  initDBEssaySection();
  editingIndex = null;
  document.getElementById('save-student-btn').style.display = '';
  document.getElementById('update-student-btn').style.display = 'none';
}

// --- Marking Tab ---
function bindMarkingTabButtons() {
  const loadBtn = document.getElementById('load-student-btn');
  const searchInput = document.getElementById('mark-student-search');
  const populateObjBtn = document.getElementById('populate-objective-btn');

  loadBtn.addEventListener('click', () => {
    const name = searchInput.value.trim();
    const student = DataManager.students.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (!student) {
      alert('Student not found');
      return;
    }
    currentStudent = student;
    document.getElementById('mark-student-name').value = student.name;
    document.getElementById('mark-student-class').value = student.class;
    document.getElementById('mark-student-arm').value = student.arm;
    document.getElementById('objective-marking-form').innerHTML = '';
    document.getElementById('objective-marking-details').textContent = '';
    document.querySelector('#essay-marking-form tbody').innerHTML = '';
    document.getElementById('essay-marking-details').textContent = '';
    currentObjectiveScore = 0;
    currentEssayScores = [];
    currentEssayScore = 0;
  });

  populateObjBtn.addEventListener('click', () => {
    if (!currentStudent) return alert('Load a student first');
    populateObjectiveMarkingForm();
  });

  document.getElementById('mark-objective-btn')
    .addEventListener('click', markObjectiveOnly);

  document.getElementById('essay-marking-form').addEventListener('click', e => {
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
    } else {
      return;
    }

    currentEssayScore = currentEssayScores.reduce((a, b) => a + (b || 0), 0);
    document.getElementById('essay-marking-details').textContent =
      `Essay Score: ${currentEssayScore}`;
  });
}

function populateObjectiveMarkingForm() {
  const container = document.getElementById('objective-marking-form');
  container.innerHTML = '';
  const len = DataManager.answerKey.objective.length;
  for (let i = 1; i <= len; i++) {
    const div = document.createElement('div');
    const studAns = currentStudent.objectiveAnswers[i - 1] || '';
    div.innerHTML = `
      <label>Q${i}:</label>
      <input type="text" name="mark_q_${i}" value="${studAns}" />
    `;
    container.appendChild(div);
  }
}

function markObjectiveOnly() {
  if (!currentStudent) return alert('Load a student first');
  const inputs = Array.from(document.querySelectorAll('#objective-marking-form input'));
  const teacher = DataManager.answerKey.objective.map(o => o.answer.trim());
  currentObjectiveScore = 0;
  teacher.forEach((ans, idx) => {
    const stud = (inputs[idx]?.value || '').trim();
    if (stud && stud.toLowerCase() === ans.toLowerCase()) {
      currentObjectiveScore++;
    }
  });
  document.getElementById('objective-marking-details').textContent =
    `Objective Score: ${currentObjectiveScore} / ${teacher.length}`;
}

function populateEssayMarkingSection() {
  const tbody = document.querySelector('#essay-marking-form tbody');
  tbody.innerHTML = '';
  DataManager.answerKey.essay.forEach((t, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.idx = idx;
    const studObj = currentStudent.essayAnswers.find(e => e.questionNo === t.questionNo) || {};
    const studHTML = studObj.answer && studObj.answer.startsWith('data:')
      ? `<img src="${studObj.answer}" style="width:75px;"/>`
      : `<div>${studObj.answer || ''}</div>`;
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
  if (!currentStudent) return alert('Load and mark student first');
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
