document.addEventListener('DOMContentLoaded', () => {
  // 1) Registration handler
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = registerForm.email.value.trim();
      const password = registerForm.password.value;
      const confirm = registerForm.confirmPassword.value;

      if (password !== confirm) {
        alert('Passwords do not match');
        return;
      }

      // Load existing users
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      if (users.find(u => u.email === email)) {
        alert('This email is already registered');
        return;
      }

      // Save new user
      users.push({ email, password });
      localStorage.setItem('users', JSON.stringify(users));
      alert('Registration successful! Please log in.');
      window.location.href = 'login.html';
    });
    return; // skip the rest when on register page
  }

  // 2) Login handler (on login.html) — replaces hard-coded creds
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;

      // Seed a demo user if none exist
      let users = JSON.parse(localStorage.getItem('users') || '[]');
      if (users.length === 0) {
        users = [{ email: 'user@example.com', password: 'password' }];
        localStorage.setItem('users', JSON.stringify(users));
      }

      const match = users.find(u => u.email === email && u.password === password);
      if (match) {
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('userEmail', email);
        window.location.href = 'dashboard.html';
      } else {
        alert('Invalid credentials');
      }
    });
    return; // skip the rest when on login page
  }

  // 3) Dashboard protection & logout (unchanged) :contentReference[oaicite:0]{index=0}
  const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
  if (!isLoggedIn) {
    window.location.href = 'login.html';
    return;
  }
  // Display user email
  const userEmailSpan = document.getElementById('user-email');
  if (userEmailSpan) {
    userEmailSpan.textContent = localStorage.getItem('userEmail') || '';
  }
  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('userEmail');
      window.location.href = 'login.html';
    });
  }
});
