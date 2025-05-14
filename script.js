// script.js
// auth.js
// Firebase config & init
firebase.initializeApp({
  apiKey: "AIzaSyBN6N8I4lpAJNM1ohDkX65UeiIWNhX3xlk",
  authDomain: "your-app.firebaseapp.com",
  databaseURL: "https://your-app.firebaseio.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
});

const auth = firebase.auth();
const db   = firebase.database();

const signupForm = document.getElementById('signup-form');
const loginForm  = document.getElementById('login-form');
const authCtn    = document.getElementById('auth-container');
const appCtn     = document.getElementById('app');
const userNickEl = document.getElementById('user-nick');
const logoutBtn  = document.getElementById('logout-btn');

// Sign Up
signupForm.addEventListener('submit', async e => {
  e.preventDefault();
  const nick  = document.getElementById('signup-nick').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-pass').value;
  const { user } = await auth.createUserWithEmailAndPassword(email, pass);
  await db.ref('users/' + user.uid).set({ nickname: nick });
});

// Login
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  await auth.signInWithEmailAndPassword(email, pass);
});

// Auth State Listener
auth.onAuthStateChanged(async user => {
  if (user) {
    const snap = await db.ref('users/' + user.uid + '/nickname').get();
    userNickEl.textContent = snap.val() || 'User';
    authCtn.style.display = 'none';
    appCtn.style.display  = 'block';
    logoutBtn.style.display = 'block';
  } else {
    authCtn.style.display = 'block';
    appCtn.style.display  = 'none';
    logoutBtn.style.display = 'none';
  }
});

// Logout
logoutBtn.addEventListener('click', () => auth.signOut());

// --- Data Manager (uses localStorage) ---
const MAX_STUDENTS = 1000;

// ---- image compression helper ----
async function compressToMaxSize(file, maxWidth = 800, maxHeight = 800, maxKB = 500) {
  if (!(file instanceof File)) {
    throw new Error('Provided input is not a File.');
  }

  const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Invalid image file.'));
    img.src = src;
  });

  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  const canvas = document.createElement('canvas');
  let w = img.width;
  let h = img.height;

  if (w > h && w > maxWidth) {
    h *= maxWidth / w;
    w = maxWidth;
  } else if (h > w && h > maxHeight) {
    w *= maxHeight / h;
    h = maxHeight;
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  let quality = 0.9;
  let output = canvas.toDataURL('image/jpeg', quality);
  let sizeKB = (output.length * 3 / 4) / 1024;

  while (sizeKB > maxKB && quality > 0.1) {
    quality -= 0.1;
    output = canvas.toDataURL('image/jpeg', quality);
    sizeKB = (output.length * 3 / 4) / 1024;
  }

  if (sizeKB > maxKB) {
    throw new Error('Unable to compress image below ' + maxKB + 'KB.');
  }

  return output;
}

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
    setupLevelRadios();
    bindStudentButtons();
    bindClearStudentsButton();
    bindStudentUploadHandler();
    updateStudentAnswerInfo();
    updateScoreTable();
    bindClearScoreButton();
    bindMarkingTab();
    bindDownloadButton();
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

// --- Tab Navigation ---
document.querySelectorAll('.tab-button').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
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
  const section = document.getElementById('answer');
  const desc = document.createElement('p');
  desc.textContent =
    'Upload or manually type your objective answers into the objective form section and the essay section.';
  desc.style.fontSize = '1rem';
  section.insertBefore(desc, document.getElementById('objective-answer-container'));
}

// --- Teacher's Answer Tab: updated renderObjectiveKeyForm ---
function renderObjectiveKeyForm() {
  const c = document.getElementById('objective-answer-form');
  c.innerHTML = '';
  c.classList.add('two-col-form');

  // get only populated entries (non?empty answers)
  const entries = DataManager.answerKey.objective;
  const populated = entries.filter(o => o.answer.trim() !== '');
  // if none, still show 50 blanks
  const toShow = populated.length
    ? entries
    : Array.from({ length: 50 }, (_, i) => ({ questionNo: i + 1, answer: '' }));

  toShow.forEach(o => {
    const div = document.createElement('div');
    div.innerHTML = `<label>Q${o.questionNo}:</label>
                     <input type="text" name="q_${o.questionNo}"
                            value="${o.answer}" />`;
    c.appendChild(div);
  });

  // update and show total count
  const totalEl = document.getElementById('objective-key-total');
  const count = populated.length;
  if (count > 0) {
    totalEl.textContent = `Total Objective Marks: ${count}`;
    totalEl.style.display = '';
  } else {
    totalEl.style.display = 'none';
  }
}

