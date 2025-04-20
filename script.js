// --- Tab Switching ---
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- Persistence Keys ---
const KEY_ANSWERS   = 'answerData';
const KEY_STUDENTDB = 'studentDB';
const KEY_SCORES    = 'studentData';

// --- Global Data Structures (loaded from localStorage) ---
let answerData  = JSON.parse(localStorage.getItem(KEY_ANSWERS)   || '{"objectives":{},"essays":{}}');
let studentDB   = JSON.parse(localStorage.getItem(KEY_STUDENTDB) || '[]');
let studentData = JSON.parse(localStorage.getItem(KEY_SCORES)    || '[]');

// --- Limits ---
const DEFAULT_OBJ_COUNT = 50;
const ESSAY_LIMIT       = 20;

// --- Persistence Helpers ---
function persistAnswers()   { localStorage.setItem(KEY_ANSWERS,   JSON.stringify(answerData)); }
function persistDB()        { localStorage.setItem(KEY_STUDENTDB, JSON.stringify(studentDB)); }
function persistScores()    { localStorage.setItem(KEY_SCORES,    JSON.stringify(studentData)); }

// --- Notification ---
function notify(msg) {
  const note = document.getElementById('marking-notification');
  if (note) note.innerText = msg;
}

// --- Answer Tab: Dynamic Forms ---
function createObjectiveFormTwoCol(container, prefix, count = DEFAULT_OBJ_COUNT) {
  container.innerHTML = '';
  container.classList.add('two-col-form');
  for (let i = 1; i <= count; i++) {
    container.innerHTML += `<div><label>${i}.</label>
      <input type="text" id="${prefix}-${i}" maxlength="50" value="${answerData.objectives[i]||''}"></div>`;
  }
}
function createEssayForm(container, prefix, limit = ESSAY_LIMIT) {
  container.innerHTML = '';
  for (let i = 1; i <= limit; i++) {
    const e = answerData.essays[i]||{qn:'',mark:'',answer:''};
    container.innerHTML += `
      <div>
        <label>Q${i}</label>
        <input type="text" id="${prefix}-qn-${i}" placeholder="Question No" value="${e.qn||''}">
        <input type="number" id="${prefix}-mark-${i}" placeholder="Mark"       value="${e.mark||''}">
        <textarea id="${prefix}-ans-${i}" placeholder="Answer">${e.answer||''}</textarea>
      </div>`;
  }
}
function saveAnswerData() {
  answerData.objectives = {};
  for (let i = 1; i <= DEFAULT_OBJ_COUNT; i++) {
    const v = document.getElementById(`objective-answer-${i}`).value.trim();
    if (v) answerData.objectives[i] = v;
  }
  answerData.essays = {};
  for (let i = 1; i <= ESSAY_LIMIT; i++) {
    const q = document.getElementById(`essay-answer-qn-${i}`).value.trim();
    const m = document.getElementById(`essay-answer-mark-${i}`).value;
    const a = document.getElementById(`essay-answer-ans-${i}`).value.trim();
    if (q && a) answerData.essays[q] = { mark: +m||0, answer: a };
  }
  persistAnswers();
  alert('Teacher answers saved.');
}

// --- Students Database Tab ---
function renderStudentDBTable() {
  const c = document.getElementById('student-db-reference');
  c.innerHTML = '<button id="reset-db">Reset Database</button><table><thead><tr>'
    +['Name','Class','Arm','Objective','Essay','Actions'].map(h=>`<th>${h}</th>`).join('')
    +'</tr></thead><tbody>'
    + studentDB.map((s,i)=>{
      const obj = s.objAnswer.split(',').map((v,j)=>`${j+1}:${v.trim()}`).join('<br>');
      const essays = s.essayAnswers.map(e=>`Q${e.qNo}: `+
        (e.answer?e.answer:`<img src="${e.imageData}" width="100">`))
        .join('<br>');
      return `<tr data-idx="${i}">
        <td>${s.name}</td><td>${s.class}</td><td>${s.arm}</td>
        <td>${obj}</td><td>${essays}</td>
        <td><button onclick="startEdit(${i})">Edit</button></td>
      </tr>`;
    }).join('')+'</tbody></table>';
  document.getElementById('reset-db').onclick = () => {
    if(confirm('Clear all students?')) {
      studentDB=[]; persistDB(); renderStudentDBTable(); initDBForm();
    }
  };
}

