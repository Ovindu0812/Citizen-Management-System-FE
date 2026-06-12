// Local storage keys
const SESSION_KEY = 'cms_active_session';
const COMPLAINT_DB_KEY = 'cms_complaints';

// Current session data
let activeUser = null;
let complaints = [];
let activeStatusFilter = 'all';
let currentEditingId = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  loadComplaints();
  loadUsers();
});

// Load Users
function loadUsers() {
  const citizens = JSON.parse(localStorage.getItem('cms_citizens') || '[]');
  const tableBody = document.getElementById('users-table-body');
  if (!tableBody) return;
  
  if (citizens.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" style="padding: 1rem; text-align: center; color: var(--text-muted);">No citizens registered yet.</td></tr>`;
    return;
  }
  
  tableBody.innerHTML = '';
  citizens.forEach(u => {
    tableBody.innerHTML += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 1rem;">${u.name}</td>
        <td style="padding: 1rem;">${u.nic}</td>
        <td style="padding: 1rem;">${u.email}</td>
        <td style="padding: 1rem;">${u.phone || '-'}</td>
        <td style="padding: 1rem;">${u.district || '-'}, ${u.province || '-'}</td>
      </tr>
    `;
  });
}

// Verify authorization
function checkAdminAuth() {
  const sessionData = localStorage.getItem(SESSION_KEY);
  if (!sessionData) {
    window.location.href = 'login.html';
    return;
  }
  activeUser = JSON.parse(sessionData);
  if (activeUser.role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }
  
  document.getElementById('profile-name').textContent = activeUser.name;
  document.getElementById('welcome-text').textContent = `Welcome, ${activeUser.name}`;
  document.getElementById('profile-id').textContent = activeUser.email;
}

// Logout session
function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = 'login.html';
}

// Fetch DB
function loadComplaints() {
  const saved = localStorage.getItem(COMPLAINT_DB_KEY);
  if (saved) {
    complaints = JSON.parse(saved);
    complaints.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else {
    complaints = [];
  }
  updateStats();
  renderComplaints();
}

// Analytics Updates
function updateStats() {
  const total = complaints.length;
  const pending = complaints.filter(c => c.status === 'pending').length;
  const progress = complaints.filter(c => c.status === 'in progress').length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;

  document.getElementById('stats-total').textContent = total;
  document.getElementById('stats-pending').textContent = pending;
  document.getElementById('stats-progress').textContent = progress;
  document.getElementById('stats-resolved').textContent = resolved;
}

// Filter Actions
function filterByStatus(status) {
  activeStatusFilter = status;
  
  document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`filter-${status.replace(' ', '-')}`).classList.add('active');
  
  applyFilters();
}

function applyFilters() {
  const searchTerm = document.getElementById('complaint-search').value.toLowerCase();
  
  const filtered = complaints.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm) || 
                          c.id.toLowerCase().includes(searchTerm) ||
                          c.location.toLowerCase().includes(searchTerm);
    
    const matchesStatus = activeStatusFilter === 'all' || c.status === activeStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  renderComplaints(filtered);
}

// Render dynamic HTML
function renderComplaints(filteredComplaints = null) {
  const listContainer = document.getElementById('complaints-list-container');
  const targetList = filteredComplaints || complaints;

  if (targetList.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25m-2.25-2.25l-2.25 2.25M3.75 7.5L5.625 3.75A1.875 1.875 0 017.375 2.5h9.25c.783 0 1.482.453 1.785 1.176L20.25 7.5"></path>
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
      <div class="complaint-card-footer" style="flex-direction: column; align-items: stretch; gap: 1rem;">
        <div style="display: flex; justify-content: space-between;">
          <span style="font-family: monospace; font-weight: 600;">${c.id}</span>
          <div class="complaint-meta">
            <span>${formatDate(c.date)}</span>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; justify-content: space-between; margin-top: 0.5rem;">
          <button class="btn ${c.status === 'pending' ? 'btn-primary' : 'btn-outline'}" style="flex: 1; padding: 0.5rem; font-size: 0.8rem; ${c.status === 'pending' ? 'cursor: default;' : ''}" onclick="event.stopPropagation(); updateStatusInline('${c.id}', 'pending')">Pending</button>
          <button class="btn ${c.status === 'in progress' ? 'btn-primary' : 'btn-outline'}" style="flex: 1; padding: 0.5rem; font-size: 0.8rem; ${c.status === 'in progress' ? 'cursor: default;' : ''}" onclick="event.stopPropagation(); updateStatusInline('${c.id}', 'in progress')">In Progress</button>
          <button class="btn ${c.status === 'resolved' ? 'btn-primary' : 'btn-outline'}" style="flex: 1; padding: 0.5rem; font-size: 0.8rem; ${c.status === 'resolved' ? 'cursor: default;' : ''}" onclick="event.stopPropagation(); updateStatusInline('${c.id}', 'resolved')">Resolved</button>
        </div>
      </div>
    `;
    listContainer.appendChild(card);
  });
}

