// --- Tab Switching ---
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- Global Data & Persistence Functions ---
const essayLimit = 20;
let answerData = { objectives: {}, essays: {} };
let studentDB = [];
let studentScores = [];

// persist to localStorage
function persistAnswers()   { localStorage.setItem('answerData',   JSON.stringify(answerData)); }
function persistDB()        { localStorage.setItem('studentDB',    JSON.stringify(studentDB)); }
function persistScores()    { localStorage.setItem('studentScores', JSON.stringify(studentScores)); }

// reset all data
function resetAllData() {
  if (!confirm('Reset EVERYTHING? This cannot be undone.')) return;
  localStorage.clear();
  answerData   = { objectives:{}, essays:{} };
  studentDB    = [];
  studentScores= [];
  // clear forms & tables
  createObjectiveFormTwoCol(objAnswerForm, 'objective-answer');
  essayAnswerForm.innerHTML = '';
  objectiveMarkForm.innerHTML = '';
  essayMarkForm.innerHTML = '';
  studentSelect.innerHTML = '<option value="">--Select Student--</option>';
  renderStudentDBTable();
  renderScoreTable();
  alert('All data reset.');
}

// --- Answer Tab Helpers ---
const objAnswerForm  = document.getElementById('objective-answer-form');
const essayAnswerForm= document.getElementById('essay-answer-form');
function createObjectiveFormTwoCol(container, prefix, defaultCount = 50) {
  container.innerHTML = '';
  container.classList.add('two-col-form');
  for (let i = 1; i <= defaultCount; i++) {
    let div = document.createElement('div');
    div.innerHTML = `<label>${i}.</label>
      <input type="text" id="${prefix}-${i}" maxlength="50">`;
    container.appendChild(div);
  }
}
function createEssayForm(container, prefix, count = essayLimit) {
  container.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    let div = document.createElement('div');
    div.innerHTML = `
      <label>Q${i}</label>
      <input type="text" id="${prefix}-qn-${i}" placeholder="Question No">
      <input type="number" id="${prefix}-mark-${i}" placeholder="Mark">
      <textarea id="${prefix}-ans-${i}" placeholder="Answer"></textarea>
    `;
    container.appendChild(div);
  }
}
function saveAnswerData() {
  answerData = { objectives: {}, essays: {} };
  for (let i = 1; i <= 50; i++) {
    let v = document.getElementById(`objective-answer-${i}`).value.trim();
    if (v) answerData.objectives[i] = v;
  }
  for (let i = 1; i <= essayLimit; i++) {
    let qn = document.getElementById(`essay-answer-qn-${i}`).value.trim(),
        mk = parseInt(document.getElementById(`essay-answer-mark-${i}`).value) || 0,
        an = document.getElementById(`essay-answer-ans-${i}`).value.trim();
    if (qn && an) answerData.essays[qn] = { mark: mk, answer: an };
  }
  persistAnswers();
  alert('Answers saved.');
}

// --- Student DB Helpers ---
const dbEssayForm = document.getElementById('db-essay-form');
const studentSelect = document.createElement('select');
studentSelect.id = 'student-select';

function addNewEssayGroup(existing = {}) {
  let idx = dbEssayForm.children.length + 1;
  if (idx > essayLimit) return;
  let div = document.createElement('div');
  div.className = 'essay-group';
  div.innerHTML = `
    <label>Q${idx}:</label>
    <input type="text" class="db-essay-qn" placeholder="Question No" value="${existing.qNo||''}">
    <textarea class="db-essay-ans" placeholder="Answer">${existing.answer||''}</textarea>
    <input type="file" class="db-essay-img" accept="image/*">
    <div class="file-preview">${existing.image? `<img src="${existing.image}" alt="preview" />` : ''}</div>
    <div class="essay-addition">
      <button type="button" class="add-essay-btn">Continue</button>
      <button type="button" class="delete-essay-btn">Delete</button>
    </div>
    <div class="error-msg"></div>
  `;
  dbEssayForm.appendChild(div);
  // Preview on image select
  div.querySelector('.db-essay-img').addEventListener('change', e => {
    let file = e.target.files[0];
    if (!file) return;
    let url = URL.createObjectURL(file);
    div.querySelector('.file-preview').innerHTML = `<img src="${url}" alt="preview" />`;
    existing.image = url;
  });
  // continue/delete
  div.querySelector('.add-essay-btn').onclick = () => addNewEssayGroup();
  div.querySelector('.delete-essay-btn').onclick = () => div.remove();
}

