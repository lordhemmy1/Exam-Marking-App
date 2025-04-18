// --- Tab Switching ---
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- Global Data / Persistence ---
const essayLimit = 20;
let answerData = { objectives: {}, essays: {} };
let studentData = [];
let studentDB = JSON.parse(localStorage.getItem('studentDB') || '[]');

function persistDB() {
  localStorage.setItem('studentDB', JSON.stringify(studentDB));
}

// --- Answer Tab Helpers ---
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
    let inp = document.getElementById(`objective-answer-${i}`);
    if (inp && inp.value.trim()) answerData.objectives[inp.id.split('-')[2]] = inp.value.trim();
  }
  for (let i = 1; i <= essayLimit; i++) {
    let qn = document.getElementById(`essay-answer-qn-${i}`),
        mk = document.getElementById(`essay-answer-mark-${i}`),
        an = document.getElementById(`essay-answer-ans-${i}`);
    if (qn && mk && an && qn.value.trim() && an.value.trim()) {
      answerData.essays[qn.value.trim()] = { mark: parseInt(mk.value)||0, answer: an.value.trim() };
    }
  }
  alert('Answer data saved.');
}

// --- Marking Helpers ---
function calculateSimilarity(a, b) {
  let t1=a.toLowerCase().split(/\s+/), t2=b.toLowerCase().split(/\s+/);
  let common = t1.filter(tok=>t2.includes(tok));
  return (common.length/t1.length)*100;
}
function notify(msg) {
  let n = document.getElementById('marking-notification');
  if (n) n.innerText = msg;
}
function markAnswers() {
  notify('Uploading...');
  setTimeout(()=>{
    notify('Marking...');
    let name=document.getElementById('student-name').value,
        cls=document.getElementById('student-class').value,
        arm=document.getElementById('student-arm').value;
    let scoreObj=0, scoreEssay=0, objD=[], essayD=[];
    for(let i=1;i<=50;i++){
      let inp=document.getElementById(`objective-marking-${i}`);
      if(inp&&inp.value.trim()){
        let q=i+'', correct=answerData.objectives[q]||'', stud=inp.value.trim();
        let remark=correct.toLowerCase()===stud.toLowerCase()?'✔':'✖';
        if(remark==='✔') scoreObj++;
        objD.push({q,correct,stud,remark});
      }
    }
    for(let i=1;i<=essayLimit;i++){
      let qn=document.getElementById(`essay-marking-qn-${i}`),
          markEl=document.getElementById(`essay-marking-mark-${i}`),
          ansEl=document.getElementById(`essay-marking-ans-${i}`);
      if(qn&&markEl&&ansEl&&qn.value.trim()&&ansEl.value.trim()){
        let key=qn.value.trim(),
            model=answerData.essays[key]||{answer:'',mark:0},
            sim=calculateSimilarity(model.answer,ansEl.value.trim()),
            remark=sim>=55?'✔':'✖';
        if(sim>=55) scoreEssay+=model.mark;
        essayD.push({q:key,correct:model.answer,stud:ansEl.value.trim(),remark});
      }
    }
    let total=scoreObj+scoreEssay;
    studentData.push({name,cls,arm,scoreObj,scoreEssay,total});
    updateScoreTable(); updateDetailTables(objD,essayD);
    notify('Getting results...');
    setTimeout(()=>notify('Marking complete.'),500);
  },500);
}
function updateScoreTable(){
  let tb=document.querySelector('#score-table tbody');
  tb.innerHTML='';
  studentData.forEach(s=>{
    let tr=document.createElement('tr');
    tr.innerHTML=`<td>${s.name}</td><td>${s.cls}</td><td>${s.arm}</td>
      <td>${s.scoreObj}</td><td>${s.scoreEssay}</td><td>${s.total}</td>`;
    tb.appendChild(tr);
  });
}
function updateDetailTables(oD,eD){
  let ot=document.querySelector('#objective-detail-table tbody'),
      et=document.querySelector('#essay-detail-table tbody');
  ot.innerHTML=''; et.innerHTML='';
  oD.forEach(i=>ot.insertAdjacentHTML('beforeend',
    `<tr><td>${i.q}</td><td>${i.correct}</td><td>${i.stud}</td><td>${i.remark}</td></tr>`));
  eD.forEach(i=>et.insertAdjacentHTML('beforeend',
    `<tr><td>${i.q}</td><td>${i.correct}</td><td>${i.stud}</td><td>${i.remark}</td><td></td></tr>`));
}
function resetScores(){
  if(confirm('Reset scores?')){
    studentData=[]; updateScoreTable();
  }
}
function downloadScores(type){
  if(type==='csv'){
    let c='Name,Class,Arm,Objective,Essay,Total\n';
    studentData.forEach(s=>c+=`${s.name},${s.cls},${s.arm},${s.scoreObj},${s.scoreEssay},${s.total}\n`);
    downloadFile('scores.csv',c);
  } else if(type==='doc'){
    let html='<table border="1"><tr><th>Name</th><th>Class</th><th>Arm</th><th>Objective</th><th>Essay</th><th>Total</th></tr>';
    studentData.forEach(s=> html+=`<tr><td>${s.name}</td><td>${s.cls}</td><td>${s.arm}</td>
      <td>${s.scoreObj}</td><td>${s.scoreEssay}</td><td>${s.total}</td></tr>`);
    html+='</table>';
    let blob=new Blob([`<html><body>${html}</body></html>`],{type:'application/msword'});
    let url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url;a.download='scores.doc';a.click();
    URL.revokeObjectURL(url);
  } else if(type==='xlsx'){
    let ws=XLSX.utils.json_to_sheet(studentData),
        wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Scores");
    XLSX.writeFile(wb,"scores.xlsx");
  }
}
function downloadFile(fn, content){
  let blob=new Blob([content],{type:'text/plain'}),
      url=URL.createObjectURL(blob),
      a=document.createElement('a');
  a.href=url; a.download=fn; a.click(); URL.revokeObjectURL(url);
}

