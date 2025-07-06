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

// Toggle Objective & Essay Sections in Both Tabs
function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.style.display = (section.style.display === 'none') ? 'block' : 'none';
  }
}

// Validate at least one section filled before saving answers
function validateTeacherAnswers() {
  const objectiveInputs = document.querySelectorAll('#objective-answer-form input, #objective-answer-form textarea');
  const essayInputs = document.querySelectorAll('#essay-answer-form input, #essay-answer-form textarea');
  const hasObjective = [...objectiveInputs].some(input => input.value.trim() !== '');
  const hasEssay = [...essayInputs].some(input => input.value.trim() !== '');

  if (!hasObjective && !hasEssay) {
    alert('Please fill either the Objective or Essay answers before saving.');
    return false;
  }
  return true;
}

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
  const objectiveContainer = document.getElementById('objective-answer-container');
  const essayContainer = document.getElementById('essay-answer-container');
  const objectiveVisible = objectiveContainer && objectiveContainer.style.display !== 'none';
  const essayVisible = essayContainer && essayContainer.style.display !== 'none';

  let validObjective = false;
  let validEssay = false;

  if (objectiveVisible) {
    const objInputs = Array.from(document.querySelectorAll('#objective-answer-form input'));
    validObjective = objInputs.some(i => i.value.trim());
    if (!validObjective) {
      alert('Please fill at least one objective answer before saving.');
      return;
    }
    DataManager.answerKey.objective = objInputs.map((i, idx) => ({
      questionNo: idx + 1,
      answer: i.value.trim()
    }));
  } else {
    DataManager.answerKey.objective = [];
  }

  if (essayVisible) {
    const essayDivs = Array.from(document.querySelectorAll('#essay-answer-form div'));
    validEssay = essayDivs.some((div, idx) => {
      const q = div.querySelector(`[name="qno_${idx + 1}"]`).value.trim();
      const m = div.querySelector(`[name="mark_${idx + 1}"]`).value.trim();
      const a = div.querySelector(`[name="ans_${idx + 1}"]`).value.trim();
      return q && m && a;
    });
    if (!validEssay) {
      alert('Please fill at least one essay question (Question No., Mark, and Answer).');
      return;
    }
    DataManager.answerKey.essay = essayDivs.map((div, idx) => ({
      questionNo: div.querySelector(`[name="qno_${idx + 1}"]`).value.trim(),
      mark: div.querySelector(`[name="mark_${idx + 1}"]`).value.trim(),
      answer: div.querySelector(`[name="ans_${idx + 1}"]`).value.trim()
    }));
  } else {
    DataManager.answerKey.essay = [];
  }

  // Final validation: at least one must be filled if both are visible
  if (objectiveVisible && essayVisible && !validObjective && !validEssay) {
    alert('Please fill at least one objective or essay answer before saving.');
    return;
  }

  DataManager.saveAnswerKey();

  // Clear inputs
  if (objectiveVisible) {
    document.querySelectorAll('#objective-answer-form input').forEach(i => (i.value = ''));
  }
  if (essayVisible) {
    document.querySelectorAll('#essay-answer-form input, #essay-answer-form textarea').forEach(el => (el.value = ''));
  }

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
    <button type="button" class="db-essay-add">Add Next Question</button>  
    <button type="button" class="db-essay-remove">Delete Question</button>  
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

