// --- Tab Switching (unchanged) ---
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- Global Data Structures & Persistence ---
const essayLimit = 20;
let answerData = { objectives: {}, essays: {} };
let studentData = [];
let studentDB = JSON.parse(localStorage.getItem('studentDB') || '[]');

function persistDB() {
  localStorage.setItem('studentDB', JSON.stringify(studentDB));
}

// --- Reset Students Database (moved below table in render) ---
function resetStudentDB() {
  if (!confirm('Clear entire Students Database?')) return;
  studentDB = [];
  persistDB();
  renderStudentDBTable();
}

// --- Answer Tab Helpers (unchanged) ---
function createObjectiveFormTwoCol(container, prefix, defaultCount = 50) {
  container.innerHTML = '';
  container.classList.add('two-col-form');
  for (let i = 1; i <= defaultCount; i++) {
    const div = document.createElement('div');
    div.innerHTML = `<label>${i}.</label>
      <input type="text" id="${prefix}-${i}" maxlength="50">`;
    container.appendChild(div);
  }
}
function createEssayForm(container, prefix, count = essayLimit) {
  container.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    const div = document.createElement('div');
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
    let inp = document.getElementById(`objective-answer-${i}`);
    if (inp && inp.value.trim()) answerData.objectives[i] = inp.value.trim();
  }
  for (let i = 1; i <= essayLimit; i++) {
    let qn = document.getElementById(`essay-answer-qn-${i}`),
        mk = document.getElementById(`essay-answer-mark-${i}`),
        an = document.getElementById(`essay-answer-ans-${i}`);
    if (qn && mk && an && qn.value.trim() && an.value.trim()) {
      answerData.essays[qn.value.trim()] = {
        mark: parseInt(mk.value) || 0,
        answer: an.value.trim()
      };
    }
  }
  alert('Answer data saved.');
}

// --- Marking Helpers & UI Updates ---
function calculateSimilarity(a, b) {
  let t1=a.toLowerCase().split(/\s+/), t2=b.toLowerCase().split(/\s+/);
  let common = t1.filter(tok=>t2.includes(tok));
  return (common.length/t1.length)*100;
}
function notify(msg) {
  let n=document.getElementById('marking-notification');
  if(n) n.innerText=msg;
}

// 4. Upload button in Marking Tab to load student’s answers:
function setupMarkingUploadButton() {
  // Assumes you added <button id="upload-student-btn">Upload Student</button>
  let btn = document.getElementById('upload-student-btn');
  btn.addEventListener('click', () => loadStudentForMarking());
}

// Find student in DB and populate Marking Tab
function loadStudentForMarking() {
  let name=document.getElementById('student-name').value.trim(),
      cls =document.getElementById('student-class').value.trim(),
      arm =document.getElementById('student-arm').value.trim();
  let student = studentDB.find(s=>
    s.name===name && s.class===cls && s.arm===arm
  );
  if(!student){
    alert('Student not found!');
    return;
  }

  // 1. Populate objective-marking-form inputs (50 cells) from stored objAnswer lines
  let lines = student.objAnswer.split('\n');
  lines.forEach((ans,i)=>{
    let inp = document.getElementById(`objective-marking-${i+1}`);
    if(inp) inp.value = ans.trim();
  });
  // Show a "Mark Objective" button below
  if(!document.getElementById('mark-objective-btn')) {
    let btn=document.createElement('button');
    btn.id='mark-objective-btn';
    btn.type='button';
    btn.innerText='Mark Objective';
    btn.onclick = markObjectiveOnly;
    document.getElementById('objective-marking-form').insertAdjacentElement('afterend', btn);
  }

  // 5. Populate essay-marking-form as 3-column rows
  let cont = document.getElementById('essay-marking-form');
  cont.innerHTML = '';
  Object.entries(answerData.essays).forEach(([qNo, model],idx)=>{
    let studentAns = student.essayAnswers.find(e=>e.qNo===qNo);
    let studDisplay = studentAns.image
      ? `<img src="" alt="${studentAns.image}" class="essay-preview"/>`
      : studentAns.answer;
    let row = document.createElement('div');
    row.className='essay-mark-row';
    row.innerHTML = `
      <div class="col teacher-answer">${model.answer}</div>
      <div class="col student-answer">${studDisplay || '—'}</div>
      <div class="col marking-tools">
        <button type="button" onclick="assignEssayMark(${idx}, 'correct')">✔</button>
        <button type="button" onclick="assignEssayMark(${idx}, 'incorrect')">✖</button>
        <button type="button" onclick="assignEssayMark(${idx}, 'custom', ${idx})">✎</button>
        <input type="number" id="custom-essay-${idx}" style="display:none" placeholder="Mark">
        <button type="button" id="done-essay-${idx}" style="display:none" onclick="applyCustomEssay(${idx})">Done</button>
      </div>
      <input type="hidden" id="essay-mark-${idx}" value="0">
      <input type="hidden" id="essay-qn-${idx}" value="${qNo}">
    `;
    cont.appendChild(row);
  });
}

