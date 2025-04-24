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

    // marking & download bindings
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

// --- Render Answer Forms ---
function renderObjectiveKeyForm() {
  const c = document.getElementById('objective-answer-form');
  c.innerHTML = '';
  c.classList.add('two-col-form');
  const entries = DataManager.answerKey.objective;
  const populated = entries.filter(o => o.answer.trim() !== '');
  const toShow = populated.length ? populated : Array.from({ length: 50 }, (_, i) => ({ questionNo: i + 1, answer: '' }));
  toShow.forEach(o => {
    const div = document.createElement('div');
    div.innerHTML = `<label>Q${o.questionNo}:</label>
                     <input type="text" name="q_${o.questionNo}" value="${o.answer}" />`;
    c.appendChild(div);
  });
  const totalEl = document.getElementById('objective-key-total');
  if (populated.length) {
    totalEl.textContent = `Total Marks: ${populated.length}`;
    totalEl.style.display = 'block';
  } else {
    totalEl.style.display = 'none';
  }
}

function renderEssayKeyForm() {
  const c = document.getElementById('essay-answer-form');
  c.innerHTML = '';
  const entries = DataManager.answerKey.essay;
  const populated = entries.filter(e => e.questionNo && e.mark !== '');
  const toShow = populated.length ? populated : Array.from({ length: 20 }, (_, i) => ({ questionNo: '', mark: '', answer: '' }));
  toShow.forEach((e, i) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Set ${e.questionNo || i + 1}:</label>
      <input type="text" name="qno_${i+1}" placeholder="Question No." value="${e.questionNo}" />
      <input type="number" name="mark_${i+1}" placeholder="Mark allotted" value="${e.mark}" />
      <textarea name="ans_${i+1}" placeholder="Correct answer">${e.answer}</textarea>
    `;
    c.appendChild(div);
  });
  const totalEl = document.getElementById('essay-key-total');
  if (populated.length) {
    const sum = populated.reduce((s, e) => s + Number(e.mark), 0);
    totalEl.textContent = `Total Essay Marks: ${sum}`;
    totalEl.style.display = 'block';
  } else {
    totalEl.style.display = 'none';
  }
}

// --- Bind Answer Save / Upload ---
function bindAnswerSaveButton() {
  const btn = document.getElementById('save-answers-btn');
  if (btn) {
    btn.textContent = 'Save Answers';
    btn.addEventListener('click', saveAnswerData);
  }
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
    const data = evt.target.result;
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
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
    const data = evt.target.result;
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length <= 1) return;
    DataManager.answerKey.essay = rows.slice(1, 21).map(r => ({
      questionNo: String(r[0] || '').trim(),
      mark: r[1] != null ? r[1] : '',
      answer: String(r[2] || '').trim()
    }));
    DataManager.saveAnswerKey();
    renderEssayKeyForm();
  };
  reader.readAsArrayBuffer(file);
}

// --- Save Answers with Validation ---
function saveAnswerData() {
  const objInputs = Array.from(document.querySelectorAll('#objective-answer-form input'));
  if (objInputs.every(i => !i.value.trim())) {
    return alert('Please fill at least one objective answer before saving.');
  }
  DataManager.answerKey.objective = objInputs.map((i, idx) => ({
    questionNo: idx + 1,
    answer: i.value.trim()
  }));

  const essayDivs = Array.from(document.querySelectorAll('#essay-answer-form div'));
  const hasOne = essayDivs.some((div, idx) => {
    const q = div.querySelector(`[name="qno_${idx+1}"]`).value.trim();
    const m = div.querySelector(`[name="mark_${idx+1}"]`).value.trim();
    const a = div.querySelector(`[name="ans_${idx+1}"]`).value.trim();
    return q && m && a;
  });
  if (!hasOne) {
    return alert('Please fill at least one essay question (Question No., Mark, and Answer).');
  }
  DataManager.answerKey.essay = essayDivs.map((div, idx) => ({
    questionNo: div.querySelector(`[name="qno_${idx+1}"]`).value.trim(),
    mark: div.querySelector(`[name="mark_${idx+1}"]`).value.trim(),
    answer: div.querySelector(`[name="ans_${idx+1}"]`).value.trim()
  }));

  DataManager.saveAnswerKey();
  objInputs.forEach(i => i.value = '');
  document.querySelectorAll('#essay-answer-form input, #essay-answer-form textarea')
    .forEach(el => el.value = '');

  let notif = document.getElementById('answer-notification');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'answer-notification';
    document.getElementById('save-answers-btn').insertAdjacentElement('afterend', notif);
  }
  notif.textContent = 'All answers (objective and essay) have been saved successfully';
  notif.style.color = 'green';
}

// --- Students Database ---
let editingIndex = null;

function initDBEssaySection() {
  const c = document.getElementById('db-essay-form');
  c.innerHTML = '';
  addDBEssaySet();
}

function addDBEssaySet(qNo = '', answer = '') {
  const container = document.getElementById('db-essay-form');
  const set = document.createElement('div');
  set.className = 'db-essay-set';
  set.innerHTML = `
    <input type="text" class="db-essay-qno" value="${qNo}" placeholder="Q No" />
    <textarea class="db-essay-text" placeholder="Answer text">${answer}</textarea>
    <input type="file" class="db-essay-file" accept="image/png, image/jpeg" />
    <div class="db-essay-preview"><img style="width:100px;height:100px;display:none;" /></div>
    <button type="button" class="db-essay-add">Continue</button>
    <button type="button" class="db-essay-remove">Delete</button>
  `;
  container.appendChild(set);

  const ta = set.querySelector('.db-essay-text');
  const fileInput = set.querySelector('.db-essay-file');
  const img = set.querySelector('img');

  ta.addEventListener('input', () => {
    fileInput.style.display = ta.value.trim() ? 'none' : '';
    img.style.display = ta.value.trim() ? 'none' : img.style.display;
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      img.src = e.target.result;
      img.style.display = '';
      ta.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  set.querySelector('.db-essay-add').addEventListener('click', () => addDBEssaySet());
  set.querySelector('.db-essay-remove').addEventListener('click', () => set.remove());
}

function bindStudentButtons() {
  const saveBtn = document.getElementById('save-student-btn');
  saveBtn.textContent = 'Add Student';
  const updateBtn = document.createElement('button');
  updateBtn.id = 'update-student-btn';
  updateBtn.type = 'button';
  updateBtn.textContent = 'Update Student';
  updateBtn.style.display = 'none';
  saveBtn.insertAdjacentElement('afterend', updateBtn);

  saveBtn.addEventListener('click', saveStudentData);
  updateBtn.addEventListener('click', updateStudentData);
}

function bindClearStudentsButton() {
  const btn = document.getElementById('clear-students-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      if (!confirm('Clear all student records?')) return;
      DataManager.students = [];
      DataManager.saveStudents();
      updateStudentAnswerInfo();
    });
  }
}

async function saveStudentData() {
  if (DataManager.students.length >= 250) {
    return alert('Maximum of 250 students reached.');
  }
  const name = document.getElementById('db-student-name').value.trim();
  const cls = document.getElementById('db-student-class').value.trim();
  const arm = document.getElementById('db-student-arm').value.trim();
  if (!name || !cls || !arm) return alert('Name, Class & Arm are required');

  const objRaw = document.getElementById('db-objective-answer').value.trim();
  if (!objRaw) return alert('Objective answers required');
  const objArr = objRaw.split(',').map(s => s.trim());

  const sets = Array.from(document.querySelectorAll('.db-essay-set'));
  if (!sets.length) return alert('At least one essay answer required');
  const essayData = [];
  for (const set of sets) {
    const qno = set.querySelector('.db-essay-qno').value.trim();
    if (!qno) return alert('Question number required for each essay answer');
    const ta = set.querySelector('.db-essay-text');
    const fileInput = set.querySelector('.db-essay-file');
    let ans = '';
    if (ta.style.display !== 'none' && ta.value.trim()) {
      ans = ta.value.trim();
    } else if (fileInput.files.length) {
      ans = await new Promise(res => {
        const fr = new FileReader();
        fr.onload = e => res(e.target.result);
        fr.readAsDataURL(fileInput.files[0]);
      });
    } else {
      return alert(`Provide text or upload image for essay Q${qno}`);
    }
    essayData.push({ questionNo: qno, answer: ans });
  }

  DataManager.students.push({
    name, class: cls, arm,
    objectiveAnswers: objArr,
    essayAnswers: essayData
  });
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
      <tr>
        <th>Name</th><th>Class</th><th>Arm</th>
        <th>Objective Answers</th><th>Essay Answers</th><th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${DataManager.students.map((s,i) => {
        const obj = s.objectiveAnswers.join(', ');
        const essay = s.essayAnswers.map(e =>
          e.answer.startsWith('data:')
            ? `<img src="${e.answer}" style="width:50px;height:50px;"/>`
            : e.answer
        ).join(', ');
        return `
        <tr>
          <td>${s.name}</td>
          <td>${s.class}</td>
          <td>${s.arm}</td>
          <td>${obj}</td>
          <td>${essay}</td>
          <td>
            <button class="edit-student" data-index="${i}">Edit</button>
            <button class="delete-student" data-index="${i}">Delete</button>
          </td>
        </tr>`;
      }).join('')}
    </tbody>`;
  c.appendChild(tbl);

  tbl.querySelectorAll('.edit-student').forEach(btn =>
    btn.addEventListener('click', () => startEditStudent(+btn.dataset.index))
  );
  tbl.querySelectorAll('.delete-student').forEach(btn =>
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.index;
      if (!confirm(`Delete record for ${DataManager.students[idx].name}?`)) return;
      DataManager.students.splice(idx, 1);
      DataManager.saveStudents();
      updateStudentAnswerInfo();
    })
  );
}

