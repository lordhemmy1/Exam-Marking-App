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
    if (sd) this.students  = JSON.parse(sd);
    if (sc) this.scores    = JSON.parse(sc);

    // initialize UI
    renameAnswerTab();
    insertAnswerTabDescription();
    renderObjectiveKeyForm();
    renderEssayKeyForm();
    bindAnswerSaveButton();
    bindUploadHandlers();

    initDBEssaySection();
    bindStudentButtons();
    updateStudentAnswerInfo();
    bindClearDBButton();

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
    'Upload or manually type your objective answers into the objective form section and the essay section.';
  desc.style.fontSize = '1rem';
  section.insertBefore(desc, document.getElementById('objective-answer-container'));
}

// --- Render Answer Forms ---
function renderObjectiveKeyForm() {
  const c = document.getElementById('objective-answer-form');
  c.innerHTML = '';
  c.classList.remove('two-columns');
  c.classList.add('two-col-form');

  const n     = DataManager.answerKey.objective.length;
  const count = Math.max(n, 50);
  for (let i = 1; i <= count; i++) {
    const existing = DataManager.answerKey.objective.find(o => Number(o.questionNo) === i);
    const ans      = existing ? existing.answer : '';
    const div      = document.createElement('div');
    div.innerHTML  = `
      <label>Q${i}:</label>
      <input type="text" name="q_${i}" value="${ans}" />
    `;
    c.appendChild(div);
  }
}

function renderEssayKeyForm() {
  const c     = document.getElementById('essay-answer-form');
  c.innerHTML = '';
  const count = 20;
  for (let i = 1; i <= count; i++) {
    const existing = DataManager.answerKey.essay.find(e => Number(e.questionNo) === i);
    const qNo      = existing ? existing.questionNo : '';
    const mark     = existing ? existing.mark : '';
    const ans      = existing ? existing.answer : '';
    const div      = document.createElement('div');
    div.innerHTML  = `
      <label>Set ${i}:</label>
      <input type="text" name="qno_${i}" placeholder="Question No." value="${qNo}" />
      <input type="number" name="mark_${i}" placeholder="Mark allotted" value="${mark}" />
      <textarea name="ans_${i}" placeholder="Correct answer">${ans}</textarea>
    `;
    c.appendChild(div);
  }
}

// --- Clear Answer Forms (after save) ---
function clearAnswerForms() {
  document.querySelectorAll('#objective-answer-form input').forEach(i => i.value = '');
  document.querySelectorAll('#essay-answer-form input, #essay-answer-form textarea').forEach(el => el.value = '');
}

// --- Bind Save / Upload Handlers ---
function bindAnswerSaveButton() {
  const btn = document.getElementById('save-answers-btn');
  if (btn) {
    btn.textContent = 'Save Answers';
    btn.addEventListener('click', saveAnswerData);
  }
}

function bindUploadHandlers() {
  const objInput   = document.getElementById('upload-objective-answer');
  const essayInput = document.getElementById('upload-essay-answer');
  if (objInput)   objInput.addEventListener('change', handleObjectiveUpload);
  if (essayInput) essayInput.addEventListener('change', handleEssayUpload);
}

// --- File Upload Parsers ---
function handleObjectiveUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const wb   = XLSX.read(evt.target.result, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length <= 1) return;
    DataManager.answerKey.objective = rows
      .slice(1)
      .map(r => ({ questionNo: Number(r[0]) || undefined, answer: String(r[1] || '').trim() }));
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
    const wb   = XLSX.read(evt.target.result, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length <= 1) return;
    DataManager.answerKey.essay = rows
      .slice(1)
      .slice(0, 20)
      .map(r => ({
        questionNo: String(r[0] || '').trim(),
        mark:       r[1] != null ? r[1] : '',
        answer:     String(r[2] || '').trim()
      }));
    DataManager.saveAnswerKey();
    renderEssayKeyForm();
  };
  reader.readAsArrayBuffer(file);
}

// --- Save Answers with Validation ---
function saveAnswerData() {
  // validate objective
  const objInputs = Array.from(document.querySelectorAll('#objective-answer-form input'));
  if (objInputs.every(i => !i.value.trim())) {
    return alert('Please fill at least one objective answer before saving.');
  }

  DataManager.answerKey.objective = objInputs.map((i, idx) => ({
    questionNo: idx + 1,
    answer:     i.value.trim()
  }));

  // validate essay: at least one qno+mark+ans
  const essayDivs = Array.from(document.querySelectorAll('#essay-answer-form div'));
  const hasOne    = essayDivs.some((div, idx) => {
    const qno  = div.querySelector(`input[name="qno_${idx+1}"]`).value.trim();
    const mark = div.querySelector(`input[name="mark_${idx+1}"]`).value.trim();
    const ans  = div.querySelector(`textarea[name="ans_${idx+1}"]`).value.trim();
    return qno && mark && ans;
  });
  if (!hasOne) {
    return alert('Please fill at least one essay question (Question No., Mark, and Answer).');
  }

  DataManager.answerKey.essay = essayDivs.map((div, idx) => ({
    questionNo: div.querySelector(`input[name="qno_${idx+1}"]`).value.trim(),
    mark:       div.querySelector(`input[name="mark_${idx+1}"]`).value.trim(),
    answer:     div.querySelector(`textarea[name="ans_${idx+1}"]`).value.trim()
  }));

  DataManager.saveAnswerKey();

  clearAnswerForms();

  let notif = document.getElementById('answer-notification');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'answer-notification';
    document.getElementById('save-answers-btn')
            .insertAdjacentElement('afterend', notif);
  }
  notif.textContent = 'All answers (objective and essay) have been saved successfully';
  notif.style.color = 'green';
}

// --- Student DB & Marking ---
let editingIndex = null;

