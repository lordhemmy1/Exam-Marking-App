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