// Format ISO date
function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return d.toLocaleDateString(undefined, options);
}

// Drawer functionality
function openDrawer(id) {
  const c = complaints.find(item => item.id === id);
  if (!c) return;

  currentEditingId = id;

  document.getElementById('drawer-complaint-id').textContent = c.id;
  document.getElementById('drawer-complaint-title').textContent = c.title;
  document.getElementById('drawer-category').textContent = c.category;
  
  let priorityClass = 'badge-priority-low';
  if (c.urgency === 'High') priorityClass = 'badge-priority-high';
  else if (c.urgency === 'Medium') priorityClass = 'badge-priority-medium';
  
  document.getElementById('drawer-urgency').innerHTML = `<span class="badge ${priorityClass}">${c.urgency}</span>`;
  document.getElementById('drawer-date').textContent = formatDate(c.date);
  document.getElementById('drawer-location').textContent = c.location;
  document.getElementById('drawer-desc').textContent = c.description;

  // Submitted by
  document.getElementById('drawer-submitted-by').innerHTML = c.citizenName 
    ? `<strong>${c.citizenName}</strong><br><span style="color: var(--text-muted); font-size: 0.85em;">${c.citizenId || ''}</span>`
    : '<span style="color: var(--text-muted);">Anonymous / Legacy</span>';

  // Attachment handling
  const attachSec = document.getElementById('drawer-attachment-section');
  const attachBox = document.getElementById('drawer-attachment-box');
  if (c.attachment) {
    attachSec.style.display = 'block';
    attachBox.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="24" height="24" style="color: var(--primary);">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm3.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z"></path>
        </svg>
        <div>
          <div style="font-weight: 500; font-size: 0.95rem;">${c.attachment.name}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${c.attachment.size} • ${c.attachment.type.split('/')[1] || 'File'}</div>
        </div>
      </div>
    `;
  } else {
    attachSec.style.display = 'none';
  }

  // Set current status and comment
  document.getElementById('admin-status-update').value = c.status;
  document.getElementById('admin-comment-update').value = c.adminComment || '';

  // Show drawer
  document.getElementById('drawer-overlay').classList.add('active');
  const drawer = document.getElementById('complaint-drawer');
  drawer.style.right = '0';
}

function closeDrawer() {
  document.getElementById('drawer-overlay').classList.remove('active');
  document.getElementById('complaint-drawer').style.right = '-600px';
  currentEditingId = null;
}

// Admin save functionality
function saveComplaintUpdates() {
  if (!currentEditingId) return;
  
  const cIndex = complaints.findIndex(item => item.id === currentEditingId);
  if (cIndex === -1) return;

  const newStatus = document.getElementById('admin-status-update').value;
  const newComment = document.getElementById('admin-comment-update').value.trim();

  // If status changes, update timeline
  const now = new Date().toISOString();
  if (complaints[cIndex].status !== newStatus) {
    if (newStatus === 'under review' && !complaints[cIndex].timeline.underReview) {
      complaints[cIndex].timeline.underReview = now;
    }
    if (newStatus === 'in progress' && !complaints[cIndex].timeline.inProgress) {
      complaints[cIndex].timeline.inProgress = now;
    }
    if (newStatus === 'resolved' && !complaints[cIndex].timeline.resolved) {
      complaints[cIndex].timeline.resolved = now;
    }
  }

  complaints[cIndex].status = newStatus;
  complaints[cIndex].adminComment = newComment;

  localStorage.setItem(COMPLAINT_DB_KEY, JSON.stringify(complaints));
  
  showToast('Complaint updated successfully', 'success');
  
  // Re-render
  updateStats();
  applyFilters();
  closeDrawer();
}

// Inline Status Update (from card buttons)
window.updateStatusInline = function(id, newStatus) {
  const cIndex = complaints.findIndex(item => item.id === id);
  if (cIndex === -1) return;

  const now = new Date().toISOString();
  if (complaints[cIndex].status !== newStatus) {
    if (newStatus === 'under review' && !complaints[cIndex].timeline.underReview) {
      complaints[cIndex].timeline.underReview = now;
    }
    if (newStatus === 'in progress' && !complaints[cIndex].timeline.inProgress) {
      complaints[cIndex].timeline.inProgress = now;
    }
    if (newStatus === 'resolved' && !complaints[cIndex].timeline.resolved) {
      complaints[cIndex].timeline.resolved = now;
    }
  }

  complaints[cIndex].status = newStatus;
  localStorage.setItem(COMPLAINT_DB_KEY, JSON.stringify(complaints));
  showToast('Status updated to ' + newStatus, 'success');
  
  updateStats();
  applyFilters(); // This will re-render the list and update button styles
};

// Generate Report
function generateReport() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format based on local time might be off slightly but close enough
  
  let newToday = 0;
  let resolvedToday = 0;
  let currentProgress = 0;
  let currentPending = 0;

  complaints.forEach(c => {
    const cDate = c.date.split('T')[0];
    if (cDate === today) newToday++;
    
    if (c.status === 'resolved') {
      if (c.timeline.resolved && c.timeline.resolved.split('T')[0] === today) {
        resolvedToday++;
      }
    }
    
    if (c.status === 'in progress') currentProgress++;
    if (c.status === 'pending') currentPending++;
  });

  document.getElementById('report-date').textContent = new Date().toLocaleDateString();
  document.getElementById('report-new').textContent = newToday;
  document.getElementById('report-resolved').textContent = resolvedToday;
  document.getElementById('report-progress').textContent = currentProgress;
  document.getElementById('report-pending').textContent = currentPending;

  document.getElementById('report-output').style.display = 'block';
  showToast('Report generated successfully', 'success');
}

// Side-bar section link highlights
function switchSection(section) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const navItem = document.getElementById('nav-' + section);
  if(navItem) navItem.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const historySec = document.getElementById('complaints-history-section');
  const reportsSec = document.getElementById('reports-section');
  const usersSec = document.getElementById('users-section');
  const statsGrid = document.querySelector('.stats-grid');

  if (section === 'dashboard' || section === 'history') {
    if (historySec) historySec.style.display = 'block';
    if (reportsSec) reportsSec.style.display = 'none';
    if (usersSec) usersSec.style.display = 'none';
    if (statsGrid && section === 'dashboard') statsGrid.style.display = 'grid';
  } else if (section === 'reports') {
    if (historySec) historySec.style.display = 'none';
    if (reportsSec) reportsSec.style.display = 'block';
    if (usersSec) usersSec.style.display = 'none';
    if (statsGrid) statsGrid.style.display = 'none';
  } else if (section === 'users') {
    if (historySec) historySec.style.display = 'none';
    if (reportsSec) reportsSec.style.display = 'none';
    if (usersSec) usersSec.style.display = 'block';
    if (statsGrid) statsGrid.style.display = 'none';
  }
}

// Scroll to section helper
function scrollToElement(id) {
  const element = document.getElementById(id);
  if (element) {
    // Hide all sections first
    const historySec = document.getElementById('complaints-history-section');
    const reportsSec = document.getElementById('reports-section');
    const usersSec = document.getElementById('users-section');
    if (historySec) historySec.style.display = 'none';
    if (reportsSec) reportsSec.style.display = 'none';
    if (usersSec) usersSec.style.display = 'none';

    // Show target section
    element.style.display = 'block';

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Highlight sidebar items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    if (id === 'complaints-history-section') {
      const navItem = document.getElementById('nav-history');
      if(navItem) navItem.classList.add('active');
    } else if (id === 'reports-section') {
      const navItem = document.getElementById('nav-reports');
      if(navItem) navItem.classList.add('active');
    } else if (id === 'users-section') {
      const navItem = document.getElementById('nav-users');
      if(navItem) navItem.classList.add('active');
    }
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
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
