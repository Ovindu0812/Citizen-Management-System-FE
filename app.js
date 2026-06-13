// Local storage keys
const SESSION_KEY = 'cms_active_session';
const COMPLAINT_DB_KEY = 'cms_complaints';

const provinceToDistricts = {
  "Central": ["Kandy", "Matale", "Nuwara Eliya"],
  "Eastern": ["Batticaloa", "Ampara", "Trincomalee"],
  "North Central": ["Anuradhapura", "Polonnaruwa"],
  "Northern": ["Jaffna", "Kilinochchi", "Mannar", "Vavuniya", "Mullaitivu"],
  "North Western": ["Kurunegala", "Puttalam"],
  "Sabaragamuwa": ["Ratnapura", "Kegalle"],
  "Southern": ["Galle", "Matara", "Hambantota"],
  "Uva": ["Badulla", "Moneragala"],
  "Western": ["Colombo", "Gampaha", "Kalutara"]
};

// Current session data
let activeUser = null;
let complaints = [];
let activeStatusFilter = 'all';
let selectedFileMock = null;

// Mock database seeds (used if complaints database is empty)
const SEED_COMPLAINTS = [
  {
    id: "CMP-0182",
    title: "Damaged bypass road causing traffic bottlenecks",
    category: "Roads & Transport",
    urgency: "High",
    location: "Sector 4 Outer Ring Road, near Metro Exit B",
    description: "Several massive craters have formed along the outer lane of the Ring Road. Heavy container trucks are forced to brake suddenly and swerve, causing dangerous bottlenecks during peak morning rush hours.",
    date: "2026-06-08T09:12:00.000Z",
    status: "resolved",
    attachment: { name: "road_damage_photo.jpg", size: "1.2 MB", type: "image/jpeg" },
    timeline: {
      submitted: "2026-06-08T09:12:00.000Z",
      underReview: "2026-06-08T14:30:00.000Z",
      inProgress: "2026-06-09T08:15:00.000Z",
      resolved: "2026-06-11T16:40:00.000Z"
    },
    adminComment: "Road construction division has filled the craters and resurfaced 150 meters of the roadway with durable hot-mix asphalt. Normal flow of traffic restored."
  },
  {
    id: "CMP-0205",
    title: "Broken streetlamp causing complete darkness",
    category: "Public Safety",
    urgency: "Medium",
    location: "Oakwood Drive, behind Central Park School",
    description: "Two streetlights near the rear school gate have been completely burnt out for over ten days. Since this area has thick foliage, it becomes pitch black after 6 PM, which is a major safety concern for kids returning from after-school sports.",
    date: "2026-06-10T15:22:00.000Z",
    status: "in progress",
    attachment: null,
    timeline: {
      submitted: "2026-06-10T15:22:00.000Z",
      underReview: "2026-06-11T10:05:00.000Z",
      inProgress: "2026-06-12T09:30:00.000Z",
      resolved: null
    },
    adminComment: "Work order issued to municipal electricity grids division. Maintenance truck scheduled for bulb replacement and wire harness inspect."
  },
  {
    id: "CMP-0211",
    title: "Uncollected commercial waste piled on sidewalk",
    category: "Sanitation & Waste",
    urgency: "Medium",
    location: "Broad Street Market, Alleyway 3",
    description: "Commercial food waste bags have been dumped on the public sidewalk by local market stalls. It has been sitting in the sun for 48 hours, creating terrible odors and attracting rodent infestations.",
    date: "2026-06-12T06:14:00.000Z",
    status: "pending",
    attachment: null,
    timeline: {
      submitted: "2026-06-12T06:14:00.000Z",
      underReview: null,
      inProgress: null,
      resolved: null
    },
    adminComment: null
  }
];

// Verify authorization
function checkAuth() {
  const sessionData = localStorage.getItem(SESSION_KEY);
  if (!sessionData) {
    window.location.href = 'http://localhost:8000/login.html';
    return;
  }
  activeUser = JSON.parse(sessionData);
  setupUserInfo();
}

