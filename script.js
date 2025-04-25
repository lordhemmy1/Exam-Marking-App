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
    bindAnswerSaveButton();
    bindUploadHandlers();

    initDBLevelControls();    // NEW
    initDBEssaySection();
    bindStudentButtons();
    bindClearStudentsButton();
    updateStudentAnswerInfo();

    bindMarkingTab();
    updateScoreTable();
    bindClearScoreButton();
    bindDownloadButton();

    document.getElementById('reset-all-btn')?.addEventListener('click', () => {
      if (confirm('This will wipe EVERYTHING. Continue?')) DataManager.clearAll();
    });
  },

  saveAnswerKey() {
    localStorage.setItem('answerKey', JSON.stringify(this.answerKey));
  },

  saveStudents() {
    // sort alphabetically
    this.students.sort((a, b) => a.name.localeCompare(b.name));
    localStorage.setItem('studentsDB', JSON.stringify(this.students));
  },

  saveScores() {
    localStorage.setItem('scoresDB', JSON.stringify(this.scores));
  },

  clearAll() {
    localStorage.clear();
    this.answerKey = { objective: [], essay: [] };
    this.students = [];
    this.scores = [];
    location.reload();
  }
};

// --- NEW: Level Controls in Student DB ---
function initDBLevelControls() {
  const container = document.getElementById('db-student-form-levels');
  if (!container) return;
  container.innerHTML = `
    <label><input type="radio" name="level" value="primary"> Primary</label>
    <label><input type="radio" name="level" value="secondary"> Secondary</label>
    <label><input type="radio" name="level" value="tertiary"> Tertiary</label>
  `;
  const select = document.getElementById('db-student-class');
  const arm    = document.getElementById('db-student-arm');
  const savedLvl = localStorage.getItem('db_level');
  const savedCls = localStorage.getItem('db_class');
  if (savedLvl) {
    document.querySelector(`input[name=level][value=${savedLvl}]`).checked = true;
    updateClassOptions(savedLvl);
    if (savedCls) select.value = savedCls;
  }
  document.querySelectorAll('input[name=level]').forEach(r => {
    r.addEventListener('change', e => {
      localStorage.setItem('db_level', e.target.value);
      updateClassOptions(e.target.value);
    });
  });
  select.addEventListener('change', () => {
    localStorage.setItem('db_class', select.value);
  });
}
function updateClassOptions(level) {
  const select = document.getElementById('db-student-class');
  select.innerHTML = '';
  let opts = [];
  if (level==='primary') opts=['PRY1','PRY2','PRY3','PRY4','PRY5','PRY6'];
  if (level==='secondary') opts=['JS1','JS2','JS3','SS1','SS2','SS3'];
  if (level==='tertiary') opts=['100L','200L','300L','400L','500L','MSc','PhD'];
  opts.forEach(o=>{const el=document.createElement('option');el.value=o;el.textContent=o;select.appendChild(el);});
}

