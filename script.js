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
    initDBEssaySection();
    updateStudentAnswerInfo();
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

// --- Answer Tab Customization ---
function renameAnswerTab() {
  const btn = document.querySelector('.tab-button[data-tab="answer"]');
  if (btn) btn.textContent = "Teacher's Answer Tab";
}

function insertAnswerTabDescription() {
  const section = document.getElementById('answer');
  const desc = document.createElement('p');
  desc.textContent =
    'Here, upload or enter your objective and essay answer keys. ' +
    'The objective form shows up to 100 questions (50 by default). ' +
    'The essay form supports up to 20 questions.';
  section.insertBefore(desc, section.firstElementChild.nextSibling);
}

// --- Answer‐Key Upload & Adaptive Render ---
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
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    rows.shift(); // ignore header
    DataManager.answerKey.objective = rows.map((r, i) => ({
      questionNo: i + 1,
      answer: String(r[1] || '').trim()
    }));
    DataManager.saveAnswerKey();
    renderObjectiveKeyForm();
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
    DataManager.answerKey.essay = rows.map((r, i) => ({
      questionNo: i + 1,
      mark: Number(r[1] || 0),
      answer: String(r[2] || '')
    }));
    DataManager.saveAnswerKey();
    renderEssayKeyForm();
  };
  reader.readAsArrayBuffer(file);
}

function renderObjectiveKeyForm() {
  const c = document.getElementById('objective-answer-form');
  c.innerHTML = '';
  c.classList.add('two-columns');

  const n = DataManager.answerKey.objective.length;
  const count = Math.min(Math.max(n, 50), 100);

  for (let i = 1; i <= count; i++) {
    const existing = DataManager.answerKey.objective.find(o => Number(o.questionNo) === i);
    const ans = existing ? existing.answer : '';
    const div = document.createElement('div');
    div.innerHTML = `<label>Q${i}:</label> <input type="text" name="q_${i}" value="${ans}" />`;
    c.appendChild(div);
  }
}

function renderEssayKeyForm() {
  const c = document.getElementById('essay-answer-form');
  c.innerHTML = '';
  let n = DataManager.answerKey.essay.length;
  const count = Math.min(Math.max(n, 1), 20);

  for (let i = 1; i <= count; i++) {
    const existing = DataManager.answerKey.essay.find(e => Number(e.questionNo) === i);
    const mark = existing ? existing.mark : '';
    const ans = existing ? existing.answer : '';
    const div = document.createElement('div');
    div.innerHTML = `<label>Q${i} (Max):</label> <input type="number" name="mark_${i}" placeholder="Mark allotted" value="${mark}" /> <textarea name="ans_${i}" placeholder="Correct answer">${ans}</textarea>`;
    c.appendChild(div);
  }
}

// --- Student DB: Dynamic Essay Sets ---
let editingIndex = null;

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
    <input type="number" class="db-essay-qno" value="${qNo}" placeholder="Q No" />
    <textarea class="db-essay-text" placeholder="Answer text">${!answer.startsWith('data:') ? answer : ''}</textarea>
    <input type="file" class="db-essay-file" accept="image/png, image/jpeg" />
    <div class="db-essay-preview"><img style="width:100px;height:100px;display:none;" /></div>
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

// Save or Update Student
document.querySelector('#db-student-form button')
  .addEventListener('click', () => editingIndex === null ? saveStudentData() : updateStudentData());

async function saveStudentData() {
  const name = document.getElementById('db-student-name').value.trim();
  const cls = document.getElementById('db-student-class').value.trim();
  const arm = document.getElementById('db-student-arm').value.trim();
  if (!name || !cls || !arm) return alert('Name, Class & Arm are required');

  const objRaw = document.getElementById('db-objective-answer').value.trim();
  if (!objRaw) return alert('Objective answers required');
  const objArr = objRaw.split(',').map(s => s.trim());

  const sets = Array.from(document.querySelectorAll('.db-essay-set'));
  if (sets.length === 0) return alert('At least one essay answer required');
  const essayData = [];

  for (const set of sets) {
    const qno = set.querySelector('.db-essay-qno').value.trim();
    if (!qno) return alert('Question number required for each essay answer');
    const ta = set.querySelector('.db-essay-text');
    const fileInput = set.querySelector('.db-essay-file');
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
      <tr><th>Name</th><th>Class</th><th>Arm</th><th>Objective</th><th>Essay</th><th>Edit</th></tr>
    </thead>
    <tbody>
      ${DataManager.students.map((s, i) => `
        <tr>
          <td>${s.name}</td>
          <td>${s.class}</td>
          <td>${s.arm}</td>
          <td>${s.objectiveAnswers.join(',')}</td>
          <td>
            ${s.essayAnswers.map(e =>
              e.answer.startsWith('data:')
                ? `<img src="${e.answer}" style="width:50px;height:50px;"/>`
                : e.answer).join('<br/>')}
          </td>
          <td><button data-index="${i}" class="edit-student">Edit</button></td>
        </tr>`).join('')}
    </tbody>
  `;
  c.appendChild(tbl);
  c.querySelectorAll('.edit-student').forEach(btn => {
    btn.addEventListener('click', () => startEditStudent(btn.dataset.index));
  });
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
  document.querySelector('#db-student-form button').textContent = 'Update Student';
}

async function updateStudentData() {
  if (editingIndex === null) return;

  const name = document.getElementById('db-student-name').value.trim();
  const cls = document.getElementById('db-student-class').value.trim();
  const arm = document.getElementById('db-student-arm').value.trim();
  if (!name || !cls || !arm) return alert('Name, Class & Arm are required');

  const objRaw = document.getElementById('db-objective-answer').value.trim();
  if (!objRaw) return alert('Objective answers required');
  const objArr = objRaw.split(',').map(s => s.trim());

  const sets = Array.from(document.querySelectorAll('.db-essay-set'));
  const essayData = [];

  for (const set of sets) {
    const qno = set.querySelector('.db-essay-qno').value.trim();
    if (!qno) return alert('Question number required');
    const ta = set.querySelector('.db-essay-text');
    const fileInput = set.querySelector('.db-essay-file');
    let ans = '';

    if (ta.style.display !== 'none' && ta.value.trim()) {
      ans = ta.value.trim();
    } else if (fileInput.files.length) {
      ans = await new Promise(res => {
        const fr = new FileReader();
        fr.onload = e => res(e.target.result);
        fr.readAsDataURL(fileInput.files[0]);
      });
    } else return alert(`Provide answer for essay Q${qno}`);

    essayData.push({ questionNo: qno, answer: ans });
  }

  DataManager.students[editingIndex] = {
    name,
    class: cls,
    arm,
    objectiveAnswers: objArr,
    essayAnswers: essayData
  };

  DataManager.saveStudents();
  updateStudentAnswerInfo();
  alert('Student updated');
  document.getElementById('db-student-form').reset();
  initDBEssaySection();
  editingIndex = null;
  document.querySelector('#db-student-form button').textContent = 'Save Student';
}

// --- Marking & Score Tabs remain unchanged ---
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
