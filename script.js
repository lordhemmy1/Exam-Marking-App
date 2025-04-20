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
const essayLimit = 20;
let answerData = { objectives: {}, essays: {} };
let studentData = [];
let studentDB = JSON.parse(localStorage.getItem('studentDB') || '[]');

// --- Notification Function ---
function notify(message) {
  const note = document.getElementById('marking-notification');
  if (note) note.innerText = message;
}

// --- Utility: Save to localStorage ---
function persistDB() {
  localStorage.setItem('studentDB', JSON.stringify(studentDB));
}

// --- Students Database: Generate Table ---
function renderStudentDBTable() {
  const container = document.getElementById('student-db-reference');
  container.innerHTML = `
    <table id="student-db-table">
      <thead>
        <tr>
          <th>Name</th><th>Class</th><th>Arm</th><th>Objective Answer</th><th>Essay Answers</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${studentDB.map((s, i) => {
          const essays = s.essayAnswers.map(e=>e.image?`[${e.image}]`:e.answer).join('; ');
          return `<tr data-index="${i}">
            <td>${s.name}</td>
            <td>${s.class}</td>
            <td>${s.arm}</td>
            <td>${s.objAnswer.replace(/\n/g,'<br>')}</td>
            <td>${essays}</td>
            <td><button onclick="editStudent(${i})">Edit</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

// --- Edit Student ---
function editStudent(idx) {
  const s = studentDB[idx];
  document.getElementById('db-student-name').value = s.name;
  document.getElementById('db-student-class').value = s.class;
  document.getElementById('db-student-arm').value = s.arm;
  document.getElementById('db-objective-answer').value = s.objAnswer;
  // rebuild essay form with existing data
  document.getElementById('db-essay-form').innerHTML = '';
  s.essayAnswers.forEach((ea, i) => {
    addNewEssayGroup(ea, idx);
  });
}

// --- New: Reset Entire Student DB ---
function resetStudentDB() {
  if (!confirm('Wipe all student records?')) return;
  studentDB = [];
  persistDB();
  renderStudentDBTable();
}

// --- Save Student (with validation + update) ---
function saveStudentData() {
  const name = document.getElementById('db-student-name').value.trim();
  const cls  = document.getElementById('db-student-class').value.trim();
  const arm  = document.getElementById('db-student-arm').value.trim();
  const obj  = document.getElementById('db-objective-answer').value.trim();
  // validate basics
  if (!name||!cls||!arm||!obj) {
    alert('Name, Class, Arm and Objective Answer are required.');
    return;
  }
  const groups = Array.from(document.querySelectorAll('#db-essay-form .essay-group'));
  let essayAnswers = [];
  for (let g of groups) {
    const qn  = g.querySelector('.db-essay-qn').value.trim();
    const ans = g.querySelector('.db-essay-ans').value.trim();
    const fileInput = g.querySelector('.db-essay-img');
    const img = fileInput.files[0]?.name || '';
    if (!qn) {
      g.querySelector('.error-msg')?.remove();
      g.insertAdjacentHTML('beforeend','<div class="error-msg">Question No required</div>');
      return;
    }
    if (!ans && !img) {
      g.querySelector('.error-msg')?.remove();
      g.insertAdjacentHTML('beforeend','<div class="error-msg">Answer text or image required</div>');
      return;
    }
    g.querySelector('.error-msg')?.remove();
    essayAnswers.push({ qNo: qn, answer: ans, image: img });
  }

  // if editing an existing record (we stored index on form)
  const editIdx = document.getElementById('db-student-form').dataset.editIndex;
  if (editIdx != null) {
    studentDB[editIdx] = { name, class: cls, arm, objAnswer: obj, essayAnswers };
    delete document.getElementById('db-student-form').dataset.editIndex;
  } else {
    studentDB.push({ name, class: cls, arm, objAnswer: obj, essayAnswers });
    if (studentDB.length>400) studentDB.shift();
  }

  persistDB();
  renderStudentDBTable();

  // reset form
  document.getElementById('db-student-form').reset();
  document.getElementById('db-essay-form').innerHTML = '';
  addNewEssayGroup();
}

// --- Essay Groups: Always attach continue/delete handlers ---
function addNewEssayGroup(existingData, editIdx) {
  const container = document.getElementById('db-essay-form');
  const idx = container.children.length + 1;
  if (idx>essayLimit) return;
  const div = document.createElement('div');
  div.classList.add('essay-group');
  div.innerHTML = `
    <label>Q${idx}:</label>
    <input type="text" class="db-essay-qn" placeholder="Question No" value="${existingData?.qNo||''}">
    <textarea class="db-essay-ans" placeholder="Answer">${existingData?.answer||''}</textarea>
    <input type="file" class="db-essay-img" accept="image/*">
    <div class="essay-addition">
      <button type="button" class="add-essay-btn">Continue</button>
      <button type="button" class="delete-essay-btn">Delete</button>
    </div>
    <div class="error-msg"></div>
  `;
  container.appendChild(div);
  div.querySelector('.add-essay-btn').addEventListener('click', () => {
    addNewEssayGroup();
  });
  div.querySelector('.delete-essay-btn').addEventListener('click', () => {
    div.remove();
  });
}

// --- Initialize DB Form on load ---
function initStudentDBForm() {
  const form = document.getElementById('db-student-form');
  form.insertAdjacentHTML('afterbegin','<button type="button" onclick="resetStudentDB()">Reset Database</button>');
  addNewEssayGroup();
  renderStudentDBTable();
}

// --- On load for everything else ---
window.onload = () => {
  initStudentDBForm();
  // <-- keep your existing calls to setupUploadListeners(), createObjectiveFormTwoCol(), etc.
};nt-arm'].value  = s.arm;
  };
  // Populate objectives button
  const btnObj = document.createElement('button');
  btnObj.type='button'; btnObj.id='populate-obj';
  btnObj.innerText='Load Objectives';
  info.append(btnObj);
  btnObj.onclick = populateObjectivesFromDB;
  // Mark objective button
  const btnMarkObj = document.createElement('button');
  btnMarkObj.type='button'; btnMarkObj.id='mark-objectives';
  btnMarkObj.innerText='Mark Objectives';
  document.getElementById('objective-marking-form').after(btnMarkObj);
  btnMarkObj.onclick = markObjectives;
  // Mark essay button
  const btnMarkEssay = document.createElement('button');
  btnMarkEssay.type='button'; btnMarkEssay.id='mark-essay';
  btnMarkEssay.innerText='Mark Essays';
  document.getElementById('essay-marking-form').after(btnMarkEssay);
  btnMarkEssay.onclick = markEssays;
}

