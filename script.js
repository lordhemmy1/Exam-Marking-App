// script.js

// --- Global Data & Persistence ---
const essayLimit = 20;
let answerData  = JSON.parse(localStorage.getItem('answerData')  || '{"objectives":{},"essays":{}}');
let studentDB   = JSON.parse(localStorage.getItem('studentDB')   || '[]');
let studentData = JSON.parse(localStorage.getItem('studentData') || '[]');

// Persist functions
function persistAnswers()   { localStorage.setItem('answerData',  JSON.stringify(answerData)); }
function persistStudentDB() { localStorage.setItem('studentDB',   JSON.stringify(studentDB));   }
function persistScores()    { localStorage.setItem('studentData', JSON.stringify(studentData)); }

// --- Tab Switching ---
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- Reset All Data ---
function resetAllData() {
  if (!confirm("Reset EVERYTHING? This cannot be undone.")) return;
  localStorage.clear();
  answerData = { objectives: {}, essays: {} };
  studentDB  = [];
  studentData= [];
  initAll();
}

// --- Answer Tab Helpers ---
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
    const inp = document.getElementById(`objective-answer-${i}`);
    if (inp && inp.value.trim()) answerData.objectives[i] = inp.value.trim();
  }
  for (let i = 1; i <= essayLimit; i++) {
    const qn = document.getElementById(`essay-answer-qn-${i}`);
    const mk = document.getElementById(`essay-answer-mark-${i}`);
    const an = document.getElementById(`essay-answer-ans-${i}`);
    if (qn && mk && an && qn.value.trim() && an.value.trim()) {
      answerData.essays[qn.value.trim()] = {
        mark: parseInt(mk.value) || 0,
        answer: an.value.trim()
      };
    }
  }
  persistAnswers();
  alert('Answer data saved.');
}

// --- File Upload & OCR for Answer Tab ---
function handleFileUpload(e, type, prefix) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.type.startsWith('image/')) {
    return handleImageUpload(file, type, prefix);
  }
  const reader = new FileReader();
  reader.onload = ev => {
    const data = new Uint8Array(ev.target.result),
          wb   = XLSX.read(data, { type: 'array' }),
          ws   = wb.Sheets[wb.SheetNames[0]],
          arr  = XLSX.utils.sheet_to_json(ws, { header: 1 });
    // If essay-answer, drop first row
    const rows = (type === 'essay' && prefix === 'essay-answer') ? arr.slice(1) : arr;
    rows.forEach((row, i) => {
      if (type === 'objective' && row[0] != null && row[1] != null) {
        const inp = document.getElementById(`${prefix}-${row[0]}`);
        if (inp) inp.value = row[1];
      }
      if (type === 'essay' && row[0] != null && row[1] != null && row[2] != null) {
        const qn = document.getElementById(`${prefix}-qn-${i+1}`),
              mk = document.getElementById(`${prefix}-mark-${i+1}`),
              an = document.getElementById(`${prefix}-ans-${i+1}`);
        if (qn && mk && an) {
          qn.value = row[0];
          mk.value = row[1];
          an.value = row[2];
        }
      }
    });
  };
  reader.readAsArrayBuffer(file);
}
function handleImageUpload(file, type, prefix) {
  Tesseract.recognize(file, 'eng')
    .then(({ data: { text } }) => {
      text.split('\n').map(l => l.trim()).filter(l => l).forEach(line => {
        const [label, ...rest] = line.split(/[:\-]/),
              qNo   = label.replace(/\D/g, ''),
              val   = rest.join(':').trim(),
              inp   = document.getElementById(`${prefix}-ans-${qNo}`);
        if (inp) inp.value = val;
      });
    })
    .catch(console.error);
}

