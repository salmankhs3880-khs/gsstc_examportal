// ============================================
// GDSTC KHS SECURE AUTHENTICATION SYSTEM
// ============================================

// Configuration - CHANGE THESE FOR YOUR SCHOOL
const SECURITY_CONFIG = {
    // School password (CHANGE THIS AND GIVE TO STUDENTS)
    SCHOOL_PASSWORD: "GDSTC2026",
    
    // Exam time window (SET YOUR EXAM DATES)
    EXAM_START: "2026-02-06T07:00:00",  // Start date/time
    EXAM_END: "2026-02-08T17:00:00",    // End date/time
    
    // Security settings
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_TIME_MINUTES: 30,
    
    // Google Forms URL (UPDATE WITH YOUR FORM)
    GOOGLE_FORM_URL: "https://forms.gle/7cikHASmYgBzqmsJ8",
    
    // Student data file
    STUDENT_DATA_URL: "data/students.json",
    SETTINGS_URL: "data/settings.json"
};

// Global state
let loginAttempts = 0;
let isLocked = false;
let lockoutTime = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check login status
    checkLoginStatus();
    
    // Load exam window display
    loadExamWindowDisplay();
    
    // Initialize CAPTCHA
    generateCaptcha();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for lockout
    checkLockoutStatus();
});

// ============================================
// MAIN AUTHENTICATION FUNCTION
// ============================================

async function handleLogin(e) {
    e.preventDefault();
    
    // Get form elements
    const adminNumber = document.getElementById('adminNumber').value.trim().toUpperCase();
    const username = document.getElementById('username').value.trim();
    const schoolPassword = document.getElementById('schoolPassword').value;
    const captchaInput = document.getElementById('captchaInput').value.trim().toUpperCase();
    
    // Reset status
    showLoginStatus('', '');
    
    // 1. CHECK FOR LOCKOUT
    if (isLocked) {
        const remaining = getRemainingLockoutTime();
        showLoginStatus(`Account locked. Try again in ${remaining}`, 'error');
        return;
    }
    
    // 2. VALIDATE REQUIRED FIELDS
    if (!validateRequiredFields(adminNumber, username, schoolPassword, captchaInput)) {
        return;
    }
    
    // 3. VERIFY CAPTCHA
    if (!verifyCaptcha(captchaInput)) {
        handleFailedAttempt();
        generateCaptcha(); // New CAPTCHA
        return;
    }
    
    // 4. VERIFY SCHOOL PASSWORD
    if (!verifySchoolPassword(schoolPassword)) {
        handleFailedAttempt();
        showLoginStatus('Invalid school access code', 'error');
        return;
    }
    
    // 5. CHECK EXAM TIME WINDOW
    if (!checkExamTimeWindow()) {
        showLoginStatus('Access outside exam period', 'error');
        return;
    }
    
    // 6. VERIFY STUDENT CREDENTIALS
    try {
        const isValidStudent = await verifyStudentCredentials(adminNumber, username);
        
        if (!isValidStudent) {
            handleFailedAttempt();
            showLoginStatus('Invalid student credentials', 'error');
            return;
        }
        
        // 7. CHECK IF EXAM ALREADY COMPLETED
        const hasCompleted = await checkExamCompletion(adminNumber);
        if (hasCompleted) {
            showLoginStatus('Exam already completed', 'error');
            return;
        }
        
        // 8. SUCCESSFUL LOGIN
        await handleSuccessfulLogin(adminNumber, username);
        
    } catch (error) {
        console.error('Login error:', error);
        showLoginStatus('System error. Please try again.', 'error');
    }
}

// ============================================
// SECURITY FUNCTIONS
// ============================================

function validateRequiredFields(adminNumber, username, password, captcha) {
    if (!adminNumber || !username || !password || !captcha) {
        showLoginStatus('All fields are required', 'error');
        return false;
    }
    
    // Validate admin number format
    if (!/^GD[A-Z0-9]{5,10}$/.test(adminNumber)) {
        showLoginStatus('Invalid administration number format', 'error');
        return false;
    }
    
    // Validate username format
    if (!/^[A-Za-z0-9]{3,20}$/.test(username)) {
        showLoginStatus('Invalid username format', 'error');
        return false;
    }
    
    return true;
}

function verifySchoolPassword(password) {
    return password === SECURITY_CONFIG.SCHOOL_PASSWORD;
}