// 4b. Mark objective only
function markObjectiveOnly(){
  let score=0, total=0;
  for(let i=1;i<=50;i++){
    let inp = document.getElementById(`objective-marking-${i}`);
    if(inp && inp.value.trim()){
      total++;
      if(answerData.objectives[i]===inp.value.trim()) score++;
    }
  }
  alert(`Objective: ${score}/${total}`);
}

// 5b. Essay marking actions
function assignEssayMark(idx, type){
  let qn = document.getElementById(`essay-qn-${idx}`).value;
  let model = answerData.essays[qn];
  let markInput = document.getElementById(`essay-mark-${idx}`);
  if(type==='correct'){
    markInput.value = model?.mark||0;
  } else if(type==='incorrect'){
    markInput.value = 0;
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

// After essay marking, call this to move scores to Score Tab
function collectAndPushScores(name,cls,arm){
  let objScore=0, objTotal=0;
  for(let i=1;i<=50;i++){
    let inp=document.getElementById(`objective-marking-${i}`);
    if(inp && inp.value.trim()){
      objTotal++;
      if(answerData.objectives[i]===inp.value.trim()) objScore++;
    }
  }
  let essayScore=0;
  document.querySelectorAll('[id^="essay-mark-"]').forEach(el=>{
    essayScore += parseInt(el.value)||0;
  });
  let total = objScore+essayScore;
  studentData.push({name,cls,arm,objScore,essayScore,total});
  updateScoreTable();
}

// --- Score Tab Helpers ---
function updateScoreTable(){
  let tb=document.querySelector('#score-table tbody');
  tb.innerHTML='';
  studentData.forEach(s=>{
    tb.insertAdjacentHTML('beforeend',`
      <tr>
        <td>${s.name}</td><td>${s.cls}</td><td>${s.arm}</td>
        <td>${s.objScore}</td><td>${s.essayScore}</td><td>${s.total}</td>
      </tr>`);
  });
}

// --- Students Database Helpers ---
// 2. Edit student must re-show all fields & retain file names
function editStudent(idx){
  let s = studentDB[idx];
  document.getElementById('db-student-name').value = s.name;
  document.getElementById('db-student-class').value = s.class;
  document.getElementById('db-student-arm').value = s.arm;
  document.getElementById('db-objective-answer').value = s.objAnswer;
  let form = document.getElementById('db-essay-form');
  form.innerHTML = '';
  s.essayAnswers.forEach(ea=> addNewEssayGroup(ea));
  // remove original then allow save to re‑push at end
  studentDB.splice(idx,1);
  persistDB();
  renderStudentDBTable();
}

// 3. Render table and move Reset DB below it
function renderStudentDBTable(){
  let c = document.getElementById('student-db-reference');
  c.innerHTML = `
    <table id="student-db-table">
      <thead><tr>
        <th>Name</th><th>Class</th><th>Arm</th>
        <th>Objective</th><th>Essay</th><th>Edit</th>
      </tr></thead>
      <tbody>
        ${studentDB.map((s,i)=>{
          let essays = s.essayAnswers.map(e=>e.image?`[${e.image}]`:e.answer).join('; ');
          return `<tr>
            <td>${s.name}</td><td>${s.class}</td><td>${s.arm}</td>
            <td>${s.objAnswer.replace(/\n/g,'<br>')}</td>
            <td>${essays}</td>
            <td><button onclick="editStudent(${i})">Edit</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <button id="reset-students-btn" onclick="resetStudentDB()">Reset Students</button>
  `;
}

// 3b. AddNewEssayGroup with file‑name preview so edit retains it
function addNewEssayGroup(existing){
  let c = document.getElementById('db-essay-form'),
      idx = c.children.length+1;
  if(idx>essayLimit) return;
  let div=document.createElement('div');
  div.className='essay-group';
  div.innerHTML=`
    <label>Q${idx}:</label>
    <input type="text" class="db-essay-qn" placeholder="Question No" value="${existing?.qNo||''}">
    <textarea class="db-essay-ans" placeholder="Answer">${existing?.answer||''}</textarea>
    <input type="file" class="db-essay-img" accept="image/*">
    ${existing?.image ? `<div class="file-preview">Existing: ${existing.image}</div>` : ''}
    <div class="essay-addition">
      <button type="button" class="add-essay-btn">Continue</button>
      <button type="button" class="delete-essay-btn">Delete</button>
    </div>
    <div class="error-msg"></div>
  `;
  c.appendChild(div);
  div.querySelector('.add-essay-btn').onclick = ()=> addNewEssayGroup();
  div.querySelector('.delete-essay-btn').onclick = ()=> div.remove();
}

// 1 & 2. Save student with new validation (unchanged)
function saveStudentData(){
  let name=document.getElementById('db-student-name').value.trim(),
      cls =document.getElementById('db-student-class').value.trim(),
      arm =document.getElementById('db-student-arm').value.trim(),
      obj =document.getElementById('db-objective-answer').value.trim();
  if(!name||!cls||!arm||!obj){ alert('All fields required'); return; }
  let groups=[...document.querySelectorAll('.essay-group')], essays=[];
  for(let g of groups){
    let q=g.querySelector('.db-essay-qn').value.trim(),
        a=g.querySelector('.db-essay-ans').value.trim(),
        img=g.querySelector('.db-essay-img').files[0]?.name||'';
    if(!q||( !a && !img )){ 
      g.querySelector('.error-msg').innerText='Q and (Answer or Image) required'; 
      return; 
    }
    g.querySelector('.error-msg').innerText='';
    essays.push({qNo:q,answer:a,image:img});
  }
  studentDB.push({ name, class:cls, arm, objAnswer:obj, essayAnswers:essays });
  if(studentDB.length>400) studentDB.shift();
  persistDB();
  renderStudentDBTable();
  document.getElementById('db-student-form').reset();
  document.getElementById('db-essay-form').innerHTML='';
  addNewEssayGroup();
}

// --- File Upload & OCR for Answer Tab (unchanged) ---
function handleFileUpload(e,type,prefix){
  let file=e.target.files[0]; if(!file)return;
  if(file.type.startsWith('image/')) return handleImageUpload(file,type,prefix);
  let reader=new FileReader();
  reader.onload= ev=>{
    let data=new Uint8Array(ev.target.result),
        wb=XLSX.read(data,{type:'array'}),
        ws=wb.Sheets[wb.SheetNames[0]],
        arr=XLSX.utils.sheet_to_json(ws,{header:1});
    if(type==='essay'&&prefix==='essay-answer') arr=arr.slice(1);
    arr.forEach((row,i)=>{
      if(type==='objective'&&row[0]&&row[1]){
        let inp=document.getElementById(`${prefix}-${row[0]}`);
        if(inp) inp.value=row[1];
      }
      if(type==='essay'&&row[0]&&row[1]&&row[2]){
        let qn=document.getElementById(`${prefix}-qn-${i+1}`),
            mk=document.getElementById(`${prefix}-mark-${i+1}`),
            an=document.getElementById(`${prefix}-ans-${i+1}`);
        if(qn&&mk&&an){ qn.value=row[0]; mk.value=row[1]; an.value=row[2]; }
      }
    });
  };
  reader.readAsArrayBuffer(file);
}
function handleImageUpload(file,type,prefix){
  notify('OCR...');
  Tesseract.recognize(file,'eng')
    .then(({data:{text}})=>{
      text.split('\n').map(l=>l.trim()).filter(l=>l).forEach(line=>{
        let [label,...rest]=line.split(/[:\-]/),
            q=label.replace(/\D/g,''), val=rest.join(':').trim(),
            ansInp=document.getElementById(`${prefix}-ans-${q}`);
        if(ansInp) ansInp.value=val;
      });
      notify('');
    })
    .catch(()=>notify('OCR error'));
}

// --- Initialize on load ---
window.onload = () => {
  // Answer Tab
  createObjectiveFormTwoCol(document.getElementById('objective-answer-form'),'objective-answer');
  createObjectiveFormTwoCol(document.getElementById('objective-marking-form'),'objective-marking');
  createEssayForm(document.getElementById('essay-answer-form'),'essay-answer');
  createEssayForm(document.getElementById('essay-marking-form'),'essay-marking');
  document.getElementById('upload-objective-answer')
    .addEventListener('change',e=>handleFileUpload(e,'objective','objective-answer'));
  document.getElementById('upload-essay-answer')
    .addEventListener('change',e=>handleFileUpload(e,'essay','essay-answer'));

  // Students Database
  addNewEssayGroup();
  renderStudentDBTable();

  // Marking Tab
  setupMarkingUploadButton();
};