function initDBForm() {
  const form = document.getElementById('student-db-form');
  form.reset();
  form.removeAttribute('data-edit-idx');
  const essayContainer = document.getElementById('db-essay-form');
  essayContainer.innerHTML = '';
  addEssayGroup();
}

function startEdit(idx) {
  const s = studentDB[idx];
  const form = document.getElementById('student-db-form');
  form.dataset.editIdx = idx;
  form['db-student-name'].value  = s.name;
  form['db-student-class'].value = s.class;
  form['db-student-arm'].value   = s.arm;
  form['db-objective-answer'].value = s.objAnswer;
  const essayContainer = document.getElementById('db-essay-form');
  essayContainer.innerHTML = '';
  s.essayAnswers.forEach(e=>addEssayGroup(e));
}

function addEssayGroup(data={qn:'',answer:'',imageData:''}) {
  const c = document.getElementById('db-essay-form');
  const idx = c.children.length+1;
  const div = document.createElement('div');
  div.classList.add('essay-group');
  div.innerHTML = `
    <label>Q${idx}:</label>
    <input type="text" class="db-essay-qn" value="${data.qn}" placeholder="Question No">
    <textarea class="db-essay-ans" placeholder="Answer">${data.answer}</textarea>
    <input type="file" class="db-essay-img" accept="image/*">
    <div class="preview">${data.imageData?`<img src="${data.imageData}" width="100">`:''}</div>
    <div class="errors"></div>
    <button class="add">Continue</button>
    <button class="del">Delete</button>
  `;
  c.append(div);
  div.querySelector('.add').onclick = ()=>addEssayGroup();
  div.querySelector('.del').onclick = ()=>div.remove();
  const imgInput = div.querySelector('.db-essay-img');
  imgInput.onchange = e=>{
    const f=e.target.files[0];
    const reader=new FileReader();
    reader.onload = evt=> div.querySelector('.preview').innerHTML=`<img src="${evt.target.result}" width="100">`, 
    reader.readAsDataURL(f);
  };
}

function saveStudentData() {
  const name = form['db-student-name'].value.trim();
  const cls  = form['db-student-class'].value.trim();
  const arm  = form['db-student-arm'].value.trim();
  const obj  = form['db-objective-answer'].value.trim();
  if(!name||!cls||!arm||!obj){ alert('Fill all fields'); return; }
  const groups = [...document.querySelectorAll('.essay-group')];
  const essayAnswers = [];
  for(let g of groups){
    const qn = g.querySelector('.db-essay-qn').value.trim();
    const ans= g.querySelector('.db-essay-ans').value.trim();
    const imgData = g.querySelector('.preview img')?.src||'';
    if(!qn||( !ans && !imgData )) {
      g.querySelector('.errors').innerText='Provide QNo and either text or image';
      return;
    }
    g.querySelector('.errors').innerText='';
    essayAnswers.push({qNo:qn,answer:ans,imageData:imgData});
  }
  const record={name, class:cls, arm, objAnswer:obj, essayAnswers};
  const editIdx = parseInt(form.dataset.editIdx);
  if (!isNaN(editIdx)) studentDB[editIdx]=record;
  else {
    studentDB.push(record);
    if(studentDB.length>400) studentDB.shift();
  }
  persistDB(); renderStudentDBTable(); initDBForm();
}

// --- Marking Tab Setup ---
function initMarkingTab() {
  const sel = document.createElement('select');
  sel.id='student-select';
  sel.innerHTML='<option value="">--Select Student--</option>'
    +studentDB.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('');
  const info = document.getElementById('student-info-form');
  info.prepend(sel);
  sel.onchange = ()=>{
    const i=sel.value; if(i==='') return;
    const s=studentDB[i];
    info['student-name'].value = s.name;
    info['student-class'].value= s.class;
    info['student-arm'].value  = s.arm;
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