// --- Students Database Helpers ---
function addNewEssayGroup(existing) {
  const container = document.getElementById('db-essay-form'),
        idx       = container.children.length + 1;
  if (idx > essayLimit) return;
  const div = document.createElement('div');
  div.className = 'essay-group';
  div.innerHTML = `
    <label>Q${idx}:</label>
    <input type="text" class="db-essay-qn" placeholder="Question No" value="${existing?.qNo||''}">
    <textarea class="db-essay-ans" placeholder="Answer">${existing?.answer||''}</textarea>
    <input type="file" class="db-essay-img" accept="image/*">
    <div class="file-preview">${existing?.image ? 'Existing: '+existing.image : ''}</div>
    <div class="essay-addition">
      <button type="button" class="add-essay-btn">Continue</button>
      <button type="button" class="delete-essay-btn">Delete</button>
    </div>
    <div class="error-msg"></div>
  `;
  container.appendChild(div);

  // Preview handler
  const imgIn = div.querySelector('.db-essay-img'),
        prev  = div.querySelector('.file-preview');
  imgIn.addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      prev.innerHTML = `<img src="${ev.target.result}" alt="${f.name}" class="essay-preview-img">`;
    };
    reader.readAsDataURL(f);
  });

  div.querySelector('.add-essay-btn').onclick = () => addNewEssayGroup();
  div.querySelector('.delete-essay-btn').onclick = () => div.remove();
}

function saveStudentData() {
  const name = document.getElementById('db-student-name').value.trim(),
        cls  = document.getElementById('db-student-class').value.trim(),
        arm  = document.getElementById('db-student-arm').value.trim(),
        obj  = document.getElementById('db-objective-answer').value.trim();
  if (!name || !cls || !arm || !obj) {
    alert('All fields required');
    return;
  }
  const groups = document.querySelectorAll('.essay-group'),
        essays = [];
  for (let g of groups) {
    const qn      = g.querySelector('.db-essay-qn').value.trim(),
          ans     = g.querySelector('.db-essay-ans').value.trim(),
          imgFile = g.querySelector('.db-essay-img').files[0]?.name || '';
    if (!qn || (!ans && !imgFile)) {
      g.querySelector('.error-msg').innerText = 'Need Q-No and (answer or image)';
      return;
    }
    g.querySelector('.error-msg').innerText = '';
    essays.push({ qNo: qn, answer: ans, image: imgFile });
  }

  studentDB.push({ name, class: cls, arm, objAnswer: obj, essayAnswers: essays });
  if (studentDB.length > 400) studentDB.shift();
  persistStudentDB();
  renderStudentDBTable();

  document.getElementById('db-student-form').reset();
  document.getElementById('db-essay-form').innerHTML = '';
  addNewEssayGroup();
}

function editStudent(idx) {
  const s = studentDB[idx];
  document.getElementById('db-student-name').value = s.name;
  document.getElementById('db-student-class').value = s.class;
  document.getElementById('db-student-arm').value = s.arm;
  document.getElementById('db-objective-answer').value = s.objAnswer;
  const form = document.getElementById('db-essay-form');
  form.innerHTML = '';
  s.essayAnswers.forEach(ea => addNewEssayGroup(ea));
  studentDB.splice(idx, 1);
  persistStudentDB();
  renderStudentDBTable();
}

