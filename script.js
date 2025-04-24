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
    initDBEssaySection();
    bindStudentButtons();
    bindClearStudentsButton();
    updateStudentAnswerInfo();
    updateScoreTable();

    // marking and download
    bindMarkingTab();
    bindDownloadButton();
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
  desc.textContent = 'Upload or manually type your objective answers into the objective form section and the essay section.';
  desc.style.fontSize = '1rem';
  section.insertBefore(desc, document.getElementById('objective-answer-container'));
}

// --- Render Answer Forms with dynamic hiding & total ---
function renderObjectiveKeyForm() {
  const form = document.getElementById('objective-answer-form');
  form.innerHTML = '';
  form.classList.add('two-col-form');

  const entries = DataManager.answerKey.objective;
  // only populated or at least one row
  const populated = entries.filter(o => o.answer.trim() !== '');
  const toShow = populated.length ? populated : Array.from({ length: 50 }, (_, i) => ({ questionNo: i+1, answer: '' }));

  toShow.forEach(o => {
    const div = document.createElement('div');
    div.innerHTML = `<label>Q${o.questionNo}:</label><input type="text" name="q_${o.questionNo}" value="${o.answer}"/>`;
    form.appendChild(div);
  });

  // display total count
  let totalEl = document.getElementById('objective-total');
  if (!totalEl) {
    totalEl = document.createElement('div');
    totalEl.id = 'objective-total';
    totalEl.style.fontWeight = 'bold';
    form.parentNode.insertBefore(totalEl, form.nextSibling);
  }
  const total = populated.length;
  if (total > 0) {
    totalEl.textContent = `Total Objective Marks: ${total}`;
    totalEl.style.display = '';
  } else {
    totalEl.style.display = 'none';
  }
}

