const SESSION_KEY = 'cms_active_session';
const API_BASE_URL = 'http://127.0.0.1:8080/api';

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

// Redirect if already authenticated
function checkExistingSession() {
  const session = localStorage.getItem(SESSION_KEY);
  if (session) {
    const user = JSON.parse(session);
    if (user.role === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'index.html';
    }
  }
}

// Tab switcher between Login and Signup
function switchTab(mode) {
  const loginTab = document.getElementById('tab-login');
  const regTab = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');

  if (mode === 'login') {
    loginTab.classList.add('active');
    regTab.classList.remove('active');
    loginForm.classList.add('active');
    regForm.classList.remove('active');
  } else {
    loginTab.classList.remove('active');
    regTab.classList.add('active');
    loginForm.classList.remove('active');
    regForm.classList.add('active');
  }
}

// View / Hide password toggle
function togglePasswordVisibility(fieldId, button) {
  const field = document.getElementById(fieldId);
  const icon = button.querySelector('.eye-icon');
  
  if (field.type === 'password') {
    field.type = 'text';
    icon.style.opacity = '0.5';
  } else {
    field.type = 'password';
    icon.style.opacity = '1';
  }
}

// Dynamic Toast Notifications
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

  // Auto-remove toast after 4s
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Log In handler connecting to PHP Backend
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('login-id').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    showToast('Please fill out all fields', 'error');
    return;
  }

  try {
    console.log(`[API Request] POST ${API_BASE_URL}/auth/login`, { username, password });
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    console.log(`[API Response] Status: ${response.status}`, result);

    if (response.ok) {
      showToast('Login successful! Redirecting...', 'success');
      
      // Save active session using the user object returned from PHP backend
      localStorage.setItem(SESSION_KEY, JSON.stringify(result.user));

      setTimeout(() => {
        if (result.user.role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'index.html';
        }
      }, 1200);
    } else {
      showToast(result.message || 'Invalid username or password', 'error');
    }
  } catch (error) {
    console.error("Login Error:", error);
    showToast('Network error! Ensure your backend is running.', 'error');
  }
}

// Registration handler connecting to PHP Backend
async function handleRegister(event) {
  event.preventDefault();

  const name = document.getElementById('reg-name').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const nic = document.getElementById('reg-nic').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const province = document.getElementById('reg-province').value;
  const district = document.getElementById('reg-district').value;
  const birthday = document.getElementById('reg-birthday').value;
  const phone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;

  if (!name || !username || !nic || !email || !province || !district || !birthday || !phone || !password) {
    showToast('All fields are required', 'error');
    return;
  }

  if (/[A-Z]/.test(email)) {
    showToast('Email must be entirely in lowercase letters', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password should be at least 6 characters long', 'error');
    return;
  }

  // Birthday validation strict
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (!dateRegex.test(birthday)) {
    showToast('Birthday must be YYYY-MM-DD with valid month and day', 'error');
    return;
  }

  const payload = { name, username, nic, email, province, district, birthday, phone, password };

  try {
    console.log(`[API Request] POST ${API_BASE_URL}/auth/register`, payload);
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log(`[API Response] Status: ${response.status}`, result);

    if (response.ok) {
      showToast('Account created successfully! Please log in.', 'success');
      
      // Switch back to login tab so user can log in
      setTimeout(() => {
        document.getElementById('login-id').value = username;
        switchTab('login');
      }, 1500);

    } else {
      showToast(result.message || 'Registration failed', 'error');
    }
  } catch (error) {
    console.error("Registration Error:", error);
    showToast('Network error! Ensure your backend is running.', 'error');
  }
}

// Initialize dynamic district dropdown
document.addEventListener('DOMContentLoaded', () => {
  const regProvince = document.getElementById('reg-province');
  const regDistrict = document.getElementById('reg-district');
  
  if (regProvince && regDistrict) {
    regProvince.addEventListener('change', function() {
      const selected = this.value;
      const districts = provinceToDistricts[selected] || [];
      
      regDistrict.innerHTML = '<option value="" disabled selected>Select District</option>';
      districts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        regDistrict.appendChild(opt);
      });
    });
  }
});

// Main execution triggers
checkExistingSession();
