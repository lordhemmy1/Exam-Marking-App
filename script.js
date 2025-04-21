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
    if (sc) this.scores   = JSON.parse(sc);

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

    // new bindings for marking tab
    bindStudentSearch();
    bindPopulateObjective();
    bindFinalizeButton();
  },

  saveAnswerKey()   { localStorage.setItem('answerKey', JSON.stringify(this.answerKey)); },
  saveStudents()    { localStorage.setItem('studentsDB', JSON.stringify(this.students)); },
  saveScores()      { localStorage.setItem('scoresDB',   JSON.stringify(this.scores)); }
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
  // validate objective
  const objInputs = Array.from(document.querySelectorAll('#objective-answer-form input'));
  if (objInputs.every(i => !i.value.trim())) {
    return alert('Please fill at least one objective answer before saving.');
  }
  DataManager.answerKey.objective = objInputs.map((i, idx) => ({
    questionNo: idx + 1,
    answer:     i.value.trim()
  }));

  // validate essay
  const essayDivs = Array.from(document.querySelectorAll('#essay-answer-form div'));
  const hasOne = essayDivs.some((div, idx) => {
    const qno  = div.querySelector(`input[name="qno_${idx+1}"]`).value.trim();
    const mark = div.querySelector(`input[name="mark_${idx+1}"]`).value.trim();
    const ans  = div.querySelector(`textarea[name="ans_${idx+1}"]`).value.trim();
    return qno && mark && ans;
  });
  if (!hasOne) {
    return alert('Please fill at least one essay question (Question No., Mark, and Answer).');
  }
  DataManager.answerKey.essay = essayDivs.map((div, idx) => {
    const qnoEl  = div.querySelector(`input[name="qno_${idx+1}"]`);
    const markEl = div.querySelector(`input[name="mark_${idx+1}"]`);
    const ansEl  = div.querySelector(`textarea[name="ans_${idx+1}"]`);
    return {
      questionNo: qnoEl.value.trim(),
      mark:       markEl.value.trim(),
      answer:     ansEl.value.trim()
    };
  });

  DataManager.saveAnswerKey();

  // clear fields
  objInputs.forEach(i => i.value = '');
  document.querySelectorAll('#essay-answer-form input, #essay-answer-form textarea')
          .forEach(el => el.value = '');

  // show notification
  let notif = document.getElementById('answer-notification');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'answer-notification';
    document.getElementById('save-answers-btn')
            .insertAdjacentElement('afterend', notif);
  }
  notif.textContent = 'All answers (objective and essay) have been saved successfully';
  notif.style.color   = 'green';
}

// --- Student DB & Marking --- 
let editingIndex = null;
let markingContext = {
  student:        null,
  objectiveScore: null,
  essayScores:    {}  // map questionNo → awarded mark
};

// (unchanged) initDBEssaySection, addDBEssaySet, bindStudentButtons, bindClearStudentsButton, saveStudentData, updateStudentAnswerInfo, startEditStudent, updateStudentData ...

// --- Rename "Save Student" → "Add Student" and hook up Edit/Delete table ---
function bindStudentButtons() {
  const saveBtn   = document.getElementById('save-student-btn');
  saveBtn.textContent = 'Add Student';
  const updateBtn = document.createElement('button');
  updateBtn.id           = 'update-student-btn';
  updateBtn.type         = 'button';
  updateBtn.textContent  = 'Update Student';
  updateBtn.style.display = 'none';
  saveBtn.insertAdjacentElement('afterend', updateBtn);

  saveBtn.addEventListener('click', saveStudentData);
  updateBtn.addEventListener('click', updateStudentData);
}

// ... (rest of existing student DB code remains) ...

// --- Marking Tab: Student Search ---
function bindStudentSearch() {
  const btn = document.getElementById('upload-student-btn');
  btn.textContent = 'Search Student';
  btn.addEventListener('click', handleStudentSearch);
}

function handleStudentSearch() {
  const name = document.getElementById('student-name').value.trim();
  const found = DataManager.students.find(s => s.name === name);
  if (!found) {
    return alert(`Student "${name}" not found in database.`);
  }
  // populate fields
  document.getElementById('student-class').value = found.class;
  document.getElementById('student-arm').value   = found.arm;
  markingContext.student = found;

  // clear previous marking state
  markingContext.objectiveScore = null;
  markingContext.essayScores    = {};
  document.getElementById('objective-marking-details').textContent = '';
  document.getElementById('essay-marking-details').textContent     = '';
  document.getElementById('objective-marking-form').innerHTML = '';
  document.getElementById('essay-marking-form').innerHTML     = '';
}

// --- Marking Tab: Objective Populate & Marking ---
function bindPopulateObjective() {
  const btn = document.getElementById('populate-objectives-btn');
  btn.addEventListener('click', renderStudentObjectiveForm);
}

