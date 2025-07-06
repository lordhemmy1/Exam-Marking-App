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

// Attach validation to save button
const saveAnswersBtn = document.getElementById('save-answers-btn');
if (saveAnswersBtn) {
  saveAnswersBtn.addEventListener('click', (e) => {
    if (!validateTeacherAnswers()) {
      e.preventDefault();
      return;
    }
    // Proceed with existing save logic...
  });
}

// Link "No Objective" and "No Essay" buttons to both tabs
const toggleObjectiveBtn = document.getElementById('toggle-objective-btn');
const toggleEssayBtn = document.getElementById('toggle-essay-btn');

if (toggleObjectiveBtn) {
  toggleObjectiveBtn.addEventListener('click', () => {
    toggleSection('objective-answer-container');
    toggleSection('objective-marking-form');
  });
}

if (toggleEssayBtn) {
  toggleEssayBtn.addEventListener('click', () => {
    toggleSection('essay-answer-container');
    toggleSection('essay-marking-container');
  });
}

// Auto-retrieve student essay image from database during marking
function populateEssayImages(studentName) {
  const students = JSON.parse(localStorage.getItem('students') || '[]');
  const student = students.find(s => s.name.toLowerCase() === studentName.toLowerCase());
  if (student && student.essayImages) {
    const container = document.getElementById('essay-marking-container');
    container.innerHTML = '';
    student.essayImages.forEach(imgUrl => {
      const img = document.createElement('img');
      img.src = imgUrl;
      img.style.maxWidth = '100%';
      img.style.marginBottom = '1rem';
      container.appendChild(img);
    });
  }
}