function saveStudentData() {
  let name = dbName.value.trim(),
      cls  = dbClass.value.trim(),
      arm  = dbArm.value.trim(),
      obj  = dbObjective.value.trim();
  if (!name||!cls||!arm||!obj) { alert('All fields required.'); return; }
  let groups = [...dbEssayForm.children], essays = [];
  for (let g of groups) {
    let q = g.querySelector('.db-essay-qn').value.trim(),
        a = g.querySelector('.db-essay-ans').value.trim(),
        img = g.querySelector('.file-preview img')?.src || '';
    if (!q || (!a && !img)) {
      g.querySelector('.error-msg').innerText = 'Need Q# and (answer or image)';
      return;
    }
    g.querySelector('.error-msg').innerText = '';
    essays.push({ qNo: q, answer: a, image: img });
  }
  studentDB.push({ name, class: cls, arm, objAnswer: obj, essayAnswers: essays });
  if (studentDB.length > 400) studentDB.shift();
  persistDB();
  renderStudentDBTable();
  fillStudentSelect();
  dbForm.reset();
  dbEssayForm.innerHTML = '';
  addNewEssayGroup();
}

// render student table + resetStudents + fill dropdown
function renderStudentDBTable() {
  let c = document.getElementById('student-db-reference');
  c.innerHTML = `<table id="student-db-table">
    <thead><tr><th>Name</th><th>Class</th><th>Arm</th>
    <th>Objective</th><th>Essay</th><th>Edit</th></tr></thead>
    <tbody>${studentDB.map((s,i)=>`
      <tr>
        <td>${s.name}</td><td>${s.class}</td><td>${s.arm}</td>
        <td>${s.objAnswer.split(',').join(', ')}</td>
        <td>${s.essayAnswers.map(e=> e.image? '<img src="'+e.image+'" />': e.answer).join('<br>')}</td>
        <td><button onclick="editStudent(${i})">Edit</button></td>
      </tr>`).join('')}
    </tbody>
  </table>
  <button type="button" onclick="resetStudentDB()">Reset Students</button>`;
}

function fillStudentSelect() {
  studentSelect.innerHTML = '<option value="">--Select Student--</option>' +
    studentDB.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('');
}

// edit student
function editStudent(i) {
  let s = studentDB.splice(i,1)[0];
  persistDB(); renderStudentDBTable(); fillStudentSelect();
  dbName.value = s.name;
  dbClass.value= s.class;
  dbArm.value  = s.arm;
  dbObjective.value = s.objAnswer;
  dbEssayForm.innerHTML='';
  s.essayAnswers.forEach(e=>addNewEssayGroup(e));
}

// --- Marking Tab Helpers ---
const objMarkForm = document.getElementById('objective-marking-form');
const essayMarkForm = document.getElementById('essay-marking-form');

function setupMarkingDropdown() {
  let container = document.getElementById('student-info-form');
  container.appendChild(studentSelect);
  studentSelect.onchange = () => {
    let idx = parseInt(studentSelect.value);
    if (isNaN(idx)) return;
    let s = studentDB[idx];
    studentName.value = s.name;
    studentClass.value= s.class;
    studentArm.value  = s.arm;
  };
}

function loadStudentForMarking() {
  let idx = parseInt(studentSelect.value);
  if (isNaN(idx)) { alert('Select a student'); return; }
  let s = studentDB[idx];
  // 3. objective: comma split
  let answers = s.objAnswer.split(',');
  createObjectiveFormTwoCol(objMarkForm, 'objective-marking');
  answers.forEach((ans,i)=>{
    let inp = document.getElementById(`objective-marking-${i+1}`);
    if(inp) inp.value = ans.trim();
  });
  // mark details container
  let det = document.getElementById('objective-mark-details');
  if(!det) {
    det = document.createElement('div');
    det.id = 'objective-mark-details';
    objMarkForm.insertAdjacentElement('afterend', det);
  }
  det.innerHTML = ''; // clear
  // 5. Mark blanks incorrect, show table
  let table = '<table><tr><th>Q</th><th>Correct</th><th>Student</th><th>Remark</th></tr>';
  for(let i=1;i<=Object.keys(answerData.objectives).length;i++){
    let corr = answerData.objectives[i]|| '';
    let stud = (answers[i-1]||'').trim();
    let remark = (corr.toLowerCase()===stud.toLowerCase())?'✔':'✖';
    table += `<tr><td>${i}</td><td>${corr}</td><td>${stud}</td><td>${remark}</td></tr>`;
  }
  table += '</table>';
  det.innerHTML = table;

  // 5. essay
  essayMarkForm.innerHTML = '';
  Object.entries(answerData.essays).forEach(([q,mod],idx)=>{
    let stud = s.essayAnswers.find(e=>e.qNo===q);
    let studDisplay = stud.image
      ? `<img src="${stud.image}" class="essay-preview2"/>`
      : stud.answer;
    let row = document.createElement('div');
    row.className = 'essay-row';
    row.innerHTML = `
      <div class="col1">Q${q}: ${mod.answer} (mark:${mod.mark})</div>
      <div class="col2">${studDisplay}</div>
      <div class="col3">
        <button onclick="assignEssayMark(${idx},'correct')">✔</button>
        <button onclick="assignEssayMark(${idx},'incorrect')">✖</button>
        <button onclick="assignEssayMark(${idx},'custom',${idx})">✎</button>
        <button onclick="assignEssayMark(${idx},'erase',${idx})">⎌</button>
        <input type="number" id="custom-essay-${idx}" style="display:none">
        <button id="done-essay-${idx}" style="display:none" onclick="applyCustomEssay(${idx})">Done</button>
        <input type="hidden" id="essay-mark-${idx}" value="0">
        <input type="hidden" id="essay-qn-${idx}"   value="${q}">
      </div>`;
    essayMarkForm.appendChild(row);
  });

  // show reset all button in score tab
  if (!document.getElementById('reset-all-btn')) {
    let sb = document.getElementById('score').querySelector('.score-controls');
    let btn = document.createElement('button');
    btn.id = 'reset-all-btn';
    btn.innerText = 'Reset All';
    btn.onclick = resetAllData;
    sb.appendChild(btn);
  }
}

