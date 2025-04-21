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
    configureSaveAnswersButton();
    renderObjectiveKeyForm();
    renderEssayKeyForm();
    initDBEssaySection();
    updateStudentAnswerInfo();
    updateScoreTable();
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
  const old = section.querySelector('.answer-desc');
  if (old) old.remove();
  const desc = document.createElement('p');
  desc.className = 'answer-desc';
  desc.textContent = 'Upload or manually type your objective answers into the objective form section and the essay section.';
  desc.style.fontSize = '1rem';
  section.insertBefore(desc, section.querySelector('#objective-answer-container'));
}

function configureSaveAnswersButton() {
  const btn = document.querySelector('#answer button');
  if (btn) {
    btn.textContent = 'Save Answers';
    btn.removeAttribute('onclick');
    btn.addEventListener('click', saveAnswerData);
  }
}

// --- Answer‐Key Upload & Adaptive Render ---
document.getElementById('upload-objective-answer').addEventListener('change', handleObjectiveKeyUpload);
document.getElementById('upload-essay-answer').addEventListener('change', handleEssayKeyUpload);

function handleObjectiveKeyUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const data = new Uint8Array(evt.target.result);
    const wb = XLSX.read(data, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    rows.shift();
    DataManager.answerKey.objective = rows.map((r, i) => ({
      questionNo: i + 1,
      answer: String(r[1] || '').trim()
    }));
    DataManager.saveAnswerKey();
    renderObjectiveKeyForm();
  };
  reader.readAsArrayBuffer(file);
}

function handleEssayKeyUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const data = new Uint8Array(evt.target.result);
    const wb = XLSX.read(data, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    rows.shift();
    DataManager.answerKey.essay = rows.map((r, i) => ({
      questionNo: i + 1,
      mark: Number(r[1] || 0),
      answer: String(r[2] || '')
    }));
    DataManager.saveAnswerKey();
    renderEssayKeyForm();
  };
  reader.readAsArrayBuffer(file);
}

function renderObjectiveKeyForm() {
  const c = document.getElementById('objective-answer-form');
  c.innerHTML = '';
  c.classList.add('two-columns');

  const n = DataManager.answerKey.objective.length;
  const count = Math.min(Math.max(n, 50), 100);

  for (let i = 1; i <= count; i++) {
    const existing = DataManager.answerKey.objective.find(o => Number(o.questionNo) === i);
    const ans = existing ? existing.answer : '';
    const div = document.createElement('div');
    div.innerHTML = `<label>Q${i}:</label> <input type="text" name="q_${i}" value="${ans}" />`;
    c.appendChild(div);
  }
}

function renderEssayKeyForm() {
  const c = document.getElementById('essay-answer-form');
  c.innerHTML = '';
  let n = DataManager.answerKey.essay.length;
  const count = Math.min(Math.max(n, 1), 20);

  for (let i = 1; i <= count; i++) {
    const existing = DataManager.answerKey.essay.find(e => Number(e.questionNo) === i);
    const mark = existing ? existing.mark : '';
    const ans = existing ? existing.answer : '';
    const div = document.createElement('div');
    div.innerHTML = `<label>Q${i} (Max):</label>
      <input type="number" name="mark_${i}" placeholder="Mark allotted" value="${mark}" />
      <textarea name="ans_${i}" placeholder="Correct answer">${ans}</textarea>`;
    c.appendChild(div);
  }
}

// Save Answers (Teacher Tab)
function saveAnswerData() {
  const inputs = document.querySelectorAll('#objective-answer-form input');
  DataManager.answerKey.objective = Array.from(inputs).map(i => ({
    questionNo: i.name.split('_')[1],
    answer: i.value.trim()
  }));

  const essayInputs = document.querySelectorAll('#essay-answer-form input, #essay-answer-form textarea');
  DataManager.answerKey.essay = [];

  essayInputs.forEach(el => {
    const [type, qno] = el.name.split('_');
    let item = DataManager.answerKey.essay.find(e => e.questionNo == qno);
    if (!item) {
      item = { questionNo: qno, mark: 0, answer: '' };
      DataManager.answerKey.essay.push(item);
    }
    if (type === 'mark') item.mark = Number(el.value);
    if (type === 'ans') item.answer = el.value.trim();
  });

  DataManager.saveAnswerKey();

  inputs.forEach(i => i.value = '');
  essayInputs.forEach(el => el.value = '');

  let note = document.getElementById('answer-save-notification');
  if (!note) {
    note = document.createElement('div');
    note.id = 'answer-save-notification';
    note.style.color = 'green';
    note.style.marginTop = '10px';
    document.querySelector('#answer').appendChild(note);
  }
  note.textContent = 'Answers has been saved successfully';
}
