// Global Variables for Form Control
let selectedFile = null;
let audioPreview = null;
let isPlaying = false;
let updateInterval = null;

// DOM Elements
const form = document.getElementById('registration-form');
const dragArea = document.getElementById('file-drag-area');
const fileInput = document.getElementById('track');
const audioCard = document.getElementById('audio-preview-card');
const playPauseBtn = document.getElementById('play-pause-btn');
const timeCurrent = document.getElementById('audio-time-current');
const timeDuration = document.getElementById('audio-time-duration');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressBarWrapper = document.getElementById('progress-bar-wrapper');
const duetSection = document.getElementById('duet-performer-section');
const submitBtn = document.getElementById('btn-submit-form');
const errorBanner = document.getElementById('response-message-banner');

// Input fields for Lead
const inputName = document.getElementById('name');
const inputRoll = document.getElementById('rollNo');
const inputCourse = document.getElementById('course');
const inputYear = document.getElementById('year');
const inputBranch = document.getElementById('branch');

// Input fields for Partner
const inputPartnerName = document.getElementById('partnerName');
const inputPartnerRoll = document.getElementById('partnerRollNo');
const inputPartnerCourse = document.getElementById('partnerCourse');
const inputPartnerYear = document.getElementById('partnerYear');
const inputPartnerBranch = document.getElementById('partnerBranch');

// Toggle Solo/Duet Participation Type
function setParticipationType(type) {
  const optionSolo = document.getElementById('option-solo');
  const optionDuet = document.getElementById('option-duet');
  const participationTypeInput = document.getElementById('participationType');

  participationTypeInput.value = type;

  if (type === 'solo') {
    optionSolo.classList.add('active');
    optionDuet.classList.remove('active');
    duetSection.classList.remove('show');
    // Remove required attributes and clear errors
    togglePartnerRequired(false);
  } else {
    optionSolo.classList.remove('active');
    optionDuet.classList.add('active');
    duetSection.classList.add('show');
    togglePartnerRequired(true);
  }
}

// Helper to set/remove required validation tags on partner fields
function togglePartnerRequired(isRequired) {
  const partnerFields = [inputPartnerName, inputPartnerRoll, inputPartnerCourse, inputPartnerYear, inputPartnerBranch];
  partnerFields.forEach(field => {
    if (isRequired) {
      field.setAttribute('required', 'required');
    } else {
      field.removeAttribute('required');
      field.classList.remove('error');
      const errEl = document.getElementById(`error-${field.id}`);
      if (errEl) errEl.style.display = 'none';
    }
  });
}

// Drag and drop event listeners
['dragenter', 'dragover'].forEach(eventName => {
  dragArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    dragArea.classList.add('drag-over');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dragArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    dragArea.classList.remove('drag-over');
  }, false);
});

dragArea.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files.length > 0) {
    fileInput.files = files;
    handleFile(files[0]);
  }
});

function triggerFileInput() {
  fileInput.click();
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

// Process selected audio file
function handleFile(file) {
  // Reset previous track if any
  removeSelectedTrack();

  const fileError = document.getElementById('error-track');
  fileError.style.display = 'none';

  // Basic validation for audio files
  if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|webm|flac|mp4|3gp)$/i)) {
    showInputError(fileInput, 'Invalid file type. Please upload a valid audio track (MP3/WAV/OGG/M4A/AAC/WEBM).');
    fileInput.value = '';
    return;
  }

  // Size limit validation (30MB)
  const maxSize = 30 * 1024 * 1024;
  if (file.size > maxSize) {
    showInputError(fileInput, 'File is too large. Maximum size allowed is 30MB.');
    fileInput.value = '';
    return;
  }

  selectedFile = file;
  
  // Update preview card information
  document.getElementById('preview-file-name').innerText = file.name;
  document.getElementById('preview-file-size').innerText = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
  
  // Show preview player
  audioCard.classList.add('show');

  // Load audio source object
  const audioUrl = URL.createObjectURL(file);
  audioPreview = new Audio(audioUrl);
  
  // Metadata load listener
  audioPreview.addEventListener('loadedmetadata', () => {
    timeDuration.innerText = formatTime(audioPreview.duration);
  });

  // End of audio playback listener
  audioPreview.addEventListener('ended', () => {
    resetAudioPlayer();
  });
}