function startEditStudent(idx) {
  const s = DataManager.students[idx];
  document.getElementById('db-student-name').value = s.name;
  document.getElementById('db-student-class').value = s.class;
  document.getElementById('db-student-arm').value = s.arm;
  document.getElementById('db-objective-answer').value = s.objectiveAnswers.join(',');
  document.getElementById('db-essay-form').innerHTML = '';
  s.essayAnswers.forEach(e => addDBEssaySet(e.questionNo, e.answer));
  editingIndex = idx;
  document.getElementById('save-student-btn').style.display = 'none';
  document.getElementById('update-student-btn').style.display = '';
}

async function updateStudentData() {
  if (editingIndex === null) return;
  const name = document.getElementById('db-student-name').value.trim();
  const cls = document.getElementById('db-student-class').value.trim();
  const arm = document.getElementById('db-student-arm').value.trim();
  if (!name || !cls || !arm) return alert('Name, Class & Arm are required');

  const objRaw = document.getElementById('db-objective-answer').value.trim();
  if (!objRaw) return alert('Objective answers required');
  const objArr = objRaw.split(',').map(s => s.trim());

  const sets = Array.from(document.querySelectorAll('.db-essay-set'));
  const essayData = [];
  for (const set of sets) {
    const qno = set.querySelector('.db-essay-qno').value.trim();
    if (!qno) return alert('Question number required');
    const ta = set.querySelector('.db-essay-text');
    const fileInput = set.querySelector('.db-essay-file');
    let ans = '';
    if (ta.style.display !== 'none' && ta.value.trim()) {
      ans = ta.value.trim();
    } else if (fileInput.files.length) {
      ans = await new Promise(res => {
        const fr = new FileReader();
        fr.onload = e => res(e.target.result);
        fr.readAsDataURL(fileInput.files[0]);
      });
    } else {
      return alert(`Provide answer for essay Q${qno}`);
    }
    essayData.push({ questionNo: qno, answer: ans });
  }

  DataManager.students[editingIndex] = {
    name, class: cls, arm,
    objectiveAnswers: objArr,
    essayAnswers: essayData
  };
  DataManager.saveStudents();
  updateStudentAnswerInfo();
  alert('Student updated');
  document.getElementById('db-student-form').reset();
  initDBEssaySection();
  editingIndex = null;
  document.getElementById('save-student-btn').style.display = '';
  document.getElementById('update-student-btn').style.display = 'none';
}

