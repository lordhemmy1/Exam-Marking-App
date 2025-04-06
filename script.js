// script.js

// Utility to create form rows dynamically function createObjectiveInputs(formId, prefix, count = 10) { const form = document.getElementById(formId); form.innerHTML = ''; for (let i = 1; i <= count; i++) { const row = document.createElement('div'); row.innerHTML = <label>Q${i}: <input type="text" name="${prefix}-q${i}" /></label>; form.appendChild(row); } }

function createEssayInputs(formId, prefix, count = 5) { const form = document.getElementById(formId); form.innerHTML = ''; for (let i = 1; i <= count; i++) { for (let sub of ['a', 'b', 'c', 'd']) { const row = document.createElement('div'); row.innerHTML = <label>${i}${sub} - Mark: <input type="number" name="${prefix}-q${i}${sub}-mark" style="width: 60px" /></label> <textarea name="${prefix}-q${i}${sub}-ans" placeholder="Answer for ${i}${sub}"></textarea>; form.appendChild(row); } } }

// Load default inputs createObjectiveInputs('answer-objective-form', 'answer'); createEssayInputs('answer-essay-form', 'answer'); createObjectiveInputs('marking-objective-form', 'marking'); createEssayInputs('marking-essay-form', 'marking');

// Placeholder for uploaded and saved data let answerData = {}; let markingData = {}; let scores = [];

function uploadFile(type) { alert(Upload box for ${type} will be implemented with XLSX/CSV support.); // Placeholder: handle file input and parsing here. }

function saveAnswerData() { const form = document.getElementById('answer-objective-form'); const formEssay = document.getElementById('answer-essay-form'); const objective = {}; const essay = {};

for (let input of form.elements) { if (input.name && input.value) { objective[input.name] = input.value.trim(); } }

for (let input of formEssay.elements) { if (input.name && input.value) { essay[input.name] = input.value.trim(); } }

answerData = { objective, essay }; alert('Answer data saved!'); }

function saveMarkingData() { const form = document.getElementById('marking-objective-form'); const formEssay = document.getElementById('marking-essay-form'); const objective = {}; const essay = {};

for (let input of form.elements) { if (input.name && input.value) { objective[input.name] = input.value.trim(); } }

for (let input of formEssay.elements) { if (input.name && input.value) { essay[input.name] = input.value.trim(); } }

// Compare and score let scoreObj = 0; let scoreEssay = 0;

for (let key in objective) { if (answerData.objective?.[key] && answerData.objective[key].toLowerCase() === objective[key].toLowerCase()) { scoreObj++; } }

for (let key in essay) { if (key.includes('ans')) { const markKey = key.replace('ans', 'mark'); const ansKey = key; const answerText = (answerData.essay?.[ansKey] || '').toLowerCase(); const studentText = essay[ansKey].toLowerCase(); if (studentText && answerText && studentText.includes(answerText.slice(0, 4))) { scoreEssay += parseInt(answerData.essay[markKey] || 0); } } }

const total = scoreObj + scoreEssay;

const student = { name: prompt("Enter Student's Name"), class: prompt("Enter Class"), arm: prompt("Enter Arm"), objective: scoreObj, essay: scoreEssay, total };

scores.push(student); updateScoreTable(); alert('Marking complete and saved!'); }

function updateScoreTable() { const tbody = document.querySelector('#score-table tbody'); tbody.innerHTML = ''; scores.forEach(s => { const row = <tr> <td>${s.name}</td> <td>${s.class}</td> <td>${s.arm}</td> <td>${s.objective}</td> <td>${s.essay}</td> <td>${s.total}</td> </tr>; tbody.innerHTML += row; }); }

function resetScores() { if (confirm("Are you sure you want to reset all data?")) { scores = []; updateScoreTable(); } }

function downloadScores(type) { let data = "Student Name,Class,Arm,Objective Score,Essay Score,Total Score\n"; scores.forEach(s => { data += ${s.name},${s.class},${s.arm},${s.objective},${s.essay},${s.total}\n; });

const blob = new Blob([data], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = scores.${type}; a.click(); URL.revokeObjectURL(url); }

