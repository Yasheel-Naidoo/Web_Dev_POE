// --- DOM ELEMENTS ---
const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const regMessage = document.getElementById('regMessage');
const loginMessage = document.getElementById('loginMessage');

// --- PANEL SWITCHING ANIMATION ---
signUpButton.addEventListener('click', () => {
    container.classList.add("right-panel-active");
    clearMessages();
});

signInButton.addEventListener('click', () => {
    container.classList.remove("right-panel-active");
    clearMessages();
});

function clearMessages() {
    regMessage.innerText = '';
    loginMessage.innerText = '';
    regMessage.style.color = '';
    loginMessage.style.color = '';
}

// --- 1. REGISTRATION LOGIC (Create Account) ---
registerForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent the page from reloading

    // Get values from HTML inputs
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    // Get existing users from memory (or create an empty list if none exist)
    let users = JSON.parse(localStorage.getItem('users')) || [];

    // Check if this email is already registered
    const userExists = users.some(user => user.email === email);

    if (userExists) {
        regMessage.innerText = "User already exists! Please Sign In.";
        regMessage.style.color = "red";
        return;
    }

    // Add the new user to the list
    users.push({ name, email, password });
    
    // Save the updated list back to browser memory
    localStorage.setItem('users', JSON.stringify(users));

    // Show success message and clear the form
    regMessage.innerText = "Registration Successful! Switch to Sign In.";
    regMessage.style.color = "green";
    registerForm.reset();
});

// --- 2. LOGIN LOGIC (Authenticate & Redirect) ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent the page from reloading

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // Retrieve the list of users from memory
    let users = JSON.parse(localStorage.getItem('users')) || [];

    // Find a user that matches BOTH email and password
    const validUser = users.find(user => user.email === email && user.password === password);

    if (validUser) {
        loginMessage.innerText = "Login Successful! Redirecting...";
        loginMessage.style.color = "green";

        // Save the current logged-in user to memory so the Dashboard knows who they are
        localStorage.setItem('currentUser', JSON.stringify(validUser));

        // Wait 1.5 seconds so the user sees the success message, then redirect
        setTimeout(() => {
            window.location.href = "dashboard.html"; 
        }, 1500); 
    } else {
        loginMessage.innerText = "Invalid email or password.";
        loginMessage.style.color = "red";
    }
});