// Local storage keys
const SESSION_KEY = 'cms_active_session';
const API_BASE_URL = 'http://127.0.0.1:8080/api';

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

// Helper to get Auth Headers
function getAuthHeaders() {
  const sessionData = localStorage.getItem(SESSION_KEY);
  if (!sessionData) return { 'Content-Type': 'application/json' };
  const user = JSON.parse(sessionData);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user.id}`
  };
}

// Load Users dynamically from Backend
async function loadUsers() {
  const tableBody = document.getElementById('users-table-body');
  if (!tableBody) return;

  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (response.ok) {
      const data = await response.json();
      const citizens = data.users || [];

      if (citizens.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="padding: 1rem; text-align: center; color: var(--text-muted);">No citizens registered yet.</td></tr>`;
        return;
      }

      tableBody.innerHTML = '';
      citizens.forEach(u => {
        tableBody.innerHTML += `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding: 1rem;">${u.name}</td>
            <td style="padding: 1rem;">${u.username || '-'}</td>
            <td style="padding: 1rem;">${u.nic}</td>
            <td style="padding: 1rem;">${u.email}</td>
            <td style="padding: 1rem;">${u.phone || '-'}</td>
            <td style="padding: 1rem;">${u.district || '-'}, ${u.province || '-'}</td>
            <td style="padding: 1rem; text-align: right;">
              <button class="btn btn-outline btn-status-rejected" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="deleteUser(${u.id})">Delete</button>
            </td>
          </tr>
        `;
      });
    } else {
      const errorData = await response.json();
      showToast(errorData.message || 'Failed to load citizens', 'error');
      tableBody.innerHTML = `<tr><td colspan="5" style="padding: 1rem; text-align: center; color: var(--danger);">Failed to load citizens.</td></tr>`;
    }
  } catch (error) {
    console.error("Error fetching citizens:", error);
    tableBody.innerHTML = `<tr><td colspan="5" style="padding: 1rem; text-align: center; color: var(--danger);">Network error. Backend might be down.</td></tr>`;
  }
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
async function loadComplaints() {
  try {
    const response = await fetch(`${API_BASE_URL}/complaints`, {
      headers: getAuthHeaders()
    });
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
        citizenId: c.citizenEmail,
        citizenName: c.citizenName,
        citizenNic: c.citizenNic || '-',
      }));
      complaints.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
      complaints = [];
      showToast(data.message || 'Error fetching complaints', 'error');
    }
  } catch (e) {
    console.error(e);
    complaints = [];
    showToast('Network error fetching complaints', 'error');
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
  // Note: Total includes rejected, but we keep existing stats widgets unchanged.

  document.getElementById('stats-total').textContent = total;
  document.getElementById('stats-pending').textContent = pending;
  document.getElementById('stats-progress').textContent = progress;
  document.getElementById('stats-resolved').textContent = resolved;
}

