// Database seed keys
const USER_DB_KEY = 'cms_citizens';
const SESSION_KEY = 'cms_active_session';

// Default Test Citizen Account
const DEFAULT_CITIZEN = {
  name: "Jane Smith",
  nic: "200012345678",
  email: "citizen@example.com",
  province: "Western",
  district: "Colombo",
  birthday: "2000-01-01",
  phone: "+94 77 123 4567",
  password: "password123"
};

// Initialize database with default citizen if empty
function initDb() {
  let citizens = localStorage.getItem(USER_DB_KEY);
  if (!citizens) {
    localStorage.setItem(USER_DB_KEY, JSON.stringify([DEFAULT_CITIZEN]));
  }
}

const ADMIN_ACCOUNT = {
  email: "admin@example.com",
  password: "admin123",
  role: "admin"
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
    // Change eye icon to "slashed" or dimmed
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

// Log In handler
function handleLogin(event) {
  event.preventDefault();
  
  const idOrEmail = document.getElementById('login-id').value.trim();
  const password = document.getElementById('login-password').value;

  if (!idOrEmail || !password) {
    showToast('Please fill out all fields', 'error');
    return;
  }

  if (idOrEmail.toLowerCase() === ADMIN_ACCOUNT.email && password === ADMIN_ACCOUNT.password) {
    showToast('Admin Login successful! Redirecting...', 'success');
    
    // Save active session
    const sessionUser = {
      name: "Administrator",
      email: ADMIN_ACCOUNT.email,
      role: ADMIN_ACCOUNT.role
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

    setTimeout(() => {
      window.location.href = 'admin.html';
    }, 1200);
    return;
  }

  const citizens = JSON.parse(localStorage.getItem(USER_DB_KEY) || '[]');
  
  // Find matching user (case insensitive on email/NIC)
  const matchedUser = citizens.find(
    c => (c.email?.toLowerCase() === idOrEmail.toLowerCase() || c.nic?.toLowerCase() === idOrEmail.toLowerCase()) && c.password === password
  );

  if (matchedUser) {
    showToast('Login successful! Redirecting...', 'success');
    
    // Save active session
    const sessionUser = {
      name: matchedUser.name,
      email: matchedUser.email,
      nic: matchedUser.nic,
      phone: matchedUser.phone,
      role: "citizen"
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);
  } else {
    showToast('Invalid ID/Email or password', 'error');
  }
}

// Registration handler
function handleRegister(event) {
  event.preventDefault();

  const name = document.getElementById('reg-name').value.trim();
  const nic = document.getElementById('reg-nic').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const province = document.getElementById('reg-province').value;
  const district = document.getElementById('reg-district').value;
  const birthday = document.getElementById('reg-birthday').value;
  const phone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;

  if (!name || !nic || !email || !province || !district || !birthday || !phone || !password) {
    showToast('All fields are required', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password should be at least 6 characters long', 'error');
    return;
  }

  const citizens = JSON.parse(localStorage.getItem(USER_DB_KEY) || '[]');

  // Check uniqueness of NIC and Email
  const nicExists = citizens.some(c => c.nic?.toLowerCase() === nic.toLowerCase());
  const emailExists = citizens.some(c => c.email?.toLowerCase() === email.toLowerCase());

  if (nicExists) {
    showToast('An account with this NIC already exists', 'error');
    return;
  }
  if (emailExists) {
    showToast('An account with this Email already exists', 'error');
    return;
  }

  // Save new citizen
  const newCitizen = { name, nic, email, province, district, birthday, phone, password };
  citizens.push(newCitizen);
  localStorage.setItem(USER_DB_KEY, JSON.stringify(citizens));

  showToast('Account created successfully! Logging you in...', 'success');
  
  // Auto-login: Save active session
  const sessionUser = {
    name: newCitizen.name,
    email: newCitizen.email,
    nic: newCitizen.nic,
    phone: newCitizen.phone,
    role: "citizen"
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1500);
}

// Main execution triggers
initDb();
checkExistingSession();