// --- Marking & Scores ---
let markingStudentIndex = null;
let currentObjectiveScore = null;
let currentEssayScore = null;

function bindMarkingTab() {
  document.getElementById('search-student-btn')
    .addEventListener('click', searchStudentForMarking);
  document.getElementById('populate-objective-btn')
    .addEventListener('click', populateStudentObjectiveAnswers);
  document.getElementById('mark-objective-btn')
    .addEventListener('click', markObjectiveOnly);
  document.getElementById('sum-essay-btn')
    .addEventListener('click', sumEssayMarks);
  document.getElementById('record-mark-btn')
    .addEventListener('click', recordMark);
}

function searchStudentForMarking() {
  const name = document.getElementById('search-student-input').value.trim().toLowerCase();
  const idx = DataManager.students.findIndex(s => s.name.toLowerCase() === name);
  if (idx < 0) {
    alert('Student not found');
    return;
  }
  markingStudentIndex = idx;
  const s = DataManager.students[idx];
  document.getElementById('mark-student-name').value = s.name;
  document.getElementById('mark-student-class').value = s.class;
  document.getElementById('mark-student-arm').value = s.arm;
  document.getElementById('objective-marking-form').innerHTML = '';
  document.getElementById('objective-marking-details').textContent = '';
  document.getElementById('essay-marking-container').innerHTML = '';
  document.getElementById('essay-scoring-details').textContent = '';
  currentObjectiveScore = null;
  currentEssayScore = null;
}

