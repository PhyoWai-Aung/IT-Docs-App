// ========================
// Authentication Module
// ========================

// Demo users database
const USERS = {
  'phyowaiaung1512@gmail.com': {
    password: 'Phyo.wai@1994',
    name: 'Local Admin',
    role: 'admin',
    avatar: '👑'
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

// ========================
// INITIALIZATION
// ========================

// ========================
// INITIALIZATION
// ========================

document.addEventListener('DOMContentLoaded', function() {
  console.log('🔐 Auth module loaded');
  
  // Check if already logged in
  checkAuth();
  
  // Initialize Google Sign-In if on login page
  if (window.location.pathname.includes('login.html')) {
    // Wait for Google Identity Services to load
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      initializeGoogleSignIn();
    } else {
      // Wait for the script to load with timeout
      let attempts = 0;
      const checkGoogleLoaded = setInterval(() => {
        attempts++;
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
          clearInterval(checkGoogleLoaded);
          initializeGoogleSignIn();
        } else if (attempts > 50) { // 5 seconds timeout
          clearInterval(checkGoogleLoaded);
          console.error('Google Identity Services failed to load within timeout');
          // Show fallback message
          const buttonElement = document.getElementById('googleSignInBtn');
          if (buttonElement) {
            buttonElement.innerHTML = '<p style="color: #666; font-size: 0.9rem;">Google Sign-In unavailable</p>';
          }
        }
      }, 100);
    }
  }
  
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

// Separate function for Google Sign-In initialization
function initializeGoogleSignIn() {
  const buttonElement = document.getElementById('googleSignInBtn');
  if (!buttonElement) {
    console.error('Google Sign-In button element not found');
    return;
  }
  
  google.accounts.id.initialize({
    client_id: '503597374916-ikeifcb9a8le4ga76nt91u8ar6cf534r.apps.googleusercontent.com',
    callback: handleGoogleSignIn
  });
  
  google.accounts.id.renderButton(
    buttonElement,
    { 
      theme: 'outline', 
      size: 'large',
      width: 'auto',
      text: 'signin_with',
      shape: 'rectangular'
    }
  );
  
  console.log('✅ Google Sign-In button rendered');
}

// Google Sign-In callback handler
function handleGoogleSignIn(response) {
  try {
    // Decode the JWT token
    const responsePayload = decodeJwtResponse(response.credential);
    
    const userData = {
      email: responsePayload.email,
      name: responsePayload.name,
      role: 'user',
      avatar: responsePayload.picture || '👤',
      loginTime: new Date().toISOString(),
      googleAuth: true,
      googleId: responsePayload.sub
    };
    
    createSession(userData, true);
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Google Sign-In error:', error);
    showError('Google Sign-In failed. Please try again.');
  }
}

// Helper function to decode JWT
function decodeJwtResponse(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}