// Filter Actions
function filterByStatus(status) {
  activeStatusFilter = status;

  document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
  const btn = document.getElementById(`filter-${status.replace(' ', '-')}`);
  if (btn) btn.classList.add('active');

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
    else if (c.status === 'rejected') statusClass = 'badge-rejected';

    // Pick priority class
    let priorityClass = 'badge-priority-low';
    if (c.urgency === 'High') priorityClass = 'badge-priority-high';
    else if (c.urgency === 'Medium') priorityClass = 'badge-priority-medium';

    const isPending = c.status === 'pending';
    const isProg = c.status === 'in progress';
    const isRes = c.status === 'resolved';
    const isRej = c.status === 'rejected';
    const isFinal = isRes || isRej;

    const disProg = isProg || isFinal;

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
          <button class="btn btn-outline" style="flex: 1; padding: 0.5rem; font-size: 0.8rem;" onclick="event.stopPropagation(); openDrawer('${c.id}')">View</button>
          <button class="btn ${isPending ? 'btn-primary' : 'btn-outline'}" style="flex: 1; padding: 0.5rem; font-size: 0.8rem;" disabled>Pending</button>
          <button class="btn ${isProg ? 'btn-primary' : 'btn-outline'}" style="flex: 1; padding: 0.5rem; font-size: 0.8rem;" onclick="event.stopPropagation(); updateStatusInline('${c.id}', 'in progress')" ${disProg ? 'disabled' : ''}>In Progress</button>
          <button class="btn ${isRes ? 'btn-primary' : 'btn-outline'}" style="flex: 1; padding: 0.5rem; font-size: 0.8rem;" onclick="event.stopPropagation(); updateStatusInline('${c.id}', 'resolved')" ${isFinal ? 'disabled' : ''}>Resolved</button>
          <button class="btn ${isRej ? 'btn-primary' : 'btn-outline'} btn-status-rejected" style="flex: 1; padding: 0.5rem; font-size: 0.8rem;" onclick="event.stopPropagation(); updateStatusInline('${c.id}', 'rejected')" ${isFinal ? 'disabled' : ''}>Reject</button>
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

// Helper to update status buttons in drawer
window.updateDrawerStatus = function (status) {
  document.getElementById('admin-status-update').value = status;

  // Update UI active state
  const buttons = document.querySelectorAll('#drawer-status-buttons button');
  buttons.forEach(btn => btn.classList.remove('active'));

  const activeBtn = document.getElementById('btn-' + (status === 'in progress' ? 'progress' : status));
  if (activeBtn) activeBtn.classList.add('active');
};

// Delete Citizen
window.deleteUser = async function (userId) {
  if (!confirm('Are you sure you want to permanently delete this citizen account and all their complaints?')) return;

  try {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (res.ok) {
      showToast('User account deleted successfully.', 'success');
      loadUsers(); // Refresh citizen list
      loadComplaints(); // Refresh complaints as well
    } else {
      const data = await res.json();
      showToast(data.message || 'Failed to delete user', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Network error deleting user', 'error');
  }
};

// Drawer functionality
function openDrawer(id) {
  const c = complaints.find(item => String(item.id) === String(id));
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
    ? `<strong>${c.citizenName}</strong><br><span style="color: var(--text-muted); font-size: 0.85em;">NIC: ${c.citizenNic}</span><br><span style="color: var(--text-muted); font-size: 0.85em;">Email: ${c.citizenId || ''}</span>`
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
  updateDrawerStatus(c.status);
  document.getElementById('admin-comment-update').value = c.adminComment || '';

  // Enforce unidirectional status flow
  const pendingBtn = document.getElementById('btn-pending');
  const progressBtn = document.getElementById('btn-progress');
  const resolvedBtn = document.getElementById('btn-resolved');
  const rejectedBtn = document.getElementById('btn-rejected');

  const isProg = c.status === 'in progress';
  const isFinal = c.status === 'resolved' || c.status === 'rejected';

  pendingBtn.disabled = true; // Can never go back to pending
  progressBtn.disabled = isProg || isFinal;
  resolvedBtn.disabled = isFinal;
  rejectedBtn.disabled = isFinal;

  // Show drawer
  document.getElementById('drawer-overlay').classList.add('active');
  const drawer = document.getElementById('complaint-drawer');
  drawer.style.right = '0';
  drawer.classList.add('active');
}

function closeDrawer() {
  document.getElementById('drawer-overlay').classList.remove('active');
  const drawer = document.getElementById('complaint-drawer');
  drawer.style.right = '-600px';
  drawer.classList.remove('active');
  currentEditingId = null;
}

// Admin save functionality
function saveComplaintUpdates() {
  if (!currentEditingId) return;

  const cIndex = complaints.findIndex(item => String(item.id) === String(currentEditingId));
  if (cIndex === -1) return;

  const newStatus = document.getElementById('admin-status-update').value;
  const newComment = document.getElementById('admin-comment-update').value.trim();

  const payload = {
    status: newStatus,
    admin_remarks: newComment
  };

  fetch(`${API_BASE_URL}/complaints/${currentEditingId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })
    .then(res => {
      if (res.ok) {
        closeDrawer();
        showToast('Complaint successfully updated', 'success');
        loadComplaints(); // Reload from backend
      } else {
        showToast('Failed to update complaint', 'error');
      }
    })
    .catch(err => {
      console.error(err);
      showToast('Network error updating complaint', 'error');
    });
}

// Inline Status Update (from card buttons)
window.updateStatusInline = async function (id, newStatus) {
  const cIndex = complaints.findIndex(item => String(item.id) === String(id));
  if (cIndex === -1) return;

  const payload = {
    status: newStatus,
    admin_remarks: complaints[cIndex].adminComment || ''
  };

  try {
    const res = await fetch(`${API_BASE_URL}/complaints/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Status updated to ' + newStatus, 'success');
      loadComplaints(); // Reload from backend
    } else {
      showToast('Failed to update status', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Network error updating status', 'error');
  }
};


// Generate Report
function generateReport() {
  const today = new Date().toISOString().split('T')[0];

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
  if (navItem) navItem.classList.add('active');
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
    loadUsers(); // Refresh the users list dynamically
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
      if (navItem) navItem.classList.add('active');
    } else if (id === 'reports-section') {
      const navItem = document.getElementById('nav-reports');
      if (navItem) navItem.classList.add('active');
    } else if (id === 'users-section') {
      const navItem = document.getElementById('nav-users');
      if (navItem) navItem.classList.add('active');
      loadUsers(); // Refresh the users list dynamically
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