// collect scores & push to score tab
function finalizeMarking() {
  let name = studentName.value, cls = studentClass.value, arm = studentArm.value;
  // objective
  let objScore=0, totalObj = Object.keys(answerData.objectives).length;
  for(let i=1;i<=totalObj;i++){
    let stud = document.getElementById(`objective-marking-${i}`).value.trim();
    if(answerData.objectives[i]?.toLowerCase()===stud.toLowerCase()) objScore++;
  }
  // essay
  let essayScore=0;
  essayMarkForm.querySelectorAll('[id^="essay-mark-"]').forEach(el=>{
    essayScore += parseInt(el.value)||0;
  });
  studentScores.push({ name, class: cls, arm, objScore, essayScore, total: objScore+essayScore });
  persistScores(); renderScoreTable();
}

// update score table
function renderScoreTable(){
  let tb = document.querySelector('#score-table tbody');
  tb.innerHTML = '';
  studentScores.forEach(s=>{
    tb.insertAdjacentHTML('beforeend',`
      <tr><td>${s.name}</td><td>${s.class}</td><td>${s.arm}</td>
          <td>${s.objScore}</td><td>${s.essayScore}</td><td>${s.total}</td></tr>`);
  });
}

// --- Essay marking actions (as before) ---
function assignEssayMark(idx, type) {
  let markInput = document.getElementById(`essay-mark-${idx}`);
  let qn = document.getElementById(`essay-qn-${idx}`).value;
  let model = answerData.essays[qn];
  if (type==='correct') {
    markInput.value = model?.mark || 0;
  } else if(type==='incorrect') {
    markInput.value = 0;
  } else if(type==='erase') {
    markInput.value = '';
  } else {
    document.getElementById(`custom-essay-${idx}`).style.display='inline-block';
    document.getElementById(`done-essay-${idx}`).style.display='inline-block';
  }
}
function applyCustomEssay(idx){
  let val = document.getElementById(`custom-essay-${idx}`).value;
  document.getElementById(`essay-mark-${idx}`).value = val;
  document.getElementById(`custom-essay-${idx}`).style.display='none';
  document.getElementById(`done-essay-${idx}`).style.display='none';
}

// --- File upload / OCR (unchanged) ---
// ...

// --- Initialization on load ---
window.onload = () => {
  // load persisted data
  answerData    = JSON.parse(localStorage.getItem('answerData')   || '{}');
  studentDB     = JSON.parse(localStorage.getItem('studentDB')    || '[]');
  studentScores = JSON.parse(localStorage.getItem('studentScores')|| '[]');

  // Answer tab
  createObjectiveFormTwoCol(objAnswerForm, 'objective-answer');
  createEssayForm(essayAnswerForm, 'essay-answer');
  document.getElementById('upload-objective-answer')
    .addEventListener('change', e=>handleFileUpload(e,'objective','objective-answer'));
  document.getElementById('upload-essay-answer')
    .addEventListener('change', e=>handleFileUpload(e,'essay','essay-answer'));

  // Student DB
  addNewEssayGroup();
  renderStudentDBTable();
  fillStudentSelect();

  // Marking
  setupMarkingDropdown();
  setupMarkingUploadButton();

  // Score
  renderScoreTable();
};
