// ========================
// Authentication Module
// ========================

// Demo users database
const USERS = {
  'admin@itdocs.com': {
    password: 'admin123',
    name: 'Administrator',
    role: 'admin',
    avatar: '👑'
  },
  'user@itdocs.com': {
    password: 'user123',
    name: 'Team Member',
    role: 'user',
    avatar: '👤'
  },
  'demo@itdocs.com': {
    password: 'demo123',
    name: 'Demo User',
    role: 'user',
    avatar: '👤'
  }
};

// ========================
// SESSION MANAGEMENT
// ========================

function createSession(userData, rememberMe) {
  const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const expiryTime = new Date().getTime() + sessionDuration;
  
  localStorage.setItem('itdocs_user', JSON.stringify(userData));
  localStorage.setItem('itdocs_session_expiry', expiryTime.toString());
  console.log('✅ Session created');
}

function clearSession() {
  localStorage.removeItem('itdocs_user');
  localStorage.removeItem('itdocs_session_expiry');
  console.log('🗑️ Session cleared');
}

function checkAuth() {
  const user = localStorage.getItem('itdocs_user');
  const sessionExpiry = localStorage.getItem('itdocs_session_expiry');
  
  if (user && sessionExpiry) {
    const now = new Date().getTime();
    if (now < parseInt(sessionExpiry)) {
      if (window.location.pathname.includes('login.html')) {
        window.location.href = 'index.html';
      }
      return true;
    }
  }
  
  // Redirect to login if not on login page
  if (!window.location.pathname.includes('login.html')) {
    clearSession();
    window.location.href = 'login.html';
  }
  
  return false;
}

// Global logout function
function logout() {
  console.log('👋 Logging out...');
  clearSession();
  window.location.href = 'login.html';
}

// Make logout globally accessible
window.logout = logout;

// ========================
// AUTHENTICATION
// ========================

function authenticateUser(email, password) {
  const user = USERS[email];
  
  if (!user) {
    return { success: false, message: 'No account found with this email.' };
  }
  
  if (user.password !== password) {
    return { success: false, message: 'Incorrect password. Please try again.' };
  }
  
  return {
    success: true,
    userData: {
      email: email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      loginTime: new Date().toISOString(),
      googleAuth: false
    }
  };
}

// Google sign-in (demo mode)
function signInWithGoogle() {
  console.log('🔐 Google Sign-In (demo)');
  const result = authenticateUser('demo@itdocs.com', 'demo123');
  if (result.success) {
    createSession(result.userData, true);
    window.location.href = 'index.html';
  }
}

window.signInWithGoogle = signInWithGoogle;

// ========================
// UI HELPERS
// ========================

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  
  if (errorDiv && errorText) {
    errorText.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 5000);
  }
}

// ========================
// INITIALIZATION
// ========================

document.addEventListener('DOMContentLoaded', function() {
  console.log('🔐 Auth module loaded');
  
  // Check if already logged in
  checkAuth();
  
  // Login form handler
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim().toLowerCase();
      const password = document.getElementById('password').value;
      const rememberMe = document.getElementById('rememberMe')?.checked || false;
      
      const loginBtn = document.getElementById('loginBtn');
      const originalText = loginBtn.innerHTML;
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
      loginBtn.disabled = true;
      
      setTimeout(() => {
        const result = authenticateUser(email, password);
        
        if (result.success) {
          createSession(result.userData, rememberMe);
          window.location.href = 'index.html';
        } else {
          showError(result.message);
          loginBtn.innerHTML = originalText;
          loginBtn.disabled = false;
        }
      }, 800);
    });
  }
});