function populateStudentObjectiveAnswers() {
  if (markingStudentIndex === null) {
    alert('Please search and select a student first');
    return;
  }
  const student = DataManager.students[markingStudentIndex];
  const form = document.getElementById('objective-marking-form');
  form.innerHTML = '';
  form.classList.add('two-col-form');
  const answers = student.objectiveAnswers
    .map((a, i) => ({ questionNo: i + 1, answer: a }))
    .filter(o => o.answer.trim() !== '');
  answers.forEach(o => {
    const div = document.createElement('div');
    div.innerHTML = `<label>Q${o.questionNo}:</label>
                     <input type="text" name="obj_q_${o.questionNo}" value="${o.answer}" readonly />`;
    form.appendChild(div);
  });
  document.getElementById('objective-marking-details').textContent = '';
  currentObjectiveScore = null;
  populateStudentEssaySection();
}

function markObjectiveOnly() {
  if (markingStudentIndex === null) { alert('No student selected'); return; }
  const form = document.getElementById('objective-marking-form');
  const inputs = Array.from(form.querySelectorAll('input'));
  const key = DataManager.answerKey.objective;
  let correct = 0;
  inputs.forEach(inp => {
    const qn = parseInt(inp.name.split('_')[2], 10);
    const studAns = inp.value.trim().toLowerCase();
    const keyObj = key.find(o => o.questionNo === qn);
    const correctAns = keyObj ? keyObj.answer.trim().toLowerCase() : '';
    if (studAns && studAns === correctAns) correct++;
  });
  currentObjectiveScore = correct;
  document.getElementById('objective-marking-details')
    .textContent = `Objective Score: ${correct} / ${key.length}`;
}

function populateStudentEssaySection() {
  const container = document.getElementById('essay-marking-container');
  container.innerHTML = '';
  const key = DataManager.answerKey.essay;
  const student = DataManager.students[markingStudentIndex];
  const tbl = document.createElement('table');
  tbl.innerHTML = `
    <thead>
      <tr>
        <th>Teacher's Answer</th>
        <th>Student's Answer</th>
        <th>Marking Tools</th>
      </tr>
    </thead>
    <tbody>
      ${key.map(k => {
        const stud = student.essayAnswers.find(e => e.questionNo === k.questionNo) || {};
        const studAns = stud.answer || '';
        const studDisplay = studAns.startsWith('data:')
          ? `<img src="${studAns}" style="width:100px;height:100px;"/>`
          : studAns;
        return `
        <tr data-qno="${k.questionNo}" data-mark="${k.mark}">
          <td>Q${k.questionNo} [${k.mark}]: ${k.answer}</td>
          <td>${studDisplay}</td>
          <td>
            <button class="btn-correct">Correct</button>
            <button class="btn-incorrect">Incorrect</button>
            <button class="btn-custom">Custom</button>
            <button class="btn-erase">Erase</button>
          </td>
        </tr>`;
      }).join('')}
    </tbody>`;
  container.appendChild(tbl);

  tbl.querySelectorAll('tr[data-qno]').forEach(row => {
    const updateScore = () => {
      let total = 0;
      tbl.querySelectorAll('tr[data-qno]').forEach(r => {
        const sc = parseFloat(r.dataset.score);
        if (!isNaN(sc)) total += sc;
      });
      currentEssayScore = total;
      document.getElementById('essay-scoring-details')
        .textContent = `Essay Score: ${total}`;
    };

    row.querySelector('.btn-correct').addEventListener('click', () => {
      row.dataset.score = row.dataset.mark;
      updateScore();
    });
    row.querySelector('.btn-incorrect').addEventListener('click', () => {
      row.dataset.score = 0;
      updateScore();
    });
    row.querySelector('.btn-custom').addEventListener('click', () => {
      if (row.querySelector('.custom-input')) return;
      const inp = document.createElement('input');
      inp.type = 'number'; inp.className = 'custom-input'; inp.placeholder = 'Mark';
      const done = document.createElement('button'); done.textContent = 'Done';
      done.addEventListener('click', () => {
        const v = parseFloat(inp.value);
        if (!isNaN(v)) {
          row.dataset.score = v;
          updateScore();
          inp.remove(); done.remove();
        }
      });
      row.lastElementChild.append(inp, done);
    });
    row.querySelector('.btn-erase').addEventListener('click', () => {
      delete row.dataset.score;
      updateScore();
    });
  });
}