function checkExamTimeWindow() {
    const now = new Date();
    const examStart = new Date(SECURITY_CONFIG.EXAM_START);
    const examEnd = new Date(SECURITY_CONFIG.EXAM_END);
    
    // For testing, you can comment this out
    // return true;
    
    return now >= examStart && now <= examEnd;
}

async function verifyStudentCredentials(adminNumber, username) {
    try {
        // Try to load from settings first
        const settings = await loadSettings();
        if (settings.useStudentList) {
            const students = await loadStudentData();
            const student = students.find(s => 
                s.adminNumber === adminNumber && 
                s.username === username &&
                s.active === true
            );
            return student !== undefined;
        }
        
        // If no student list, just check format
        return /^GD[A-Z0-9]{5,10}$/.test(adminNumber) && 
               /^[A-Za-z0-9]{3,20}$/.test(username);
        
    } catch (error) {
        console.warn('Student verification failed, using fallback:', error);
        // Fallback to basic validation
        return /^GD[A-Z0-9]{5,10}$/.test(adminNumber);
    }
}

async function checkExamCompletion(adminNumber) {
    const studentKey = `exam_completed_${adminNumber}`;
    const examCompleted = localStorage.getItem(studentKey);
    return examCompleted === 'true';
}

// ============================================
// ATTEMPT TRACKING AND LOCKOUT
// ============================================

function handleFailedAttempt() {
    loginAttempts++;
    
    // Store attempts in localStorage
    const attemptsData = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
    const ip = 'default'; // In real app, get actual IP
    
    if (!attemptsData[ip]) {
        attemptsData[ip] = { count: 0, lastAttempt: null };
    }
    
    attemptsData[ip].count++;
    attemptsData[ip].lastAttempt = new Date().toISOString();
    
    localStorage.setItem('loginAttempts', JSON.stringify(attemptsData));
    
    // Check for lockout
    if (attemptsData[ip].count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
        activateLockout();
        const remaining = getRemainingLockoutTime();
        showLoginStatus(`Too many attempts. Locked for ${remaining}`, 'error');
    } else {
        const remaining = SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - attemptsData[ip].count;
        showLoginStatus(`Incorrect credentials. ${remaining} attempts remaining`, 'error');
    }
}

function checkLockoutStatus() {
    const lockoutData = JSON.parse(localStorage.getItem('lockoutData') || 'null');
    
    if (lockoutData && lockoutData.expires) {
        const now = new Date();
        const expires = new Date(lockoutData.expires);
        
        if (now < expires) {
            isLocked = true;
            lockoutTime = expires;
            showLockoutWarning();
        } else {
            // Lockout expired
            clearLockout();
        }
    }
}

function activateLockout() {
    isLocked = true;
    lockoutTime = new Date(Date.now() + SECURITY_CONFIG.LOCKOUT_TIME_MINUTES * 60000);
    
    const lockoutData = {
        activated: new Date().toISOString(),
        expires: lockoutTime.toISOString(),
        attempts: loginAttempts
    };
    
    localStorage.setItem('lockoutData', JSON.stringify(lockoutData));
    showLockoutWarning();
}

function clearLockout() {
    isLocked = false;
    lockoutTime = null;
    loginAttempts = 0;
    localStorage.removeItem('lockoutData');
    
    // Clear attempts after successful login
    localStorage.removeItem('loginAttempts');
    
    const warning = document.getElementById('lockoutWarning');
    if (warning) warning.style.display = 'none';
}