// --- Populate Objectives from DB into existing form ---
function populateObjectivesFromDB() {
  const idx = +document.getElementById('student-select').value;
  if (isNaN(idx)) return alert('Select a student');
  const objArr = studentDB[idx].objAnswer.split(',').map(v=>v.trim());
  for (let i=1;i<=DEFAULT_OBJ_COUNT;i++){
    const inp = document.getElementById(`objective-marking-${i}`);
    if(inp) inp.value = objArr[i-1]||'';
  }
}

// --- Mark Objectives ---
function markObjectives() {
  const details = [];
  let score=0;
  for(let i=1;i<=DEFAULT_OBJ_COUNT;i++){
    const studentAns = document.getElementById(`objective-marking-${i}`)?.value.trim()||'';
    const correct  = answerData.objectives[i]||'';
    const ok = correct.toLowerCase()===studentAns.toLowerCase();
    if(ok) score++;
    details.push({q:i,correct,student:studentAns,remark:ok?'✔':'✖'});
  }
  // render table
  let html='<table><thead><tr><th>Q</th><th>Correct</th><th>Student</th><th>Remark</th></tr></thead><tbody>';
  details.forEach(r=> html+=`<tr><td>${r.q}</td><td>${r.correct}</td><td>${r.student}</td><td>${r.remark}</td></tr>`);
  html+='</tbody></table>';
  document.getElementById('objective-detail-table').outerHTML=html;
  notify(`Objective score: ${score}/${DEFAULT_OBJ_COUNT}`);
  // store partial
  studentData.currentObjScore = score;
}

