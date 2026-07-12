// Global State for Dashboard Control
let registrationsList = [];
let filteredList = [];
let activeAudio = null;
let activeRegId = null; // tracking which registration is currently selected for audio
let isPlaying = false;
let progressInterval = null;

// DOM Elements
const tbody = document.getElementById('registrations-list-tbody');
const countBadge = document.getElementById('reg-count-number');
const emptyState = document.getElementById('empty-state-placeholder');
const searchInput = document.getElementById('admin-search-input');
const categoryFilter = document.getElementById('admin-category-filter');
const courseFilter = document.getElementById('admin-course-filter');

// Global player panel items
const globalPlayer = document.getElementById('global-audio-panel');
const globalTrackTitle = document.getElementById('global-track-title');
const globalPlayBtn = document.getElementById('global-play-btn');
const globalTimeCurrent = document.getElementById('global-time-current');
const globalTimeDuration = document.getElementById('global-time-duration');
const globalProgressFill = document.getElementById('global-progress-fill');
const globalProgressWrapper = document.getElementById('global-progress-wrapper');

// Page Load initialization
document.addEventListener('DOMContentLoaded', () => {
  // Extract and store admin key from URL query if present
  const urlParams = new URLSearchParams(window.location.search);
  const urlKey = urlParams.get('key');
  if (urlKey) {
    sessionStorage.setItem('admin_password', urlKey);
  }
  fetchRegistrations();
});