function renderStudentDBTable() {
  const c = document.getElementById('student-db-reference');
  c.innerHTML = `
    <table id="student-db-table">
      <thead>
        <tr>
          <th>Name</th><th>Class</th><th>Arm</th>
          <th>Objective</th><th>Essay</th><th>Edit</th>
        </tr>
      </thead>
      <tbody>
        ${studentDB.map((s, i) => {
          const es = s.essayAnswers.map(e => e.image ? `[${e.image}]` : e.answer).join('; ');
          return `<tr>
            <td>${s.name}</td>
            <td>${s.class}</td>
            <td>${s.arm}</td>
            <td>${s.objAnswer.split(',').join('<br>')}</td>
            <td>${es}</td>
            <td><button onclick="editStudent(${i})">Edit</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <button id="reset-students-btn" onclick="resetStudentDB()">Reset Students</button>
  `;
}

function resetStudentDB() {
  if (!confirm('Clear entire Students Database?')) return;
  studentDB = [];
  persistStudentDB();
  renderStudentDBTable();
}

// --- Marking Tab Helpers ---
function setupMarkingUploadButton() {
  document.getElementById('upload-student-btn')
          .addEventListener('click', loadStudentForMarking);
}

function loadStudentForMarking() {
  const name = document.getElementById('student-name').value.trim(),
        cls  = document.getElementById('student-class').value.trim(),
        arm  = document.getElementById('student-arm').value.trim();
  const student = studentDB.find(s =>
    s.name === name && s.class === cls && s.arm === arm
  );
  if (!student) {
    alert('Student not found');
    return;
  }

  // Objective: split by comma into 50 cells
  const answers = student.objAnswer.split(',').map(x => x.trim());
  for (let i = 1; i <= 50; i++) {
    const inp = document.getElementById(`objective-marking-${i}`);
    if (inp) inp.value = answers[i-1] || '';
  }
  renderObjectiveMarkingDetails(answers);

  // Essay: build 3-column rows
  const cont = document.getElementById('essay-marking-form');
  cont.innerHTML = '';
  Object.entries(answerData.essays).forEach(([qNo, model], idx) => {
    const stud = student.essayAnswers.find(e => e.qNo === qNo);
    const preview = stud && stud.image
      ? `<img src="" alt="${stud.image}" class="essay-preview"/>`
      : (stud ? stud.answer : '');
    const row = document.createElement('div');
    row.className = 'essay-mark-row';
    row.innerHTML = `
      <div class="col header">
        <strong>Q${qNo}</strong><br>Mark: ${model.mark}
      </div>
      <div class="col student">${preview}</div>
      <div class="col tools">
        <button onclick="setEssayMark(${idx},${model.mark})">✔</button>
        <button onclick="setEssayMark(${idx},0)">✖</button>
        <button onclick="showCustomEssay(${idx})">✎</button>
        <button onclick="eraseEssayMark(${idx})">🗑️</button>
        <input type="number" id="cust-essay-${idx}" style="display:none" placeholder="Mark">
        <button id="done-essay-${idx}" style="display:none" onclick="applyCustomEssay(${idx})">Done</button>
      </div>
      <input type="hidden" id="essay-mark-${idx}" value="0">
      <input type="hidden" id="essay-qn-${idx}" value="${qNo}">
    `;
    cont.appendChild(row);
  });
}

function renderObjectiveMarkingDetails(answers) {
  let det = document.getElementById('objective-marking-details');
  if (!det) {
    det = document.createElement('div');
    det.id = 'objective-marking-details';
    document.getElementById('objective-marking-form')
            .insertAdjacentElement('afterend', det);
  }
  let html = `<h4>Objective Details</h4>
    <table>
      <thead><tr><th>Q</th><th>Correct</th><th>Student</th><th>Remark</th></tr></thead>
      <tbody>`;
  for (let i = 1; i <= 50; i++) {
    const stud  = answers[i-1] || '';
    const corr  = answerData.objectives[i] || '';
    const mark  = (corr.toLowerCase() === stud.toLowerCase()) ? '✔' : '✖';
    html += `<tr>
      <td>${i}</td>
      <td>${corr}</td>
      <td>${stud}</td>
      <td>${mark}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  det.innerHTML = html;
}

function markObjectiveOnly() {
  renderObjectiveMarkingDetails(
    Array.from({ length: 50 }, (_, i) => {
      const inp = document.getElementById(`objective-marking-${i+1}`);
      return inp ? inp.value.trim() : '';
    })
  );
}