// --- Tab Navigation ---
document.querySelectorAll('.tab-button').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s=>s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- Answer Tab ---
function renameAnswerTab(){
  const btn=document.querySelector('.tab-button[data-tab="answer"]');
  if(btn)btn.textContent="Teacher's Answer Tab";
}
function insertAnswerTabDescription(){
  const sec=document.getElementById('answer');
  const p=document.createElement('p');
  p.textContent='Upload or manually type your objective answers into the forms.';
  p.style.fontSize='1rem';
  sec.insertBefore(p,document.getElementById('objective-answer-container'));
}
function renderObjectiveKeyForm(){
  const c=document.getElementById('objective-answer-form');
  c.innerHTML=''; c.classList.add('two-col-form');
  const arr=DataManager.answerKey.objective;
  const count=Math.max(arr.length,50);
  for(let i=1;i<=count;i++){
    const ex=arr.find(o=>o.questionNo===i);
    const ans=ex?ex.answer:'';
    const d=document.createElement('div');
    d.innerHTML=`<label>Q${i}:</label><input type="text" name="q_${i}" value="${ans}"/>`;
    c.appendChild(d);
  }
}
function renderEssayKeyForm(){
  const c=document.getElementById('essay-answer-form');
  c.innerHTML='';
  const arr=DataManager.answerKey.essay;
  for(let i=1;i<=20;i++){
    const ex=arr[i-1]||{};
    const d=document.createElement('div');
    d.innerHTML=`
      <label>Set ${i}:</label>
      <input type="text" name="qno_${i}" placeholder="Q No." value="${ex.questionNo||''}"/>
      <input type="number" name="mark_${i}" placeholder="Mark" value="${ex.mark||''}"/>
      <textarea name="ans_${i}" placeholder="Answer">${ex.answer||''}</textarea>
    `;
    c.appendChild(d);
  }
}
function bindAnswerSaveButton(){
  const btn=document.getElementById('save-answers-btn');
  btn.textContent='Save Answers';
  btn.addEventListener('click',saveAnswerData);
}
function bindUploadHandlers(){
  document.getElementById('upload-objective-answer')?.addEventListener('change',handleObjectiveUpload);
  document.getElementById('upload-essay-answer')?.addEventListener('change',handleEssayUpload);
}
function handleObjectiveUpload(e){
  const f=e.target.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=ev=>{
    const wb=XLSX.read(ev.target.result,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1});
    if(rows.length<=1)return;
    DataManager.answerKey.objective=rows.slice(1).map(rw=>({
      questionNo:Number(rw[0])||0,
      answer:String(rw[1]||'').trim()
    }));
    DataManager.saveAnswerKey(); renderObjectiveKeyForm();
  };
  r.readAsArrayBuffer(f);
}
function handleEssayUpload(e){
  const f=e.target.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=ev=>{
    const wb=XLSX.read(ev.target.result,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1});
    if(rows.length<=1)return;
    DataManager.answerKey.essay=rows.slice(1,21).map(rw=>({
      questionNo:String(rw[0]||'').trim(),
      mark:rw[1]!=null?rw[1]:'',
      answer:String(rw[2]||'').trim()
    }));
    DataManager.saveAnswerKey(); renderEssayKeyForm();
  };
  r.readAsArrayBuffer(f);
}
function saveAnswerData(){
  const obj=Array.from(document.querySelectorAll('#objective-answer-form input'));
  if(obj.every(i=>!i.value.trim()))return alert('Fill one objective');
  DataManager.answerKey.objective=obj.map((i,idx)=>({
    questionNo:idx+1,answer:i.value.trim()
  }));
  const ed=document.querySelectorAll('#essay-answer-form div');
  if(!Array.from(ed).some((d,idx)=>{
    return d.querySelector(`[name="qno_${idx+1}"]`).value.trim()&&
           d.querySelector(`[name="mark_${idx+1}"]`).value.trim()&&
           d.querySelector(`[name="ans_${idx+1}"]`).value.trim();
  }))return alert('Fill one essay');
  DataManager.answerKey.essay=Array.from(ed).map((d,idx)=>({
    questionNo:d.querySelector(`[name="qno_${idx+1}"]`).value.trim(),
    mark:d.querySelector(`[name="mark_${idx+1}"]`).value.trim(),
    answer:d.querySelector(`[name="ans_${idx+1}"]`).value.trim()
  }));
  DataManager.saveAnswerKey();
  obj.forEach(i=>i.value='');
  document.querySelectorAll('#essay-answer-form input, #essay-answer-form textarea')
    .forEach(el=>el.value='');
  let n=document.getElementById('answer-notification');
  if(!n){
    n=document.createElement('div');n.id='answer-notification';
    document.getElementById('save-answers-btn').after(n);
  }
  n.textContent='Answers saved'; n.style.color='green';
}

