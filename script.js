// --- Tab Switching ---
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- Global Data Structures ---
const objectiveLimit = 100; // total allowed; default display is 50 rows for objective forms
const essayLimit = 20;
let answerData = { objectives: {}, essays: {} }; // Data from Answer Tab (teacher input)
let studentData = [];  // Array for marking records (displayed in Score Tab)
let studentDB = [];    // Local database for students (max 400 records)

// --- Notification Function ---
function notify(message) {
  const note = document.getElementById('marking-notification');
  if (note) note.innerText = message;
}

// --- Similarity Calculation for Essay Matching (Simple Implementation) ---
function calculateSimilarity(str1, str2) {
  let tokens1 = str1.toLowerCase().split(/\s+/);
  let tokens2 = str2.toLowerCase().split(/\s+/);
  let common = tokens1.filter(token => tokens2.includes(token));
  return (common.length / tokens1.length) * 100;
}

// --- Dynamic Form Creation ---
// Create objective form in two columns (for Answer or Marking)
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

// Create essay form (for Answer or Marking)
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

// --- Save Answer Tab Data ---
function saveAnswerData() {
  answerData.objectives = {};
  answerData.essays = {};
  // Save objective answers from 1 to 50.
  for (let i = 1; i <= 50; i++) {
    const input = document.getElementById(`objective-answer-${i}`);
    if (input && input.value.trim()) {
      answerData.objectives[input.id.split('-')[2]] = input.value.trim();
    }
  }
  // Save essay answers.
  for (let i = 1; i <= essayLimit; i++) {
    const qn = document.getElementById(`essay-answer-qn-${i}`);
    const mark = document.getElementById(`essay-answer-mark-${i}`);
    const ans = document.getElementById(`essay-answer-ans-${i}`);
    if (qn && mark && ans && qn.value.trim() && ans.value.trim()) {
      answerData.essays[qn.value.trim()] = {
        mark: parseInt(mark.value) || 0,
        answer: ans.value.trim()
      };
    }
  }
  alert('Answer data saved.');
}

// --- Marking (Compare) Process ---
function markAnswers() {
  notify('Uploading...');
  setTimeout(() => {
    notify('Marking...');
    const name = document.getElementById('student-name').value;
    const cls = document.getElementById('student-class').value;
    const arm = document.getElementById('student-arm').value;
    let scoreObj = 0, scoreEssay = 0;
    let objDetails = [];
    let essayDetails = [];
  
    // Compare objective answers.
    for (let i = 1; i <= 50; i++) {
      const input = document.getElementById(`objective-marking-${i}`);
      if (input && input.value.trim()) {
        let qNo = input.id.split('-')[2];
        const correctAns = answerData.objectives[qNo] || '';
        const studentAns = input.value.trim();
        let remark = (correctAns.toLowerCase() === studentAns.toLowerCase()) ? '✔' : '✖';
        if (correctAns.toLowerCase() === studentAns.toLowerCase()) scoreObj++;
        objDetails.push({ qNo, correctAns, studentAns, remark });
      }
    }
  
    // Compare essay answers using a threshold of 55%.
    for (let i = 1; i <= essayLimit; i++) {
      const qn = document.getElementById(`essay-marking-qn-${i}`);
      const markEl = document.getElementById(`essay-marking-mark-${i}`);
      const ansEl = document.getElementById(`essay-marking-ans-${i}`);
      if (qn && markEl && ansEl && qn.value.trim() && ansEl.value.trim()) {
        let key = qn.value.trim();
        let model = answerData.essays[key];
        let studentAns = ansEl.value.trim();
        let similarity = (model) ? calculateSimilarity(model.answer, studentAns) : 0;
        let remark = (similarity >= 55) ? '✔' : '✖';
        if (similarity >= 55 && model) scoreEssay += model.mark;
        essayDetails.push({ qNo: key, correctAns: model ? model.answer : '', studentAns, remark });
      }
    }
  
    const total = scoreObj + scoreEssay;
    studentData.push({ name, class: cls, arm, scoreObj, scoreEssay, total });
    updateScoreTable();
    updateDetailTables(objDetails, essayDetails);
    notify('Getting results...');
    setTimeout(() => {
      notify('Marking complete.');
    }, 500);
  }, 500);
}