function getRemainingLockoutTime() {
    if (!lockoutTime) return "0:00";
    
    const now = new Date();
    const diff = lockoutTime - now;
    
    if (diff <= 0) {
        clearLockout();
        return "0:00";
    }
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function showLockoutWarning() {
    // Create or update lockout warning
    let warning = document.getElementById('lockoutWarning');
    
    if (!warning) {
        warning = document.createElement('div');
        warning.id = 'lockoutWarning';
        warning.className = 'lockout-warning';
        document.querySelector('.login-container').prepend(warning);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .lockout-warning {
                background: linear-gradient(135deg, #c53030, #9b2c2c);
                color: white;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                text-align: center;
                border: 2px solid #fed7d7;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.8; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    const remaining = getRemainingLockoutTime();
    warning.innerHTML = `
        <i class="fas fa-lock"></i> 
        <strong>ACCESS LOCKED</strong> - Too many failed attempts. 
        Try again in ${remaining}
    `;
    warning.style.display = 'block';
}

// ============================================
// CAPTCHA SYSTEM
// ============================================

function generateCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters
    let captcha = '';
    
    for (let i = 0; i < 6; i++) {
        captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Store in sessionStorage (cleared on browser close)
    sessionStorage.setItem('currentCaptcha', captcha);
    
    // Display with distortion effect
    displayCaptcha(captcha);
    
    // Setup refresh button
    document.getElementById('refreshCaptcha').onclick = function() {
        generateCaptcha();
        document.getElementById('captchaInput').value = '';
    };
}

function displayCaptcha(text) {
    const captchaElement = document.getElementById('captchaText');
    let html = '';
    
    // Create each character with random rotation and skew
    for (let i = 0; i < text.length; i++) {
        const rotation = Math.floor(Math.random() * 30) - 15;
        const skew = Math.floor(Math.random() * 10) - 5;
        html += `<span style="
            display: inline-block;
            transform: rotate(${rotation}deg) skew(${skew}deg);
            margin: 0 2px;
        ">${text.charAt(i)}</span>`;
    }
    
    captchaElement.innerHTML = html;
}

function verifyCaptcha(input) {
    const storedCaptcha = sessionStorage.getItem('currentCaptcha');
    
    if (!storedCaptcha) {
        generateCaptcha();
        return false;
    }
    
    return input === storedCaptcha;
}

// ============================================
// DATA LOADING FUNCTIONS
// ============================================

async function loadStudentData() {
    try {
        const response = await fetch(SECURITY_CONFIG.STUDENT_DATA_URL);
        if (!response.ok) throw new Error('Failed to load student data');
        
        const data = await response.json();
        return data.students || [];
    } catch (error) {
        console.error('Error loading student data:', error);
        return [];
    }
}

async function loadSettings() {
    try {
        const response = await fetch(SECURITY_CONFIG.SETTINGS_URL);
        if (!response.ok) throw new Error('Failed to load settings');
        
        return await response.json();
    } catch (error) {
        console.error('Error loading settings:', error);
        return {
            useStudentList: false,
            examName: "GDSTC KHS Examination",
            allowRetake: false
        };
    }
}

// ============================================
// SUCCESSFUL LOGIN HANDLING
// ============================================

async function handleSuccessfulLogin(adminNumber, username) {
    // Clear any lockout
    clearLockout();
    
    // Store session data
    localStorage.setItem('studentLoggedIn', 'true');
    localStorage.setItem('studentAdminNumber', adminNumber);
    localStorage.setItem('studentUsername', username);
    localStorage.setItem('loginTime', new Date().toISOString());
    localStorage.setItem('loginIP', 'school_network'); // In real app, get actual IP
    
    // Log successful login
    logLoginEvent(adminNumber, 'SUCCESS');
    
    // Show success message
    showLoginStatus('Login successful! Redirecting...', 'success');
    
    // Redirect after delay
    setTimeout(() => {
        window.location.href = 'profile.html';
    }, 1500);
}

function logLoginEvent(adminNumber, status) {
    const logs = JSON.parse(localStorage.getItem('loginLogs') || '[]');
    
    logs.push({
        adminNumber,
        status,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform
    });
    
    // Keep only last 100 logs
    if (logs.length > 100) {
        logs.shift();
    }
    
    localStorage.setItem('loginLogs', JSON.stringify(logs));
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

function showLoginStatus(message, type) {
    const statusElement = document.getElementById('loginStatus');
    
    if (!message) {
        statusElement.style.display = 'none';
        return;
    }
    
    statusElement.textContent = message;
    statusElement.className = `login-status ${type}`;
    statusElement.style.display = 'block';
}

function loadExamWindowDisplay() {
    const displayElement = document.getElementById('examWindowDisplay');
    if (!displayElement) return;
    
    const start = new Date(SECURITY_CONFIG.EXAM_START);
    const end = new Date(SECURITY_CONFIG.EXAM_END);
    
    const formatOptions = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    const startStr = start.toLocaleDateString('en-NG', formatOptions);
    const endStr = end.toLocaleDateString('en-NG', formatOptions);
    
    displayElement.textContent = `${startStr} to ${endStr}`;
}

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout button (on other pages)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Start exam button
    const startExamBtn = document.getElementById('startExamBtn');
    if (startExamBtn) {
        startExamBtn.addEventListener('click', handleStartExam);
    }
}

// ============================================
// LOGOUT FUNCTION
// ============================================

function handleLogout() {
    // Clear sensitive data
    const adminNumber = localStorage.getItem('studentAdminNumber');
    const studentKey = `exam_completed_${adminNumber}`;
    const examCompleted = localStorage.getItem(studentKey);
    
    // Clear all except exam completion status
    localStorage.clear();
    
    // Restore exam completion if exists
    if (examCompleted === 'true') {
        localStorage.setItem(studentKey, 'true');
    }
    
    // Clear session storage
    sessionStorage.clear();
    
    // Redirect to login
    window.location.href = 'index.html';
}

// ============================================
// EXISTING FUNCTIONS (from previous code)
// ============================================

function checkLoginStatus() {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'profile.html' || currentPage === 'instructions.html' || 
        currentPage === 'exam.html' || currentPage === 'thankyou.html') {
        
        const isLoggedIn = localStorage.getItem('studentLoggedIn');
        const examCompleted = localStorage.getItem('examCompleted');
        
        if (!isLoggedIn || isLoggedIn !== 'true') {
            window.location.href = 'index.html';
            return;
        }
        
        if (examCompleted === 'true' && 
            (currentPage === 'instructions.html' || currentPage === 'exam.html')) {
            window.location.href = 'thankyou.html';
            return;
        }
        
        if (currentPage === 'profile.html') {
            loadStudentProfile();
        }
    }
}

function loadStudentProfile() {
    const adminNumber = localStorage.getItem('studentAdminNumber');
    const username = localStorage.getItem('studentUsername');
    
    const adminNumberElement = document.getElementById('profileAdminNumber');
    const usernameElement = document.getElementById('profileUsername');
    const loginTimeElement = document.getElementById('loginTime');
    
    if (adminNumberElement) adminNumberElement.textContent = adminNumber;
    if (usernameElement) usernameElement.textContent = username;
    
    if (loginTimeElement) {
        const loginTime = new Date(localStorage.getItem('loginTime'));
        loginTimeElement.textContent = loginTime.toLocaleString();
    }
    
    const studentKey = `exam_completed_${adminNumber}`;
    const examCompleted = localStorage.getItem(studentKey);
    const examStatusElement = document.getElementById('examStatus');
    const startExamBtn = document.getElementById('startExamBtn');
    
    if (examCompleted === 'true') {
        if (examStatusElement) {
            examStatusElement.innerHTML = '<i class="fas fa-check-circle"></i> Exam Completed';
            examStatusElement.style.color = '#38a169';
        }
        if (startExamBtn) {
            startExamBtn.innerHTML = '<i class="fas fa-check"></i> Exam Completed';
            startExamBtn.classList.add('btn-disabled');
            startExamBtn.disabled = true;
            startExamBtn.onclick = function() {
                window.location.href = 'thankyou.html';
            };
        }
    } else {
        if (examStatusElement) {
            examStatusElement.innerHTML = '<i class="fas fa-clock"></i> Exam Not Started';
            examStatusElement.style.color = '#d69e2e';
        }
    }
}

function handleStartExam() {
    const adminNumber = localStorage.getItem('studentAdminNumber');
    const studentKey = `exam_completed_${adminNumber}`;
    const examCompleted = localStorage.getItem(studentKey);
    
    if (examCompleted === 'true') {
        alert('You have already completed the examination.');
        window.location.href = 'thankyou.html';
        return;
    }
    
    const examStartTime = new Date().toISOString();
    localStorage.setItem('examStartTime', examStartTime);
    
    window.location.href = 'instructions.html';
}// Authentication and Session Management
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    checkLoginStatus();
    
    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Handle start exam button
    const startExamBtn = document.getElementById('startExamBtn');
    if (startExamBtn) {
        startExamBtn.addEventListener('click', handleStartExam);
    }
    
    // Handle agreement checkbox on instructions page
    const agreementCheckbox = document.getElementById('agreementCheckbox');
    const proceedToExamBtn = document.getElementById('proceedToExamBtn');
    
    if (agreementCheckbox && proceedToExamBtn) {
        agreementCheckbox.addEventListener('change', function() {
            proceedToExamBtn.disabled = !this.checked;
            proceedToExamBtn.classList.toggle('btn-disabled', !this.checked);
        });
        
        proceedToExamBtn.addEventListener('click', function() {
            if (!agreementCheckbox.checked) {
                alert('You must agree to the examination rules before proceeding.');
                return;
            }
            window.location.href = 'exam.html';
        });
    }
});

function checkLoginStatus() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // If on profile page and not logged in, redirect to login
    if (currentPage === 'profile.html' || currentPage === 'instructions.html' || 
        currentPage === 'exam.html' || currentPage === 'thankyou.html') {
        
        const isLoggedIn = localStorage.getItem('studentLoggedIn');
        const examCompleted = localStorage.getItem('examCompleted');
        
        if (!isLoggedIn || isLoggedIn !== 'true') {
            window.location.href = 'index.html';
            return;
        }
        
        // If exam is already completed and trying to access exam pages
        if (examCompleted === 'true' && 
            (currentPage === 'instructions.html' || currentPage === 'exam.html')) {
            window.location.href = 'thankyou.html';
            return;
        }
        
        // If on profile page, load student info
        if (currentPage === 'profile.html') {
            loadStudentProfile();
        }
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const adminNumber = document.getElementById('adminNumber').value.trim();
    const username = document.getElementById('username').value.trim();
    
    // Basic validation
    if (!adminNumber || !username) {
        showMessage('Please enter both Administration Number and Username', 'error');
        return;
    }
    
    if (adminNumber.length < 5 || adminNumber.length > 15) {
        showMessage('Administration number must be 5-15 characters', 'error');
        return;
    }
    
    if (username.length < 3 || username.length > 20) {
        showMessage('Username must be 3-20 characters', 'error');
        return;
    }
    
    // Check if exam already completed for this student
    const studentKey = `exam_completed_${adminNumber}`;
    const examCompleted = localStorage.getItem(studentKey);
    
    if (examCompleted === 'true') {
        showMessage('You have already completed the examination. Multiple attempts are not allowed.', 'error');
        return;
    }
    
    // Simulate login (in real app, this would connect to a backend)
    // Store student info in localStorage
    localStorage.setItem('studentLoggedIn', 'true');
    localStorage.setItem('studentAdminNumber', adminNumber);
    localStorage.setItem('studentUsername', username);
    localStorage.setItem('loginTime', new Date().toISOString());
    
    // Redirect to profile page
    window.location.href = 'profile.html';
}

function handleLogout() {
    // Clear all session data except exam completion status
    const adminNumber = localStorage.getItem('studentAdminNumber');
    const studentKey = `exam_completed_${adminNumber}`;
    const examCompleted = localStorage.getItem(studentKey);
    
    localStorage.clear();
    
    // Restore exam completion status if exists
    if (examCompleted === 'true') {
        localStorage.setItem(studentKey, 'true');
    }
    
    window.location.href = 'index.html';
}

function loadStudentProfile() {
    const adminNumber = localStorage.getItem('studentAdminNumber');
    const username = localStorage.getItem('studentUsername');
    
    // Update profile elements
    const adminNumberElement = document.getElementById('profileAdminNumber');
    const usernameElement = document.getElementById('profileUsername');
    const loginTimeElement = document.getElementById('loginTime');
    
    if (adminNumberElement) adminNumberElement.textContent = adminNumber;
    if (usernameElement) usernameElement.textContent = username;
    
    if (loginTimeElement) {
        const loginTime = new Date(localStorage.getItem('loginTime'));
        loginTimeElement.textContent = loginTime.toLocaleString();
    }
    
    // Check exam status
    const studentKey = `exam_completed_${adminNumber}`;
    const examCompleted = localStorage.getItem(studentKey);
    const examStatusElement = document.getElementById('examStatus');
    const startExamBtn = document.getElementById('startExamBtn');
    
    if (examCompleted === 'true') {
        if (examStatusElement) {
            examStatusElement.innerHTML = '<i class="fas fa-check-circle"></i> Exam Completed';
            examStatusElement.style.color = '#38a169';
        }
        if (startExamBtn) {
            startExamBtn.innerHTML = '<i class="fas fa-check"></i> Exam Completed';
            startExamBtn.classList.add('btn-disabled');
            startExamBtn.disabled = true;
            startExamBtn.onclick = function() {
                window.location.href = 'thankyou.html';
            };
        }
    } else {
        if (examStatusElement) {
            examStatusElement.innerHTML = '<i class="fas fa-clock"></i> Exam Not Started';
            examStatusElement.style.color = '#d69e2e';
        }
    }
}

function handleStartExam() {
    const adminNumber = localStorage.getItem('studentAdminNumber');
    const studentKey = `exam_completed_${adminNumber}`;
    const examCompleted = localStorage.getItem(studentKey);
    
    if (examCompleted === 'true') {
        showMessage('You have already completed the examination.', 'error');
        window.location.href = 'thankyou.html';
        return;
    }
    
    // Set exam start time
    const examStartTime = new Date().toISOString();
    localStorage.setItem('examStartTime', examStartTime);
    
    // Redirect to instructions page
    window.location.href = 'instructions.html';
}

function showMessage(message, type) {
    // Remove any existing message
    const existingMessage = document.querySelector('.message-alert');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message-alert message-${type}`;
    messageElement.innerHTML = `
        <div class="message-content">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="message-close"><i class="fas fa-times"></i></button>
    `;
    
    // Add styles
    const styles = `
        .message-alert {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-width: 300px;
            max-width: 500px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .message-error {
            background-color: #fed7d7;
            color: #9b2c2c;
            border-left: 4px solid #fc8181;
        }
        .message-success {
            background-color: #c6f6d5;
            color: #276749;
            border-left: 4px solid #68d391;
        }
        .message-content {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }
        .message-close {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            padding: 0;
            margin-left: 15px;
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    
    // Add to page
    document.body.appendChild(messageElement);
    
    // Add close button functionality
    messageElement.querySelector('.message-close').addEventListener('click', function() {
        messageElement.style.animation = 'slideOut 0.3s ease';
        messageElement.style.transform = 'translateX(100%)';
        messageElement.style.opacity = '0';
        setTimeout(() => messageElement.remove(), 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.style.animation = 'slideOut 0.3s ease';
            messageElement.style.transform = 'translateX(100%)';
            messageElement.style.opacity = '0';
            setTimeout(() => messageElement.remove(), 300);
        }
    }, 5000);
}// Authentication and Session Management
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    checkLoginStatus();
    
    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Handle start exam button
    const startExamBtn = document.getElementById('startExamBtn');
    if (startExamBtn) {
        startExamBtn.addEventListener('click', handleStartExam);
    }
    
    // Handle agreement checkbox on instructions page
    const agreementCheckbox = document.getElementById('agreementCheckbox');
    const proceedToExamBtn = document.getElementById('proceedToExamBtn');
    
    if (agreementCheckbox && proceedToExamBtn) {
        agreementCheckbox.addEventListener('change', function() {
            proceedToExamBtn.disabled = !this.checked;
            proceedToExamBtn.classList.toggle('btn-disabled', !this.checked);
        });
        
        proceedToExamBtn.addEventListener('click', function() {
            if (!agreementCheckbox.checked) {
                alert('You must agree to the examination rules before proceeding.');
                return;
            }
            window.location.href = 'exam.html';
        });
    }
});

function checkLoginStatus() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // If on profile page and not logged in, redirect to login
    if (currentPage === 'profile.html' || currentPage === 'instructions.html' || 
        currentPage === 'exam.html' || currentPage === 'thankyou.html') {
        
        const isLoggedIn = localStorage.getItem('studentLoggedIn');
        const examCompleted = localStorage.getItem('examCompleted');
        
        if (!isLoggedIn || isLoggedIn !== 'true') {
            window.location.href = 'index.html';
            return;
        }
        
        // If exam is already completed and trying to access exam pages
        if (examCompleted === 'true' && 
            (currentPage === 'instructions.html' || currentPage === 'exam.html')) {
            window.location.href = 'thankyou.html';
            return;
        }
        
        // If on profile page, load student info
        if (currentPage === 'profile.html') {
            loadStudentProfile();
        }
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const adminNumber = document.getElementById('adminNumber').value.trim();
    const username = document.getElementById('username').value.trim();
    
    // Basic validation
    if (!adminNumber || !username) {
        showMessage('Please enter both Administration Number and Username', 'error');
        return;
    }
    
    if (adminNumber.length < 5 || adminNumber.length > 15) {
        showMessage('Administration number must be 5-15 characters', 'error');
        return;
    }
    
    if (username.length < 3 || username.length > 20) {
        showMessage('Username must be 3-20 characters', 'error');
        return;
    }
    
    // Check if exam already completed for this student
    const studentKey = `exam_completed_${adminNumber}`;
    const examCompleted = localStorage.getItem(studentKey);
    
    if (examCompleted === 'true') {
        showMessage('You have already completed the examination. Multiple attempts are not allowed.', 'error');
        return;
    }
    
    // Simulate login (in real app, this would connect to a backend)
    // Store student info in localStorage
    localStorage.setItem('studentLoggedIn', 'true');
    localStorage.setItem('studentAdminNumber', adminNumber);
    localStorage.setItem('studentUsername', username);
    localStorage.setItem('loginTime', new Date().toISOString());
    
    // Redirect to profile page
    window.location.href = 'profile.html';
}

function handleLogout() {
    // Clear all session data except exam completion status
    const adminNumber = localStorage.getItem('studentAdminNumber');
    const studentKey = `exam_completed_${adminNumber}`;
    const examCompleted = localStorage.getItem(studentKey);
    
    localStorage.clear();
    
    // Restore exam completion status if exists
    if (examCompleted === 'true') {
        localStorage.setItem(studentKey, 'true');
    }
    
    window.location.href = 'index.html';
}

function loadStudentProfile() {
    const adminNumber = localStorage.getItem('studentAdminNumber');
    const username = localStorage.getItem('studentUsername');
    
    // Update profile elements
    const adminNumberElement = document.getElementById('profileAdminNumber');
    const usernameElement = document.getElementById('profileUsername');
    const loginTimeElement = document.getElementById('loginTime');
    
    if (adminNumberElement) adminNumberElement.textContent = adminNumber;
    if (usernameElement) usernameElement.textContent = username;
    
    if (loginTimeElement) {
        const loginTime = new Date(localStorage.getItem('loginTime'));
        loginTimeElement.textContent = loginTime.toLocaleString();
    }
    
    // Check exam status
    const studentKey = `exam_completed_${adminNumber}`;
    const examCompleted = localStorage.getItem(studentKey);
    const examStatusElement = document.getElementById('examStatus');
    const startExamBtn = document.getElementById('startExamBtn');
    
    if (examCompleted === 'true') {
        if (examStatusElement) {
            examStatusElement.innerHTML = '<i class="fas fa-check-circle"></i> Exam Completed';
            examStatusElement.style.color = '#38a169';
        }
        if (startExamBtn) {
            startExamBtn.innerHTML = '<i class="fas fa-check"></i> Exam Completed';
            startExamBtn.classList.add('btn-disabled');
            startExamBtn.disabled = true;
            startExamBtn.onclick = function() {
                window.location.href = 'thankyou.html';
            };
        }
    } else {
        if (examStatusElement) {
            examStatusElement.innerHTML = '<i class="fas fa-clock"></i> Exam Not Started';
            examStatusElement.style.color = '#d69e2e';
        }
    }
}

function handleStartExam() {
    const adminNumber = localStorage.getItem('studentAdminNumber');
    const studentKey = `exam_completed_${adminNumber}`;
    const examCompleted = localStorage.getItem(studentKey);
    
    if (examCompleted === 'true') {
        showMessage('You have already completed the examination.', 'error');
        window.location.href = 'thankyou.html';
        return;
    }
    
    // Set exam start time
    const examStartTime = new Date().toISOString();
    localStorage.setItem('examStartTime', examStartTime);
    
    // Redirect to instructions page
    window.location.href = 'instructions.html';
}

function showMessage(message, type) {
    // Remove any existing message
    const existingMessage = document.querySelector('.message-alert');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message-alert message-${type}`;
    messageElement.innerHTML = `
        <div class="message-content">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="message-close"><i class="fas fa-times"></i></button>
    `;
    
    // Add styles
    const styles = `
        .message-alert {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-width: 300px;
            max-width: 500px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .message-error {
            background-color: #fed7d7;
            color: #9b2c2c;
            border-left: 4px solid #fc8181;
        }
        .message-success {
            background-color: #c6f6d5;
            color: #276749;
            border-left: 4px solid #68d391;
        }
        .message-content {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }
        .message-close {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            padding: 0;
            margin-left: 15px;
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    
    // Add to page
    document.body.appendChild(messageElement);
    
    // Add close button functionality
    messageElement.querySelector('.message-close').addEventListener('click', function() {
        messageElement.style.animation = 'slideOut 0.3s ease';
        messageElement.style.transform = 'translateX(100%)';
        messageElement.style.opacity = '0';
        setTimeout(() => messageElement.remove(), 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.style.animation = 'slideOut 0.3s ease';
            messageElement.style.transform = 'translateX(100%)';
            messageElement.style.opacity = '0';
            setTimeout(() => messageElement.remove(), 300);
        }
    }, 5000);
}

