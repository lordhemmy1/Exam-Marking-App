// script.js

const loadSheetJS = () => { if (!window.XLSX) { const script = document.createElement('script'); script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.full.min.js'; script.onload = () => console.log('SheetJS loaded'); document.head.appendChild(script); } };

function showTab(tabId) { document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none'); document.getElementById(tabId).style.display = 'block'; }

function initObjectiveForm(type) { const form = document.getElementById(${type}-objective-form); form.innerHTML = ''; for (let i = 1; i <= 10; i++) addObjectiveRow(form, i); }

function addObjectiveRow(form, index) { const input = document.createElement('input'); input.placeholder = Q${index}; input.dataset.qnum = index; input.oninput = () => { if (form.children.length === index) addObjectiveRow(form, index + 1); }; form.appendChild(input); }

function initEssayForm(type) { const form = document.getElementById(${type}-essay-form); form.innerHTML = ''; for (let i = 1; i <= 5; i++) { ['a','b','c','d'].forEach(sub => { addEssayRow(form, ${i}${sub}); }); } }

function addEssayRow(form, qnum) { const container = document.createElement('div'); container.className = 'essay-row';

const qInput = document.createElement('input'); qInput.placeholder = Q${qnum}; qInput.dataset.qnum = qnum;

const markInput = document.createElement('input'); markInput.type = 'number'; markInput.placeholder = 'Mark';

const answerInput = document.createElement('textarea'); answerInput.placeholder = 'Answer';

container.appendChild(qInput); container.appendChild(markInput); container.appendChild(answerInput);

form.appendChild(container); }

function uploadObjectiveFile(type) { const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.csv'; input.onchange = async (e) => { const file = e.target.files[0]; const data = await file.arrayBuffer(); const workbook = XLSX.read(data); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const form = document.getElementById(`${type}-objective-form`);
form.innerHTML = '';
rows.forEach((row, i) => {
  const input = document.createElement('input');
  input.placeholder = `Q${i+1}`;
  input.value = row[0] || '';
  form.appendChild(input);
});

}; input.click(); }

function uploadEssayFile(type) { const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.csv'; input.onchange = async (e) => { const file = e.target.files[0]; const data = await file.arrayBuffer(); const workbook = XLSX.read(data); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const form = document.getElementById(`${type}-essay-form`);
form.innerHTML = '';
rows.forEach((row) => {
  const container = document.createElement('div');
  container.className = 'essay-row';

  const qInput = document.createElement('input');
  qInput.placeholder = `Q${row[0]}`;
  qInput.value = row[0] || '';

  const markInput = document.createElement('input');
  markInput.type = 'number';
  markInput.placeholder = 'Mark';
  markInput.value = row[1] || '';

  const answerInput = document.createElement('textarea');
  answerInput.placeholder = 'Answer';
  answerInput.value = row[2] || '';

  container.appendChild(qInput);
  container.appendChild(markInput);
  container.appendChild(answerInput);

  form.appendChild(container);
});

}; input.click(); }

let savedAnswers = { objectives: [], essays: [] };

function saveAnswerData() { const objForm = document.getElementById('answer-objective-form'); savedAnswers.objectives = Array.from(objForm.querySelectorAll('input')).map(input => input.value.trim().toLowerCase());

const essForm = document.getElementById('answer-essay-form'); savedAnswers.essays = Array.from(essForm.querySelectorAll('.essay-row')).map(row => { const inputs = row.querySelectorAll('input, textarea'); return { question: inputs[0].value.trim().toLowerCase(), mark: parseInt(inputs[1].value.trim()) || 0, answer: inputs[2].value.trim().toLowerCase() }; }); alert('Answer data saved for comparison.'); }

function saveMarkingData() { const studentName = document.getElementById('student-name').value.trim(); const studentClass = document.getElementById('student-class').value.trim(); const studentArm = document.getElementById('student-arm').value.trim();

const objForm = document.getElementById('marking-objective-form'); const stuAnswers = Array.from(objForm.querySelectorAll('input')).map(input => input.value.trim().toLowerCase());

let objScore = 0; stuAnswers.forEach((ans, idx) => { if (ans === savedAnswers.objectives[idx]) objScore++; });

const essForm = document.getElementById('marking-essay-form'); const stuEssays = Array.from(essForm.querySelectorAll('.essay-row')).map(row => { const inputs = row.querySelectorAll('input, textarea'); return { question: inputs[0].value.trim().toLowerCase(), mark: parseInt(inputs[1].value.trim()) || 0, answer: inputs[2].value.trim().toLowerCase() }; });

let essScore = 0; stuEssays.forEach(stu => { const model = savedAnswers.essays.find(e => e.question === stu.question); if (model && stu.answer && model.answer) { const keywords = model.answer.split(/\s+/); const matched = keywords.filter(word => stu.answer.includes(word)); const ratio = matched.length / keywords.length; if (ratio >= 0.6) essScore += model.mark; } });

const total = objScore + essScore;

const tbody = document.getElementById('score-body'); const row = document.createElement('tr'); row.innerHTML = <td>${studentName || 'Unknown'}</td> <td>${studentClass || 'N/A'}</td> <td>${studentArm || '-'}</td> <td>${objScore}</td> <td>${essScore}</td> <td>${total}</td>; tbody.appendChild(row); alert('Scores generated and saved.'); }

function downloadScores(format) { const table = document.getElementById('score-table'); const wb = XLSX.utils.book_new(); const ws = XLSX.utils.table_to_sheet(table); XLSX.utils.book_append_sheet(wb, ws, 'Scores');

if (format === 'xlsx') { XLSX.writeFile(wb, 'scores.xlsx'); } else if (format === 'csv') { XLSX.writeFile(wb, 'scores.csv'); } else if (format === 'doc') { let html = '<table>' + table.innerHTML + '</table>'; const blob = new Blob(['\uFEFF' + html], { type: 'application/msword' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'scores.doc'; link.click(); } }

function resetScores() { document.getElementById('score-body').innerHTML = ''; alert('Scores reset.'); }

window.onload = () => { loadSheetJS(); initObjectiveForm('answer'); initObjectiveForm('marking'); initEssayForm('answer'); initEssayForm('marking'); };