// --- Teacher's Answer Tab: updated renderEssayKeyForm ---
function renderEssayKeyForm() {
  const c = document.getElementById('essay-answer-form');
  c.innerHTML = '';

  const entries = DataManager.answerKey.essay;
  const populated = entries.filter(e => e.questionNo && e.mark !== '');
  const toShow = populated.length
    ? entries
    : Array.from({ length: 20 }, (_, i) => ({ questionNo: '', mark: '', answer: '' }));

  toShow.forEach((e, i) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Set ${e.questionNo || i + 1}:</label>
      <input type="text"   name="qno_${i + 1}"  placeholder="Question No." value="${e.questionNo}" />
      <input type="number" name="mark_${i + 1}" placeholder="Mark allotted"  value="${e.mark}" />
      <textarea name="ans_${i + 1}" placeholder="Correct answer">${e.answer}</textarea>
    `;
    c.appendChild(div);
  });

  // sum up all the marks
  const totalEl = document.getElementById('essay-key-total');
  const sum = populated.reduce((s, e) => s + Number(e.mark), 0);
  if (populated.length) {
    totalEl.textContent = `Total Essay Marks: ${sum}`;
    totalEl.style.display = '';
  } else {
    totalEl.style.display = 'none';
  }
}

// --- Bind Answer Save & Upload ---
function bindAnswerSaveButton() {
  const btn = document.getElementById('save-answers-btn');
  btn.textContent = 'Save Answers';
  btn.addEventListener('click', saveAnswerData);
}
function bindUploadHandlers() {
  document
    .getElementById('upload-objective-answer')
    ?.addEventListener('change', handleObjectiveUpload);
  document
    .getElementById('upload-essay-answer')
    ?.addEventListener('change', handleEssayUpload);
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

// --- Save Answer Data ---
function saveAnswerData() {
  const objInputs = Array.from(
    document.querySelectorAll('#objective-answer-form input')
  );
  if (objInputs.every(i => !i.value.trim())) {
    return alert('Please fill at least one objective answer before saving.');
  }
  DataManager.answerKey.objective = objInputs.map((i, idx) => ({
    questionNo: idx + 1,
    answer: i.value.trim()
  }));

  const essayDivs = Array.from(
    document.querySelectorAll('#essay-answer-form div')
  );
  const hasOne = essayDivs.some((div, idx) => {
    const q = div.querySelector(`[name="qno_${idx + 1}"]`).value.trim();
    const m = div.querySelector(`[name="mark_${idx + 1}"]`).value.trim();
    const a = div.querySelector(`[name="ans_${idx + 1}"]`).value.trim();
    return q && m && a;
  });
  if (!hasOne) {
    return alert(
      'Please fill at least one essay question (Question No., Mark, and Answer).'
    );
  }
  DataManager.answerKey.essay = essayDivs.map((div, idx) => ({
    questionNo: div.querySelector(`[name="qno_${idx + 1}"]`).value.trim(),
    mark: div.querySelector(`[name="mark_${idx + 1}"]`).value.trim(),
    answer: div.querySelector(`[name="ans_${idx + 1}"]`).value.trim()
  }));

  DataManager.saveAnswerKey();
  objInputs.forEach(i => (i.value = ''));
  document
    .querySelectorAll('#essay-answer-form input, #essay-answer-form textarea')
    .forEach(el => (el.value = ''));

  let notif = document.getElementById('answer-notification');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'answer-notification';
    document.getElementById('save-answers-btn').insertAdjacentElement('afterend', notif);
  }
  notif.textContent = 'All answers saved successfully';
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
    <div class="db-essay-preview"><img style="width:200px;height:200px;display:none;" /></div>
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
  fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;

  // 1. Reject anything over 5 MB outright
  if (file.size > 5 * 1024 * 1024) {
    alert('Image too large! Please pick one under 5 MB.');
    fileInput.value = '';
    return;
  }

  try {
    // 2. Compress it down to ?500 KB
    const compressed = await compressToMaxSize(file, 800, 800, 500);
    // 3. Show & stash the tiny version
    img.src = compressed;
    img.style.display = '';
    ta.style.display = 'none';
    fileInput.dataset.dataurl = compressed;
  } catch (err) {
    alert('Image processing error: ' + err.message);
    fileInput.value = '';  // clear for retry
  }
});
  

  set.querySelector('.db-essay-add').addEventListener('click', () => addDBEssaySet());
  set.querySelector('.db-essay-remove').addEventListener('click', () => set.remove());
}

function setupLevelRadios() {
  const levels = {
    primary: ['PRY1','PRY2','PRY3','PRY4','PRY5','PRY6'],
    secondary: ['JS1','JS2','JS3','SS1','SS2','SS3'],
    tertiary: ['100L','200L','300L','400L','500L','MSc Level','PhD Level']
  };
  const radios = document.querySelectorAll('input[name="level"]');
  const classSelect = document.getElementById('db-student-class');
  const armInput = document.getElementById('db-student-arm');
  armInput.placeholder =
    'Enter Arm e.g Science, Business, Humanity, Microbiology';

  radios.forEach(r =>
    r.addEventListener('change', () => {
      classSelect.innerHTML = '<option value="">Select Class</option>';
      levels[r.value].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        classSelect.appendChild(o);
      });
      localStorage.setItem('selectedLevel', r.value);
    })
  );

// restore on load (moved from init)
const savedLevel = localStorage.getItem('selectedLevel');
if (savedLevel) {
  const radio = document.querySelector(`input[name="level"][value="${savedLevel}"]`);
  if (radio) radio.checked = true;
}

  // restore
  const saved = localStorage.getItem('selectedLevel');
  if (saved && levels[saved]) {
    document.querySelector(`input[name="level"][value="${saved}"]`).checked = true;
    levels[saved].forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      classSelect.appendChild(o);
    });
    const sel = localStorage.getItem('db-student-class');
    if (sel) classSelect.value = sel;
  }
  classSelect.addEventListener('change', () => {
    localStorage.setItem('db-student-class', classSelect.value);
  });
  armInput.addEventListener('input', () => {
    localStorage.setItem('db-student-arm', armInput.value);
  });
  const savedArm = localStorage.getItem('db-student-arm');
  if (savedArm) armInput.value = savedArm;
}

function bindStudentButtons() {
  const saveBtn = document.getElementById('save-student-btn');
  saveBtn.textContent = 'Add Student';
  const updateBtn = document.getElementById('update-student-btn') || (() => {
    const btn = document.createElement('button');
    btn.id = 'update-student-btn';
    btn.type = 'button';
    btn.textContent = 'Update Student';
    btn.style.display = 'none';
    saveBtn.insertAdjacentElement('afterend', btn);
    return btn;
  })();

  saveBtn.addEventListener('click', saveStudentData);
  updateBtn.addEventListener('click', updateStudentData);
}
// ??????????????????????????????????????????????????????????
// 3) Bulk?import handler for ?upload-students?
// ??????????????????????????????????????????????????????????

/**
 * Fires once on init (after bindClearStudentsButton())
 */
function bindStudentUploadHandler() {
  document
    .getElementById('upload-students')
    .addEventListener('change', handleStudentUpload);
}

function handleStudentUpload(e) {
  const file = e.target.files[0];
  if (!file) return alert('No file selected.');

  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const wb = XLSX.read(evt.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // remove header row, then for each row [name, class, arm, objective answer]
      rows.slice(1).forEach(r => {
        const [name, cls, arm, objAns] = r;
        if (name && cls && arm) {
          // split the comma-separated objective answers into an array
          const objArr = objAns
            ? 
            String(objAns).trim().split(',').map(s => s.trim())
            : [];
          
          DataManager.students.push({
            name: String(name).trim(),
            class: String(cls).trim(),
            arm:  String(arm).trim(),
            objectiveAnswers: objArr,    // ? populated from XLSX
            essayAnswers: []
    });
  }
});

      
      DataManager.saveStudents();
      updateStudentAnswerInfo();
      alert('Imported ' + Math.max(0, rows.length - 1) + ' students.');
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      e.target.value = ''; // clear input
    }
  };

  reader.onerror = () => alert('File read error.');
  reader.readAsArrayBuffer(file);
        }

function bindClearStudentsButton() {
  document.getElementById('clear-students-btn')?.addEventListener('click', () => {
    if (!confirm('Clear all student records?')) return;
    DataManager.students = [];
    DataManager.saveStudents();
    updateStudentAnswerInfo();
  });
}

async function saveStudentData() {
  if (DataManager.students.length >= MAX_STUDENTS) {
    return alert(`Maximum of ${MAX_STUDENTS} students reached.`);
  }
  const name = document.getElementById('db-student-name').value.trim();
  const cls = document.getElementById('db-student-class').value.trim();
  const arm = document.getElementById('db-student-arm').value.trim();
  if 
    (!name || !cls || !arm) return alert('Name, Class & Arm are required');

  const objRaw = document.getElementById('db-objective-answer').value.trim();
  if (!objRaw) return alert('Objective answers required');
  const objArr = objRaw.split(',').map(s => s.trim());

  const sets = Array.from(document.querySelectorAll('.db-essay-set'));
  if (!sets.length) return alert('At least one essay answer required');
  const essayData = [];
  for (const set of sets) {
  const qno = set.querySelector('.db-essay-qno').value.trim();
  if (!qno) return alert('Question number required');
  const ta = set.querySelector('.db-essay-text');
  const fileInput = set.querySelector('.db-essay-file');

  let ans = '';
  if (ta.style.display !== 'none' && ta.value.trim()) {
    ans = ta.value.trim();
  } else if (fileInput.dataset.dataurl) {
    // use only the compressed version we stored earlier
    ans = fileInput.dataset.dataurl;
  } else {
    return alert(
      'Please wait for image compression to finish or enter text before adding student.'
    );
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
  tbl.id = 'student-db-table';
  tbl.innerHTML = `
    <thead>
      <tr>
        <th>Name</th><th>Class</th><th>Arm</th>
        <th>Objective Answers</th><th>Essay Answers</th><th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${DataManager.students
        .map((s, i) => {
          const obj = s.objectiveAnswers.join(', ');
          const essay = s.essayAnswers
            .map(e =>
              e.answer.startsWith('data:')
                ? `<img src="${e.answer}" style="width:50px;height:50px;"/>`
                : e.answer
            )
            .join(', ');
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
        })
        .join('')}
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
      try {
  DataManager.saveStudents();
} catch (e) {
  return alert('Could not save student data: ' + e.message);
}
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
  const essayContainer = document.getElementById('db-essay-form');
  essayContainer.innerHTML = '';
  if (s.essayAnswers && s.essayAnswers.length) {
    s.essayAnswers.forEach(e => addDBEssaySet(e.questionNo, e.answer));
  } else {
    initDBEssaySection();  // create one blank set for editing
  }
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
      const file = fileInput.files[0];
      // 1) reject oversized files immediately
      if (file.size > 5 * 1024 * 1024) {
        alert('Image too large! Please pick one under 5?MB.');
        return;
      }
      // 2) compress via canvas helper
      try {
        ans = await compressToMaxSize(file, 800, 800, 500);
      } catch (err) {
        alert('Image compression failed: ' + err.message);
        return;
      }
    } else {
      return alert(`Provide answer for essay Q${qno}`)
    }
    essayData.push({ questionNo: qno, answer: ans || fileInput.dataset.dataurl });
  }



  DataManager.students[editingIndex] = {
    name,
    class: cls,
    arm,
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
let currentMarkIndex = -1;

function bindMarkingTab() {
  const searchLabel = document.querySelector('label[for="search-student-input"]');
  if (searchLabel) searchLabel.textContent = 'Search Student';
  document.getElementById('search-student-btn')?.addEventListener('click', searchStudentForMarking);
  document.getElementById('populate-objective-btn')?.addEventListener('click', populateStudentObjectiveAnswers);
  document.getElementById('mark-objective-btn')?.addEventListener('click', markObjectiveOnly);
  document.getElementById('sum-essay-btn')?.addEventListener('click', sumEssayMarks);

  const recordBtn = document.getElementById('record-mark-btn');
  recordBtn?.addEventListener('click', () => {
    recordMark();
    setTimeout(() => {
      document.getElementById('marking-notification').textContent = '';
    }, 2000);
  });

  document.getElementById('mark-next-btn')?.addEventListener('click', markNextStudent);
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

function markNextStudent() {
  if (!DataManager.students.length) return;
  currentMarkIndex = (currentMarkIndex + 1) % DataManager.students.length;
  const s = DataManager.students[currentMarkIndex];
  document.getElementById('search-student-input').value = s.name;
  searchStudentForMarking();
  if (DataManager.scores.length === DataManager.students.length) {
    alert('All Students have been Marked and Recorded');
  }
}

function populateStudentObjectiveAnswers() {
  if (markingStudentIndex === null) return alert('Select a student first');
  const student = DataManager.students[markingStudentIndex];
  const form = document.getElementById('objective-marking-form');
  form.innerHTML = '';
  form.classList.add('two-col-form');
  const answers = student.objectiveAnswers.map((a, i) => ({ questionNo: i + 1, answer: a }));
  answers.forEach(o => {
    const div = document.createElement('div');
    div.innerHTML = `<label>Q${o.questionNo}:</label>
                     <input type="text" name="obj_q_${o.questionNo}" value="${o.answer}" readonly />`;
    form.appendChild(div);
  });
  currentObjectiveScore = null;
  document.getElementById('objective-marking-details').textContent = '';
  populateStudentEssaySection();
}

function markObjectiveOnly() {
if (!DataManager.answerKey.objective || DataManager.answerKey.objective.length === 0) 
{
  return alert('Teacher has not supplied answers for Marking'); 
}
  if (markingStudentIndex === null) return alert('No student selected');
  const inputs = Array.from(document.querySelectorAll('#objective-marking-form input'));
  const key = DataManager.answerKey.objective;
  let correct = 0;
  inputs.forEach(inp => {
    const qn = parseInt(inp.name.split('_')[2], 10);
    const studAns = inp.value.trim().toLowerCase();
    const keyObj = key.find(o => o.questionNo === qn);
    const correctAns = keyObj ? keyObj.answer.trim().toLowerCase() : '';
    if (studAns === correctAns) correct++;
  });
  currentObjectiveScore = correct;
  document.getElementById('objective-marking-details').textContent =
    `Objective Score: ${correct} / ${key.length}`;
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
      ${key
        .map(k => {
          const stud = student.essayAnswers.find(e => e.questionNo === k.questionNo) || {};
          const studAns = stud.answer || '';
          const studDisplay = studAns.startsWith('data:')
            ? `<img src="${studAns}" style="width:360px;height: 562px;"/>`
            : studAns;
          // inside populateStudentEssaySection(), in the `.map(?)` HTML template:
return `
  <tr data-qno="${k.questionNo}" data-mark="${k.mark}">
    <td>Q${k.questionNo} [${k.mark}]: ${k.answer}</td>
    <td>${studDisplay}</td>
    <td>
        <button class="btn-correct" style="color: green;">✓</button>
        <button class="btn-incorrect" style="color: red;">✗</button>
        <button class="btn-custom" style="color: goldenrod;">✎</button>
        <button class="btn-erase" style="color: black;">🗑️</button>
    </td>
  </tr>`;
        })
        .join('')}
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
      document.getElementById('essay-scoring-details').textContent = `Essay Score: ${total}`;
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
      inp.type = 'number';
      inp.className = 'custom-input';
      inp.placeholder = 'Mark';
      const done = document.createElement('button');
      done.textContent = 'Done';
      done.addEventListener('click', () => {
        const v = parseFloat(inp.value);
        if (!isNaN(v)) {
          row.dataset.score = v;
          updateScore();
          inp.remove();
          done.remove();
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
  if (!DataManager.answerKey.essay || DataManager.answerKey.essay.length === 0)
  {
    return alert('Teacher has not supplied answers for Marking');
  }
  if (markingStudentIndex === null) return alert('No student selected');
  const keyTotal = DataManager.answerKey.essay.reduce((s, e) => s + Number(e.mark), 0);
  let sum = 0;
  document.querySelectorAll('#essay-marking-container tr[data-qno]').forEach(r => {
    const sc = parseFloat(r.dataset.score);
    if (!isNaN(sc)) sum += sc;
  });
  currentEssayScore = sum;
  document.getElementById('essay-scoring-details').textContent =
    `Essay Score: ${sum} / ${keyTotal}`;
}

function recordMark() {
  if (markingStudentIndex === null) return alert('No student to record');
  if (currentObjectiveScore === null) return alert('Please mark objective first');
  if (currentEssayScore === null) return alert('Please sum essay first');
  if (DataManager.scores.length >= MAX_STUDENTS) {
    return alert(`Maximum of ${MAX_STUDENTS} scores reached.`);
  }
  const s = DataManager.students[markingStudentIndex];
if (DataManager.scores.some(r =>
      r.name === s.name &&
      r.class === s.class &&
      r.arm   === s.arm)) {
  return alert("Student's Mark has been Recorded Already!");
}
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

// --- Score Tab & Download ---
function bindDownloadButton() {  
  document.getElementById('download-score-btn')?.addEventListener('click', downloadScores);  
}  
function bindClearScoreButton() {  
  document.getElementById('reset-scores-btn')?.addEventListener('click', () => {  
    if (!confirm('Clear all scores?')) return;  
    DataManager.scores = [];  
    DataManager.saveScores();  
    updateScoreTable();  
  });  
}  

function downloadScores() {
  const scores = DataManager.scores;
  if (!scores.length) return alert('No scores to download');
  const format = prompt('Enter format: xlsx, csv, pdf, doc').toLowerCase();
  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(scores);
    const wb = { Sheets: { Scores: ws }, SheetNames: ['Scores'] };
    XLSX.writeFile(wb, 'scores.xlsx');
  } else if (format === 'csv') {
    const ws = XLSX.utils.json_to_sheet(scores);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scores.csv';
    a.click();
    URL.revokeObjectURL(url);
  } else if (format === 'pdf') {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 10;
    doc.text('Scores', 10, y);
    y += 10;
    doc.text('Name | Class | Arm | Obj | Essay | Total', 10, y);
    y += 10;
    scores.forEach(r => {
      doc.text(
        `${r.name} | ${r.class} | ${r.arm} | ${r.objective} | ${r.essay} | ${r.total}`,
        10,
        y
      );
      y += 10;
    });
    doc.save('scores.pdf');
  } else if (format === 'doc') {
    let content = '<html><body>';
    content += '<h1>Scores</h1>';
    content +=
      '<table border="1"><tr><th>Name</th><th>Class</th><th>Arm</th><th>Objective</th><th>Essay</th><th>Total</th></tr>';
    scores.forEach(r => {
      content += `<tr><td>${r.name}</td><td>${r.class}</td><td>${r.arm}</td><td>${r.objective}</td><td>${r.essay}</td><td>${r.total}</td></tr>`;
    });
    content += '</table></body></html>';
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scores.doc';
    a.click();
    URL.revokeObjectURL(url);
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

function resetAllData() {
  if (!confirm('This will wipe EVERYTHING. Continue?')) return;
  DataManager.clearAll();
}

window.addEventListener('DOMContentLoaded', () => {
  DataManager.init();
  initTabNavButtons();
});

function initTabNavButtons() {
  document.querySelectorAll('.tab-content').forEach(container => {
    container.insertAdjacentHTML('beforeend', '<br><br><br><br>');
    const navWrap = document.createElement('div');
    navWrap.style.display = 'flex';
    navWrap.style.justifyContent = 'space-between';
    navWrap.style.padding = '1rem';

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

    navWrap.append(back, next);
    container.appendChild(navWrap);
  });
}

function switchTab(direction) {
  const tabs = Array.from(document.querySelectorAll('.tab-button'));
  const current = tabs.findIndex(t => t.classList.contains('active'));
  const target = current + direction;
  if (target < 0 || target >= tabs.length) return;
  tabs[target].click();
}