function renderStudentObjectiveForm() {
  if (!markingContext.student) {
    return alert('Please search and load a student first.');
  }
  const form = document.getElementById('objective-marking-form');
  form.innerHTML = '';
  // always 50 fields
  for (let i = 1; i <= 50; i++) {
    const ans = markingContext.student.objectiveAnswers[i - 1] || '';
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Q${i}:</label>
      <input type="text" name="oq_${i}" value="${ans}" />
    `;
    form.appendChild(div);
  }
}

function markObjectiveOnly() {
  if (!markingContext.student) {
    return alert('Load a student first before marking.');
  }
  const key = DataManager.answerKey.objective;
  let score = 0;
  key.forEach((item, idx) => {
    const input = document.querySelector(`#objective-marking-form input[name="oq_${item.questionNo}"]`);
    const stuAns = (input && input.value.trim().toLowerCase()) || '';
    if (stuAns === item.answer.toLowerCase()) score++;
  });
  markingContext.objectiveScore = score;

  // display
  document.getElementById('objective-marking-details').textContent =
    `Objective Score: ${score}`;

  // store/update in scores DB
  const name  = markingContext.student.name;
  const cls   = markingContext.student.class;
  const arm   = markingContext.student.arm;
  const existing = DataManager.scores.find(r => r.name === name);
  if (existing) {
    existing.objective = score;
    existing.total     = existing.objective + existing.essay;
  } else {
    DataManager.scores.push({
      name, class: cls, arm,
      objective: score,
      essay:     0,
      total:     score
    });
  }
  DataManager.saveScores();
  updateScoreTable();
}

// attach new override for inline onclick
window.markObjectiveOnly = markObjectiveOnly;

// --- Marking Tab: Essay Rendering & Tools ---
function bindFinalizeButton() {
  window.finalizeMarking = function() {
    if (!markingContext.student) {
      return alert('Load a student first.');
    }
    const name        = markingContext.student.name;
    const cls         = markingContext.student.class;
    const arm         = markingContext.student.arm;
    const objScore    = markingContext.objectiveScore || 0;
    const essayScore  = Object.values(markingContext.essayScores)
                               .reduce((a,b) => a + b, 0);

    // update scores DB
    const existing = DataManager.scores.find(r => r.name === name);
    if (existing) {
      existing.essay = essayScore;
      existing.total = objScore + essayScore;
    } else {
      DataManager.scores.push({
        name, class: cls, arm,
        objective: objScore,
        essay:     essayScore,
        total:     objScore + essayScore
      });
    }
    DataManager.saveScores();
    updateScoreTable();
    document.getElementById('marking-notification').textContent = 'Mark recorded!';
  };
}

// render essay form whenever you load a student
document.getElementById('marking').addEventListener('click', () => {
  if (!markingContext.student) return;
  const container = document.getElementById('essay-marking-form');
  if (container.childElementCount) return; // already rendered
  const key = DataManager.answerKey.essay;
  key.forEach(item => {
    const qNo    = item.questionNo;
    const tMark  = Number(item.mark) || 0;
    const tAns   = item.answer;
    // student's essay answer (image only)
    const stuEntry = markingContext.student.essayAnswers
                          .find(e => e.questionNo === qNo);
    let preview = '';
    if (stuEntry && stuEntry.answer.startsWith('data:')) {
      preview = `<img src="${stuEntry.answer}" style="max-width:100px;"/>`;
    }
    // build row
    const row = document.createElement('div');
    row.className = 'essay-marking-row';
    row.innerHTML = `
      <div class="teacher-answer">
        <strong>${qNo} [${tMark}]:</strong><br>${tAns}
      </div>
      <div class="student-answer">
        ${preview}
      </div>
      <div class="mark-tools" data-qno="${qNo}" data-mark="${tMark}">
        <button class="mark-correct">✅</button>
        <button class="mark-incorrect">❌</button>
        <button class="mark-custom">✏️</button>
        <button class="mark-erase">🗑️</button>
        <span class="awarded-mark" id="awarded-${qNo}"></span>
      </div>
    `;
    container.appendChild(row);
  });

  // bind all tool buttons
  container.querySelectorAll('.mark-correct').forEach(btn => {
    btn.addEventListener('click', e => {
      const parent = e.target.closest('.mark-tools');
      const q = parent.dataset.qno;
      const m = Number(parent.dataset.mark);
      markingContext.essayScores[q] = m;
      updateAwardAndTotal(q);
    });
  });
  container.querySelectorAll('.mark-incorrect').forEach(btn => {
    btn.addEventListener('click', e => {
      const q = e.target.closest('.mark-tools').dataset.qno;
      markingContext.essayScores[q] = 0;
      updateAwardAndTotal(q);
    });
  });
  container.querySelectorAll('.mark-erase').forEach(btn => {
    btn.addEventListener('click', e => {
      const q = e.target.closest('.mark-tools').dataset.qno;
      delete markingContext.essayScores[q];
      updateAwardAndTotal(q);
    });
  });
  container.querySelectorAll('.mark-custom').forEach(btn => {
    btn.addEventListener('click', e => {
      const parent = e.target.closest('.mark-tools');
      const q = parent.dataset.qno;
      // don't duplicate input
      if (parent.querySelector('.custom-input')) return;
      const input = document.createElement('input');
      input.type  = 'number';
      input.className = 'custom-input';
      input.placeholder = 'Mark';
      const done = document.createElement('button');
      done.textContent = 'Done';
      done.className = 'custom-done';
      parent.appendChild(input);
      parent.appendChild(done);
      done.addEventListener('click', () => {
        const v = Number(input.value);
        if (isNaN(v)) return alert('Enter a valid number');
        markingContext.essayScores[q] = v;
        parent.removeChild(input);
        parent.removeChild(done);
        updateAwardAndTotal(q);
      });
    });
  });
});

function updateAwardAndTotal(qNo) {
  const awardedEl = document.getElementById(`awarded-${qNo}`);
  awardedEl.textContent = markingContext.essayScores[qNo] != null
    ? markingContext.essayScores[qNo]
    : '';
  // update essay total display
  const sum = Object.values(markingContext.essayScores)
                    .reduce((a,b) => a + b, 0);
  document.getElementById('essay-marking-details').textContent =
    `Essay Score: ${sum}`;
}

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