function renderEssayKeyForm() {
  const form = document.getElementById('essay-answer-form');
  form.innerHTML = '';

  const entries = DataManager.answerKey.essay;
  const populated = entries.filter(e => e.questionNo && e.mark !== '');
  const toShow = populated.length
    ? populated
    : Array.from({ length: 20 }, (_, i) => ({ questionNo: '', mark: '', answer: '' }));

  toShow.forEach((e, i) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Set ${e.questionNo || i+1}:</label>
      <input type="text" name="qno_${i+1}" placeholder="Q No." value="${e.questionNo}"/>
      <input type="number" name="mark_${i+1}" placeholder="Mark" value="${e.mark}"/>
      <textarea name="ans_${i+1}" placeholder="Correct answer">${e.answer}</textarea>
    `;
    form.appendChild(div);
  });

  // display total essay marks
  let totalEl = document.getElementById('essay-total');
  if (!totalEl) {
    totalEl = document.createElement('div');
    totalEl.id = 'essay-total';
    totalEl.style.fontWeight = 'bold';
    form.parentNode.insertBefore(totalEl, form.nextSibling);
  }
  const sum = populated.reduce((s, e) => s + Number(e.mark), 0);
  if (populated.length) {
    totalEl.textContent = `Total Essay Marks: ${sum}`;
    totalEl.style.display = '';
  } else {
    totalEl.style.display = 'none';
  }
}

// --- Bind Save / Upload handlers ---
function bindAnswerSaveButton() {
  const btn = document.getElementById('save-answers-btn');
  if (btn) btn.addEventListener('click', saveAnswerData);
}

function bindUploadHandlers() {
  document.getElementById('upload-objective-answer')?.addEventListener('change', handleObjectiveUpload);
  document.getElementById('upload-essay-answer')?.addEventListener('change', handleEssayUpload);
}

// --- File Upload Parsers ---
function handleObjectiveUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const wb = XLSX.read(evt.target.result, { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    if (rows.length <= 1) return;
    DataManager.answerKey.objective = rows.slice(1).map(r => ({
      questionNo: Number(r[0]) || undefined,
      answer: String(r[1] || '').trim()
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
  reader.onload = evt => {
    const wb = XLSX.read(evt.target.result, { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    if (rows.length <= 1) return;
    DataManager.answerKey.essay = rows.slice(1,21).map(r => ({
      questionNo: String(r[0] || '').trim(),
      mark: r[1] != null ? r[1] : '',
      answer: String(r[2] || '').trim()
    }));
    DataManager.saveAnswerKey();
    renderEssayKeyForm();
  };
  reader.readAsArrayBuffer(file);
}

// --- Save Answers ---
function saveAnswerData() {
  // objective
  const objs = Array.from(document.querySelectorAll('#objective-answer-form input'))
    .map((i, idx) => ({ questionNo: idx+1, answer: i.value.trim() }))
    .filter(o => o.answer !== '');
  if (!objs.length) return alert('Fill at least one objective answer');
  DataManager.answerKey.objective = objs;

  // essays
  const divs = Array.from(document.querySelectorAll('#essay-answer-form div'));
  const essays = divs.map((div, i) => {
    const q = div.querySelector(`[name="qno_${i+1}"]`).value.trim();
    const m = div.querySelector(`[name="mark_${i+1}"]`).value.trim();
    const a = div.querySelector(`[name="ans_${i+1}"]`).value.trim();
    return { questionNo: q, mark: m, answer: a };
  }).filter(e => e.questionNo && e.mark && e.answer);
  if (!essays.length) return alert('Fill at least one essay set');
  DataManager.answerKey.essay = essays;

  DataManager.saveAnswerKey();
  renderObjectiveKeyForm();
  renderEssayKeyForm();

  alert('Teacher answers saved!');
}

// --- Students DB ---
let editingIndex = null;

function initDBEssaySection() {
  const c = document.getElementById('db-essay-form');
  c.innerHTML = '';
  addDBEssaySet();
}

function addDBEssaySet(qNo = '', ans = '') {
  const c = document.getElementById('db-essay-form');
  const div = document.createElement('div');
  div.className = 'db-essay-set';
  div.innerHTML = `
    <input class="db-essay-qno" value="${qNo}" placeholder="Q No"/>
    <textarea class="db-essay-text">${ans.startsWith('data:') ? '' : ans}</textarea>
    <input type="file" class="db-essay-file"/>
    <div class="db-essay-preview"><img style="display:none; width:100px; height:100px;"/></div>
    <button class="db-essay-add">+</button>
    <button class="db-essay-remove">–</button>
  `;
  c.appendChild(div);

  const ta = div.querySelector('.db-essay-text');
  const fi = div.querySelector('.db-essay-file');
  const img = div.querySelector('img');

  ta.addEventListener('input', () => fi.style.display = ta.value.trim() ? 'none' : '');
  fi.addEventListener('change', () => {
    const f = fi.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = e => {
      img.src = e.target.result;
      img.style.display = '';
      ta.style.display = 'none';
    };
    r.readAsDataURL(f);
  });
  div.querySelector('.db-essay-add').onclick = () => addDBEssaySet();
  div.querySelector('.db-essay-remove').onclick = () => div.remove();
}

function bindStudentButtons() {
  const add = document.getElementById('save-student-btn');
  add.textContent = 'Add Student';
  const upd = document.getElementById('update-student-btn');
  if (!upd) {
    const b = document.createElement('button');
    b.id = 'update-student-btn'; b.textContent = 'Update Student'; b.style.display = 'none';
    add.after(b);
    b.onclick = updateStudentData;
  }
  add.onclick = saveStudentData;
}

function bindClearStudentsButton() {
  document.getElementById('clear-students-btn').onclick = () => {
    if (!confirm('Clear all?')) return;
    DataManager.students = [];
    DataManager.saveStudents();
    updateStudentAnswerInfo();
  };
}

async function saveStudentData() {
  if (DataManager.students.length >= 250) return alert('Max 250 students reached');
  const name = document.getElementById('db-student-name').value.trim();
  const cls  = document.getElementById('db-student-class').value.trim();
  const arm  = document.getElementById('db-student-arm').value.trim();
  if (!name||!cls||!arm) return alert('Name/Class/Arm required');

  const obj = document.getElementById('db-objective-answer').value.trim().split(',').map(s=>s.trim());
  if (!obj.length) return alert('Objective answers required');

  const sets = Array.from(document.querySelectorAll('.db-essay-set'));
  if (!sets.length) return alert('At least one essay required');
  const es = [];
  for (const s of sets) {
    const q = s.querySelector('.db-essay-qno').value.trim();
    if (!q) return alert('Essay Q No required');
    const ta = s.querySelector('.db-essay-text');
    const fi = s.querySelector('.db-essay-file');
    let a = '';
    if (ta.style.display !== 'none' && ta.value.trim()) a = ta.value.trim();
    else if (fi.files.length) {
      a = await new Promise(res=>{
        const r = new FileReader();
        r.onload=e=>res(e.target.result);
        r.readAsDataURL(fi.files[0]);
      });
    } else return alert(`Provide essay Q${q}`);
    es.push({ questionNo: q, answer: a });
  }

  DataManager.students.push({ name, class: cls, arm, objectiveAnswers: obj, essayAnswers: es });
  DataManager.saveStudents();
  updateStudentAnswerInfo();
  alert('Student added');
  document.getElementById('db-student-form').reset();
  initDBEssaySection();
}

function updateStudentAnswerInfo() {
  const c = document.getElementById('student-db-reference');
  c.innerHTML = '';
  if (!DataManager.students.length) return;

  const tbl = document.createElement('table');
  tbl.id = 'student-db-table';
  tbl.innerHTML = `
    <thead>
      <tr><th>Name</th><th>Class</th><th>Arm</th><th>Obj Ans</th><th>Essay Ans</th><th>Actions</th></tr>
    </thead>
    <tbody>
      ${DataManager.students.map((s,i)=>`
        <tr>
          <td>${s.name}</td>
          <td>${s.class}</td>
          <td>${s.arm}</td>
          <td>${s.objectiveAnswers.join(',')}</td>
          <td>${s.essayAnswers.map(e=>
            e.answer.startsWith('data:')
              ? `<img src="${e.answer}" style="width:50px;height:50px;"/>`
              : e.answer
          ).join(',')}</td>
          <td>
            <button class="edit-student" data-i="${i}">Edit</button>
            <button class="delete-student" data-i="${i}">Del</button>
          </td>
        </tr>
      `).join('')}
    </tbody>
  `;
  c.appendChild(tbl);
  tbl.querySelectorAll('.edit-student').forEach(b=>
    b.onclick=()=>startEditStudent(+b.dataset.i)
  );
  tbl.querySelectorAll('.delete-student').forEach(b=>
    b.onclick=()=>{
      const i=+b.dataset.i;
      if(!confirm(`Delete ${DataManager.students[i].name}?`))return;
      DataManager.students.splice(i,1);
      DataManager.saveStudents();
      updateStudentAnswerInfo();
    }
  );
}

function startEditStudent(i) {
  const s = DataManager.students[i];
  document.getElementById('db-student-name').value = s.name;
  document.getElementById('db-student-class').value = s.class;
  document.getElementById('db-student-arm').value = s.arm;
  document.getElementById('db-objective-answer').value = s.objectiveAnswers.join(',');
  document.getElementById('db-essay-form').innerHTML = '';
  s.essayAnswers.forEach(e=>addDBEssaySet(e.questionNo,e.answer));
  editingIndex = i;
  document.getElementById('save-student-btn').style.display = 'none';
  document.getElementById('update-student-btn').style.display = '';
}

async function updateStudentData() {
  if (editingIndex===null) return;
  const name = document.getElementById('db-student-name').value.trim();
  const cls  = document.getElementById('db-student-class').value.trim();
  const arm  = document.getElementById('db-student-arm').value.trim();
  if (!name||!cls||!arm) return alert('Name/Class/Arm required');

  const obj = document.getElementById('db-objective-answer').value.trim().split(',').map(s=>s.trim());
  if (!obj.length) return alert('Objective answers required');

  const sets = Array.from(document.querySelectorAll('.db-essay-set'));
  const es = [];
  for (const s of sets) {
    const q = s.querySelector('.db-essay-qno').value.trim();
    if (!q) return alert('Essay Q No required');
    const ta = s.querySelector('.db-essay-text');
    const fi = s.querySelector('.db-essay-file');
    let a = '';
    if (ta.style.display!=='none' && ta.value.trim()) a = ta.value.trim();
    else if (fi.files.length) {
      a = await new Promise(res=>{
        const r=new FileReader(); r.onload=e=>res(e.target.result); r.readAsDataURL(fi.files[0]);
      });
    } else return alert(`Provide essay Q${q}`);
    es.push({ questionNo:q,answer:a });
  }

  DataManager.students[editingIndex] = { name, class:cls, arm, objectiveAnswers:obj, essayAnswers:es };
  DataManager.saveStudents();
  updateStudentAnswerInfo();
  alert('Student updated');
  document.getElementById('db-student-form').reset();
  initDBEssaySection();
  editingIndex = null;
  document.getElementById('save-student-btn').style.display = '';
  document.getElementById('update-student-btn').style.display = 'none';
}

// --- Marking & Scoring ---
let markingStudentIndex = null;
let currentObjectiveScore = null;
let currentEssayScore = null;

function bindMarkingTab() {
  // spacing container already via CSS
  document.getElementById('search-student-btn').onclick = searchStudentForMarking;
  document.getElementById('populate-objective-btn').onclick = populateStudentObjectiveAnswers;
  document.getElementById('mark-objective-btn').onclick = markObjectiveOnly;
  document.getElementById('sum-essay-btn')?.onclick = sumEssayMarks;
  document.getElementById('record-mark-btn').onclick = recordMark;
}

function searchStudentForMarking() {
  const name = document.getElementById('search-student-input').value.trim().toLowerCase();
  const idx = DataManager.students.findIndex(s=>s.name.toLowerCase()===name);
  if (idx<0) return alert('Not found');
  markingStudentIndex = idx;
  const s = DataManager.students[idx];
  document.getElementById('mark-student-name').value = s.name;
  document.getElementById('mark-student-class').value = s.class;
  document.getElementById('mark-student-arm').value = s.arm;
  document.getElementById('objective-marking-form').innerHTML = '';
  document.getElementById('essay-marking-container').innerHTML = '';
  document.getElementById('objective-marking-details').textContent = '';
  document.getElementById('essay-scoring-details').textContent = '';
  currentObjectiveScore = currentEssayScore = null;
}

function populateStudentObjectiveAnswers() {
  if (markingStudentIndex===null) return alert('Select student first');
  const student = DataManager.students[markingStudentIndex];
  const form = document.getElementById('objective-marking-form');
  form.innerHTML = '';
  form.classList.add('two-col-form');
  student.objectiveAnswers
    .map((v,i)=>({val:v,i:i+1}))
    .filter(o=>o.val.trim()!=='')
    .forEach(o=>{
      const d=document.createElement('div');
      d.innerHTML=`<label>Q${o.i}:</label><input readonly value="${o.val}"/>`;
      form.appendChild(d);
    });
  document.getElementById('objective-marking-details').textContent='';
}

function markObjectiveOnly() {
  if (markingStudentIndex===null) return alert('Select student first');
  const inputs = Array.from(document.querySelectorAll('#objective-marking-form input'));
  const key = DataManager.answerKey.objective;
  let correct=0;
  inputs.forEach(inp=>{
    const idx = parseInt(inp.previousSibling.textContent.slice(1),10)-1;
    const k = key.find(o=>o.questionNo===idx+1);
    if (k && inp.value.trim().toLowerCase()===k.answer.trim().toLowerCase()) correct++;
  });
  currentObjectiveScore = correct;
  document.getElementById('objective-marking-details').textContent =
    `Obj Score: ${correct} / ${key.length}`;
}

function populateStudentEssaySection() {
  if (markingStudentIndex===null) return;
  const cont = document.getElementById('essay-marking-container');
  cont.innerHTML = '';
  const key = DataManager.answerKey.essay;
  const stud = DataManager.students[markingStudentIndex];
  const tbl = document.createElement('table');
  tbl.innerHTML = `
    <thead><tr><th>Teacher</th><th>Student</th><th>Tools</th></tr></thead>
    <tbody>
      ${key.map(k=>{
        const sa = (stud.essayAnswers.find(e=>e.questionNo===k.questionNo)||{}).answer||'';
        const disp = sa.startsWith('data:')?`<img src="${sa}" style="width:100px;height:100px;"/>`:sa;
        return `<tr data-mark="${k.mark}" data-qno="${k.questionNo}">
          <td>Q${k.questionNo}[${k.mark}]: ${k.answer}</td>
          <td>${disp}</td>
          <td>
            <button class="btn-correct">✓</button>
            <button class="btn-incorrect">✗</button>
            <button class="btn-custom">☆</button>
            <button class="btn-erase">🗑</button>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  `;
  cont.appendChild(tbl);

  tbl.querySelectorAll('tr').forEach(row=>{
    const update=()=>{
      let sum=0;
      tbl.querySelectorAll('tr').forEach(r=>{
        const sc=parseFloat(r.dataset.score);
        if(!isNaN(sc)) sum+=sc;
      });
      currentEssayScore=sum;
      document.getElementById('essay-scoring-details').textContent =
        `Essay Score: ${sum} / ${ key.reduce((s,e)=>s+Number(e.mark),0) }`;
    };
    row.querySelector('.btn-correct').onclick=()=>{
      row.dataset.score=row.dataset.mark; update();
    };
    row.querySelector('.btn-incorrect').onclick=()=>{
      row.dataset.score=0; update();
    };
    row.querySelector('.btn-custom').onclick=()=>{
      if(row.querySelector('.custom-input')) return;
      const inp=document.createElement('input'); inp.type='number'; inp.className='custom-input'; inp.placeholder='Mark';
      const ok=document.createElement('button'); ok.textContent='OK';
      ok.onclick=()=>{
        const v=parseFloat(inp.value);
        if(!isNaN(v)) { row.dataset.score=v; update(); inp.remove(); ok.remove(); }
      };
      row.lastElementChild.append(inp,ok);
    };
    row.querySelector('.btn-erase').onclick=()=>{
      delete row.dataset.score; update();
    };
  });
}

function sumEssayMarks() {
  // triggers update above
  // currentEssayScore updated
  if (currentEssayScore===null) populateStudentEssaySection();
}

function recordMark() {
  if (markingStudentIndex===null) return alert('Select student first');
  if (currentObjectiveScore===null) return alert('Mark objective first');
  if (currentEssayScore===null) return alert('Mark essay first');
  if (DataManager.scores.length>=300) return alert('Max 300 records');
  const s=DataManager.students[markingStudentIndex];
  const tot=currentObjectiveScore+currentEssayScore;
  DataManager.scores.push({
    name:s.name,class:s.class,arm:s.arm,
    objective:currentObjectiveScore,
    essay:currentEssayScore,
    total:tot
  });
  DataManager.saveScores();
  updateScoreTable();
  alert('Recorded!');
}

// --- Scores display & download ---
function updateScoreTable() {
  const tb=document.querySelector('#score-table tbody');
  tb.innerHTML='';
  DataManager.scores.forEach(r=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${r.name}</td>
      <td>${r.class}</td>
      <td>${r.arm}</td>
      <td>${r.objective}</td>
      <td>${r.essay}</td>
      <td>${r.total}</td>
    `;
    tb.appendChild(tr);
  });
}

function bindDownloadButton() {
  document.getElementById('download-scores-btn')?.addEventListener('click', downloadScores);
}

function downloadScores() {
  if (!DataManager.scores.length) return alert('No scores');
  const fmt = prompt('Format? xlsx,csv,pdf,doc').toLowerCase();
  const data = DataManager.scores;
  if (fmt==='xlsx' || fmt==='csv') {
    const ws = XLSX.utils.json_to_sheet(data);
    if (fmt==='xlsx') {
      XLSX.writeFile({ Sheets:{Scores:ws}, SheetNames:['Scores'] }, 'scores.xlsx');
    } else {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv],{type:'text/csv'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='scores.csv';a.click();
      URL.revokeObjectURL(url);
    }
  } else if (fmt==='pdf') {
    const { jsPDF } = window.jspdf;
    const doc=new jsPDF();
    let y=10; doc.text('Scores',10,y); y+=10;
    data.forEach(r=>{
      doc.text(`${r.name},${r.class},${r.arm},${r.objective},${r.essay},${r.total}`,10,y);
      y+=10;
    });
    doc.save('scores.pdf');
  } else if (fmt==='doc') {
    let html = '<html><body>';
    data.forEach(r=>{ html+=`<p>${r.name},${r.class},${r.arm},${r.objective},${r.essay},${r.total}</p>`; });
    html+='</body></html>';
    const blob=new Blob([html],{type:'application/msword'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='scores.doc';a.click();
    URL.revokeObjectURL(url);
  } else alert('Unknown format');
}

function resetScores() {
  if(!confirm('Clear all scores?'))return;
  DataManager.scores=[];
  DataManager.saveScores();
  updateScoreTable();
}

function resetAllData() {
  if(!confirm('Wipe EVERYTHING?'))return;
  localStorage.clear();
  location.reload();
}

window.addEventListener('DOMContentLoaded',()=>DataManager.init());