function removeSelectedTrack() {
  if (audioPreview) {
    audioPreview.pause();
    audioPreview = null;
  }
  selectedFile = null;
  fileInput.value = '';
  isPlaying = false;
  clearInterval(updateInterval);
  progressBarFill.style.style = '0%';
  timeCurrent.innerText = '0:00';
  timeDuration.innerText = '0:00';
  playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  audioCard.classList.remove('show');
}

// Audio Player controls
function toggleAudioPreview() {
  if (!audioPreview) return;

  if (isPlaying) {
    audioPreview.pause();
    playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    clearInterval(updateInterval);
  } else {
    audioPreview.play();
    playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    updateInterval = setInterval(updatePlayerProgress, 250);
  }
  isPlaying = !isPlaying;
}

function updatePlayerProgress() {
  if (!audioPreview) return;
  const current = audioPreview.currentTime;
  const duration = audioPreview.duration || 0;
  timeCurrent.innerText = formatTime(current);
  
  if (duration > 0) {
    const percent = (current / duration) * 100;
    progressBarFill.style.width = percent + '%';
  }
}

function seekAudioPreview(e) {
  if (!audioPreview) return;
  const rect = progressBarWrapper.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  const percent = clickX / width;
  
  audioPreview.currentTime = percent * audioPreview.duration;
  updatePlayerProgress();
}

function resetAudioPlayer() {
  isPlaying = false;
  clearInterval(updateInterval);
  progressBarFill.style.width = '0%';
  timeCurrent.innerText = '0:00';
  playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Interactive validation feedback
function showInputError(inputEl, customMessage = '') {
  inputEl.classList.add('error');
  const errorEl = document.getElementById(`error-${inputEl.id}`);
  if (errorEl) {
    if (customMessage) {
      errorEl.innerText = customMessage;
    }
    errorEl.style.display = 'block';
  }
}

function clearInputError(inputEl) {
  inputEl.classList.remove('error');
  const errorEl = document.getElementById(`error-${inputEl.id}`);
  if (errorEl) {
    errorEl.style.display = 'none';
  }
}

// Attach live input validations listeners
[inputName, inputRoll, inputCourse, inputYear, inputBranch, 
 inputPartnerName, inputPartnerRoll, inputPartnerCourse, inputPartnerYear, inputPartnerBranch].forEach(field => {
  field.addEventListener('input', () => {
    if (field.value.trim() !== '') {
      clearInputError(field);
    }
  });
  field.addEventListener('change', () => {
    if (field.value !== '') {
      clearInputError(field);
    }
  });
});

// Full form validation check
function validateForm() {
  let isValid = true;
  const pType = document.getElementById('participationType').value;

  // Validate Lead
  if (inputName.value.trim() === '') {
    showInputError(inputName);
    isValid = false;
  }
  if (inputRoll.value.trim() === '') {
    showInputError(inputRoll);
    isValid = false;
  }
  if (inputCourse.value === '') {
    showInputError(inputCourse);
    isValid = false;
  }
  if (inputYear.value === '') {
    showInputError(inputYear);
    isValid = false;
  }
  if (inputBranch.value.trim() === '') {
    showInputError(inputBranch);
    isValid = false;
  }

  // Validate Partner if Duet
  if (pType === 'duet') {
    if (inputPartnerName.value.trim() === '') {
      showInputError(inputPartnerName);
      isValid = false;
    }
    if (inputPartnerRoll.value.trim() === '') {
      showInputError(inputPartnerRoll);
      isValid = false;
    }
    if (inputPartnerCourse.value === '') {
      showInputError(inputPartnerCourse);
      isValid = false;
    }
    if (inputPartnerYear.value === '') {
      showInputError(inputPartnerYear);
      isValid = false;
    }
    if (inputPartnerBranch.value.trim() === '') {
      showInputError(inputPartnerBranch);
      isValid = false;
    }
  }

  // Validate File
  if (!selectedFile) {
    const fileError = document.getElementById('error-track');
    fileError.style.display = 'block';
    isValid = false;
  }

  return isValid;
}

// Form Submission Event Listener
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Clear past submission banners
  errorBanner.style.display = 'none';

  if (!validateForm()) {
    // Scroll to the first error item
    const firstError = document.querySelector('.error');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  // Build FormData structure for multipart/form-data
  const formData = new FormData();
  formData.append('participationType', document.getElementById('participationType').value);
  formData.append('name', inputName.value.trim());
  formData.append('rollNo', inputRoll.value.trim());
  formData.append('course', inputCourse.value);
  formData.append('year', inputYear.value);
  formData.append('branch', inputBranch.value.trim());

  if (document.getElementById('participationType').value === 'duet') {
    formData.append('partnerName', inputPartnerName.value.trim());
    formData.append('partnerRollNo', inputPartnerRoll.value.trim());
    formData.append('partnerCourse', inputPartnerCourse.value);
    formData.append('partnerYear', inputPartnerYear.value);
    formData.append('partnerBranch', inputPartnerBranch.value.trim());
  }

  if (selectedFile) {
    formData.append('track', selectedFile);
  }

  // Set loading button animation
  submitBtn.classList.add('loading');
  submitBtn.setAttribute('disabled', 'disabled');
  document.getElementById('btn-submit-text').innerText = 'Processing Registration...';

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.success) {
      displaySuccessTicket(result.data);
    } else {
      showServerErrorMessage(result.message || 'An error occurred during registration.');
    }
  } catch (err) {
    console.error('Fetch registration error:', err);
    showServerErrorMessage('Server is currently unreachable. Please try again later.');
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.removeAttribute('disabled');
    document.getElementById('btn-submit-text').innerText = 'Confirm Audition Registration';
  }
});