// --- Students Database ---
let editingIndex=null;
function initDBEssaySection(){
  const c=document.getElementById('db-essay-form');c.innerHTML='';addDBEssaySet();
}
function addDBEssaySet(q='',a=''){
  const c=document.getElementById('db-essay-form');
  const d=document.createElement('div');d.className='db-essay-set';
  d.innerHTML=`
    <input class="db-essay-qno" placeholder="Q No" value="${q}"/>
    <textarea class="db-essay-text" placeholder="Answer">${a}</textarea>
    <input type="file" class="db-essay-file" accept="image/*"/>
    <div class="db-essay-preview"><img style="width:100px;display:none;"/></div>
    <button type="button" class="db-essay-add">Continue</button>
    <button type="button" class="db-essay-remove">Delete</button>
  `;
  c.append(d);
  const ta=d.querySelector('.db-essay-text'),
        fi=d.querySelector('.db-essay-file'),
        im=d.querySelector('img');
  ta.addEventListener('input',()=>{
    fi.style.display=ta.value.trim()?'none':'';
    if(ta.value.trim())im.style.display='none';
  });
  fi.addEventListener('change',()=>{
    const f=fi.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=e=>{im.src=e.target.result;im.style.display='';ta.style.display='none';};
    r.readAsDataURL(f);
  });
  d.querySelector('.db-essay-add').onclick=()=>addDBEssaySet();
  d.querySelector('.db-essay-remove').onclick=()=>d.remove();
}
function bindStudentButtons(){
  const sv=document.getElementById('save-student-btn');
  sv.textContent='Add Student';
  const up=document.createElement('button');
  up.id='update-student-btn';up.type='button';up.textContent='Update Student';
  up.style.display='none';sv.after(up);
  sv.onclick=saveStudentData; up.onclick=updateStudentData;
}
function bindClearStudentsButton(){
  document.getElementById('clear-students-btn').onclick=()=>{
    if(!confirm('Clear all?'))return;
    DataManager.students=[];DataManager.saveStudents();updateStudentAnswerInfo();
  };
}
async function saveStudentData(){
  if(DataManager.students.length>=300)return alert('Max 300');
  const nm=document.getElementById('db-student-name').value.trim();
  const cls=document.getElementById('db-student-class').value.trim();
  const arm=document.getElementById('db-student-arm').value.trim();
  if(!nm||!cls||!arm)return alert('Name, class, arm req');
  const oraw=document.getElementById('db-objective-answer').value.trim();
  if(!oraw)return alert('Objective req');
  const obj=oraw.split(',').map(s=>s.trim());
  const sets=Array.from(document.querySelectorAll('.db-essay-set'));
  if(!sets.length)return alert('At least one essay');
  const ed=[];
  for(const s of sets){
    const q=s.querySelector('.db-essay-qno').value.trim();if(!q)return alert('Q no req');
    const ta=s.querySelector('.db-essay-text'),fi=s.querySelector('.db-essay-file');
    let ans='';
    if(ta.style.display!=='none'&&ta.value.trim())ans=ta.value.trim();
    else if(fi.files.length){
      ans=await new Promise(r=>{const f=new FileReader();f.onload=e=>r(e.target.result);f.readAsDataURL(fi.files[0]);});
    } else return alert(`Provide text or image for Q${q}`);
    ed.push({questionNo:q,answer:ans});
  }
  DataManager.students.push({name:nm,class:cls,arm,objectiveAnswers:obj,essayAnswers:ed});
  DataManager.saveStudents();updateStudentAnswerInfo();
  alert('Student added');
  document.getElementById('db-student-form').reset();initDBEssaySection();
}
function updateStudentAnswerInfo(){
  const c=document.getElementById('student-db-reference');c.innerHTML='';
  if(!DataManager.students.length)return;
  const tbl=document.createElement('table');tbl.id='student-db-table';
  tbl.innerHTML=`
    <thead><tr>
      <th>Name</th><th>Class</th><th>Arm</th>
      <th>Objective</th><th>Essay</th><th>Actions</th>
    </tr></thead>
    <tbody>
      ${DataManager.students.map((s,i)=>`
        <tr>
          <td>${s.name}</td>
          <td>${s.class}</td>
          <td>${s.arm}</td>
          <td>${s.objectiveAnswers.join(', ')}</td>
          <td>${s.essayAnswers.map(e=>
            e.answer.startsWith('data:')
              ? `<img src="${e.answer}" style="width:50px;"/>`
              : e.answer
          ).join(', ')}</td>
          <td>
            <button class="edit-student" data-i="${i}">Edit</button>
            <button class="delete-student" data-i="${i}">Delete</button>
          </td>
        </tr>`).join('')}
    </tbody>`;
  c.append(tbl);
  tbl.querySelectorAll('.edit-student').forEach(b=>b.onclick=()=>startEditStudent(+b.dataset.i));
  tbl.querySelectorAll('.delete-student').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i; if(!confirm(`Delete ${DataManager.students[i].name}?`))return;
    DataManager.students.splice(i,1);DataManager.saveStudents();updateStudentAnswerInfo();
  });
}
function startEditStudent(i){
  const s=DataManager.students[i];
  document.getElementById('db-student-name').value=s.name;
  document.getElementById('db-student-class').value=s.class;
  document.getElementById('db-student-arm').value=s.arm;
  document.getElementById('db-objective-answer').value=s.objectiveAnswers.join(',');
  document.getElementById('db-essay-form').innerHTML='';
  s.essayAnswers.forEach(e=>addDBEssaySet(e.questionNo,e.answer));
  editingIndex=i;
  document.getElementById('save-student-btn').style.display='none';
  document.getElementById('update-student-btn').style.display='';
}
async function updateStudentData(){
  if(editingIndex===null)return;
  const nm=document.getElementById('db-student-name').value.trim();
  const cls=document.getElementById('db-student-class').value.trim();
  const arm=document.getElementById('db-student-arm').value.trim();
  if(!nm||!cls||!arm)return alert('Name,class,arm req');
  const oraw=document.getElementById('db-objective-answer').value.trim();
  if(!oraw)return alert('Objective req');
  const obj=oraw.split(',').map(s=>s.trim());
  const sets=Array.from(document.querySelectorAll('.db-essay-set'));
  const ed=[];
  for(const s of sets){
    const q=s.querySelector('.db-essay-qno').value.trim();if(!q)return alert('Q no req');
    const ta=s.querySelector('.db-essay-text'),fi=s.querySelector('.db-essay-file');
    let ans='';
    if(ta.style.display!=='none'&&ta.value.trim())ans=ta.value.trim();
    else if(fi.files.length){
      ans=await new Promise(r=>{const f=new FileReader();f.onload=e=>r(e.target.result);f.readAsDataURL(fi.files[0]);});
    } else return alert(`Provide for Q${q}`);
    ed.push({questionNo:q,answer:ans});
  }
  DataManager.students[editingIndex]={name:nm,class:cls,arm,objectiveAnswers:obj,essayAnswers:ed};
  DataManager.saveStudents();updateStudentAnswerInfo();
  alert('Student updated');
  document.getElementById('db-student-form').reset();initDBEssaySection();
  editingIndex=null;
  document.getElementById('save-student-btn').style.display='';
  document.getElementById('update-student-btn').style.display='none';
}

