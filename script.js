// script.js

// --- Constants & Helpers ---
const MAX_STUDENTS = 1000;

/**
 * Compress an image File down to <= maxKB via canvas resizing + JPEG quality.
 */
async function compressToMaxSize(file, maxWidth = 800, maxHeight = 800, maxKB = 500) {
  if (!(file instanceof File)) throw new Error('Provided input is not a File.');
  const readAsDataURL = f => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error('Failed to read file.'));
    fr.onload  = () => res(fr.result);
    fr.readAsDataURL(f);
  });
  const loadImage = src => new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = () => rej(new Error('Invalid image file.'));
    img.src     = src;
  });

  const dataUrl = await readAsDataURL(file);
  const img     = await loadImage(dataUrl);

  let { width: w, height: h } = img;
  if (w > h && w > maxWidth)      { h *= maxWidth / w; w = maxWidth; }
  else if (h > w && h > maxHeight) { w *= maxHeight / h; h = maxHeight; }

  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  let quality = 0.9;
  let output  = canvas.toDataURL('image/jpeg', quality);
  let sizeKB  = (output.length * 3/4) / 1024;

  while (sizeKB > maxKB && quality > 0.1) {
    quality -= 0.1;
    output = canvas.toDataURL('image/jpeg', quality);
    sizeKB = (output.length * 3/4) / 1024;
  }
  if (sizeKB > maxKB) throw new Error('Unable to compress below ' + maxKB + 'KB.');
  return output;
}

// --- Data Manager (localStorage) ---
const DataManager = {
  answerKey: { objective: [], essay: [] },
  students: [],
  scores: [],

  init() {
    // Load persisted data
    const ak = localStorage.getItem('answerKey');
    const sd = localStorage.getItem('studentsDB');
    const sc = localStorage.getItem('scoresDB');
    if (ak) this.answerKey = JSON.parse(ak);
    if (sd) this.students  = JSON.parse(sd);
    if (sc) this.scores    = JSON.parse(sc);

    // UI initialization
    renameAnswerTab();
    insertAnswerTabDescription();
    renderObjectiveKeyForm();
    renderEssayKeyForm();
    bindAnswerSaveButton();
    bindUploadHandlers();

    initDBEssaySection();
    setupLevelRadios();
    bindStudentButtons();
    bindClearStudentsButton();
    bindStudentUploadHandler();
    updateStudentAnswerInfo();

    updateScoreTable();
    bindClearScoreButton();

    bindMarkingTab();
    bindDownloadButton();

    initTabNavButtons();
  },

  saveAnswerKey() {
    localStorage.setItem('answerKey', JSON.stringify(this.answerKey));
  },

  saveStudents() {
    this.students.sort((a, b) => a.name.localeCompare(b.name));
    localStorage.setItem('studentsDB', JSON.stringify(this.students));
  },

  saveScores() {
    localStorage.setItem('scoresDB', JSON.stringify(this.scores));
  },

  clearAll() {
    localStorage.clear();
    this.answerKey = { objective: [], essay: [] };
    this.students  = [];
    this.scores    = [];
    location.reload();
  }
};

// --- Tab Navigation Helpers ---
function switchTab(direction) {
  const tabs = Array.from(document.querySelectorAll('.tab-button'));
  const current = tabs.findIndex(t => t.classList.contains('active'));
  const target = current + direction;
  if (target < 0 || target >= tabs.length) return;
  tabs[target].click();
}

function initTabNavButtons() {
  document.querySelectorAll('.tab-content').forEach(container => {
    container.insertAdjacentHTML('beforeend', '<br><br>');
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.justifyContent = 'space-between';
    wrap.style.padding = '1rem';

    const back = document.createElement('button');
    back.textContent = 'Back';
    back.style.padding = '0.75rem 1.5rem';
    back.style.fontSize = '1.25rem';
    back.addEventListener('click', () => switchTab(-1));

    const next = document.createElement('button');
    next.textContent = 'Next';
    next.style.padding = '0.75rem 1.5rem';
    next.style.fontSize = '1.25rem';
    next.addEventListener('click', () => switchTab(1));

    wrap.append(back, next);
    container.appendChild(wrap);
  });
}

