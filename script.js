// --- Handle Image Upload using Tesseract.js (Improved for Marking Tab) ---
function handleImageUpload(file, type, prefix) {
  // Display a notification that image processing has started.
  notify('Processing image via OCR...');
  Tesseract.recognize(file, 'eng')
    .then(({ data: { text } }) => {
      // Split OCR output into individual lines (ignoring empty lines)
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      // Process the extracted text according to the type (objective or essay)
      if (type === 'objective') {
        // For each line, use a regex to extract the question number and answer.
        lines.forEach(line => {
          // Expect formats such as "1: answer", "1. answer", or "1 answer"
          const match = line.match(/^(\d+)[\.\:\-]?\s*(.*)$/);
          if (match) {
            let qNo = match[1];
            let extracted = match[2];
            // Find the corresponding input field in the marking tab objective form.
            let input = document.getElementById(`${prefix}-${qNo}`);
            if (input) {
              input.value = extracted;
            } else {
              // If input doesn't exist yet, create a new input row.
              let container = document.getElementById(prefix + '-form'); // For example, "objective-marking-form"
              if (container) {
                const div = document.createElement('div');
                div.innerHTML = `<label>${qNo}.</label>
                                  <input type="text" id="${prefix}-${qNo}" value="${extracted}">`;
                container.appendChild(div);
              }
            }
          }
        });
      } else if (type === 'essay') {
        // For essay, assume each line contains: question number and answer.
        lines.forEach(line => {
          // Expect formats such as "1: answer" or "1. answer"
          const match = line.match(/^(\d+)[\.\:\-]?\s*(.*)$/);
          if (match) {
            let qNo = match[1];
            let extracted = match[2];
            // For the essay marking form, we populate the corresponding question
            let index = parseInt(qNo);
            let qnInput = document.getElementById(`${prefix}-qn-${index}`);
            let ansInput = document.getElementById(`${prefix}-ans-${index}`);
            if (qnInput && ansInput) {
              qnInput.value = qNo; // Set the question number field
              ansInput.value = extracted; // Populate answer field with the OCR result
            }
          }
        });
      }
      // Notify that the image has been processed.
      notify('Image processed.');
    })
    .catch(err => {
      console.error(err);
      notify('Error processing image.');
    });
}

// --- File Upload Handling remains the same ---
function handleFileUpload(event, type, prefix) {
  const file = event.target.files[0];
  if (!file) return;
  // If the file is an image, call the updated image-handling function.
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
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (type === 'objective') {
      jsonData.forEach(row => {
        // Use the first column as the question number and the second as the answer.
        if (row[0] && row[1]) {
          let input = document.getElementById(`${prefix}-${row[0]}`);
          // If not found, create a new input row
          if (!input) {
            let container = document.getElementById(prefix + '-form');
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
        // For essay, expect: Column A = Question No.; Column B = Mark; Column C = Answer
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

// --- Attach File Upload Listeners (for Marking Tab) ---
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

// --- Initialize Forms and Upload Listeners on Page Load ---
window.onload = () => {
  // For Answer Tab
  createObjectiveFormTwoCol(document.getElementById('objective-answer-form'), 'objective-answer');
  createEssayForm(document.getElementById('essay-answer-form'), 'essay-answer');
  // For Marking Tab
  createObjectiveFormTwoCol(document.getElementById('objective-marking-form'), 'objective-marking');
  createEssayForm(document.getElementById('essay-marking-form'), 'essay-marking');
  setupUploadListeners();
};r('#score-table tbody');
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
            // Create and append new row in two-column format
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
function handleImageUpload(file, type, prefix) {
  notify('Processing image via OCR...');
  Tesseract.recognize(file, 'eng')
    .then(({ data: { text } }) => {
      // Assume OCR text is structured with one line per question: "Q#: Answer"
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      lines.forEach(line => {
        // For example, split at a delimiter, assuming "Q#: Answer"
        const parts = line.split(/[:\-]/); // you may adjust based on expected format
        if (parts.length >= 2) {
          const qNo = parts[0].replace(/[^0-9]/g, '');
          const extracted = parts.slice(1).join(':').trim();
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
