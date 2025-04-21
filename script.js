// script.js

// --- Data Manager (uses localStorage) ---
const DataManager = {
  answerKey: { objective: [], essay: [] },
  students: [],
  scores: [],
  currentMarking: { objective: 0, essay: 0 },

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
    bindUploadStudentButton();
    bindPopulateObjectiveButton();
    customizeMarkingTabButtons();
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

// --- Render Answer Forms (unchanged) ---
function renderObjectiveKeyForm() { /* ... existing code ... */ }
function renderEssayKeyForm() { /* ... existing code ... */ }

// --- Bind Save / Upload Handlers (Answer Tab) ---
function bindAnswerSaveButton() {
  const btn = document.getElementById('save-answers-btn');
  if (btn) {
    btn.textContent = 'Save Answers';
    btn.addEventListener('click', saveAnswerData);
  }
}
function bindUploadHandlers() { /* ... existing code ... */ }

// --- Student DB & Marking Initialization ---
let editingIndex = null;

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

function updateStudentAnswerInfo() {
  const c = document.getElementById('student-db-reference');
  c.innerHTML = '';
  if (!DataManager.students.length) return;

  const tbl = document.createElement('table');
  tbl.innerHTML = `
    <thead>
      <tr><th>Student Name</th><th>Objective Answer</th><th>Essay Answer</th><th>Actions</th></tr>
    </thead>
    <tbody>
      ${DataManager.students.map((s, i) => `
        <tr>
          <td>${s.name}</td>
          <td>${s.objectiveAnswers.join(', ')}</td>
          <td>
            ${s.essayAnswers.map(e =>
              e.answer.startsWith('data:')
                ? `<img src="${e.answer}" style="width:50px;height:50px;"/>`
                : e.answer
            ).join('<br/>')}
          </td>
          <td>
            <button data-index="${i}" class="edit-student">Edit</button>
            <button data-index="${i}" class="delete-student">Delete</button>
          </td>
        </tr>`).join('')}
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

// ... existing saveStudentData, updateStudentData, initDBEssaySection, addDBEssaySet ...

// --- Marking Tab Custom Behavior ---
function bindUploadStudentButton() {
  const btn = document.getElementById('upload-student-btn');
  btn.textContent = 'Search Student';
  btn.addEventListener('click', populateStudentInfo);
}

function populateStudentInfo() {
  const name = document.getElementById('student-name').value.trim();
  const student = DataManager.students.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (!student) {
    alert('Student not found');
    return;
  }
  document.getElementById('student-class').value = student.class;
  document.getElementById('student-arm').value = student.arm;
  // store current student for marking
  DataManager.currentMarking.student = student;
  // auto-populate objective & essay
  populateObjectiveForMarking(student);
  populateEssayForMarking(student);
}

function bindPopulateObjectiveButton() {
  const btn = document.getElementById('populate-objective-btn');
  btn.addEventListener('click', () => {
    const student = DataManager.currentMarking.student;
    if (!student) return alert('Load a student first');
    populateObjectiveForMarking(student);
  });
}

function populateObjectiveForMarking(student) {
  const form = document.getElementById('objective-marking-form');
  form.innerHTML = '';
  const count = 50;
  for (let i = 1; i <= count; i++) {
    const studentAns = student.objectiveAnswers[i - 1] || '';
    const div = document.createElement('div');
    div.innerHTML = `<label>Q${i}:</label><input type="text" name="mark_q${i}" value="${studentAns}" readonly/>`;
    form.appendChild(div);
  }
}

function markObjectiveOnly() {
  const student = DataManager.currentMarking.student;
  if (!student) return alert('Load a student first');
  const teacherKey = DataManager.answerKey.objective;
  const studentAns = student.objectiveAnswers;

  let correct = 0;
  teacherKey.forEach((t, idx) => {
    if (studentAns[idx] && studentAns[idx].toLowerCase() === t.answer.toLowerCase()) {
      correct++;
    }
  });
  DataManager.currentMarking.objective = correct;
  const out = document.getElementById('objective-marking-details');
  out.textContent = `Objective Score: ${correct} / ${teacherKey.length}`;
}

function populateEssayForMarking(student) {
  const container = document.getElementById('essay-marking-form');
  container.innerHTML = '';
  const key = DataManager.answerKey.essay;
  key.forEach((k, idx) => {
    const set = document.createElement('div');
    set.className = 'essay-marking-set';
    const studentAnsObj = student.essayAnswers.find(e => e.questionNo === k.questionNo) || {};
    const imgPreview = studentAnsObj.answer && studentAnsObj.answer.startsWith('data:')
      ? `<img src="${studentAnsObj.answer}" style="width:100px;"/>`
      : '<span>No Answer Image</span>';
    set.innerHTML = `
      <div class="essay-col teacher-answer">
        <strong>Q${k.questionNo}</strong><br/>Mark: ${k.mark}<br/>${k.answer}
      </div>
      <div class="essay-col student-answer">
        ${imgPreview}
      </div>
      <div class="essay-col marking-tools">
        <button type="button" class="mark-correct" data-mark="${k.mark}">✔</button>
        <button type="button" class="mark-incorrect">✖</button>
        <button type="button" class="mark-custom">✎</button>
        <button type="button" class="mark-erase">🗑</button>
        <span class="awarded-mark" data-awarded="0">0</span>
      </div>
    `;
    container.appendChild(set);

    // bind tool buttons
    const tools = set.querySelector('.mark-correct');
    tools.addEventListener('click', () => awardMark(set, +tools.dataset.mark));
    set.querySelector('.mark-incorrect').addEventListener('click', () => awardMark(set, 0));
    set.querySelector('.mark-custom').addEventListener('click', () => {
      const custom = prompt('Enter custom mark:');
      const m = Number(custom);
      if (!isNaN(m)) awardMark(set, m);
    });
    set.querySelector('.mark-erase').addEventListener('click', () => awardMark(set, 0, true));
  });
}

function awardMark(set, mark, erase = false) {
  const span = set.querySelector('.awarded-mark');
  if (erase) {
    set.dataset.awarded = '0';
    span.textContent = '0';
  } else {
    set.dataset.awarded = mark;
    span.textContent = mark;
  }
  // recalc essay total
  const awarded = Array.from(document.querySelectorAll('.awarded-mark'))
    .reduce((sum, el) => sum + Number(el.textContent), 0);
  DataManager.currentMarking.essay = awarded;
  document.getElementById('marking-notification').textContent = `Essay Score: ${awarded}`;
}

function customizeMarkingTabButtons() {
  const fin = document.querySelector('#marking button[onclick^="finalizeMarking"]');
  if (fin) {
    fin.textContent = 'Record Mark';
    fin.onclick = recordMark;
  }
}

function recordMark() {
  const student = DataManager.currentMarking.student;
  if (!student) return alert('Load and mark a student first');
  const obj = DataManager.currentMarking.objective;
  const ess = DataManager.currentMarking.essay;
  const total = obj + ess;

  DataManager.scores.push({
    name: student.name,
    class: student.class,
    arm: student.arm,
    objective: obj,
    essay: ess,
    total: total
  });
  DataManager.saveScores();
  updateScoreTable();
  alert('Mark recorded');
  // reset marking UI
  document.getElementById('objective-marking-form').innerHTML = '';
  document.getElementById('objective-marking-details').textContent = '';
  document.getElementById('essay-marking-form').innerHTML = '';
  document.getElementById('marking-notification').textContent = '';
  document.getElementById('student-info-form').reset();
  DataManager.currentMarking = { student: null, objective: 0, essay: 0 };
}

// --- Score Tab remains unchanged ---
function updateScoreTable() { /* ... existing code ... */ }
function resetScores() { /* ... existing code ... */ }
function resetAllData() { /* ... existing code ... */ }

window.addEventListener('DOMContentLoaded', () => DataManager.init());
