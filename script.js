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
    bindClearStudentsButton();
    updateStudentAnswerInfo();
    updateScoreTable();

    // NEW: marking‑tab bindings
    bindStudentSearch();
    bindPopulateObjectives();
  },

  saveAnswerKey()   { localStorage.setItem('answerKey',   JSON.stringify(this.answerKey)); },
  saveStudents()    { localStorage.setItem('studentsDB',   JSON.stringify(this.students)); },
  saveScores()      { localStorage.setItem('scoresDB',     JSON.stringify(this.scores)); }
};

// --- Tab Navigation (unchanged) ---
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- Answer Tab Customization (unchanged) ---
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

// --- Render Teacher's Answer Forms (unchanged) ---
function renderObjectiveKeyForm() {
  const c = document.getElementById('objective-answer-form');
  c.innerHTML = '';
  c.classList.remove('two-columns');
  c.classList.add('two-col-form');
  const n = DataManager.answerKey.objective.length;
  const count = Math.max(n, 50);
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
  const saved = DataManager.answerKey.essay;
  const count = 20;
  for (let i = 1; i <= count; i++) {
    const existing = saved[i - 1] || {};
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

// --- Bind Save / Upload Handlers (unchanged) ---
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

// --- File Upload Parsers (unchanged) ---
function handleObjectiveUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    const wb   = XLSX.read(evt.target.result, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length <= 1) return;
    DataManager.answerKey.objective = rows.slice(1).map(r => ({
      questionNo: Number(r[0]) || undefined,
      answer:     String(r[1] || '').trim()
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
  reader.onload = function(evt) {
    const wb   = XLSX.read(evt.target.result, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length <= 1) return;
    DataManager.answerKey.essay = rows.slice(1).slice(0, 20).map(r => ({
      questionNo: String(r[0] || '').trim(),
      mark:       r[1] != null ? r[1] : '',
      answer:     String(r[2] || '').trim()
    }));
    DataManager.saveAnswerKey();
    renderEssayKeyForm();
  };
  reader.readAsArrayBuffer(file);
}

// --- Save Answers with Validation (unchanged) ---
function saveAnswerData() {
  // ... your existing validation and save logic ...
  // (unchanged)
}

// --- Student DB & Marking (mostly unchanged) ---
let editingIndex = null;

// ... your existing initDBEssaySection, addDBEssaySet, bindStudentButtons, bindClearStudentsButton, saveStudentData, updateStudentAnswerInfo, startEditStudent, updateStudentData ...

// === 1) Student DB UI fix ===
function bindStudentButtons() {
  const saveBtn = document.getElementById('save-student-btn');
  saveBtn.textContent = 'Add Student';  // rename button
  const updateBtn = document.getElementById('update-student-btn');
  if (updateBtn) updateBtn.style.display = 'none';
  saveBtn.addEventListener('click', saveStudentData);
}

// override updateStudentAnswerInfo to show only Name, Objective, Essay, Edit/Delete
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
      ${DataManager.students.map((s, i) => `
        <tr>
          <td>${s.name}</td>
          <td>${s.objectiveAnswers.join(',')}</td>
          <td>
            ${s.essayAnswers.map(e =>
              e.answer.startsWith('data:')
                ? `<img src="${e.answer}" style="width:40px;height:40px; margin-right:4px;"/>`
                : ''
            ).join('')}
          </td>
          <td>
            <button class="edit-student" data-index="${i}">Edit</button>
            <button class="delete-student" data-index="${i}">Delete</button>
          </td>
        </tr>
      `).join('')}
    </tbody>
  `;
  c.appendChild(tbl);

  // bind edit
  c.querySelectorAll('.edit-student').forEach(btn =>
    btn.addEventListener('click', () => startEditStudent(+btn.dataset.index))
  );
  // bind delete
  c.querySelectorAll('.delete-student').forEach(btn =>
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.index;
      if (!confirm(`Delete record for ${DataManager.students[idx].name}?`)) return;
      DataManager.students.splice(idx, 1);
      DataManager.saveStudents();
      updateStudentAnswerInfo();
    })
  );
}

// === 2) Marking Tab features ===
let currentStudent = null;
const essayScores  = {};

// 2.1 Search Student
function bindStudentSearch() {
  const btn = document.getElementById('upload-student-btn');
  if (!btn) return;
  btn.textContent = 'Search Student';
  btn.addEventListener('click', () => {
    const name = document.getElementById('student-name').value.trim();
    const found = DataManager.students.find(s => s.name === name);
    if (!found) {
      alert(`Student "${name}" not found.`);
      return;
    }
    currentStudent = found;
    document.getElementById('student-class').value = found.class;
    document.getElementById('student-arm').value   = found.arm;
    document.getElementById('objective-marking-form').innerHTML = '';
    document.getElementById('essay-marking-form').innerHTML     = '';
    document.getElementById('objective-marking-details').textContent = '';
    document.getElementById('essay-marking-details').textContent     = '';
  });
}

// 2.2 Populate Objectives (50 fields)
function bindPopulateObjectives() {
  const btn = document.getElementById('populate-objectives-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!currentStudent) {
      alert('Please search and load a student first.');
      return;
    }
    const form = document.getElementById('objective-marking-form');
    form.innerHTML = '';
    for (let i = 1; i <= 50; i++) {
      const ans = currentStudent.objectiveAnswers[i - 1] || '';
      const div = document.createElement('div');
      div.innerHTML = `
        <label>Q${i}:</label>
        <input type="text" name="oq_${i}" value="${ans}" />
      `;
      form.appendChild(div);
    }
  });
}

// 2.3 Mark Objective (adapted)
window.markObjectiveOnly = function() {
  if (!currentStudent) {
    alert('Load a student first.');
    return;
  }
  const key   = DataManager.answerKey.objective;
  let score   = 0;
  key.forEach(item => {
    const inp = document.querySelector(`#objective-marking-form input[name="oq_${item.questionNo}"]`);
    const ans = inp ? inp.value.trim().toLowerCase() : '';
    if (ans === item.answer.toLowerCase()) score++;
  });
  document.getElementById('objective-marking-details').textContent = `Objective Score: ${score}`;

  // save into scores DB
  const rec = DataManager.scores.find(r => r.name === currentStudent.name);
  if (rec) {
    rec.objective = score;
    rec.total     = rec.objective + rec.essay;
  } else {
    DataManager.scores.push({
      name: currentStudent.name,
      class: currentStudent.class,
      arm: currentStudent.arm,
      objective: score,
      essay: 0,
      total: score
    });
  }
  DataManager.saveScores();
  updateScoreTable();
};

// 2.4 Render Essay section (on first click of Record Mark)
document.getElementById('record-mark-btn')?.addEventListener('click', () => {
  if (!currentStudent) return;
  const form = document.getElementById('essay-marking-form');
  if (form.childElementCount) return; // already rendered
  DataManager.answerKey.essay.forEach(item => {
    const qNo   = item.questionNo;
    const tMark = Number(item.mark) || 0;
    const tAns  = item.answer;
    const stuEntry = currentStudent.essayAnswers.find(e => e.questionNo === qNo);
    const preview  = (stuEntry?.answer.startsWith('data:'))
      ? `<img src="${stuEntry.answer}" style="width:50px;height:50px;"/>`
      : '';
    const row = document.createElement('div');
    row.className = 'essay-marking-row';
    row.innerHTML = `
      <div class="teacher-answer"><strong>${qNo} [${tMark}]</strong><br>${tAns}</div>
      <div class="student-answer">${preview}</div>
      <div class="mark-tools" data-qno="${qNo}" data-mark="${tMark}">
        <button class="mark-correct">✅</button>
        <button class="mark-incorrect">❌</button>
        <button class="mark-custom">✏️</button>
        <button class="mark-erase">🗑️</button>
        <span class="awarded-mark" id="awarded-${qNo}"></span>
      </div>
    `;
    form.appendChild(row);
  });

  // bind essay tools
  form.querySelectorAll('.mark-correct').forEach(btn =>
    btn.addEventListener('click', e => {
      const p = e.target.closest('.mark-tools');
      const q = p.dataset.qno, m = Number(p.dataset.mark);
      essayScores[q] = m;
      document.getElementById(`awarded-${q}`).textContent = m;
      updateEssayTotal();
    })
  );
  form.querySelectorAll('.mark-incorrect').forEach(btn =>
    btn.addEventListener('click', e => {
      const q = e.target.closest('.mark-tools').dataset.qno;
      essayScores[q] = 0;
      document.getElementById(`awarded-${q}`).textContent = '0';
      updateEssayTotal();
    })
  );
  form.querySelectorAll('.mark-erase').forEach(btn =>
    btn.addEventListener('click', e => {
      const q = e.target.closest('.mark-tools').dataset.qno;
      delete essayScores[q];
      document.getElementById(`awarded-${q}`).textContent = '';
      updateEssayTotal();
    })
  );
  form.querySelectorAll('.mark-custom').forEach(btn =>
    btn.addEventListener('click', e => {
      const p = e.target.closest('.mark-tools');
      if (p.querySelector('.custom-input')) return;
      const input = document.createElement('input');
      input.type  = 'number';
      input.className = 'custom-input';
      input.placeholder = 'Mark';
      const done = document.createElement('button');
      done.textContent = 'Done';
      done.addEventListener('click', () => {
        const v = Number(input.value);
        if (isNaN(v)) return alert('Enter a valid number');
        essayScores[p.dataset.qno] = v;
        document.getElementById(`awarded-${p.dataset.qno}`).textContent = v;
        p.removeChild(input);
        p.removeChild(done);
        updateEssayTotal();
      });
      p.appendChild(input);
      p.appendChild(done);
    })
  );
});

// 2.5 Update essay total
function updateEssayTotal() {
  const sum = Object.values(essayScores).reduce((a, b) => a + b, 0);
  document.getElementById('essay-marking-details').textContent = `Essay Score: ${sum}`;
}

// 2.6 Record Mark button
document.getElementById('record-mark-btn')?.addEventListener('click', () => {
  if (!currentStudent) {
    alert('Load a student first.');
    return;
  }
  const objRec = DataManager.scores.find(r => r.name === currentStudent.name);
  const objScore = objRec ? objRec.objective : 0;
  const essayScore = Object.values(essayScores).reduce((a, b) => a + b, 0);
  if (objRec) {
    objRec.essay = essayScore;
    objRec.total = objScore + essayScore;
  } else {
    DataManager.scores.push({
      name: currentStudent.name,
      class: currentStudent.class,
      arm: currentStudent.arm,
      objective: objScore,
      essay: essayScore,
      total: objScore + essayScore
    });
  }
  DataManager.saveScores();
  updateScoreTable();
  document.getElementById('marking-notification').textContent = 'Mark recorded!';
});

// --- Score Tab (unchanged) ---
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