// --- Marking & Scoring ---
let markIdx=null,curObj=null,curEss=null;
function bindMarkingTab(){
  const div=document.getElementById('mark-search-container');
  if(div&&!document.getElementById('mark-search-label')){
    const l=document.createElement('label');
    l.id='mark-search-label';l.textContent='Search Student: ';
    div.insertBefore(l,document.getElementById('search-student-input'));
  }
  document.getElementById('search-student-btn').onclick=searchStudentForMarking;
  document.getElementById('populate-objective-btn').onclick=populateStudentObjectiveAnswers;
  document.getElementById('mark-objective-btn').onclick=markObjectiveOnly;
  document.getElementById('record-mark-btn').onclick=()=>{
    recordMark();
    setTimeout(()=>document.getElementById('marking-notification').textContent='',2000);
  };
  document.getElementById('mark-next-btn')?.addEventListener('click',markNextStudent);
}
function searchStudentForMarking(){
  const name=document.getElementById('search-student-input').value.trim().toLowerCase();
  const idx=DataManager.students.findIndex(s=>s.name.toLowerCase()===name);
  if(idx<0)return alert('Not found');
  markIdx=idx; fillMarkingInfo();
}
function fillMarkingInfo(){
  const s=DataManager.students[markIdx];
  document.getElementById('mark-student-name').value=s.name;
  document.getElementById('mark-student-class').value=s.class;
  document.getElementById('mark-student-arm').value=s.arm;
  document.getElementById('objective-marking-form').innerHTML='';
  document.getElementById('objective-marking-details').textContent='';
  document.getElementById('essay-marking-container').innerHTML='';
  document.getElementById('essay-scoring-details').textContent='';
  curObj=null; curEss=null;
}
function populateStudentObjectiveAnswers(){
  if(markIdx===null)return alert('Select first');
  const s=DataManager.students[markIdx];
  const f=document.getElementById('objective-marking-form');
  f.innerHTML='';f.classList.add('two-col-form');
  const arr=s.objectiveAnswers;
  const cnt=Math.min(Math.max(arr.length,50),100);
  for(let i=1;i<=cnt;i++){
    const a=arr[i-1]||'';
    const d=document.createElement('div');
    d.innerHTML=`<label>Q${i}:</label><input value="${a}" readonly/>`;
    f.append(d);
  }
}
function markObjectiveOnly(){
  if(markIdx===null)return alert('Select first');
  const inputs=Array.from(document.querySelectorAll('#objective-marking-form input'));
  const key=DataManager.answerKey.objective;let c=0;
  inputs.forEach((i,idx)=>{if(i.value.trim().toLowerCase()=== (key[idx]?.answer||'').toLowerCase())c++;});
  curObj=c;
  document.getElementById('objective-marking-details').textContent=`Objective Score: ${c}/${key.length}`;
}
function populateStudentEssaySection(){
  // unused
}
function recordMark(){
  if(markIdx===null)return alert('None');
  if(curObj===null)return alert('Mark objective');
  // assume essay sum done inline
  const s=DataManager.students[markIdx];
  const total=curObj+(curEss||0);
  if(DataManager.scores.length>=300)return alert('Max scores');
  DataManager.scores.push({name:s.name,class:s.class,arm:s.arm,objective:curObj,essay:curEss||0,total});
  DataManager.saveScores();updateScoreTable();
  document.getElementById('marking-notification').textContent='Mark recorded!';
}
function markNextStudent(){
  if(!DataManager.students.length)return;
  let i=(markIdx===null?0:markIdx+1);
  if(i>=DataManager.students.length)return alert('All Students have been Marked and Recorded');
  document.getElementById('search-student-input').value=DataManager.students[i].name;
  document.getElementById('search-student-btn').click();
}