// Populate user identity on interface
function setupUserInfo() {
  // Update name
  document.getElementById('profile-name').textContent = activeUser.name;
  document.getElementById('welcome-text').textContent = `Welcome, ${activeUser.name}`;
  
  // Update details (Show email or NIC)
  document.getElementById('profile-id').textContent = activeUser.email;
  
  // Set avatar initials
  const initials = activeUser.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  document.getElementById('avatar-initials').textContent = initials;

  // Populate profile form if it exists
  const profName = document.getElementById('prof-name');
  if (profName) {
    document.getElementById('prof-name').value = activeUser.name || '';
    document.getElementById('prof-nic').value = activeUser.nic || '';
    document.getElementById('prof-email').value = activeUser.email || '';
    document.getElementById('prof-province').value = activeUser.province || '';
    document.getElementById('prof-district').value = activeUser.district || '';
    document.getElementById('prof-birthday').value = activeUser.birthday || '';
    document.getElementById('prof-phone').value = activeUser.phone || '';
    
    // Format created_at date nicely
    if (activeUser.created_at) {
      const dateObj = new Date(activeUser.created_at);
      document.getElementById('prof-created').value = dateObj.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      document.getElementById('prof-created').value = 'Legacy User';
    }
    
    // Attach event listener for province cascade
    const profProvince = document.getElementById('prof-province');
    const profDistrict = document.getElementById('prof-district');
    
    // Remove existing event listener if any to prevent duplicates
    const newProv = profProvince.cloneNode(true);
    profProvince.parentNode.replaceChild(newProv, profProvince);
    
    newProv.addEventListener('change', function() {
      const selected = this.value;
      const districts = provinceToDistricts[selected] || [];
      
      // Keep only the first option or wipe out
      profDistrict.innerHTML = '';
      districts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        profDistrict.appendChild(opt);
      });
      // Optionally trigger change if empty, but we can just let it sit.
    });
  }
}

// Profile update logic
function updateProfile(event) {
  event.preventDefault();
  
  const name = document.getElementById('prof-name').value.trim();
  const province = document.getElementById('prof-province').value;
  const district = document.getElementById('prof-district').value;
  const birthday = document.getElementById('prof-birthday').value;
  const phone = document.getElementById('prof-phone').value.trim();

  const citizens = JSON.parse(localStorage.getItem('cms_citizens') || '[]');
  const userIndex = citizens.findIndex(c => c.email === activeUser.email || c.nic === activeUser.nic);
  
  if (userIndex !== -1) {
    citizens[userIndex].name = name;
    citizens[userIndex].province = province;
    citizens[userIndex].district = district;
    citizens[userIndex].birthday = birthday;
    citizens[userIndex].phone = phone;
    
    localStorage.setItem('cms_citizens', JSON.stringify(citizens));
    
    // Update active session
    activeUser.name = name;
    activeUser.phone = phone;
    localStorage.setItem(SESSION_KEY, JSON.stringify(activeUser));
    
    setupUserInfo();
    showToast('Profile updated successfully', 'success');
  }
}

// Logout session
function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = 'http://localhost:8000/login.html';
}