// --- Mark Essays ---
function markEssays() {
  const idx = +document.getElementById('student-select').value;
  if (isNaN(idx)) return alert('Select a student');
  const s = studentDB[idx];
  let totalEssayScore=0;
  let html='<table><thead><tr><th>Q</th><th>Teacher</th><th>Student</th><th>Remark</th><th>Action</th></tr></thead><tbody>';
  s.essayAnswers.forEach(ea=>{
    const model = answerData.essays[ea.qNo];
    const correctAns = model?.answer||'';
    const correctMark= model?.mark||0;
    const studentImg = ea.imageData?`<img src="${ea.imageData}" width="100">`:ea.answer;
    html+=`<tr>
      <td>${ea.qNo}</td>
      <td>${correctAns} (${correctMark})</td>
      <td>${studentImg}</td>
      <td id="remark-${ea.qNo}">-</td>
      <td>
        <button onclick="setEssayMark('${ea.qNo}','correct')">✔</button>
        <button onclick="setEssayMark('${ea.qNo}','incorrect')">✖</button>
        <button onclick="setEssayMark('${ea.qNo}','custom')">✎</button>
      </td>
    </tr>`;
  });
  html+='</tbody></table>';
  document.getElementById('essay-detail-table').outerHTML=html;
  studentData.currentEssayScore = 0;
  notify('Use the ✔, ✖ or ✎ buttons to assign essay marks.');
}

// --- Set individual essay mark ---
function setEssayMark(qNo, type) {
  const model = answerData.essays[qNo];
  let mark = 0;
  if (type==='correct' && model) mark = model.mark;
  else if (type==='custom') {
    const m = prompt('Enter custom mark');
    if (m!==null) mark = +m||0;
  }
  studentData.currentEssayScore += mark;
  document.getElementById(`remark-${qNo}`).innerText = mark;
}

// --- Finalize and Save Score ---
function finalizeScore() {
  const idx = +document.getElementById('student-select').value;
  if (isNaN(idx)) return;
  const s   = studentDB[idx];
  const obj = studentData.currentObjScore||0;
  const ess = studentData.currentEssayScore||0;
  studentData.push({ name:s.name, class:s.class, arm:s.arm, obj, ess, total:obj+ess });
  persistScores();
  renderScoreTable();
}

// --- Score Tab ---
function renderScoreTable() {
  const tbody = document.querySelector('#score-table tbody');
  tbody.innerHTML = studentData.map(s=>
    `<tr><td>${s.name}</td><td>${s.class}</td><td>${s.arm}</td>
      <td>${s.obj}</td><td>${s.ess}</td><td>${s.total}</td></tr>`
  ).join('');
  // add Reset All button if not present
  if (!document.getElementById('reset-all')) {
    const btn = document.createElement('button');
    btn.id = 'reset-all';
    btn.innerText = 'Reset All';
    btn.onclick = ()=>{
      if(confirm('Reset everything?')) {
        localStorage.clear();
        location.reload();
      }
    };
    document.querySelector('.score-controls').append(btn);
  }
}

// --- Window Load Initialization ---
window.addEventListener('load', () => {
  // Answer Tab
  createObjectiveFormTwoCol(document.getElementById('objective-answer-form'),'objective-answer');
  createEssayForm(document.getElementById('essay-answer-form'),'essay-answer');
  setupUploadListeners();
  // Students DB
  initDBForm();
  // Marking Tab
  initMarkingTab();
  // Score Tab
  renderScoreTable();
});