function sumEssayMarks() {
  if (markingStudentIndex === null) { alert('No student selected'); return; }
  const keyTotal = DataManager.answerKey.essay.reduce((s, e) => s + Number(e.mark), 0);
  let sum = 0;
  document.querySelectorAll('#essay-marking-container tr[data-qno]').forEach(r => {
    const sc = parseFloat(r.dataset.score);
    if (!isNaN(sc)) sum += sc;
  });
  currentEssayScore = sum;
  document.getElementById('essay-scoring-details')
    .textContent = `Essay Score: ${sum} / ${keyTotal}`;
}

function recordMark() {
  if (markingStudentIndex === null) { alert('No student to record'); return; }
  if (currentObjectiveScore === null) { alert('Please mark objective first'); return; }
  if (currentEssayScore === null) { alert('Please sum essay first'); return; }
  if (DataManager.scores.length >= 300) {
    return alert('Maximum of 300 scores reached.');
  }
  const s = DataManager.students[markingStudentIndex];
  const total = currentObjectiveScore + currentEssayScore;
  DataManager.scores.push({
    name: s.name,
    class: s.class,
    arm: s.arm,
    objective: currentObjectiveScore,
    essay: currentEssayScore,
    total
  });
  DataManager.saveScores();
  updateScoreTable();
  document.getElementById('marking-notification').textContent = 'Mark recorded!';
}

// --- Download & Score Tab ---
function bindDownloadButton() {
  document.getElementById('download-score-btn')?.addEventListener('click', downloadScores);
}

function downloadScores() {
  const scores = DataManager.scores;
  if (!scores.length) { alert('No scores to download'); return; }
  const format = prompt('Enter format to download: xlsx, csv, pdf, doc').toLowerCase();
  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(scores);
    const wb = { Sheets: { 'Scores': ws }, SheetNames: ['Scores'] };
    XLSX.writeFile(wb, 'scores.xlsx');
  } else if (format === 'csv') {
    const ws = XLSX.utils.json_to_sheet(scores);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'scores.csv';
    a.click(); URL.revokeObjectURL(url);
  } else if (format === 'pdf') {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 10;
    doc.text('Scores', 10, y); y += 10;
    // add table header row
    doc.text('Name | Class | Arm | Obj | Essay | Total', 10, y); y += 10;
    scores.forEach(r => {
      doc.text(`${r.name} | ${r.class} | ${r.arm} | ${r.objective} | ${r.essay} | ${r.total}`, 10, y);
      y += 10;
    });
    doc.save('scores.pdf');
  } else if (format === 'doc') {
    let content = '<html><body>';
    content += '<h1>Scores</h1>';
    content += '<table border="1"><tr><th>Name</th><th>Class</th><th>Arm</th><th>Objective</th><th>Essay</th><th>Total</th></tr>';
    scores.forEach(r => {
      content += `<tr><td>${r.name}</td><td>${r.class}</td><td>${r.arm}</td><td>${r.objective}</td><td>${r.essay}</td><td>${r.total}</td></tr>`;
    });
    content += '</table></body></html>';
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'scores.doc';
    a.click(); URL.revokeObjectURL(url);
  } else {
    alert('Unknown format');
  }
}

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
      <td>${r.total}</td>`;
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