// --- Update Score Table in Score Tab ---
function updateScoreTable() {
  const tbody = document.querySelector('#score-table tbody');
  tbody.innerHTML = '';
  studentData.forEach(s => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${s.name}</td>
      <td>${s.class}</td>
      <td>${s.arm}</td>
      <td>${s.scoreObj}</td>
      <td>${s.scoreEssay}</td>
      <td>${s.total}</td>
    `;
    tbody.appendChild(row);
  });
}

// --- Update Detailed Marking Results ---
function updateDetailTables(objDetails, essayDetails) {
  const objTbody = document.querySelector('#objective-detail-table tbody');
  const essayTbody = document.querySelector('#essay-detail-table tbody');
  objTbody.innerHTML = '';
  essayTbody.innerHTML = '';
  objDetails.forEach(item => {
    let row = document.createElement('tr');
    row.innerHTML = `<td>${item.qNo}</td><td>${item.correctAns}</td><td>${item.studentAns}</td><td>${item.remark}</td>`;
    objTbody.appendChild(row);
  });
  essayDetails.forEach(item => {
    let row = document.createElement('tr');
    row.innerHTML = `<td>${item.qNo}</td><td>${item.correctAns}</td><td>${item.studentAns}</td><td>${item.remark}</td>`;
    essayTbody.appendChild(row);
  });
}

// --- Reset and Download Functions ---
function resetScores() {
  if (confirm('Are you sure you want to reset all scores?')) {
    studentData = [];
    updateScoreTable();
  }
}
function downloadScores(type) {
  if (type === 'csv') {
    let content = 'Name,Class,Arm,Objective,Essay,Total\n';
    studentData.forEach(s => {
      content += `${s.name},${s.class},${s.arm},${s.scoreObj},${s.scoreEssay},${s.total}\n`;
    });
    downloadFile('scores.csv', content);
  } else if (type === 'doc') {
    let content = '<table border="1"><tr><th>Name</th><th>Class</th><th>Arm</th><th>Objective</th><th>Essay</th><th>Total</th></tr>';
    studentData.forEach(s => {
      content += `<tr>
        <td>${s.name}</td>
        <td>${s.class}</td>
        <td>${s.arm}</td>
        <td>${s.scoreObj}</td>
        <td>${s.scoreEssay}</td>
        <td>${s.total}</td>
      </tr>`;
    });
    content += '</table>';
    const blob = new Blob(['<html><body>' + content + '</body></html>'], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scores.doc';
    a.click();
    URL.revokeObjectURL(url);
  } else if (type === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(studentData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scores");
    XLSX.writeFile(wb, "scores.xlsx");
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

// --- File Upload Handling with SheetJS ---
// For the essay file upload in the Answer Tab, ignore the first row (headings) and start from the second row.
function handleFileUpload(event, type, prefix) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.type.startsWith('image/')) {
    handleImageUpload(file, type, prefix);
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (type === 'essay' && prefix === 'essay-answer') {
      // Remove the first row (assumed heading) for essay answers.
      jsonData = jsonData.slice(1);
    }
    if (type === 'objective') {
      jsonData.forEach(row => {
        if (row[0] && row[1]) {
          let input = document.getElementById(`${prefix}-${row[0]}`);
          if (!input) {
            let container = document.getElementById(prefix + (prefix.includes('objective-answer') ? '-form' : '-marking-form'));
            const div = document.createElement('div');
            div.innerHTML = `<label>${row[0]}.</label>
              <input type="text" id="${prefix}-${row[0]}" value="${row[1]}">`;
            container.appendChild(div);
          } else {
            input.value = row[1];
          }
        }
      });
    } else if (type === 'essay') {
      jsonData.forEach((row, idx) => {
        if (row[0] && row[1] && row[2]) {
          let qn = document.getElementById(`${prefix}-qn-${idx + 1}`);
          let mark = document.getElementById(`${prefix}-mark-${idx + 1}`);
          let ans = document.getElementById(`${prefix}-ans-${idx + 1}`);
          if (qn && mark && ans) {
            qn.value = row[0];
            mark.value = row[1];
            ans.value = row[2];
          }
        }
      });
    }
  };
  reader.readAsArrayBuffer(file);
}

// --- Handle Image Upload using Tesseract.js ---
function handleImageUpload(file, type, prefix) {
  notify('Processing image via OCR...');
  Tesseract.recognize(file, 'eng')
    .then(({ data: { text } }) => {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      lines.forEach(line => {
        const parts = line.split(/[:\-]/);
        if (parts.length >= 2) {
          const qNo = parts[0].replace(/[^0-9]/g, '');
          const extracted = parts.slice(1).join(':').trim();
          if (prefix.includes('essay-marking')) {
            let input = document.getElementById(`${prefix}-ans-${qNo}`);
            if (input) {
              input.value = extracted;
            } else {
              let container = document.getElementById(prefix + '-form');
              const div = document.createElement('div');
              div.innerHTML = `
                <label>Q${qNo}</label>
                <input type="text" id="${prefix}-qn-${qNo}" value="${qNo}" placeholder="Question No">
                <input type="number" id="${prefix}-mark-${qNo}" placeholder="Mark">
                <textarea id="${prefix}-ans-${qNo}" placeholder="Answer">${extracted}</textarea>
              `;
              container.appendChild(div);
            }
          } else {
            let input = document.getElementById(`${prefix}-${qNo}`);
            if (input) {
              input.value = extracted;
            } else {
              let container = document.getElementById(prefix + (prefix.includes('objective-marking') ? '-form' : '-marking-form'));
              const div = document.createElement('div');
              div.innerHTML = `<label>${qNo}.</label>
                <input type="text" id="${prefix}-${qNo}" value="${extracted}">`;
              container.appendChild(div);
            }
          }
        }
      });
      notify('Image processed.');
    })
    .catch(err => {
      console.error(err);
      notify('Error processing image.');
    });
}

// --- Attach File Upload Listeners ---
function setupUploadListeners() {
  document.getElementById('upload-objective-answer').addEventListener('change',
    (e) => handleFileUpload(e, 'objective', 'objective-answer'));
  document.getElementById('upload-essay-answer').addEventListener('change',
    (e) => handleFileUpload(e, 'essay', 'essay-answer'));
  document.getElementById('upload-objective-marking').addEventListener('change',
    (e) => handleFileUpload(e, 'objective', 'objective-marking'));
  document.getElementById('upload-essay-marking').addEventListener('change',
    (e) => handleFileUpload(e, 'essay', 'essay-marking'));
}

// --- New Functions for Students Database Tab ---
// Save student information (with validation) and update reference display.
function saveStudentData() {
  const name = document.getElementById('db-student-name').value.trim();
  const cls = document.getElementById('db-student-class').value.trim();
  const arm = document.getElementById('db-student-arm').value.trim();
  const objAnswer = document.getElementById('db-objective-answer').value.trim();
  if (!name || !cls || !arm || !objAnswer) {
    alert('All Student Information fields and Objective Answer must be filled.');
    return;
  }
  const essayGroups = document.querySelectorAll('#db-essay-form .essay-group');
  let essayAnswers = [];
  for (let group of essayGroups) {
    const qn = group.querySelector('.db-essay-qn').value.trim();
    const ans = group.querySelector('.db-essay-ans').value.trim();
    const imgInput = group.querySelector('.db-essay-img');
    const hasFile = imgInput && imgInput.files && imgInput.files.length > 0;
    if (!qn || ((!ans) && !hasFile)) {
      alert('Each Essay Answer group must have a Question No and either an Answer or an uploaded file.');
      return;
    }
    let imgFile = hasFile ? imgInput.files[0].name : '';
    essayAnswers.push({ qNo: qn, answer: ans, image: imgFile });
  }
  const studentRecord = { name, class: cls, arm, objAnswer, essayAnswers };
  studentDB.push(studentRecord);
  if (studentDB.length > 400) {
    studentDB.shift();
  }
  updateStudentDBReference();
  // Reset the Students Database form.
  document.getElementById('db-student-name').value = '';
  document.getElementById('db-student-class').value = '';
  document.getElementById('db-student-arm').value = '';
  document.getElementById('db-objective-answer').value = '';
  document.getElementById('db-essay-form').innerHTML = '';
  addNewEssayGroup();
  alert('Student data saved.');
}

// Update the displayed student reference list as a table.
function updateStudentDBReference() {
  const container = document.getElementById('student-db-reference');
  let html = `<table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Class</th>
        <th>Arm</th>
        <th>Objective Answer</th>
        <th>Essay Answer</th>
      </tr>
    </thead>
    <tbody>`;
  studentDB.forEach(student => {
    let essayStr = student.essayAnswers.map(ea => ea.image ? `[${ea.image}]` : ea.answer).join(' | ');
    html += `<tr>
      <td>${student.name}</td>
      <td>${student.class}</td>
      <td>${student.arm}</td>
      <td>${student.objAnswer}</td>
      <td>${essayStr}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

// Create a new essay group for the Students Database tab.
// Only a "Continue" button (to add a new group) and a "Delete" button are provided.
function addNewEssayGroup() {
  const container = document.getElementById('db-essay-form');
  const index = container.children.length + 1;
  if (index > essayLimit) return;
  const div = document.createElement('div');
  div.classList.add('essay-group');
  div.setAttribute('data-index', index);
  div.innerHTML = `
    <label>Q${index}:</label>
    <input type="text" placeholder="Question No" class="db-essay-qn">
    <textarea placeholder="Answer" class="db-essay-ans"></textarea>
    <input type="file" accept="image/png,image/jpeg,image/jpg" class="db-essay-img">
    <div class="essay-addition">
      <button type="button" class="add-essay-btn">Continue</button>
      <button type="button" class="delete-essay-btn">Delete</button>
    </div>
  `;
  container.appendChild(div);
  // Attach event listener for "Continue" button.
  div.querySelector('.add-essay-btn').addEventListener('click', () => {
    // Debug log to ensure the button fires.
    console.log("Continue button clicked for essay group", index);
    addNewEssayGroup();
  });
  // Attach event listener for "Delete" button.
  div.querySelector('.delete-essay-btn').addEventListener('click', () => {
    div.parentNode.removeChild(div);
  });
}

// Initialize the Students Database essay form on page load.
function initStudentDBForm() {
  document.getElementById('db-essay-form').innerHTML = '';
  addNewEssayGroup();
}

// --- Modify Marking Tab: Auto-populate from Students Database ---
// When teacher enters student info in the Marking Tab, auto-populate the corresponding answers.
function populateStudentData() {
  const name = document.getElementById('student-name').value.trim();
  const cls = document.getElementById('student-class').value.trim();
  const arm = document.getElementById('student-arm').value.trim();
  const student = studentDB.find(s =>
    s.name.toLowerCase() === name.toLowerCase() &&
    s.class.toLowerCase() === cls.toLowerCase() &&
    s.arm.toLowerCase() === arm.toLowerCase()
  );
  if (student) {
    // Populate objective marking form.
    const objFormContainer = document.getElementById('objective-marking-form');
    objFormContainer.innerHTML = '';
    let answers = student.objAnswer.split('\n');
    answers.forEach((ans, idx) => {
      const div = document.createElement('div');
      div.innerHTML = `<label>${idx+1}.</label>
      <input type="text" id="objective-marking-${idx+1}" value="${ans.trim()}">`;
      objFormContainer.appendChild(div);
    });
    // Populate essay marking form as a three-column layout.
    const essayFormContainer = document.getElementById('essay-marking-form');
    essayFormContainer.innerHTML = '';
    student.essayAnswers.forEach((ea, idx) => {
      const studentAnswerDisplay = ea.image
        ? `<div class="essay-image-preview">Image: ${ea.image}</div>`
        : ea.answer;
      const correctAnswer = answerData.essays[ea.qNo] ? answerData.essays[ea.qNo].answer : 'N/A';
      const div = document.createElement('div');
      div.innerHTML = `
        <div class="essay-marking-row">
          <div class="col correct-answer">
            ${correctAnswer}
          </div>
          <div class="col student-answer">
            ${studentAnswerDisplay}
          </div>
          <div class="col marking-actions">
            <button type="button" onclick="assignMark(${idx+1}, 'correct')">Correct</button>
            <button type="button" onclick="assignMark(${idx+1}, 'incorrect')">Incorrect</button>
            <button type="button" onclick="assignMark(${idx+1}, 'custom', ${idx+1})">Custom Mark</button>
            <input type="number" id="custom-mark-${idx+1}" style="display:none;" placeholder="Enter mark">
            <button type="button" id="apply-custom-${idx+1}" style="display:none;" onclick="applyCustomMark(${idx+1})">Done</button>
          </div>
        </div>
      `;
      essayFormContainer.appendChild(div);
    });
  }
}

// --- Functions for marking actions in Essay Marking ---
function assignMark(idx, type, customIdx) {
  const markInput = document.getElementById(`essay-marking-mark-${idx}`);
  if (type === 'correct') {
    const qnInput = document.getElementById(`essay-marking-qn-${idx}`);
    const answerKey = qnInput ? qnInput.value.trim() : '';
    const model = answerData.essays[answerKey];
    if (model) {
      markInput.value = model.mark;
    }
  } else if (type === 'incorrect') {
    markInput.value = 0;
  } else if (type === 'custom') {
    document.getElementById(`custom-mark-${customIdx}`).style.display = 'inline-block';
    document.getElementById(`apply-custom-${customIdx}`).style.display = 'inline-block';
  }
}
function applyCustomMark(idx) {
  const customMark = document.getElementById(`custom-mark-${idx}`).value;
  document.getElementById(`essay-marking-mark-${idx}`).value = customMark;
  document.getElementById(`custom-mark-${idx}`).style.display = 'none';
  document.getElementById(`apply-custom-${idx}`).style.display = 'none';
}

// --- Attach File Upload Listeners ---
function setupUploadListeners() {
  document.getElementById('upload-objective-answer').addEventListener('change',
    (e) => handleFileUpload(e, 'objective', 'objective-answer'));
  document.getElementById('upload-essay-answer').addEventListener('change',
    (e) => handleFileUpload(e, 'essay', 'essay-answer'));
  document.getElementById('upload-objective-marking').addEventListener('change',
    (e) => handleFileUpload(e, 'objective', 'objective-marking'));
  document.getElementById('upload-essay-marking').addEventListener('change',
    (e) => handleFileUpload(e, 'essay', 'essay-marking'));
}

// --- Initialize Forms and Listeners on Page Load ---
window.onload = () => {
  createObjectiveFormTwoCol(document.getElementById('objective-answer-form'), 'objective-answer');
  createObjectiveFormTwoCol(document.getElementById('objective-marking-form'), 'objective-marking');
  createEssayForm(document.getElementById('essay-answer-form'), 'essay-answer');
  createEssayForm(document.getElementById('essay-marking-form'), 'essay-marking');
  setupUploadListeners();
  initStudentDBForm();
};