// Initialize Complaints Database
async function loadComplaints() {
  try {
    const response = await fetch(`http://localhost:8080/api/complaints/user?userId=${activeUser.id}`);
    const data = await response.json();
    
    if (response.ok) {
      complaints = data.complaints.map(c => ({
        id: c.id,
        title: c.title,
        category: c.category,
        urgency: c.urgency,
        location: c.location,
        description: c.description,
        date: c.created_at,
        status: c.status,
        timeline: {
          submitted: c.created_at,
          underReview: c.status === 'in progress' ? c.created_at : null,
          inProgress: c.status === 'in progress' ? c.created_at : null,
          resolved: c.status === 'resolved' ? c.resolved_at : null
        },
        adminComment: c.admin_remarks,
        citizenId: activeUser.email,
        citizenName: activeUser.name
      }));
      sortComplaints();
    } else {
      complaints = [];
      showToast('Error loading complaints', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Network error loading complaints', 'error');
    complaints = [];
  }
  
  updateDashboardStats();
  renderComplaintsList();
}

function sortComplaints() {
  complaints.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Recalculate and render stats widgets
function updateDashboardStats() {
  const total = complaints.length;
  const pending = complaints.filter(c => c.status === 'pending').length;
  const progress = complaints.filter(c => c.status === 'in progress').length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;

  document.getElementById('stats-total').textContent = total;
  document.getElementById('stats-pending').textContent = pending;
  document.getElementById('stats-progress').textContent = progress;
  document.getElementById('stats-resolved').textContent = resolved;
}

// Helper to format date strings nicely
function formatDate(dateString) {
  if (!dateString) return '-';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

// Render the complaints listing cards
function renderComplaintsList(filteredComplaints = null) {
  const listContainer = document.getElementById('complaints-list-container');
  const targetList = filteredComplaints || complaints;

  if (targetList.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25m-2.25-2.25l-2.25 2.25m2.25-2.25l2.25-2.25M3.75 7.5L5.625 3.75A1.875 1.875 0 017.375 2.5h9.25c.783 0 1.482.453 1.785 1.176L20.25 7.5"></path>
        </svg>
        <p>No complaints matched your active filters.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = '';
  
  targetList.forEach((c, index) => {
    const card = document.createElement('div');
    card.className = 'complaint-card glass-panel animate-fade-in';
    card.style.animationDelay = `${index * 0.05}s`;
    card.setAttribute('onclick', `openDrawer('${c.id}')`);

    // Pick badge class based on status
    let statusClass = 'badge-pending';
    if (c.status === 'in progress') statusClass = 'badge-progress';
    else if (c.status === 'resolved') statusClass = 'badge-resolved';

    // Pick priority class
    let priorityClass = 'badge-priority-low';
    if (c.urgency === 'High') priorityClass = 'badge-priority-high';
    else if (c.urgency === 'Medium') priorityClass = 'badge-priority-medium';

    card.innerHTML = `
      <div class="complaint-card-header">
        <span class="badge ${statusClass}">${c.status}</span>
        <span class="badge ${priorityClass}">${c.urgency}</span>
      </div>
      <h4 class="complaint-card-title">${c.title}</h4>
      <p class="complaint-card-desc">${c.description}</p>
      <div class="complaint-card-footer">
        <span style="font-family: monospace; font-weight: 600;">${c.id}</span>
        <div class="complaint-meta">
          <span>${formatDate(c.date)}</span>
        </div>
      </div>
    `;
    listContainer.appendChild(card);
  });
}

// Scroll to section helper
function scrollToElement(id) {
  const element = document.getElementById(id);
  if (element) {
    // Hide all sections first
    const profileSec = document.getElementById('profile-section');
    const historySec = document.getElementById('complaints-history-section');
    if (profileSec) profileSec.style.display = 'none';
    if (historySec) historySec.style.display = 'none';

    // Show target section
    element.style.display = 'block';

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Highlight sidebar items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    if (id === 'profile-section') {
      const navItem = document.getElementById('nav-profile');
      if(navItem) navItem.classList.add('active');
    } else if (id === 'complaints-history-section') {
      const navItem = document.getElementById('nav-history');
      if(navItem) navItem.classList.add('active');
    }
  }
}

// Side-bar section link highlights
function switchSection(section) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const navItem = document.getElementById('nav-' + section);
  if(navItem) navItem.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const profileSec = document.getElementById('profile-section');
  const historySec = document.getElementById('complaints-history-section');
  const statsGrid = document.querySelector('.stats-grid');
  
  if (section === 'dashboard' || section === 'history') {
    if (historySec) historySec.style.display = 'block';
    if (profileSec) profileSec.style.display = 'none';
    if (statsGrid && section === 'dashboard') statsGrid.style.display = 'grid';
  } else if (section === 'profile') {
    if (historySec) historySec.style.display = 'none';
    if (profileSec) profileSec.style.display = 'block';
    if (statsGrid) statsGrid.style.display = 'none';
  }
}

// Toast Notifications System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg fill="none" stroke="var(--success)" stroke-width="2" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg fill="none" stroke="var(--danger)" stroke-width="2" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  } else {
    iconSvg = `<svg fill="none" stroke="var(--info)" stroke-width="2" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// File Input triggers
function triggerFileSelect() {
  document.getElementById('file-input').click();
}

// Handle file uploaded from browser
function handleFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  selectedFileMock = {
    name: file.name,
    size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
    type: file.type
  };

  renderFilePreview();
}

// Draw temporary preview of files selected
function renderFilePreview() {
  const container = document.getElementById('file-preview-container');
  container.innerHTML = '';
  container.style.display = 'flex';

  const preview = document.createElement('div');
  preview.className = 'file-preview';
  
  // Draw file layout details
  preview.innerHTML = `
    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
    </svg>
    <div class="file-preview-name">${selectedFileMock.name} (${selectedFileMock.size})</div>
    <button type="button" class="btn-icon" onclick="clearFileSelection()" style="padding: 0.25rem;">
      <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
  `;
  container.appendChild(preview);
}

// Deselect files
function clearFileSelection() {
  selectedFileMock = null;
  const fileInput = document.getElementById('file-input');
  if (fileInput) fileInput.value = '';
  const previewContainer = document.getElementById('file-preview-container');
  if (previewContainer) {
    previewContainer.innerHTML = '';
    previewContainer.style.display = 'none';
  }
}

// Drag & drop zones configuration
const dropZone = document.getElementById('file-drop-zone');

if (dropZone) {
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--primary)';
      dropZone.style.background = 'rgba(99, 102, 241, 0.08)';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--border-color)';
      dropZone.style.background = 'var(--bg-input)';
    }, false);
  });

  dropZone.addEventListener('drop', e => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
      selectedFileMock = {
        name: files[0].name,
        size: (files[0].size / (1024 * 1024)).toFixed(1) + ' MB',
        type: files[0].type
      };
      renderFilePreview();
    }
  });
}

// Filter triggers
function filterByStatus(status) {
  activeStatusFilter = status;
  
  // Highlight active filter chip
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.remove('active');
  });
  
  const targetId = `filter-${status === 'in progress' ? 'progress' : status}`;
  const targetChip = document.getElementById(targetId);
  if (targetChip) targetChip.classList.add('active');

  applyFilters();
}

// Consolidated Search and Status Filter logic
function applyFilters() {
  const query = document.getElementById('complaint-search').value.toLowerCase().trim();
  
  const filtered = complaints.filter(c => {
    // Status match
    const statusMatch = (activeStatusFilter === 'all' || c.status === activeStatusFilter);
    
    // Search query match
    const queryMatch = !query || 
      c.title.toLowerCase().includes(query) ||
      c.location.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query) ||
      c.category.toLowerCase().includes(query);

    return statusMatch && queryMatch;
  });

  renderComplaintsList(filtered);
}

// Toggle Complaint Form
function toggleNewComplaintForm() {
  const formContainer = document.getElementById('new-complaint-form-container');
  if (formContainer.style.display === 'none') {
    formContainer.style.display = 'block';
  } else {
    formContainer.style.display = 'none';
  }
}

// Complaint Submission Logic
function submitComplaint(event) {
  event.preventDefault();

  const title = document.getElementById('complaint-title').value.trim();
  const category = document.getElementById('complaint-category').value;
  const urgency = document.getElementById('complaint-urgency').value;
  const location = document.getElementById('complaint-location').value.trim();
  const description = document.getElementById('complaint-description').value.trim();

  if (!title || !category || !urgency || !location || !description) {
    showToast('Please fill out all required fields', 'error');
    return;
  }

  const payload = {
    user_id: activeUser.id,
    title,
    category,
    urgency,
    location,
    description
  };

  fetch('http://localhost:8080/api/complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if (data.id) {
      showToast('Complaint submitted successfully!', 'success');
      document.getElementById('complaint-form').reset();
      clearFileSelection();
      toggleNewComplaintForm();
      loadComplaints();
    } else {
      showToast(data.message || 'Error submitting complaint', 'error');
    }
  })
  .catch(err => {
    console.error("Submit Complaint Error:", err);
    showToast('Network error submitting complaint', 'error');
  });
}

// Active Side Drawer details page loading
function openDrawer(complaintId) {
  const c = complaints.find(item => item.id === complaintId);
  if (!c) return;

  document.getElementById('drawer-complaint-id').textContent = c.id;
  document.getElementById('drawer-complaint-title').textContent = c.title;
  document.getElementById('drawer-category').textContent = c.category;
  document.getElementById('drawer-date').textContent = formatDate(c.date);
  document.getElementById('drawer-location').textContent = c.location;
  document.getElementById('drawer-desc').textContent = c.description;

  // Build priority badge
  let urgencyClass = 'badge-priority-low';
  if (c.urgency === 'High') urgencyClass = 'badge-priority-high';
  else if (c.urgency === 'Medium') urgencyClass = 'badge-priority-medium';
  
  document.getElementById('drawer-urgency').innerHTML = `<span class="badge ${urgencyClass}">${c.urgency}</span>`;

  // Process attachments display
  const attachSection = document.getElementById('drawer-attachment-section');
  const attachBox = document.getElementById('drawer-attachment-box');
  if (c.attachment) {
    attachSection.style.display = 'flex';
    attachBox.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
        </svg>
        <span>${c.attachment.name} (${c.attachment.size})</span>
      </div>
    `;
  } else {
    attachSection.style.display = 'none';
  }

  // Update tracking steps timeline
  updateTimelineUI(c);

  // Update admin resolution comments block
  const commentSection = document.getElementById('admin-comment-section');
  const commentBox = document.getElementById('admin-comment-box');
  if (c.status === 'resolved' && c.adminComment) {
    commentSection.style.display = 'flex';
    commentBox.textContent = c.adminComment;
  } else if (c.status === 'in progress' && c.adminComment) {
    commentSection.style.display = 'flex';
    commentBox.textContent = `Updates: ${c.adminComment}`;
    commentBox.style.borderLeftColor = 'var(--warning)';
  } else {
    commentSection.style.display = 'none';
  }

  // Slide drawer into view
  document.getElementById('drawer-overlay').classList.add('active');
  document.getElementById('complaint-drawer').classList.add('active');
}

function closeDrawer() {
  document.getElementById('drawer-overlay').classList.remove('active');
  document.getElementById('complaint-drawer').classList.remove('active');
}

// Redraw tracking steps visual classes and dates
function updateTimelineUI(complaint) {
  const steps = [
    { key: 'submitted', id: 'step-submitted', dateId: 'timeline-date-submitted' },
    { key: 'underReview', id: 'step-under-review', dateId: 'timeline-date-review' },
    { key: 'inProgress', id: 'step-in-progress', dateId: 'timeline-date-progress' },
    { key: 'resolved', id: 'step-resolved', dateId: 'timeline-date-resolved' }
  ];

  let currentActiveReached = false;

  // Track status values to highlight active step properly
  const statusStepMap = {
    'pending': 'underReview', // Under review is the active step we are working towards if pending
    'in progress': 'inProgress',
    'resolved': 'resolved'
  };

  const targetActiveKey = statusStepMap[complaint.status];

  steps.forEach(step => {
    const stepEl = document.getElementById(step.id);
    const dateEl = document.getElementById(step.dateId);
    const dateValue = complaint.timeline[step.key];

    // Populate date info
    dateEl.textContent = dateValue ? formatDate(dateValue) : '-';

    // Clear previous dynamic classes
    stepEl.classList.remove('completed', 'active');

    // If date is filled, it's completed
    if (dateValue) {
      stepEl.classList.add('completed');
    }
    
    // If it maps to the active goal status, color active
    if (step.key === targetActiveKey && !dateValue) {
      stepEl.classList.add('active');
    }
  });

  // Special case: if it is resolved, the resolved step is completed, so it won't be marked active but completed.
  if (complaint.status === 'resolved') {
    document.getElementById('step-resolved').classList.add('completed');
  } else if (complaint.status === 'pending' && !complaint.timeline.underReview) {
    // If filed but not yet reviewed, filed step is completed, underReview is the active target.
    document.getElementById('step-under-review').classList.add('active');
  }
}

// Background simulation representing admin action loops
function simulateAdminResponse(complaintId) {
  // 1. Move to "Under Review" after 8 seconds
  setTimeout(() => {
    const stored = JSON.parse(localStorage.getItem(COMPLAINT_DB_KEY) || '[]');
    const index = stored.findIndex(c => c.id === complaintId);
    
    if (index !== -1 && !stored[index].timeline.underReview) {
      stored[index].timeline.underReview = new Date().toISOString();
      localStorage.setItem(COMPLAINT_DB_KEY, JSON.stringify(stored));
      
      // Sync local state if drawer is open or list needs updating
      syncSimulationState(stored);
      showToast(`Complaint ${complaintId} is now under review.`, 'info');
    }
  }, 8000);

  // 2. Move to "In Progress" after 20 seconds
  setTimeout(() => {
    const stored = JSON.parse(localStorage.getItem(COMPLAINT_DB_KEY) || '[]');
    const index = stored.findIndex(c => c.id === complaintId);
    
    if (index !== -1 && stored[index].status === 'pending') {
      stored[index].status = 'in progress';
      stored[index].timeline.inProgress = new Date().toISOString();
      stored[index].adminComment = "Assigned to regional dispatch crew. Dispatch crew scheduled to arrive at location shortly.";
      localStorage.setItem(COMPLAINT_DB_KEY, JSON.stringify(stored));
      
      syncSimulationState(stored);
      showToast(`Administrative action initiated for complaint ${complaintId}.`, 'info');
    }
  }, 20000);

  // 3. Move to "Resolved" after 40 seconds
  setTimeout(() => {
    const stored = JSON.parse(localStorage.getItem(COMPLAINT_DB_KEY) || '[]');
    const index = stored.findIndex(c => c.id === complaintId);
    
    if (index !== -1 && stored[index].status === 'in progress') {
      stored[index].status = 'resolved';
      stored[index].timeline.resolved = new Date().toISOString();
      stored[index].adminComment = "Maintenance team has completed the inspection and finished repair work. The issue is marked as successfully resolved.";
      localStorage.setItem(COMPLAINT_DB_KEY, JSON.stringify(stored));
      
      syncSimulationState(stored);
      showToast(`Complaint ${complaintId} has been resolved.`, 'success');
    }
  }, 40000);
}

// Synchronize interface elements after background simulation changes
function syncSimulationState(updatedData) {
  complaints = updatedData;
  sortComplaints();
  updateDashboardStats();
  applyFilters();

  // If the drawer is currently open for the modified complaint, update the drawer details live!
  const drawer = document.getElementById('complaint-drawer');
  const openId = document.getElementById('drawer-complaint-id').textContent;
  
  if (drawer.classList.contains('active') && openId) {
    openDrawer(openId);
  }
}

// Start app sequences
checkAuth();
loadComplaints();