document.querySelectorAll('.tab-button').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  })
);

// --- Teacher's Answer Tab ---
function renameAnswerTab() {
  const btn = document.querySelector('.tab-button[data-tab="answer"]');
  if (btn) btn.textContent = "Teacher's Answer Tab";
}
function insertAnswerTabDescription() {
  const sec = document.getElementById('answer');
  const p = document.createElement('p');
  p.textContent = 'Upload or type your objective answers and essay key.';
  p.style.fontSize = '1rem';
  sec.insertBefore(p, document.getElementById('objective-answer-container'));
}

// --- Answer Key Forms ---
function renderObjectiveKeyForm() {
  const c = document.getElementById('objective-answer-form');
  c.innerHTML = '';
  c.classList.add('two-col-form');
  const entries = DataManager.answerKey.objective;
  const pop = entries.filter(o => o.answer.trim());
  const show = pop.length ? entries : Array.from({length:50}, (_,i)=>({questionNo:i+1,answer:''}));
  show.forEach(o => {
    const d = document.createElement('div');
    d.innerHTML = `<label>Q${o.questionNo}:</label><input type="text" name="q_${o.questionNo}" value="${o.answer}"/>`;
    c.appendChild(d);
  });
  const tot = document.getElementById('objective-key-total');
  if (pop.length) {
    tot.textContent = `Total Objective Marks: ${pop.length}`;
    tot.style.display = '';
  } else tot.style.display = 'none';
}

function renderEssayKeyForm() {
  const c = document.getElementById('essay-answer-form');
  c.innerHTML = '';
  const entries = DataManager.answerKey.essay;
  const pop = entries.filter(e => e.questionNo && e.mark !== '');
  const show = pop.length ? entries : Array.from({length:20}, (_,i)=>({questionNo:'',mark:'',answer:''}));
  show.forEach((e,i) => {
    const d = document.createElement('div');
    d.innerHTML = `
      <label>Set ${e.questionNo||i+1}:</label>
      <input type="text"   name="qno_${i+1}" placeholder="Question No." value="${e.questionNo}" />
      <input type="number" name="mark_${i+1}" placeholder="Mark" value="${e.mark}" />
      <textarea name="ans_${i+1}" placeholder="Correct answer">${e.answer}</textarea>
    `;
    c.appendChild(d);
  });
  const tot = document.getElementById('essay-key-total');
  const sum = pop.reduce((s,e)=>s+Number(e.mark),0);
  if (pop.length) {
    tot.textContent = `Total Essay Marks: ${sum}`;
    tot.style.display = '';
  } else tot.style.display = 'none';
}