// Fetch registrations from API
async function fetchRegistrations() {
  const adminToken = sessionStorage.getItem('admin_password') || '';
  try {
    const response = await fetch('/api/registrations', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const result = await response.json();
    
    if (response.ok && result.success) {
      registrationsList = result.data;
      filterRegistrations(); // This will apply initial filtering (none) and render
    } else {
      console.error('Failed to load registrations:', result.message);
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--neon-magenta)">Failed to load registrations from server (Unauthorized or Error).</td></tr>`;
    }
  } catch (err) {
    console.error('Fetch dashboard error:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--neon-magenta)">Server is offline or unreachable.</td></tr>`;
  }
}

// Render dynamic registrations table rows
function renderTable(list) {
  tbody.innerHTML = '';
  
  if (list.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  list.forEach(reg => {
    const tr = document.createElement('tr');
    
    // Performer Name logic (handling duet partner string)
    let performerHtml = `<strong>${reg.name}</strong>`;
    if (reg.participationType === 'duet') {
      performerHtml += `<span class="partner-info-subtext"><i class="fa-solid fa-user-group"></i> Partner: ${reg.partnerName}</span>`;
    }
    
    // Category tag
    const categoryTag = reg.participationType === 'duet' 
      ? `<span class="badge badge-duet">Duet</span>` 
      : `<span class="badge badge-solo">Solo</span>`;
      
    // Audio button check state (is this row's track currently playing?)
    const isThisPlaying = (activeRegId === reg.id && isPlaying);
    const audioBtnIcon = isThisPlaying ? 'fa-pause' : 'fa-play';
    const audioBtnClass = isThisPlaying ? 'admin-player-btn playing' : 'admin-player-btn';
    
    tr.innerHTML = `
      <td style="font-family: monospace; font-weight: bold; color: var(--neon-cyan);">${reg.id}</td>
      <td>${performerHtml}</td>
      <td>${reg.rollNo}${reg.participationType === 'duet' ? `<span class="partner-info-subtext">${reg.partnerRollNo}</span>` : ''}</td>
      <td>${reg.course} (${reg.branch})${reg.participationType === 'duet' ? `<span class="partner-info-subtext">${reg.partnerCourse} - ${reg.partnerBranch}</span>` : ''}</td>
      <td>${categoryTag}</td>
      <td style="text-align: center;">
        <button id="row-play-btn-${reg.id}" class="${audioBtnClass}" onclick="playAuditionTrack('${reg.id}', '${reg.trackPath}', '${reg.name}', '${reg.trackOriginalName}')" title="Play Audition">
          <i class="fa-solid ${audioBtnIcon}"></i>
        </button>
      </td>
      <td style="text-align: center;">
        <button class="btn-delete-row" onclick="deleteRegistration('${reg.id}')" title="Delete Registration">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

// Client filtering logic
function filterRegistrations() {
  const query = searchInput.value.toLowerCase().trim();
  const category = categoryFilter.value;
  const course = courseFilter.value;
  
  filteredList = registrationsList.filter(reg => {
    // Search query matches Lead name, Partner name, Roll, Partner Roll, or Registration ID
    const matchesSearch = 
      reg.name.toLowerCase().includes(query) ||
      reg.id.toLowerCase().includes(query) ||
      reg.rollNo.toLowerCase().includes(query) ||
      (reg.partnerName && reg.partnerName.toLowerCase().includes(query)) ||
      (reg.partnerRollNo && reg.partnerRollNo.toLowerCase().includes(query));
      
    // Category match
    const matchesCategory = category === 'all' || reg.participationType === category;
    
    // Course match
    const matchesCourse = course === 'all' || reg.course === course || (reg.partnerCourse && reg.partnerCourse === course);
    
    return matchesSearch && matchesCategory && matchesCourse;
  });
  
  // Update badge
  countBadge.innerText = filteredList.length;
  renderTable(filteredList);
}

// Global Audio Panel triggers
function playAuditionTrack(id, path, performerName, originalName) {
  // If clicking currently active track, toggle play/pause state
  if (activeRegId === id) {
    toggleGlobalAudio();
    return;
  }
  
  // Stop existing playback if any
  if (activeAudio) {
    activeAudio.pause();
    clearInterval(progressInterval);
    // Reset former playing row button icon
    const oldBtn = document.getElementById(`row-play-btn-${activeRegId}`);
    if (oldBtn) {
      oldBtn.classList.remove('playing');
      oldBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
  }
  
  activeRegId = id;
  activeAudio = new Audio(path);
  isPlaying = true;
  
  // Set global player display
  globalTrackTitle.innerHTML = `<strong>${performerName}</strong> (${originalName})`;
  globalPlayer.classList.add('show');
  globalPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  
  // Toggle new row play button icon to pause
  const currentBtn = document.getElementById(`row-play-btn-${id}`);
  if (currentBtn) {
    currentBtn.classList.add('playing');
    currentBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  }
  
  activeAudio.play();
  progressInterval = setInterval(updateGlobalProgress, 250);
  
  activeAudio.addEventListener('loadedmetadata', () => {
    globalTimeDuration.innerText = formatTime(activeAudio.duration);
  });
  
  activeAudio.addEventListener('ended', () => {
    closeGlobalAudio();
  });
}

function toggleGlobalAudio() {
  if (!activeAudio) return;
  
  const rowBtn = document.getElementById(`row-play-btn-${activeRegId}`);
  
  if (isPlaying) {
    activeAudio.pause();
    globalPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    if (rowBtn) {
      rowBtn.classList.remove('playing');
      rowBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
    clearInterval(progressInterval);
  } else {
    activeAudio.play();
    globalPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    if (rowBtn) {
      rowBtn.classList.add('playing');
      rowBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }
    progressInterval = setInterval(updateGlobalProgress, 250);
  }
  isPlaying = !isPlaying;
}

function updateGlobalProgress() {
  if (!activeAudio) return;
  const current = activeAudio.currentTime;
  const duration = activeAudio.duration || 0;
  globalTimeCurrent.innerText = formatTime(current);
  
  if (duration > 0) {
    const percent = (current / duration) * 100;
    globalProgressFill.style.width = percent + '%';
  }
}

function seekGlobalAudio(e) {
  if (!activeAudio) return;
  const rect = globalProgressWrapper.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  const percent = clickX / width;
  
  activeAudio.currentTime = percent * activeAudio.duration;
  updateGlobalProgress();
}

function closeGlobalAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  clearInterval(progressInterval);
  
  const rowBtn = document.getElementById(`row-play-btn-${activeRegId}`);
  if (rowBtn) {
    rowBtn.classList.remove('playing');
    rowBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  }
  
  isPlaying = false;
  activeRegId = null;
  globalPlayer.classList.remove('show');
  globalProgressFill.style.width = '0%';
  globalTimeCurrent.innerText = '0:00';
  globalTimeDuration.innerText = '0:00';
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Delete registration API trigger
async function deleteRegistration(id) {
  const confirmDelete = confirm(`Are you sure you want to delete the registration ticket: ${id}? This will permanently remove their records and audio audition file.`);
  
  if (!confirmDelete) return;
  
  const adminToken = sessionStorage.getItem('admin_password') || '';
  try {
    const response = await fetch(`/api/registrations/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const result = await response.json();
    
    if (response.ok && result.success) {
      // If deleted track was playing, stop it
      if (activeRegId === id) {
        closeGlobalAudio();
      }
      
      // Update data and re-filter list
      registrationsList = registrationsList.filter(reg => reg.id !== id);
      filterRegistrations();
    } else {
      alert(`Error: ${result.message}`);
    }
  } catch (err) {
    console.error('Delete registration error:', err);
    alert('Failed to connect to the server to delete registration.');
  }
}