function initDBEssaySection() {
  const c = document.getElementById('db-essay-form');
  c.innerHTML = '';
  addDBEssaySet();
}

function addDBEssaySet(qNo = '', answer = '') {
  const container = document.getElementById('db-essay-form');
  const set       = document.createElement('div');
  set.className   = 'db-essay-set';
  set.innerHTML   = `
    <input type="text" class="db-essay-qno" value="${qNo}" placeholder="Q No (alphanumeric)" />
    <textarea class="db-essay-text" placeholder="Answer text">${!answer.startsWith('data:') ? answer : ''}</textarea>
    <input type="file" class="db-essay-file" accept="image/png, image/jpeg" />
    <div class="db-essay-preview"><img style="width:100px;height:100px;display:none;" /></div>
    <button type="button" class="db-essay-add">Add More</button>
    <button type="button" class="db-essay-remove">Delete</button>
  `;
  container.appendChild(set);

  const ta        = set.querySelector('.db-essay-text');
  const fileInput = set.querySelector('.db-essay-file');
  const img       = set.querySelector('img');

  ta.addEventListener('input', () => {
    fileInput.style.display = ta.value.trim() ? 'none' : '';
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      img.src           = e.target.result;
      img.style.display = '';
      ta.style.display  = 'none';
    };
    reader.readAsDataURL(file);
  });

  set.querySelector('.db-essay-add').addEventListener('click', () => addDBEssaySet());
  set.querySelector('.db-essay-remove').addEventListener('click', () => set.remove());
}

function bindStudentButtons() {
  const saveBtn   = document.getElementById('save-student-btn');
  saveBtn.textContent = 'Add Student Information';

  const updateBtn = document.createElement('button');
  updateBtn.id         = 'update-student-btn';
  updateBtn.type       = 'button';
  updateBtn.textContent = 'Update Student';
  updateBtn.style.display = 'none';
  saveBtn.insertAdjacentElement('afterend', updateBtn);

  saveBtn.addEventListener('click', saveStudentData);
  updateBtn.addEventListener('click', updateStudentData);
}

async function saveStudentData() {
  if (DataManager.students.length >= 250) {
    return alert('Maximum of 250 students reached.');
  }
  const name = document.getElementById('db-student-name').value.trim();
  const cls  = document.getElementById('db-student-class').value.trim();
  const arm  = document.getElementById('db-student-arm').value.trim();
  if (!name || !cls || !arm) {
    return alert('Name, Class & Arm are required');
  }

  const objRaw = document.getElementById('db-objective-answer').value.trim();
  if (!objRaw || objRaw.split(',').some(s => !s.trim())) {
    return alert('Objective answers must be comma‑separated and non‑empty');
  }
  const objArr = objRaw.split(',').map(s => s.trim());

  const sets = Array.from(document.querySelectorAll('.db-essay-set'));
  if (!sets.length) return alert('At least one essay answer required');
  const essayData = [];
  for (const set of sets) {
    const qnoEl = set.querySelector('.db-essay-qno');
    const qno   = qnoEl.value.trim();
    if (!qno || !/^[a-zA-Z0-9]+$/.test(qno)) {
      return alert('Essay question number must be alphanumeric');
    }
    const ta        = set.querySelector('.db-essay-text');
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

  document.getElementById('db-student-form').reset();
  initDBEssaySection();
}

function updateStudentAnswerInfo() {
  const c = document.getElementById('student-db-reference');
  c.innerHTML = '<h4>Student Information</h4>';
  if (!DataManager.students.length) return;

  const tbl = document.createElement('table');
  tbl.innerHTML = `
    <thead>
      <tr>
        <th>Name</th><th>Class</th><th>Arm</th>
        <th>Objective</th><th>Essay</th><th>Edit</th><th>Delete</th>
      </tr>
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
                : e.answer
            ).join('<br/>')}
          </td>
          <td><button class="edit-student" data-index="${i}">Edit</button></td>
          <td><button class="delete-student" data-index="${i}">Delete</button></td>
        </tr>`).join('')}
    </tbody>
  `;
  c.appendChild(tbl);

  // bind edit
  c.querySelectorAll('.edit-student').forEach(btn =>
    btn.addEventListener('click', () => startEditStudent(btn.dataset.index))
  );
  // bind delete
  c.querySelectorAll('.delete-student').forEach(btn =>
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      if (!confirm('Delete this student?')) return;
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
  document.getElementById('db-student-arm').value   = s.arm;
  document.getElementById('db-objective-answer').value = s.objectiveAnswers.join(',');

  document.getElementById('db-essay-form').innerHTML = '';
  s.essayAnswers.forEach(item => addDBEssaySet(item.questionNo, item.answer));
  editingIndex = idx;

  document.getElementById('save-student-btn').style.display   = 'none';
  document.getElementById('update-student-btn').style.display = '';
}

async function updateStudentData() {
  if (editingIndex === null) return;
  // reuse same validation & collection as saveStudentData()
  await saveStudentData();      // overwrites at end
  DataManager.students.splice(editingIndex, 1); // remove old entry
  editingIndex = null;
  document.getElementById('update-student-btn').style.display = 'none';
  document.getElementById('save-student-btn').style.display   = '';
}

// --- Clear Database Button (student DB only) ---
function bindClearDBButton() {
  const container = document.getElementById('student-db-reference');
  let btn = document.getElementById('clear-db-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'clear-db-btn';
    btn.textContent = 'Clear Database';
    btn.style.marginTop = '1rem';
    container.appendChild(btn);
    btn.addEventListener('click', () => {
      if (!confirm('Clear all student information?')) return;
      DataManager.students = [];
      DataManager.saveStudents();
      updateStudentAnswerInfo();
    });
  }
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