function setEssayMark(idx, val) {
  document.getElementById(`essay-mark-${idx}`).value = val;
}
function showCustomEssay(idx) {
  document.getElementById(`cust-essay-${idx}`).style.display = 'inline-block';
  document.getElementById(`done-essay-${idx}`).style.display = 'inline-block';
}
function applyCustomEssay(idx) {
  const val = parseInt(document.getElementById(`cust-essay-${idx}`).value) || 0;
  setEssayMark(idx, val);
  document.getElementById(`cust-essay-${idx}`).style.display = 'none';
  document.getElementById(`done-essay-${idx}`).style.display = 'none';
}
function eraseEssayMark(idx) {
  setEssayMark(idx, 0);
}

// Finalize
function finalizeMarking() {
  const name = document.getElementById('student-name').value.trim(),
        cls  = document.getElementById('student-class').value.trim(),
        arm  = document.getElementById('student-arm').value.trim();
  let objScore = 0;
  for (let i = 1; i <= 50; i++) {
    const inp = document.getElementById(`objective-marking-${i}`);
    if (inp && inp.value.trim() && answerData.objectives[i] === inp.value.trim()) {
      objScore++;
    }
  }
  let essayScore = 0;
  document.querySelectorAll('[id^="essay-mark-"]').forEach(el => {
    essayScore += parseInt(el.value) || 0;
  });
  const total = objScore + essayScore;
  studentData.push({ name, cls, arm, objScore, essayScore, total });
  persistScores();
  updateScoreTable();
}

// --- Score Tab Helpers ---
function updateScoreTable() {
  const tb = document.querySelector('#score-table tbody');
  tb.innerHTML = '';
  studentData.forEach(s => {
    tb.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${s.name}</td>
        <td>${s.cls}</td>
        <td>${s.arm}</td>
        <td>${s.objScore}</td>
        <td>${s.essayScore}</td>
        <td>${s.total}</td>
      </tr>
    `);
  });
}
function resetScores() {
  if (!confirm('Reset all scores?')) return;
  studentData = [];
  persistScores();
  updateScoreTable();
}
function downloadScores(type) {
  if (type === 'csv') {
    let content = 'Name,Class,Arm,Objective,Essay,Total\n';
    studentData.forEach(s => {
      content += `${s.name},${s.cls},${s.arm},${s.objScore},${s.essayScore},${s.total}\n`;
    });
    downloadFile('scores.csv', content);
  } else if (type === 'doc') {
    let html = '<table border="1"><tr><th>Name</th><th>Class</th><th>Arm</th><th>Objective</th><th>Essay</th><th>Total</th></tr>';
    studentData.forEach(s => {
      html += `<tr>
        <td>${s.name}</td>
        <td>${s.cls}</td>
        <td>${s.arm}</td>
        <td>${s.objScore}</td>
        <td>${s.essayScore}</td>
        <td>${s.total}</td>
      </tr>`;
    });
    html += '</table>';
    const blob = new Blob([`<html><body>${html}</body></html>`], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scores.doc';
    a.click();
    URL.revokeObjectURL(url);
  } else if (type === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(studentData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Scores');
    XLSX.writeFile(wb, 'scores.xlsx');
  }
}
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Initialize All on Load ---
function initAll() {
  // Answer Tab
  createObjectiveFormTwoCol(document.getElementById('objective-answer-form'), 'objective-answer');
  createEssayForm(document.getElementById('essay-answer-form'), 'essay-answer');
  document.getElementById('upload-objective-answer')
    .addEventListener('change', e => handleFileUpload(e, 'objective', 'objective-answer'));
  document.getElementById('upload-essay-answer')
    .addEventListener('change', e => handleFileUpload(e, 'essay', 'essay-answer'));

  // Students Database
  addNewEssayGroup();
  renderStudentDBTable();

  // Marking Tab
  setupMarkingUploadButton();
  document.getElementById('objective-marking-form').innerHTML = '';
  document.getElementById('essay-marking-form').innerHTML = '';
  updateScoreTable();
}

window.onload = initAll;