function showServerErrorMessage(message) {
  errorBanner.innerText = message;
  errorBanner.classList.add('error');
  errorBanner.style.display = 'block';
  errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Render Entry Ticket View on Success
function displaySuccessTicket(registration) {
  // Stop preview audio if playing
  if (audioPreview) {
    audioPreview.pause();
  }

  // Slide form away and slide success card in
  document.getElementById('registration-card-wrapper').style.display = 'none';
  const successCard = document.getElementById('success-card-wrapper');
  successCard.classList.add('show');
  successCard.scrollIntoView({ behavior: 'smooth' });
}

// Reset Form to Register another participant
function resetRegistrationForm() {
  form.reset();
  removeSelectedTrack();
  setParticipationType('solo');
  
  // Slide Ticket away and slide form back in
  document.getElementById('success-card-wrapper').classList.remove('show');
  document.getElementById('success-card-wrapper').style.display = 'none';
  document.getElementById('registration-card-wrapper').style.display = 'block';
  document.getElementById('registration-card-wrapper').scrollIntoView({ behavior: 'smooth' });
}

// Check if registrations are closed (after 5 August 2026 11:59:59 PM IST)
(function checkDeadline() {
  const DEADLINE = new Date('2026-08-06T00:00:00+05:30');
  if (new Date() >= DEADLINE) {
    const cardWrapper = document.getElementById('registration-card-wrapper');
    if (cardWrapper) {
      cardWrapper.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div class="success-icon-badge" style="background: rgba(255, 0, 127, 0.1); border-color: var(--neon-magenta); color: var(--neon-magenta); margin-bottom: 25px; display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; border-radius: 50%; border: 2px solid;">
            <i class="fa-solid fa-hourglass-end" style="font-size: 1.5rem;"></i>
          </div>
          <h2 style="margin-bottom: 15px; background: linear-gradient(45deg, var(--neon-magenta), var(--neon-cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Registrations Closed!</h2>
          <p style="font-size: 1.15rem; color: #fff; margin-bottom: 25px; line-height: 1.6;">
            Registrations for the Battle of Singing 2026 ended on <strong>5 August 2026</strong>.
          </p>
          <a href="index.html" class="btn-primary" style="display: inline-block; width: 100%; max-width: 300px; text-decoration: none; text-align: center; padding: 12px 0; border-radius: 30px; font-weight: 600;">Back to Home</a>
        </div>
      `;
    }
  }
})();
