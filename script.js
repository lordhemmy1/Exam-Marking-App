// Save answers to local storage in JSON format
function saveAnswers() {
    const objAnswers = document.getElementById('obj-answers').value;
    const essayAnswers = document.getElementById('essay-answers').value;

    const answers = {
        objAnswers: objAnswers,
        essayAnswers: essayAnswers
    };

    localStorage.setItem('answers', JSON.stringify(answers));
    alert('Answers saved successfully');
}

// Mark answers and calculate scores
function markAnswers() {
    const studentName = document.getElementById('student-name').value;
    const studentClass = document.getElementById('student-class').value;
    const studentArm = document.getElementById('student-arm').value;
    const objAnswers = document.getElementById('obj-answers-m').value;
    const essayAnswers = document.getElementById('essay-answers-m').value;

    const savedAnswers = JSON.parse(localStorage.getItem('answers'));

    if (!savedAnswers) {
        alert('No answers saved to mark against!');
        return;
    }

    let objScore = (objAnswers === savedAnswers.objAnswers) ? 1 : 0;
    let essayScore = compareEssay(essayAnswers, savedAnswers.essayAnswers);

    const totalScore = objScore + essayScore;

    const scoreData = {
        studentName,
        studentClass,
        studentArm,
        objScore,
        essayScore,
        totalScore
    };

    saveScore(scoreData);
}

// Compare essay answers
function compareEssay(studentEssay, correctEssay) {
    const studentKeywords = studentEssay.split(" ");
    const correctKeywords = correctEssay.split(" ");
    let score = 0;

    studentKeywords.forEach(word => {
        if (correctKeywords.includes(word)) {
            score++;
        }
    });

    return score;
}

// Save score to local storage
function saveScore(scoreData) {
    let scores = JSON.parse(localStorage.getItem('scores')) || [];
    scores.push(scoreData);
    localStorage.setItem('scores', JSON.stringify(scores));
    alert('Scores saved');
    displayScores();
}

// Display all scores
function displayScores() {
    const scores = JSON.parse(localStorage.getItem('scores')) || [];
    const scoreList = document.getElementById('score-list');
    scoreList.innerHTML = '';

    scores.forEach(score => {
        const scoreItem = document.createElement('div');
        scoreItem.innerHTML = `
            <p>Name: ${score.studentName}, Class: ${score.studentClass}, Arm: ${score.studentArm}</p>
            <p>Objective Score: ${score.objScore}, Essay Score: ${score.essayScore}, Total Score: ${score.totalScore}</p>
        `;
        scoreList.appendChild(scoreItem);
    });
}

// Download scores as JSON file
function downloadScores() {
    const scores = JSON.parse(localStorage.getItem('scores')) || [];
    const blob = new Blob([JSON.stringify(scores, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'scores.json';
    link.click();
}

// Initially display scores if available
displayScores();
