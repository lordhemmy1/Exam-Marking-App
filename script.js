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
const objectiveLimit = 100; // total allowed, but we default to 50 displayed
const essayLimit = 20;
let answerData = { objectives: {}, essays: {} }; // Answer tab data (teacher input)
let studentData = []; // Array of student records

// --- Notification Function ---
function notify(message) {
  const note = document.getElementById('marking-notification');
  note.innerText = message;
}

// --- Similarity Calculation for Essay Matching (Simple Implementation) ---
function calculateSimilarity(str1, str2) {
  // Convert to lower-case and split into tokens
  let tokens1 = str1.toLowerCase().split(/\s+/);
  let tokens2 = str2.toLowerCase().split(/\s+/);
  let common = tokens1.filter(token => tokens2.includes(token));
  let similarity = (common.length / tokens1.length) * 100;
  return similarity;
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
  // Save objective answers; use question number from input id
  for (let i = 1; i <= 50; i++) {
    const input = document.getElementById(`objective-answer-${i}`);
    if (input && input.value.trim()) {
      answerData.objectives[input.id.split('-')[2]] = input.value.trim();
    }
  }
  // Save essay answers; key by question number entered in the form
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
  // Display notifications sequentially.
  notify('Uploading...');
  setTimeout(() => {
    notify('Marking...');
    const name = document.getElementById('student-name').value;
    const cls = document.getElementById('student-class').value;
    const arm = document.getElementById('student-arm').value;
    let scoreObj = 0, scoreEssay = 0;
    // For detailed result tables:
    let objDetails = [];
    let essayDetails = [];
  
    // Compare objective answers
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
  
    // Compare essay answers using similarity threshold (55% or above)
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
    // Save student record (make sure addition is correct)
    studentData.push({ name, class: cls, arm, scoreObj, scoreEssay, total });
    updateScoreTable();
    // Display detailed marking results in separate tables
    updateDetailTables(objDetails, essayDetails);
    notify('Getting results...');

    setTimeout(() => {
      notify('Marking complete.');
      // Scroll to Score Tab if needed or simply inform the user
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
// This function handles both XLSX/CSV files and image files.
// For images, it uses Tesseract.js to extract text.
// For objective and essay, it reads the first column as the question number.
function handleFileUpload(event, type, prefix) {
  const file = event.target.files[0];
  if (!file) return;
  // Check if file is an image by type
  if (file.type.startsWith('image/')) {
    // Pass file to the image handler
    handleImageUpload(file, type, prefix);
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (type === 'objective') {
      jsonData.forEach(row => {
        // row[0]: question number; row[1]: answer
        if (row[0] && row[1]) {
          let input = document.getElementById(`${prefix}-${row[0]}`);
          // If input not found, optionally add new row
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
        // row[0]: question no, row[1]: mark, row[2]: answer
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
// Updated to distinguish between objective and essay marking in the Marking Tab.
function handleImageUpload(file, type, prefix) {
  notify('Processing image via OCR...');
  Tesseract.recognize(file, 'eng')
    .then(({ data: { text } }) => {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      lines.forEach(line => {
        // Assuming each line is in the format "Q#: Answer" or similar
        const parts = line.split(/[:\-]/);
        if (parts.length >= 2) {
          const qNo = parts[0].replace(/[^0-9]/g, '');
          const extracted = parts.slice(1).join(':').trim();
          // If processing essay marking, populate the answer field
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
            // Else, for objective marking (or other), populate the standard input field
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

// --- Initialize Forms and Listeners on Page Load ---
window.onload = () => {
  createObjectiveFormTwoCol(document.getElementById('objective-answer-form'), 'objective-answer');
  createObjectiveFormTwoCol(document.getElementById('objective-marking-form'), 'objective-marking');
  createEssayForm(document.getElementById('essay-answer-form'), 'essay-answer');
  createEssayForm(document.getElementById('essay-marking-form'), 'essay-marking');
  setupUploadListeners();
};