// --- Score Tab download/clear ---
function bindDownloadButton(){
  document.getElementById('download-score-btn')?.addEventListener('click',downloadScores);
}
function bindClearScoreButton(){
  document.getElementById('clear-scores-btn')?.addEventListener('click',()=>{
    if(!confirm('Clear scores?'))return;DataManager.scores=[];DataManager.saveScores();updateScoreTable();
  });
}
function downloadScores(){
  const sc=DataManager.scores; if(!sc.length)return alert('None');
  const f=prompt('Format: xlsx/csv/pdf/doc').toLowerCase();
  if(f==='xlsx'){const ws=XLSX.utils.json_to_sheet(sc),wb={Sheets:{S:ws},SheetNames:['S']};XLSX.writeFile(wb,'scores.xlsx');}
  else if(f==='csv'){const ws=XLSX.utils.json_to_sheet(sc),c=XLSX.utils.sheet_to_csv(ws);
    const b=new Blob([c],{type:'text/csv'}),u=URL.createObjectURL(b),a=document.createElement('a');
    a.href=u;a.download='scores.csv';a.click();URL.revokeObjectURL(u);
  } else if(f==='pdf'){const{jsPDF}=window.jspdf,d=new jsPDF();let y=10;d.text('Scores',10,y);y+=10;
    sc.forEach(r=>{d.text(`${r.name}|${r.class}|${r.arm}|${r.objective}|${r.essay}|${r.total}`,10,y);y+=10;});d.save('scores.pdf');
  } else if(f==='doc'){let html='<html><body><h1>Scores</h1><table border="1"><tr><th>Name</th><th>Class</th><th>Arm</th><th>Obj</th><th>Essay</th><th>Total</th></tr>';
    sc.forEach(r=>html+=`<tr><td>${r.name}</td><td>${r.class}</td><td>${r.arm}</td><td>${r.objective}</td><td>${r.essay}</td><td>${r.total}</td></tr>`);
    html+='</table></body></html>';const b=new Blob([html],{type:'application/msword'}),u=URL.createObjectURL(b),a=document.createElement('a');
    a.href=u;a.download='scores.doc';a.click();URL.revokeObjectURL(u);
  } else alert('Unknown');
}
function updateScoreTable(){
  const t=document.querySelector('#score-table tbody');t.innerHTML='';
  DataManager.scores.forEach(r=>{const tr=document.createElement('tr');
    tr.innerHTML=`<td>${r.name}</td><td>${r.class}</td><td>${r.arm}</td><td>${r.objective}</td><td>${r.essay}</td><td>${r.total}</td>`;
    t.append(tr);
  });
}

window.addEventListener('DOMContentLoaded',()=>DataManager.init());