// --- File Upload & OCR ---
function handleFileUpload(e,type,prefix){
  let file=e.target.files[0];
  if(!file) return;
  if(file.type.startsWith('image/')) return handleImageUpload(file,type,prefix);
  let reader=new FileReader();
  reader.onload = ev=>{
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
        if(qn&&mk&&an){qn.value=row[0];mk.value=row[1];an.value=row[2];}
      }
    });
  };
  reader.readAsArrayBuffer(file);
}
function handleImageUpload(file,type,prefix){
  notify('OCR processing...');
  Tesseract.recognize(file,'eng').then(({data:{text}})=>{
    text.split('\n').map(l=>l.trim()).filter(l=>l).forEach(line=>{
      let [label,...rest]=line.split(/[:\-]/),
          qNo=label.replace(/\D/g,''), val=rest.join(':').trim();
      let ansInp=document.getElementById(`${prefix}-ans-${qNo}`);
      if(ansInp) ansInp.value=val;
    });
    notify('OCR done.');
  }).catch(()=>notify('OCR error.'));
}

// --- Students Database Logic ---
function addNewEssayGroup(existing){
  const c=document.getElementById('db-essay-form'),
        idx=c.children.length+1;
  if(idx>essayLimit) return;
  const div=document.createElement('div');
  div.className='essay-group';
  div.innerHTML=`
    <label>Q${idx}:</label>
    <input type="text" class="db-essay-qn" placeholder="Question No" value="${existing?.qNo||''}">
    <textarea class="db-essay-ans" placeholder="Answer">${existing?.answer||''}</textarea>
    <input type="file" class="db-essay-img" accept="image/*">
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

function saveStudentData(){
  let name=document.getElementById('db-student-name').value.trim(),
      cls=document.getElementById('db-student-class').value.trim(),
      arm=document.getElementById('db-student-arm').value.trim(),
      obj=document.getElementById('db-objective-answer').value.trim();
  if(!name||!cls||!arm||!obj){ alert('All fields required'); return; }
  let groups=[...document.querySelectorAll('.essay-group')], essays=[];
  for(let g of groups){
    let q=g.querySelector('.db-essay-qn').value.trim(),
        a=g.querySelector('.db-essay-ans').value.trim(),
        img=g.querySelector('.db-essay-img').files[0]?.name||'';
    if(!q||( !a && !img )){
      g.querySelector('.error-msg').innerText='Require question no and (answer or image)';
      return;
    }
    g.querySelector('.error-msg').innerText='';
    essays.push({qNo:q,answer:a,image:img});
  }
  studentDB.push({name, class:cls, arm, objAnswer:obj, essayAnswers:essays});
  if(studentDB.length>400) studentDB.shift();
  persistDB(); renderStudentDBTable();
  document.getElementById('db-student-form').reset();
  document.getElementById('db-essay-form').innerHTML='';
  addNewEssayGroup();
}

function renderStudentDBTable(){
  const container=document.getElementById('student-db-reference');
  container.innerHTML=`
    <table id="student-db-table">
      <thead>
        <tr><th>Name</th><th>Class</th><th>Arm</th>
            <th>Objective Answer</th><th>Essay Answers</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${studentDB.map((s,i)=>{
          let essays=s.essayAnswers.map(e=>e.image?`[${e.image}]`:e.answer).join(' ; ');
          return `<tr>
            <td>${s.name}</td><td>${s.class}</td><td>${s.arm}</td>
            <td>${s.objAnswer.replace(/\n/g,'<br>')}</td>
            <td>${essays}</td>
            <td><button onclick="editStudent(${i})">Edit</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function editStudent(i){
  let s=studentDB[i];
  document.getElementById('db-student-name').value=s.name;
  document.getElementById('db-student-class').value=s.class;
  document.getElementById('db-student-arm').value=s.arm;
  document.getElementById('db-objective-answer').value=s.objAnswer;
  document.getElementById('db-essay-form').innerHTML='';
  s.essayAnswers.forEach(e=>addNewEssayGroup(e));
  studentDB.splice(i,1);
  persistDB(); renderStudentDBTable();
}

function resetStudentDB(){
  if(!confirm('Clear entire Students Database?')) return;
  studentDB=[]; persistDB(); renderStudentDBTable();
}

// --- Initialize on load ---
function setupUploadListeners(){
  document.getElementById('upload-objective-answer')
    .addEventListener('change',e=>handleFileUpload(e,'objective','objective-answer'));
  document.getElementById('upload-essay-answer')
    .addEventListener('change',e=>handleFileUpload(e,'essay','essay-answer'));
}
window.onload = ()=>{
  createObjectiveFormTwoCol(document.getElementById('objective-answer-form'),'objective-answer');
  createObjectiveFormTwoCol(document.getElementById('objective-marking-form'),'objective-marking');
  createEssayForm(document.getElementById('essay-answer-form'),'essay-answer');
  createEssayForm(document.getElementById('essay-marking-form'),'essay-marking');
  setupUploadListeners();
  addNewEssayGroup();
  renderStudentDBTable();
};