// --- Bind Answer Save & Upload ---
function bindAnswerSaveButton() {
  const btn = document.getElementById('save-answers-btn');
  btn.textContent = 'Save Answers';
  btn.addEventListener('click', saveAnswerData);
}
function bindUploadHandlers() {
  document.getElementById('upload-objective-answer')?.addEventListener('change', handleObjectiveUpload);
  document.getElementById('upload-essay-answer')   ?.addEventListener('change', handleEssayUpload);
}
function handleObjectiveUpload(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = evt => {
    const wb = XLSX.read(evt.target.result, {type:'array'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {header:1});
    if (rows.length <= 1) return;
    DataManager.answerKey.objective = rows.slice(1).map(r=>({
      questionNo: Number(r[0])||undefined,
      answer: String(r[1]||'').trim()
    }));
    DataManager.saveAnswerKey();
    renderObjectiveKeyForm();
  };
  r.readAsArrayBuffer(f);
}
function handleEssayUpload(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = evt => {
    const wb = XLSX.read(evt.target.result, {type:'array'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {header:1});
    if (rows.length <= 1) return;
    DataManager.answerKey.essay = rows.slice(1,21).map(r=>({
      questionNo: String(r[0]||'').trim(),
      mark:       r[1]!=null ? r[1] : '',
      answer:     String(r[2]||'').trim()
    }));
    DataManager.saveAnswerKey();
    renderEssayKeyForm();
  };
  r.readAsArrayBuffer(f);
}
function saveAnswerData() {
  // Objective
  const objInputs = Array.from(document.querySelectorAll('#objective-answer-form input'));
  if (objInputs.every(i=>!i.value.trim())) {
    return alert('Fill at least one objective answer.');
  }
  DataManager.answerKey.objective = objInputs.map((i,idx)=>({
    questionNo: idx+1,
    answer: i.value.trim()
  }));
  // Essay
  const esDivs = Array.from(document.querySelectorAll('#essay-answer-form div'));
  const valid = esDivs.some((d,i)=> {
    const q = d.querySelector(`[name=qno_${i+1}]`).value.trim();
    const m = d.querySelector(`[name=mark_${i+1}]`).value.trim();
    const a = d.querySelector(`[name=ans_${i+1}]`).value.trim();
    return q && m && a;
  });
  if (!valid) {
    return alert('Fill at least one essay question.');
  }
  DataManager.answerKey.essay = esDivs.map((d,i)=>({
    questionNo: d.querySelector(`[name=qno_${i+1}]`).value.trim(),
    mark:       d.querySelector(`[name=mark_${i+1}]`).value.trim(),
    answer:     d.querySelector(`[name=ans_${i+1}]`).value.trim()
  }));
  DataManager.saveAnswerKey();
  objInputs.forEach(i=>i.value='');
  document.querySelectorAll('#essay-answer-form input,#essay-answer-form textarea').forEach(el=>el.value='');
  let n = document.getElementById('answer-notification');
  if (!n) {
    n = document.createElement('div');
    n.id = 'answer-notification';
    document.getElementById('save-answers-btn').insertAdjacentElement('afterend', n);
  }
  n.textContent = 'All answers saved successfully';
  n.style.color = 'green';
}

// --- Students Database ---
let editingIndex = null;

function initDBEssaySection() {
  const c = document.getElementById('db-essay-form');
  c.innerHTML = '';
  addDBEssaySet();
}

function addDBEssaySet(qNo = '', answer = '') {
  const c = document.getElementById('db-essay-form');
  const set = document.createElement('div');
  set.className = 'db-essay-set';
  set.innerHTML = `
    <input class="db-essay-qno" value="${qNo}" placeholder="Q No"/>
    <textarea class="db-essay-text" placeholder="Answer text">${answer}</textarea>
    <input type="file" class="db-essay-file" accept="image/png,image/jpeg"/>
    <div class="db-essay-preview"><img style="width:200px;height:200px;display:none;"/></div>
    <button type="button" class="db-essay-add">Continue</button>
    <button type="button" class="db-essay-remove">Delete</button>
  `;
  c.appendChild(set);
  const ta = set.querySelector('.db-essay-text');
  const fi = set.querySelector('.db-essay-file');
  const img = set.querySelector('img');

  ta.addEventListener('input', () => {
    fi.style.display  = ta.value.trim() ? 'none' : '';
    img.style.display = ta.value.trim() ? 'none' : img.style.display;
  });
  fi.addEventListener('change', async () => {
    const f = fi.files[0];
    if (!f) return;
    if (f.size > 5*1024*1024) {
      alert('Please pick under 5 MB.');
      fi.value = '';
      return;
    }
    try {
      const d = await compressToMaxSize(f, 800, 800, 500);
      img.src            = d;
      img.style.display  = '';
      ta.style.display   = 'none';
      fi.dataset.dataurl = d;
    } catch(err) {
      alert('Image error: ' + err.message);
      fi.value = '';
    }
  });

  set.querySelector('.db-essay-add').addEventListener('click', () => addDBEssaySet());
  set.querySelector('.db-essay-remove').addEventListener('click', () => set.remove());
}

function setupLevelRadios() {
  const levels = {
    primary:   ['PRY1','PRY2','PRY3','PRY4','PRY5','PRY6'],
    secondary: ['JS1','JS2','JS3','SS1','SS2','SS3'],
    tertiary:  ['100L','200L','300L','400L','500L','MSc Level','PhD Level']
  };
  const radios = document.querySelectorAll('input[name="level"]');
  const clsSel = document.getElementById('db-student-class');
  const armIn  = document.getElementById('db-student-arm');
  armIn.placeholder = 'Enter Arm';

  radios.forEach(r => r.addEventListener('change', () => {
    clsSel.innerHTML = '<option value="">Select Class</option>';
    levels[r.value].forEach(opt => {
      const o = document.createElement('option');
      o.value = o.textContent = opt;
      clsSel.appendChild(o);
    });
    localStorage.setItem('selectedLevel', r.value);
  }));

  const sl = localStorage.getItem('selectedLevel');
  if (sl) {
    document.querySelector(`input[name="level"][value="${sl}"]`)?.checked = true;
    levels[sl].forEach(opt => {
      const o = document.createElement('option');
      o.value = o.textContent = opt;
      clsSel.appendChild(o);
    });
    const sc = localStorage.getItem('db-student-class');
    if (sc) clsSel.value = sc;
  }
  clsSel.addEventListener('change', () => localStorage.setItem('db-student-class', clsSel.value));
  armIn.addEventListener('input', () => localStorage.setItem('db-student-arm', armIn.value));
}

// Bulk upload handler
function bindStudentUploadHandler() {
  document.getElementById('upload-students')?.addEventListener('change', handleStudentUpload);
}
function handleStudentUpload(e) {
  const f = e.target.files[0];
  if (!f) return alert('No file selected.');
  const r = new FileReader();
  r.onload = ev => {
    try {
      const wb = XLSX.read(ev.target.result, {type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws,{header:1});
      rows.slice(1).forEach(rw => {
        const [n, cl, a, oa] = rw;
        if (n && cl && a) {
          const arr = oa ? String(oa).split(',').map(s=>s.trim()) : [];
          DataManager.students.push({
            name: String(n).trim(),
            class: String(cl).trim(),
            arm:  String(a).trim(),
            objectiveAnswers: arr,
            essayAnswers: []
          });
        }
      });
      DataManager.saveStudents();
      updateStudentAnswerInfo();
      alert(`Imported ${rows.length-1} students.`);
    } catch(err) {
      alert('Import failed: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };
  r.readAsArrayBuffer(f);
}

function bindStudentButtons() {
  const sb = document.getElementById('save-student-btn');
  sb.textContent = 'Add Student';
  const ub = document.getElementById('update-student-btn') || (() => {
    const b = document.createElement('button');
    b.id = 'update-student-btn';
    b.type = 'button';
    b.textContent = 'Update Student';
    b.style.display = 'none';
    sb.insertAdjacentElement('afterend', b);
    return b;
  })();
  sb.addEventListener('click', saveStudentData);
  ub.addEventListener('click', updateStudentData);
}

function bindClearStudentsButton() {
  document.getElementById('clear-students-btn')?.addEventListener('click', () => {
    if (!confirm('Clear all students?')) return;
    DataManager.students = [];
    DataManager.saveStudents();
    updateStudentAnswerInfo();
  });
}

async function saveStudentData() {
  if (DataManager.students.length >= MAX_STUDENTS) {
    return alert(`Max of ${MAX_STUDENTS} reached.`);
  }
  const name  = document.getElementById('db-student-name').value.trim();
  const cls   = document.getElementById('db-student-class').value.trim();
  const arm   = document.getElementById('db-student-arm').value.trim();
  if (!name || !cls || !arm) return alert('Name, Class & Arm are required');

  const objRaw = document.getElementById('db-objective-answer').value.trim();
  if (!objRaw) return alert('Objective answers required');
  const objArr = objRaw.split(',').map(s => s.trim());

  const sets    = Array.from(document.querySelectorAll('.db-essay-set'));
  if (!sets.length) return alert('At least one essay answer required');
  const essayData = [];
  for (const set of sets) {
    const qno = set.querySelector('.db-essay-qno').value.trim();
    if (!qno) return alert('Question number required');
    const ta = set.querySelector('.db-essay-text');
    const fi = set.querySelector('.db-essay-file');
    let ans = '';
    if (ta.style.display !== 'none' && ta.value.trim()) {
      ans = ta.value.trim();
    } else if (fi.dataset.dataurl) {
      ans = fi.dataset.dataurl;
    } else {
      return alert(`Provide text or upload image for essay Q${qno}`);
    }
    essayData.push({ questionNo: qno, answer: ans });
  }

  DataManager.students.push({ name, class: cls, arm, objectiveAnswers: objArr, essayAnswers: essayData });
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
  tbl.innerHTML = `
    <thead><tr>
      <th>Name</th><th>Class</th><th>Arm</th>
      <th>Objective Answers</th><th>Essay Answers</th><th>Actions</th>
    </tr></thead>
    <tbody>
      ${DataManager.students.map((s,i) => {
        const obj = s.objectiveAnswers.join(', ');
        const es  = s.essayAnswers
          .map(e => e.answer.startsWith('data:')
            ? `<img src="${e.answer}" style="width:50px;height:50px;"/>`
            : e.answer
          ).join(', ');
        return `
        <tr>
          <td>${s.name}</td><td>${s.class}</td><td>${s.arm}</td>
          <td>${obj}</td><td>${es}</td>
          <td>
            <button class="edit-student" data-idx="${i}">Edit</button>
            <button class="delete-student" data-idx="${i}">Delete</button>
          </td>
        </tr>`;
      }).join('')}
    </tbody>`;
  c.appendChild(tbl);
  tbl.querySelectorAll('.edit-student').forEach(b =>
    b.addEventListener('click', () => startEditStudent(+b.dataset.idx))
  );
  tbl.querySelectorAll('.delete-student').forEach(b =>
    b.addEventListener('click', () => {
      const i = +b.dataset.idx;
      if (!confirm(`Delete ${DataManager.students[i].name}?`)) return;
      DataManager.students.splice(i,1);
      DataManager.saveStudents();
      updateStudentAnswerInfo();
    })
  );
}

function startEditStudent(i) {
  const s = DataManager.students[i];
  document.getElementById('db-student-name').value = s.name;
  document.getElementById('db-student-class').value = s.class;
  document.getElementById('db-student-arm').value = s.arm;
  document.getElementById('db-objective-answer').value = s.objectiveAnswers.join(',');
  const ec = document.getElementById('db-essay-form');
  ec.innerHTML = '';
  if (s.essayAnswers.length) {
    s.essayAnswers.forEach(e => addDBEssaySet(e.questionNo, e.answer));
  } else {
    initDBEssaySection();
  }
  editingIndex = i;
  document.getElementById('save-student-btn').style.display   = 'none';
  document.getElementById('update-student-btn').style.display = '';
}

async function updateStudentData() {
  if (editingIndex===null) return;
  const name = document.getElementById('db-student-name').value.trim();
  const cls  = document.getElementById('db-student-class').value.trim();
  const arm  = document.getElementById('db-student-arm').value.trim();
  if (!name || !cls || !arm) return alert('Name, Class & Arm are required');

  const oraw = document.getElementById('db-objective-answer').value.trim();
  if (!oraw) return alert('Objective answers required');
  const objArr = oraw.split(',').map(s=>s.trim());

  const sets = Array.from(document.querySelectorAll('.db-essay-set'));
  const essayData = [];
  for (const set of sets) {
    const qno = set.querySelector('.db-essay-qno').value.trim();
    if (!qno) return alert('Question number required');
    const ta = set.querySelector('.db-essay-text');
    const fi = set.querySelector('.db-essay-file');
    let ans = '';
    if (ta.style.display !== 'none' && ta.value.trim()) {
      ans = ta.value.trim();
    } else if (fi.files.length) {
      const f = fi.files[0];
      if (f.size > 5*1024*1024) {
        alert('Under 5 MB'); return;
      }
      try {
        ans = await compressToMaxSize(f,800,800,500);
      } catch(err) {
        alert(err.message); return;
      }
    } else if (fi.dataset.dataurl) {
      ans = fi.dataset.dataurl;
    } else {
      return alert(`Provide answer for Q${qno}`);
    }
    essayData.push({ questionNo: qno, answer: ans });
  }

  DataManager.students[editingIndex] = {
    name, class: cls, arm, objectiveAnswers: objArr, essayAnswers: essayData
  };
  DataManager.saveStudents();
  updateStudentAnswerInfo();
  alert('Student updated');
  document.getElementById('db-student-form').reset();
  initDBEssaySection();
  editingIndex = null;
  document.getElementById('save-student-btn').style.display   = '';
  document.getElementById('update-student-btn').style.display = 'none';
}

// --- Marking & Scores ---
let markingIdx = null, curObjScore = null, curEssayScore = null, curMarkIdx = -1;

function bindMarkingTab() {
  document.getElementById('search-student-btn')?.addEventListener('click', searchStudentForMarking);
  document.getElementById('populate-objective-btn')?.addEventListener('click', populateStudentObjectiveAnswers);
  document.getElementById('mark-objective-btn')?.addEventListener('click', markObjectiveOnly);
  document.getElementById('sum-essay-btn')?.addEventListener('click', sumEssayMarks);
  document.getElementById('record-mark-btn')?.addEventListener('click', () => {
    recordMark();
    setTimeout(() => document.getElementById('marking-notification').textContent = '', 2000);
  });
  document.getElementById('mark-next-btn')?.addEventListener('click', markNextStudent);
}

function searchStudentForMarking() {
  const n = document.getElementById('search-student-input').value.trim().toLowerCase();
  const idx = DataManager.students.findIndex(s => s.name.toLowerCase() === n);
  if (idx < 0) return alert('Student not found');
  markingIdx = idx;
  const s = DataManager.students[idx];
  document.getElementById('mark-student-name').value  = s.name;
  document.getElementById('mark-student-class').value = s.class;
  document.getElementById('mark-student-arm').value   = s.arm;
  document.getElementById('objective-marking-form').innerHTML = '';
  document.getElementById('objective-marking-details').textContent = '';
  document.getElementById('essay-marking-container').innerHTML    = '';
  document.getElementById('essay-scoring-details').textContent    = '';
  curObjScore = curEssayScore = null;
}

function markNextStudent() {
  if (!DataManager.students.length) return;
  if (DataManager.scores.length === DataManager.students.length) {
    return alert('All Students have been Marked and Recorded');
  }
  curMarkIdx = (curMarkIdx + 1) % DataManager.students.length;
  const s = DataManager.students[curMarkIdx];
  document.getElementById('search-student-input').value = s.name;
  searchStudentForMarking();
}

function populateStudentObjectiveAnswers() {
  if (markingIdx === null) return alert('Select a student first');
  if (!DataManager.answerKey.objective.length) return alert('Teacher has not supplied answers for Marking');
  const st = DataManager.students[markingIdx];
  const f  = document.getElementById('objective-marking-form');
  f.innerHTML = '';
  f.classList.add('two-col-form');
  st.objectiveAnswers.forEach((a,i) => {
    const d = document.createElement('div');
    d.innerHTML = `<label>Q${i+1}:</label><input readonly value="${a}"/>`;
    f.appendChild(d);
  });
  curObjScore = null;
  document.getElementById('objective-marking-details').textContent = '';
  populateStudentEssaySection();
}

function markObjectiveOnly() {
  if (!DataManager.answerKey.objective.length) return alert('Teacher has not supplied answers for Marking');
  if (markingIdx === null) return alert('No student selected');
  const inputs = Array.from(document.querySelectorAll('#objective-marking-form input'));
  let correct = 0;
  inputs.forEach(inp => {
    const qn = parseInt(inp.name.split('_')[1],10) || (inp.previousSibling.textContent.match(/Q(\d+)/)||[])[1];
    const stud = inp.value.trim().toLowerCase();
    const key = DataManager.answerKey.objective.find(o => o.questionNo===qn);
    if (key && key.answer.trim().toLowerCase() === stud) correct++;
  });
  curObjScore = correct;
  document.getElementById('objective-marking-details').textContent =
    `Objective Score: ${correct} / ${DataManager.answerKey.objective.length}`;
}

function populateStudentEssaySection() {
  const c = document.getElementById('essay-marking-container');
  c.innerHTML = '';
  const key     = DataManager.answerKey.essay;
  const st      = DataManager.students[markingIdx];
  const tbl     = document.createElement('table');
  tbl.innerHTML = `
    <thead><tr><th>Teacher's Answer</th><th>Student's Answer</th><th>Tools</th></tr></thead>
    <tbody>
      ${key.map(k => {
        const found = st.essayAnswers.find(e=>e.questionNo===k.questionNo) || {};
        const ans   = found.answer || '';
        const disp  = ans.startsWith('data:') ? `<img src="${ans}" style="width:360px;height:562px"/>` : ans;
        return `
          <tr data-q="${k.questionNo}" data-m="${k.mark}">
            <td>Q${k.questionNo}[${k.mark}]: ${k.answer}</td>
            <td>${disp}</td>
            <td>
              <button class="btn-correct" style="color:green;">✓</button>
              <button class="btn-incorrect" style="color:red;">✗</button>
              <button class="btn-custom" style="color:goldenrod;">✎</button>
              <button class="btn-erase" style="color:black;">🗑️</button>
            </td>
          </tr>`;
      }).join('')}
    </tbody>`;
  c.appendChild(tbl);

  tbl.querySelectorAll('tr[data-q]').forEach(row => {
    const update = () => {
      let total=0;
      tbl.querySelectorAll('tr[data-q]').forEach(r=>{
        const sc = parseFloat(r.dataset.score);
        if (!isNaN(sc)) total += sc;
      });
      curEssayScore = total;
      document.getElementById('essay-scoring-details').textContent = `Essay Score: ${total}`;
    };
    row.querySelector('.btn-correct').addEventListener('click', ()=>{
      row.dataset.score = row.dataset.m;
      update();
    });
    row.querySelector('.btn-incorrect').addEventListener('click', ()=>{
      row.dataset.score = 0;
      update();
    });
    row.querySelector('.btn-custom').addEventListener('click', ()=>{
      if (row.querySelector('.custom-input')) return;
      const inp = document.createElement('input');
      inp.type = 'number'; inp.className='custom-input'; inp.placeholder='Mark';
      const done = document.createElement('button');
      done.textContent = 'Done';
      done.addEventListener('click', ()=>{
        const v = parseFloat(inp.value);
        if (!isNaN(v)) {
          row.dataset.score = v;
          update();
          inp.remove();
          done.remove();
        }
      });
      row.lastElementChild.append(inp, done);
    });
    row.querySelector('.btn-erase').addEventListener('click', ()=>{
      delete row.dataset.score;
      update();
    });
  });
}

function sumEssayMarks() {
  if (!DataManager.answerKey.essay.length) return alert('Teacher has not supplied answers for Marking');
  if (markingIdx === null) return alert('No student selected');
  let sum = 0;
  document.querySelectorAll('#essay-marking-container tr[data-q]').forEach(r=>{
    const sc = parseFloat(r.dataset.score);
    if (!isNaN(sc)) sum+=sc;
  });
  const tot = DataManager.answerKey.essay.reduce((a,e)=>a+Number(e.mark),0);
  curEssayScore = sum;
  document.getElementById('essay-scoring-details').textContent = `Essay Score: ${sum} / ${tot}`;
}

function recordMark() {
  if (markingIdx === null) return alert('No student to record');
  if (curObjScore === null) return alert('Please mark objective first');
  if (curEssayScore === null) return alert('Please sum essay first');
  const s = DataManager.students[markingIdx];
  if (DataManager.scores.some(r=>r.name===s.name&&r.class===s.class&&r.arm===s.arm)) {
    return alert("Student's Mark has been Recorded Already!");
  }
  const total = curObjScore + curEssayScore;
  DataManager.scores.push({ name:s.name, class:s.class, arm:s.arm, objective:curObjScore, essay:curEssayScore, total });
  DataManager.saveScores();
  updateScoreTable();
  document.getElementById('marking-notification').textContent = 'Mark recorded!';
}

// --- Score Tab & Download ---
function bindClearScoreButton() {
  document.getElementById('clear-scores-btn')?.addEventListener('click', () => {
    if (!confirm('Clear all scores?')) return;
    DataManager.scores = [];
    DataManager.saveScores();
    updateScoreTable();
  });
}

function bindDownloadButton() {
  document.getElementById('download-score-btn')?.addEventListener('click', downloadScores);
}

function updateScoreTable() {
  const tb = document.querySelector('#score-table tbody');
  tb.innerHTML = '';
  DataManager.scores.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.name}</td>
      <td>${r.class}</td>
      <td>${r.arm}</td>
      <td>${r.objective}</td>
      <td>${r.essay}</td>
      <td>${r.total}</td>`;
    tb.appendChild(tr);
  });
}

function downloadScores() {
  const sc = DataManager.scores;
  if (!sc.length) return alert('No scores to download');
  const fmt = prompt('Enter format: xlsx, csv, pdf, doc').toLowerCase();
  if (fmt === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(sc);
    const wb = { Sheets:{Scores:ws}, SheetNames:['Scores'] };
    XLSX.writeFile(wb, 'scores.xlsx');
  } else if (fmt === 'csv') {
    const ws = XLSX.utils.json_to_sheet(sc);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], {type:'text/csv'});
    const link = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = link; a.download='scores.csv'; a.click();
    URL.revokeObjectURL(link);
  } else if (fmt === 'pdf') {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 10;
    doc.text('Scores', 10, y); y += 10;
    sc.forEach(r => {
      doc.text(`${r.name} | ${r.class} | ${r.arm} | ${r.objective} | ${r.essay} | ${r.total}`, 10, y);
      y += 10;
    });
    doc.save('scores.pdf');
  } else if (fmt === 'doc') {
    let html = '<h1>Scores</h1><table border="1"><tr><th>Name</th><th>Class</th><th>Arm</th><th>Obj</th><th>Essay</th><th>Total</th></tr>';
    sc.forEach(r => {
      html += `<tr><td>${r.name}</td><td>${r.class}</td><td>${r.arm}</td><td>${r.objective}</td><td>${r.essay}</td><td>${r.total}</td></tr>`;
    });
    html += '</table>';
    const blob = new Blob([html], {type:'application/msword'});
    const link = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = link; a.download='scores.doc'; a.click();
    URL.revokeObjectURL(link);
  } else {
    alert('Unknown format');
  }
}

function resetAllData() {
  if (!confirm('This will wipe EVERYTHING. Continue?')) return;
  DataManager.clearAll();
}

// --- Initialize ---
window.addEventListener('DOMContentLoaded', () => {
  DataManager.init();
});
