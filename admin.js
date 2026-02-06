// admin.js - GDSTC KHS Examination Portal Admin Panel
// ======================================================

// Admin Configuration
const ADMIN_CONFIG = {
    ADMIN_PASSWORD: "38803091@Khs", // CHANGE THIS!
    VERSION: "2.0",
    SCHOOL_NAME: "GOVERNMENT DAY SCIENCE TECHNICAL COLLEGE KAFIN-HAUSA"
};

// Global Variables
let currentView = 'dashboard';
let studentsData = [];
let examCodes = {};

// Initialize Admin Panel
document.addEventListener('DOMContentLoaded', function() {
    checkAdminLogin();
    initializeEventListeners();
    loadInitialData();
});

// ======================================================
// AUTHENTICATION FUNCTIONS
// ======================================================

function checkAdminLogin() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'admin.html') {
        if (!isLoggedIn) {
            showLoginForm();
        } else {
            showAdminDashboard();
        }
    }
}

function showLoginForm() {
    document.getElementById('adminLogin').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
}

function showAdminDashboard() {
    document.getElementById('adminLogin').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    loadDashboard();
}

function loginAdmin() {
    const passwordInput = document.getElementById('adminPassword');
    const errorElement = document.getElementById('adminLoginError');
    
    if (!passwordInput) return;
    
    const password = passwordInput.value;
    
    if (password === ADMIN_CONFIG.ADMIN_PASSWORD) {
        localStorage.setItem('adminLoggedIn', 'true');
        showAdminDashboard();
        passwordInput.value = '';
        errorElement.textContent = '';
        
        // Log admin login
        logAdminActivity('ADMIN_LOGIN', 'success');
    } else {
        errorElement.textContent = 'Invalid admin password';
        passwordInput.value = '';
        
        // Log failed attempt
        logAdminActivity('ADMIN_LOGIN_FAILED', 'failed');
    }
}

function logoutAdmin() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('adminLoggedIn');
        logAdminActivity('ADMIN_LOGOUT', 'success');
        showLoginForm();
    }
}

// ======================================================
// INITIALIZATION FUNCTIONS
// ======================================================

function initializeEventListeners() {
    // Admin login form
    const adminPasswordInput = document.getElementById('adminPassword');
    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginAdmin();
            }
        });
    }
    
    // Dashboard buttons
    const buttons = [
        'btnDashboard', 'btnGenerateCodes', 'btnStudentList',
        'btnLoginLogs', 'btnSettings', 'btnResetData',
        'btnExportData', 'btnSystemInfo'
    ];
    
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', function() {
                handleButtonClick(this.id);
            });
        }
    });
}

function loadInitialData() {
    // Load student data
    loadStudents();
    
    // Load existing exam codes
    loadExamCodes();
    
    // Load system stats
    updateSystemStats();
}

// ======================================================
// DATA LOADING FUNCTIONS
// ======================================================

async function loadStudents() {
    try {
        const response = await fetch('data/students.json');
        if (response.ok) {
            const data = await response.json();
            studentsData = data.students || [];
            console.log(`Loaded ${studentsData.length} students`);
        }
    } catch (error) {
        console.error('Error loading student data:', error);
        studentsData = [];
    }
}

function loadExamCodes() {
    const savedCodes = localStorage.getItem('examCodes');
    if (savedCodes) {
        try {
            examCodes = JSON.parse(savedCodes);
        } catch (error) {
            console.error('Error loading exam codes:', error);
            examCodes = {};
        }
    }
}

function saveExamCodes() {
    localStorage.setItem('examCodes', JSON.stringify(examCodes));
}

// ======================================================
// DASHBOARD FUNCTIONS
// ======================================================

function loadDashboard() {
    currentView = 'dashboard';
    updateNavigation();
    updateSystemStats();
    
    const content = document.getElementById('adminContent');
    if (!content) return;
    
    const stats = getSystemStats();
    
    content.innerHTML = `
        <div class="dashboard-header">
            <h4><i class="fas fa-tachometer-alt"></i> System Dashboard</h4>
            <p class="dashboard-subtitle">Welcome to GDSTC KHS Examination Portal Admin Panel</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card stat-primary">
                <div class="stat-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-content">
                    <h5>Total Students</h5>
                    <div class="stat-value">${stats.totalStudents}</div>
                    <div class="stat-label">Registered for exam</div>
                </div>
            </div>
            
            <div class="stat-card stat-success">
                <div class="stat-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-content">
                    <h5>Exams Completed</h5>
                    <div class="stat-value">${stats.completedExams}</div>
                    <div class="stat-label">Successfully submitted</div>
                </div>
            </div>
            
            <div class="stat-card stat-warning">
                <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-content">
                    <h5>In Progress</h5>
                    <div class="stat-value">${stats.activeExams}</div>
                    <div class="stat-label">Currently taking exam</div>
                </div>
            </div>
            
            <div class="stat-card stat-danger">
                <div class="stat-icon">
                    <i class="fas fa-times-circle"></i>
                </div>
                <div class="stat-content">
                    <h5>Failed Logins</h5>
                    <div class="stat-value">${stats.failedLogins}</div>
                    <div class="stat-label">Last 24 hours</div>
                </div>
            </div>
        </div>
        
        <div class="quick-actions">
            <h5><i class="fas fa-bolt"></i> Quick Actions</h5>
            <div class="action-buttons">
                <button onclick="generateExamCodes()" class="btn btn-sm btn-primary">
                    <i class="fas fa-key"></i> Generate Codes
                </button>
                <button onclick="exportStudentData()" class="btn btn-sm btn-success">
                    <i class="fas fa-download"></i> Export Data
                </button>
                <button onclick="clearLoginLogs()" class="btn btn-sm btn-warning">
                    <i class="fas fa-trash"></i> Clear Logs
                </button>
                <button onclick="showSystemInfo()" class="btn btn-sm btn-info">
                    <i class="fas fa-info-circle"></i> System Info
                </button>
            </div>
        </div>
        
        <div class="recent-activity">
            <h5><i class="fas fa-history"></i> Recent Activity</h5>
            <div id="recentActivityList" class="activity-list">
                Loading recent activity...
            </div>
        </div>
    `;
    
    // Load recent activity
    loadRecentActivity();
}

function getSystemStats() {
    const stats = {
        totalStudents: studentsData.length,
        completedExams: 0,
        activeExams: 0,
        failedLogins: 0,
        totalLogins: 0
    };
    
    // Count completed exams
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('exam_completed_') && localStorage.getItem(key) === 'true') {
            stats.completedExams++;
        }
    }
    
    // Count active exams (started but not completed)
    const startedExams = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key === 'examStartTime') {
            stats.activeExams++;
        }
    }
    
    // Count failed logins from logs
    const logs = JSON.parse(localStorage.getItem('loginLogs') || '[]');
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    logs.forEach(log => {
        if (log.status === 'FAILED') {
            const logTime = new Date(log.timestamp);
            if (logTime > last24Hours) {
                stats.failedLogins++;
            }
        }
    });
    
    stats.totalLogins = logs.length;
    
    return stats;
}

function updateSystemStats() {
    const stats = getSystemStats();
    
    // Update stats display if on dashboard
    if (currentView === 'dashboard') {
        document.querySelectorAll('.stat-value').forEach(el => {
            // Update will be handled when dashboard reloads
        });
    }
}

// ======================================================
// EXAM CODE MANAGEMENT
// ======================================================

function generateExamCodes() {
    if (studentsData.length === 0) {
        alert('No student data loaded. Please load students first.');
        return;
    }
    
    if (!confirm('Generate new exam codes for all students? This will replace existing codes.')) {
        return;
    }
    
    examCodes = {};
    
    studentsData.forEach(student => {
        if (student.active) {
            // Generate unique code: GDSTC-XXXXXX
            const code = 'GDSTC-' + 
                Math.random().toString(36).substr(2, 6).toUpperCase();
            examCodes[student.adminNumber] = code;
            
            // Update student data
            const studentIndex = studentsData.findIndex(s => 
                s.adminNumber === student.adminNumber);
            if (studentIndex !== -1) {
                studentsData[studentIndex].examCode = code;
            }
        }
    });
    
    // Save to localStorage
    saveExamCodes();
    
    // Save updated student data
    saveStudentData();
    
    // Show success message
    showNotification('Exam codes generated successfully!', 'success');
    
    // Update view
    if (currentView === 'studentList') {
        viewStudentList();
    }
    
    // Log activity
    logAdminActivity('GENERATE_CODES', `Generated ${Object.keys(examCodes).length} codes`);
}

function saveStudentData() {
    const updatedData = {
        students: studentsData
    };
    
    // In a real app, this would save to server
    // For now, save to localStorage
    localStorage.setItem('studentDataBackup', JSON.stringify(updatedData));
    
    // Note: To actually update students.json, you'd need server-side code
    console.log('Student data updated locally. Server update required for persistence.');
}

function exportExamCodes() {
    if (Object.keys(examCodes).length === 0) {
        alert('No exam codes generated yet.');
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Administration Number,Student Name,Class,Exam Code\n";
    
    studentsData.forEach(student => {
        if (student.active && examCodes[student.adminNumber]) {
            csvContent += `"${student.adminNumber}","${student.fullName}","${student.class}","${examCodes[student.adminNumber]}"\n`;
        }
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "gdstc_exam_codes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    logAdminActivity('EXPORT_CODES', 'Exported exam codes to CSV');
}

// ======================================================
// STUDENT MANAGEMENT
// ======================================================

function viewStudentList() {
    currentView = 'studentList';
    updateNavigation();
    
    const content = document.getElementById('adminContent');
    if (!content) return;
    
    let html = `
        <div class="view-header">
            <h4><i class="fas fa-users"></i> Student Management</h4>
            <div class="header-actions">
                <button onclick="exportStudentData()" class="btn btn-sm btn-success">
                    <i class="fas fa-download"></i> Export
                </button>
                <button onclick="addStudent()" class="btn btn-sm btn-primary">
                    <i class="fas fa-plus"></i> Add Student
                </button>
                <button onclick="refreshStudentList()" class="btn btn-sm btn-secondary">
                    <i class="fas fa-sync"></i> Refresh
                </button>
            </div>
        </div>
        
        <div class="search-box">
            <input type="text" id="studentSearch" placeholder="Search students..." 
                   onkeyup="filterStudentTable()">
            <select id="classFilter" onchange="filterStudentTable()">
                <option value="">All Classes</option>
                <option value="SS3A">SS3A</option>
                <option value="SS3B">SS3B</option>
                <option value="SS3C">SS3C</option>
                <option value="SS3D">SS3D</option>
            </select>
        </div>
        
        <div class="admin-table">
            <table id="studentTable">
                <thead>
                    <tr>
                        <th>Admin No.</th>
                        <th>Full Name</th>
                        <th>Username</th>
                        <th>Class</th>
                        <th>Status</th>
                        <th>Exam Code</th>
                        <th>Exam Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="studentTableBody">
                    ${generateStudentTableRows()}
                </tbody>
            </table>
        </div>
        
        <div class="table-summary">
            Showing <span id="studentCount">${studentsData.length}</span> students
        </div>
    `;
    
    content.innerHTML = html;
}

function generateStudentTableRows() {
    if (studentsData.length === 0) {
        return `<tr><td colspan="8" class="text-center">No student data available</td></tr>`;
    }
    
    let rows = '';
    
    studentsData.forEach((student, index) => {
        const examCompleted = localStorage.getItem(`exam_completed_${student.adminNumber}`) === 'true';
        const examCode = examCodes[student.adminNumber] || student.examCode || 'Not generated';
        
        rows += `
            <tr data-index="${index}" data-class="${student.class}" 
                data-admin="${student.adminNumber.toLowerCase()}" 
                data-name="${student.fullName.toLowerCase()}">
                <td>${student.adminNumber}</td>
                <td>${student.fullName}</td>
                <td>${student.username}</td>
                <td>${student.class}</td>
                <td>
                    <span class="status-badge ${student.active ? 'status-active' : 'status-inactive'}">
                        ${student.active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <code class="exam-code">${examCode}</code>
                    <button onclick="copyExamCode('${student.adminNumber}')" 
                            class="btn-copy" title="Copy code">
                        <i class="fas fa-copy"></i>
                    </button>
                </td>
                <td>
                    <span class="exam-status ${examCompleted ? 'status-completed' : 'status-pending'}">
                        ${examCompleted ? 'Completed' : 'Pending'}
                    </span>
                </td>
                <td>
                    <button onclick="editStudent(${index})" class="btn-action btn-edit" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="toggleStudentStatus(${index})" class="btn-action btn-toggle" title="Toggle Status">
                        <i class="fas fa-power-off"></i>
                    </button>
                    <button onclick="deleteStudent(${index})" class="btn-action btn-delete" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    return rows;
}

function filterStudentTable() {
    const searchInput = document.getElementById('studentSearch');
    const classFilter = document.getElementById('classFilter');
    const tableBody = document.getElementById('studentTableBody');
    
    if (!searchInput || !classFilter || !tableBody) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const selectedClass = classFilter.value;
    
    const rows = tableBody.getElementsByTagName('tr');
    let visibleCount = 0;
    
    for (let row of rows) {
        const admin = row.getAttribute('data-admin') || '';
        const name = row.getAttribute('data-name') || '';
        const studentClass = row.getAttribute('data-class') || '';
        
        const matchesSearch = admin.includes(searchTerm) || name.includes(searchTerm);
        const matchesClass = !selectedClass || studentClass === selectedClass;
        
        if (matchesSearch && matchesClass) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    }
    
    // Update count
    const countElement = document.getElementById('studentCount');
    if (countElement) {
        countElement.textContent = visibleCount;
    }
}

function copyExamCode(adminNumber) {
    const code = examCodes[adminNumber] || '';
    if (!code) {
        alert('No exam code for this student');
        return;
    }
    
    navigator.clipboard.writeText(code).then(() => {
        showNotification(`Copied: ${code}`, 'success');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy code');
    });
}

function toggleStudentStatus(index) {
    if (index < 0 || index >= studentsData.length) return;
    
    studentsData[index].active = !studentsData[index].active;
    
    // Update display
    if (currentView === 'studentList') {
        viewStudentList();
    }
    
    // Save changes
    saveStudentData();
    
    showNotification(`Student status updated`, 'info');
    logAdminActivity('TOGGLE_STUDENT', `Toggled status for ${studentsData[index].adminNumber}`);
}

function editStudent(index) {
    if (index < 0 || index >= studentsData.length) return;
    
    const student = studentsData[index];
    
    const content = document.getElementById('adminContent');
    content.innerHTML = `
        <div class="edit-form">
            <h4><i class="fas fa-edit"></i> Edit Student</h4>
            
            <form id="editStudentForm" onsubmit="saveStudentEdit(${index}); return false;">
                <div class="form-group">
                    <label>Administration Number</label>
                    <input type="text" value="${student.adminNumber}" 
                           id="editAdminNumber" required readonly>
                </div>
                
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" value="${student.fullName}" 
                           id="editFullName" required>
                </div>
                
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" value="${student.username}" 
                           id="editUsername" required>
                </div>
                
                <div class="form-group">
                    <label>Class</label>
                    <select id="editClass" required>
                        <option value="SS3A" ${student.class === 'SS3A' ? 'selected' : ''}>SS3A</option>
                        <option value="SS3B" ${student.class === 'SS3B' ? 'selected' : ''}>SS3B</option>
                        <option value="SS3C" ${student.class === 'SS3C' ? 'selected' : ''}>SS3C</option>
                        <option value="SS3D" ${student.class === 'SS3D' ? 'selected' : ''}>SS3D</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Status</label>
                    <select id="editStatus">
                        <option value="true" ${student.active ? 'selected' : ''}>Active</option>
                        <option value="false" ${!student.active ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Exam Code</label>
                    <input type="text" value="${student.examCode || ''}" 
                           id="editExamCode" placeholder="Auto-generate or enter manually">
                </div>
                
                <div class="form-actions">
                    <button type="button" onclick="viewStudentList()" class="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    `;
}

function saveStudentEdit(index) {
    const student = studentsData[index];
    
    student.fullName = document.getElementById('editFullName').value;
    student.username = document.getElementById('editUsername').value;
    student.class = document.getElementById('editClass').value;
    student.active = document.getElementById('editStatus').value === 'true';
    student.examCode = document.getElementById('editExamCode').value || student.examCode;
    
    // Update exam codes object
    if (student.examCode) {
        examCodes[student.adminNumber] = student.examCode;
        saveExamCodes();
    }
    
    // Save student data
    saveStudentData();
    
    // Return to student list
    viewStudentList();
    
    showNotification('Student updated successfully', 'success');
    logAdminActivity('EDIT_STUDENT', `Edited ${student.adminNumber}`);
}

function deleteStudent(index) {
    if (!confirm('Are you sure you want to delete this student?')) {
        return;
    }
    
    const student = studentsData[index];
    
    // Remove from array
    studentsData.splice(index, 1);
    
    // Remove exam code
    delete examCodes[student.adminNumber];
    saveExamCodes();
    
    // Save updated student data
    saveStudentData();
    
    // Update view
    if (currentView === 'studentList') {
        viewStudentList();
    }
    
    showNotification('Student deleted', 'warning');
    logAdminActivity('DELETE_STUDENT', `Deleted ${student.adminNumber}`);
}

function addStudent() {
    const content = document.getElementById('adminContent');
    content.innerHTML = `
        <div class="edit-form">
            <h4><i class="fas fa-user-plus"></i> Add New Student</h4>
            
            <form id="addStudentForm" onsubmit="saveNewStudent(); return false;">
                <div class="form-group">
                    <label>Administration Number *</label>
                    <input type="text" id="newAdminNumber" required 
                           pattern="GD[A-Z0-9]{5,10}"
                           title="Format: GD followed by 5-10 characters/numbers">
                </div>
                
                <div class="form-group">
                    <label>Full Name *</label>
                    <input type="text" id="newFullName" required>
                </div>
                
                <div class="form-group">
                    <label>Username *</label>
                    <input type="text" id="newUsername" required
                           pattern="[A-Za-z0-9]{3,20}">
                </div>
                
                <div class="form-group">
                    <label>Class *</label>
                    <select id="newClass" required>
                        <option value="">Select Class</option>
                        <option value="SS3A">SS3A</option>
                        <option value="SS3B">SS3B</option>
                        <option value="SS3C">SS3C</option>
                        <option value="SS3D">SS3D</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Exam Code</label>
                    <input type="text" id="newExamCode" 
                           placeholder="Leave empty to auto-generate">
                    <button type="button" onclick="generateSingleCode()" 
                            class="btn btn-sm btn-secondary">
                        Generate Code
                    </button>
                </div>
                
                <div class="form-actions">
                    <button type="button" onclick="viewStudentList()" class="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary">
                        Add Student
                    </button>
                </div>
            </form>
        </div>
    `;
}

function generateSingleCode() {
    const code = 'GDSTC-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    document.getElementById('newExamCode').value = code;
}

function saveNewStudent() {
    const adminNumber = document.getElementById('newAdminNumber').value.toUpperCase();
    const fullName = document.getElementById('newFullName').value;
    const username = document.getElementById('newUsername').value;
    const studentClass = document.getElementById('newClass').value;
    const examCode = document.getElementById('newExamCode').value;
    
    // Check if admin number already exists
    if (studentsData.some(s => s.adminNumber === adminNumber)) {
        alert('Administration number already exists!');
        return;
    }
    
    // Create new student
    const newStudent = {
        adminNumber,
        username,
        fullName,
        class: studentClass,
        active: true,
        examCode: examCode || null
    };
    
    // Add to array
    studentsData.push(newStudent);
    
    // Add exam code if provided
    if (examCode) {
        examCodes[adminNumber] = examCode;
        saveExamCodes();
    }
    
    // Save student data
    saveStudentData();
    
    // Return to student list
    viewStudentList();
    
    showNotification('Student added successfully', 'success');
    logAdminActivity('ADD_STUDENT', `Added ${adminNumber}`);
}

function refreshStudentList() {
    loadStudents();
    loadExamCodes();
    viewStudentList();
    showNotification('Student list refreshed', 'info');
}

// ======================================================
// LOG MANAGEMENT
// ======================================================

function viewLoginLogs() {
    currentView = 'logs';
    updateNavigation();
    
    const logs = JSON.parse(localStorage.getItem('loginLogs') || '[]');
    const adminLogs = JSON.parse(localStorage.getItem('adminLogs') || '[]');
    
    const content = document.getElementById('adminContent');
    content.innerHTML = `
        <div class="view-header">
            <h4><i class="fas fa-clipboard-list"></i> System Logs</h4>
            <div class="header-actions">
                <button onclick="clearLoginLogs()" class="btn btn-sm btn-warning">
                    <i class="fas fa-trash"></i> Clear Logs
                </button>
                <button onclick="exportLogs()" class="btn btn-sm btn-success">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>
        </div>
        
        <div class="log-tabs">
            <button class="log-tab active" onclick="switchLogTab('login')">Login Logs (${logs.length})</button>
            <button class="log-tab" onclick="switchLogTab('admin')">Admin Logs (${adminLogs.length})</button>
            <button class="log-tab" onclick="switchLogTab('system')">System Logs</button>
        </div>
        
        <div id="logContent" class="log-content">
            ${generateLoginLogsTable(logs)}
        </div>
    `;
}

function switchLogTab(tabType) {
    // Update tab buttons
    document.querySelectorAll('.log-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load appropriate content
    const logContent = document.getElementById('logContent');
    
    switch(tabType) {
        case 'login':
            const logs = JSON.parse(localStorage.getItem('loginLogs') || '[]');
            logContent.innerHTML = generateLoginLogsTable(logs);
            break;
            
        case 'admin':
            const adminLogs = JSON.parse(localStorage.getItem('adminLogs') || '[]');
            logContent.innerHTML = generateAdminLogsTable(adminLogs);
            break;
            
        case 'system':
            logContent.innerHTML = generateSystemLogs();
            break;
    }
}

function generateLoginLogsTable(logs) {
    if (logs.length === 0) {
        return '<div class="no-data">No login logs available</div>';
    }
    
    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    let html = `
        <div class="admin-table log-table">
            <table>
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Admin Number</th>
                        <th>Status</th>
                        <th>Platform</th>
                        <th>User Agent</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Show only last 100 logs
    const displayLogs = logs.slice(0, 100);
    
    displayLogs.forEach(log => {
        const time = new Date(log.timestamp).toLocaleString();
        const statusClass = log.status === 'SUCCESS' ? 'log-success' : 'log-failed';
        
        html += `
            <tr>
                <td>${time}</td>
                <td>${log.adminNumber || 'N/A'}</td>
                <td><span class="log-status ${statusClass}">${log.status}</span></td>
                <td>${log.platform || 'Unknown'}</td>
                <td class="user-agent">${log.userAgent ? log.userAgent.substring(0, 50) + '...' : 'N/A'}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div class="log-summary">
            Showing ${displayLogs.length} of ${logs.length} total logs
        </div>
    `;
    
    return html;
}

function generateAdminLogsTable(logs) {
    if (logs.length === 0) {
        return '<div class="no-data">No admin logs available</div>';
    }
    
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    let html = `
        <div class="admin-table log-table">
            <table>
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Action</th>
                        <th>Details</th>
                        <th>IP Address</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    logs.forEach(log => {
        const time = new Date(log.timestamp).toLocaleString();
        
        html += `
            <tr>
                <td>${time}</td>
                <td>${log.action}</td>
                <td>${log.details || 'N/A'}</td>
                <td>${log.ip || 'N/A'}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    return html;
}

function generateSystemLogs() {
    const systemInfo = {
        localStorage: localStorage.length,
        sessionStorage: sessionStorage.length,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateTime: new Date().toLocaleString()
    };
    
    let html = `
        <div class="system-info">
            <h5>System Information</h5>
            <table class="info-table">
                <tr><th>Item</th><th>Value</th></tr>
                <tr><td>Local Storage Items</td><td>${systemInfo.localStorage}</td></tr>
                <tr><td>Session Storage Items</td><td>${systemInfo.sessionStorage}</td></tr>
                <tr><td>Screen Resolution</td><td>${systemInfo.screen}</td></tr>
                <tr><td>Timezone</td><td>${systemInfo.timezone}</td></tr>
                <tr><td>Current Date/Time</td><td>${systemInfo.dateTime}</td></tr>
                <tr><td>Platform</td><td>${systemInfo.platform}</td></tr>
            </table>
            
            <h5 style="margin-top: 20px;">Local Storage Contents</h5>
            <div class="storage-contents">
    `;
    
    // Show localStorage contents (excluding sensitive data)
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key.includes('password') && !key.includes('Password')) {
            const value = localStorage.getItem(key);
            html += `<div class="storage-item"><strong>${key}:</strong> ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}</div>`;
        }
    }
    
    html += `</div></div>`;
    
    return html;
}

function clearLoginLogs() {
    if (!confirm('Clear all login logs? This cannot be undone.')) {
        return;
    }
    
    localStorage.removeItem('loginLogs');
    showNotification('Login logs cleared', 'warning');
    logAdminActivity('CLEAR_LOGS', 'Cleared all login logs');
    
    // Refresh log view
    if (currentView === 'logs') {
        viewLoginLogs();
    }
}

function exportLogs() {
    const logs = JSON.parse(localStorage.getItem('loginLogs') || '[]');
    
    if (logs.length === 0) {
        alert('No logs to export');
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,Admin Number,Status,Platform,User Agent\n";
    
    logs.forEach(log => {
        const time = new Date(log.timestamp).toLocaleString();
        csvContent += `"${time}","${log.adminNumber || ''}","${log.status}","${log.platform || ''}","${log.userAgent || ''}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "gdstc_login_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    logAdminActivity('EXPORT_LOGS', 'Exported login logs');
}

// ======================================================
// SETTINGS MANAGEMENT
// ======================================================

function viewSettings() {
    currentView = 'settings';
    updateNavigation();
    
    // Load current settings from auth.js (simulated)
    const currentPassword = "GDSTC2024@KAFINHAUSA"; // This should be loaded from config
    
    const content = document.getElementById('adminContent');
    content.innerHTML = `
        <div class="view-header">
            <h4><i class="fas fa-cogs"></i> System Settings</h4>
        </div>
        
        <div class="settings-form">
            <form id="settingsForm" onsubmit="saveSettings(); return false;">
                <div class="settings-section">
                    <h5><i class="fas fa-lock"></i> Security Settings</h5>
                    
                    <div class="form-group">
                        <label>School Access Password</label>
                        <input type="password" id="schoolPassword" 
                               value="${currentPassword}" required>
                        <div class="input-hint">Students need this to login</div>
                    </div>
                    
                    <div class="form-group">
                        <label>Admin Password</label>
                        <input type="password" id="adminPasswordNew" 
                               value="${ADMIN_CONFIG.ADMIN_PASSWORD}" required>
                        <div class="input-hint">For admin panel access</div>
                    </div>
                    
                    <div class="form-group">
                        <label>Max Login Attempts</label>
                        <input type="number" id="maxAttempts" value="5" min="1" max="10">
                    </div>
                </div>
                
                <div class="settings-section">
                    <h5><i class="fas fa-clock"></i> Exam Timing</h5>
                    
                    <div class="form-group">
                        <label>Exam Start Time</label>
                        <input type="datetime-local" id="examStart" 
                               value="2024-06-15T08:00">
                    </div>
                    
                    <div class="form-group">
                        <label>Exam End Time</label>
                        <input type="datetime-local" id="examEnd" 
                               value="2024-06-15T17:00">
                    </div>
                    
                    <div class="form-group">
                        <label>Exam Duration (minutes)</label>
                        <input type="number" id="examDuration" value="30" min="1" max="180">
                    </div>
                </div>
                
                <div class="settings-section">
                    <h5><i class="fas fa-database"></i> Data Management</h5>
                    
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="allowRetake" checked>
                        <label for="allowRetake">Allow exam retake (if enabled)</label>
                    </div>
                    
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="useStudentList" checked>
                        <label for="useStudentList">Use student verification list</label>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" onclick="loadDashboard()" class="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary">
                        Save Settings
                    </button>
                </div>
            </form>
        </div>
    `;
}

function saveSettings() {
    // Note: In a real implementation, this would save to a config file
    // For now, we'll show a message
    
    showNotification('Settings saved (Note: Requires manual update in js/auth.js)', 'info');
    logAdminActivity('SAVE_SETTINGS', 'Updated system settings');
}

// ======================================================
// DATA EXPORT FUNCTIONS
// ======================================================

function exportStudentData() {
    if (studentsData.length === 0) {
        alert('No student data to export');
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Admin Number,Full Name,Username,Class,Status,Exam Code,Exam Completed\n";
    
    studentsData.forEach(student => {
        const examCode = examCodes[student.adminNumber] || student.examCode || '';
        const examCompleted = localStorage.getItem(`exam_completed_${student.adminNumber}`) === 'true';
        
        csvContent += `"${student.adminNumber}","${student.fullName}","${student.username}","${student.class}","${student.active ? 'Active' : 'Inactive'}","${examCode}","${examCompleted ? 'Yes' : 'No'}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "gdstc_student_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Student data exported', 'success');
    logAdminActivity('EXPORT_DATA', 'Exported student data');
}

function exportAllData() {
    // Export combined data
    exportStudentData();
    exportExamCodes();
    exportLogs();
}

// ======================================================
// SYSTEM MANAGEMENT
// ======================================================

function resetExamData() {
    if (!confirm('WARNING: This will reset ALL exam data including student progress. Are you sure?')) {
        return;
    }
    
    if (!confirm('This cannot be undone. Type "RESET" to confirm:')) {
        return;
    }
    
    // Clear all exam-related data
    const keysToKeep = ['adminLoggedIn', 'studentDataBackup', 'examCodes', 'loginLogs', 'adminLogs'];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!keysToKeep.includes(key) && 
            !key.startsWith('student') && 
            !key.startsWith('admin')) {
            localStorage.removeItem(key);
        }
    }
    
    // Clear session storage
    sessionStorage.clear();
    
    showNotification('Exam data reset successfully', 'success');
    logAdminActivity('RESET_DATA', 'Reset all exam data');
    
    // Reload dashboard
    loadDashboard();
}

function showSystemInfo() {
    currentView = 'systemInfo';
    updateNavigation();
    
    const stats = getSystemStats();
    const storageUsage = calculateStorageUsage();
    
    const content = document.getElementById('adminContent');
    content.innerHTML = `
        <div class="view-header">
            <h4><i class="fas fa-info-circle"></i> System Information</h4>
        </div>
        
        <div class="system-info-container">
            <div class="info-card">
                <h5><i class="fas fa-microchip"></i> System Status</h5>
                <table class="info-table">
                    <tr><td>Portal Version</td><td>${ADMIN_CONFIG.VERSION}</td></tr>
                    <tr><td>School</td><td>${ADMIN_CONFIG.SCHOOL_NAME}</td></tr>
                    <tr><td>Current Time</td><td>${new Date().toLocaleString()}</td></tr>
                    <tr><td>Timezone</td><td>${Intl.DateTimeFormat().resolvedOptions().timeZone}</td></tr>
                    <tr><td>Browser</td><td>${navigator.userAgent.split(') ')[0].split('(')[1]}</td></tr>
                </table>
            </div>
            
            <div class="info-card">
                <h5><i class="fas fa-database"></i> Storage Information</h5>
                <table class="info-table">
                    <tr><td>LocalStorage Usage</td><td>${storageUsage.localStorage}</td></tr>
                    <tr><td>SessionStorage Usage</td><td>${storageUsage.sessionStorage}</td></tr>
                    <tr><td>Total Keys</td><td>${localStorage.length}</td></tr>
                    <tr><td>Available Space</td><td>≈ 5MB (typical)</td></tr>
                </table>
            </div>
            
            <div class="info-card">
                <h5><i class="fas fa-chart-bar"></i> Statistics</h5>
                <table class="info-table">
                    <tr><td>Total Students</td><td>${stats.totalStudents}</td></tr>
                    <tr><td>Exams Completed</td><td>${stats.completedExams}</td></tr>
                    <tr><td>Active Sessions</td><td>${stats.activeExams}</td></tr>
                    <tr><td>Total Logins</td><td>${stats.totalLogins}</td></tr>
                    <tr><td>Failed Logins (24h)</td><td>${stats.failedLogins}</td></tr>
                </table>
            </div>
            
            <div class="info-card full-width">
                <h5><i class="fas fa-tools"></i> System Maintenance</h5>
                <div class="maintenance-actions">
                    <button onclick="clearBrowserCache()" class="btn btn-warning">
                        <i class="fas fa-broom"></i> Clear Browser Cache
                    </button>
                    <button onclick="backupSystem()" class="btn btn-primary">
                        <i class="fas fa-save"></i> Backup System Data
                    </button>
                    <button onclick="runSystemDiagnostics()" class="btn btn-info">
                        <i class="fas fa-stethoscope"></i> Run Diagnostics
                    </button>
                </div>
            </div>
        </div>
    `;
}

function calculateStorageUsage() {
    let localStorageSize = 0;
    let sessionStorageSize = 0;
    
    // Calculate localStorage size
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        localStorageSize += key.length + value.length;
    }
    
    // Calculate sessionStorage size
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        sessionStorageSize += key.length + value.length;
    }
    
    return {
        localStorage: formatBytes(localStorageSize),
        sessionStorage: formatBytes(sessionStorageSize)
    };
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function clearBrowserCache() {
    if (confirm('Clear browser cache? This will not affect exam data.')) {
        // Note: Cannot directly clear browser cache from JavaScript
        // This is just for user instruction
        showNotification('To clear cache: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)', 'info');
    }
}

function backupSystem() {
    // Create backup of all data
    const backup = {
        timestamp: new Date().toISOString(),
        students: studentsData,
        examCodes: examCodes,
        loginLogs: JSON.parse(localStorage.getItem('loginLogs') || '[]'),
        adminLogs: JSON.parse(localStorage.getItem('adminLogs') || '[]'),
        examData: {}
    };
    
    // Collect exam completion data
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('exam_completed_')) {
            backup.examData[key] = localStorage.getItem(key);
        }
    }
    
    // Convert to JSON and create download
    const dataStr = JSON.stringify(backup, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `gdstc_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('System backup created', 'success');
    logAdminActivity('BACKUP_SYSTEM', 'Created system backup');
}

function runSystemDiagnostics() {
    const diagnostics = {
        localStorage: localStorage.length > 0,
        sessionStorage: sessionStorage.length > 0,
        studentsData: studentsData.length > 0,
        examCodes: Object.keys(examCodes).length > 0,
        authConfig: typeof SECURITY_CONFIG !== 'undefined',
        internet: navigator.onLine
    };
    
    let results = '<h5>Diagnostic Results:</h5><ul>';
    
    Object.entries(diagnostics).forEach(([key, value]) => {
        results += `<li>${key}: <span class="${value ? 'status-active' : 'status-inactive'}">${value ? '✓ OK' : '✗ FAILED'}</span></li>`;
    });
    
    results += '</ul>';
    
    showNotification(results, 'info');
}

// ======================================================
// HELPER FUNCTIONS
// ======================================================

function handleButtonClick(buttonId) {
    switch(buttonId) {
        case 'btnDashboard':
            loadDashboard();
            break;
        case 'btnGenerateCodes':
            generateExamCodes();
            break;
        case 'btnStudentList':
            viewStudentList();
            break;
        case 'btnLoginLogs':
            viewLoginLogs();
            break;
        case 'btnSettings':
            viewSettings();
            break;
        case 'btnResetData':
            resetExamData();
            break;
        case 'btnExportData':
            exportAllData();
            break;
        case 'btnSystemInfo':
            showSystemInfo();
            break;
    }
}

function updateNavigation() {
    // Update active state of navigation buttons
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === `btn${currentView.charAt(0).toUpperCase() + currentView.slice(1)}`) {
            btn.classList.add('active');
        }
    });
}

function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.admin-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `admin-notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.querySelector('.admin-dashboard').appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    // Add styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .admin-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 300px;
                max-width: 500px;
                z-index: 9999;
                animation: slideIn 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .notification-success {
                background-color: #c6f6d5;
                color: #276749;
                border-left: 4px solid #38a169;
            }
            .notification-error {
                background-color: #fed7d7;
                color: #9b2c2c;
                border-left: 4px solid #e53e3e;
            }
            .notification-warning {
                background-color: #feebc8;
                color: #9c4221;
                border-left: 4px solid #ed8936;
            }
            .notification-info {
                background-color: #bee3f8;
                color: #2c5282;
                border-left: 4px solid #4299e1;
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .notification-close {
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
        document.head.appendChild(styles);
    }
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

function logAdminActivity(action, details = '') {
    const logs = JSON.parse(localStorage.getItem('adminLogs') || '[]');
    
    logs.push({
        action,
        details,
        timestamp: new Date().toISOString(),
        admin: 'system'
    });
    
    // Keep only last 100 logs
    if (logs.length > 100) {
        logs.shift();
    }
    
    localStorage.setItem('adminLogs', JSON.stringify(logs));
}

function loadRecentActivity() {
    const logs = JSON.parse(localStorage.getItem('adminLogs') || '[]');
    const recentLogs = logs.slice(-5).reverse(); // Last 5 logs
    
    const activityList = document.getElementById('recentActivityList');
    if (!activityList) return;
    
    if (recentLogs.length === 0) {
        activityList.innerHTML = '<div class="no-activity">No recent activity</div>';
        return;
    }
    
    let html = '';
    recentLogs.forEach(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        html += `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${getActivityIcon(log.action)}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-action">${log.action}</div>
                    <div class="activity-time">${time}</div>
                </div>
            </div>
        `;
    });
    
    activityList.innerHTML = html;
}

function getActivityIcon(action) {
    if (action.includes('LOGIN')) return 'sign-in-alt';
    if (action.includes('LOGOUT')) return 'sign-out-alt';
    if (action.includes('GENERATE')) return 'key';
    if (action.includes('EDIT') || action.includes('ADD') || action.includes('DELETE')) return 'user-edit';
    if (action.includes('EXPORT')) return 'download';
    if (action.includes('RESET') || action.includes('CLEAR')) return 'trash';
    return 'cog';
}

// ======================================================
// STYLES FOR ADMIN PANEL
// ======================================================

// Add these styles to your CSS file
function addAdminStyles() {
    if (!document.querySelector('#admin-styles')) {
        const styles = document.createElement('style');
        styles.id = 'admin-styles';
        styles.textContent = `
            /* Admin Panel Styles */
            .dashboard-header {
                margin-bottom: 30px;
            }
            
            .dashboard-subtitle {
                color: #718096;
                margin-top: 5px;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .stat-card {
                background: white;
                border-radius: 10px;
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .stat-primary { border-left: 4px solid #4299e1; }
            .stat-success { border-left: 4px solid #38a169; }
            .stat-warning { border-left: 4px solid #ed8936; }
            .stat-danger { border-left: 4px solid #e53e3e; }
            
            .stat-icon {
                font-size: 2.5rem;
                color: #cbd5e0;
            }
            
            .stat-value {
                font-size: 2rem;
                font-weight: bold;
                color: #2d3748;
            }
            
            .stat-label {
                color: #718096;
                font-size: 0.9rem;
            }
            
            .quick-actions {
                background: #f7fafc;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 30px;
            }
            
            .action-buttons {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .recent-activity {
                background: white;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .activity-list {
                margin-top: 15px;
            }
            
            .activity-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 10px 0;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .activity-item:last-child {
                border-bottom: none;
            }
            
            .activity-icon {
                background: #edf2f7;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #4a5568;
            }
            
            .activity-action {
                font-weight: 500;
                color: #2d3748;
            }
            
            .activity-time {
                font-size: 0.85rem;
                color: #718096;
            }
            
            .view-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                flex-wrap: wrap;
                gap: 15px;
            }
            
            .header-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .search-box {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            
            .search-box input, .search-box select {
                padding: 10px 15px;
                border: 1px solid #cbd5e0;
                border-radius: 5px;
                font-size: 1rem;
            }
            
            .search-box input {
                flex: 1;
                min-width: 200px;
            }
            
            .table-summary {
                margin-top: 15px;
                color: #718096;
                font-size: 0.9rem;
            }
            
            .status-badge {
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 0.85rem;
                font-weight: 500;
            }
            
            .status-active {
                background: #c6f6d5;
                color: #276749;
            }
            
            .status-inactive {
                background: #fed7d7;
                color: #9b2c2c;
            }
            
            .status-completed {
                color: #38a169;
                font-weight: 500;
            }
            
            .status-pending {
                color: #d69e2e;
                font-weight: 500;
            }
            
            .exam-code {
                background: #edf2f7;
                padding: 4px 8px;
                border-radius: 4px;
                font-family: monospace;
            }
            
            .btn-copy {
                background: none;
                border: none;
                color: #718096;
                cursor: pointer;
                padding: 0 5px;
            }
            
            .btn-copy:hover {
                color: #4299e1;
            }
            
            .btn-action {
                background: none;
                border: none;
                cursor: pointer;
                padding: 5px;
                margin: 0 2px;
                border-radius: 4px;
            }
            
            .btn-edit { color: #4299e1; }
            .btn-edit:hover { background: #ebf8ff; }
            
            .btn-toggle { color: #d69e2e; }
            .btn-toggle:hover { background: #fffaf0; }
            
            .btn-delete { color: #e53e3e; }
            .btn-delete:hover { background: #fff5f5; }
            
            .log-tabs {
                display: flex;
                gap: 0;
                margin-bottom: 20px;
                border-bottom: 2px solid #e2e8f0;
            }
            
            .log-tab {
                padding: 10px 20px;
                background: none;
                border: none;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                margin-bottom: -2px;
            }
            
            .log-tab.active {
                border-bottom-color: #4299e1;
                color: #4299e1;
                font-weight: 500;
            }
            
            .log-table {
                max-height: 500px;
                overflow-y: auto;
            }
            
            .log-status {
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 0.85rem;
                font-weight: 500;
            }
            
            .log-success {
                background: #c6f6d5;
                color: #276749;
            }
            
            .log-failed {
                background: #fed7d7;
                color: #9b2c2c;
            }
            
            .user-agent {
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .no-data, .no-activity {
                text-align: center;
                padding: 40px;
                color: #a0aec0;
                font-style: italic;
            }
            
            .settings-section {
                background: white;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .checkbox-group {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .checkbox-group input {
                width: auto;
            }
            
            .system-info-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
            }
            
            .info-card {
                background: white;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .info-card.full-width {
                grid-column: 1 / -1;
            }
            
            .info-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .info-table tr {
                border-bottom: 1px solid #e2e8f0;
            }
            
            .info-table tr:last-child {
                border-bottom: none;
            }
            
            .info-table td, .info-table th {
                padding: 10px;
                text-align: left;
            }
            
            .info-table th {
                color: #718096;
                font-weight: 500;
                width: 40%;
            }
            
            .storage-contents {
                max-height: 200px;
                overflow-y: auto;
                background: #f7fafc;
                padding: 15px;
                border-radius: 5px;
                margin-top: 10px;
            }
            
            .storage-item {
                padding: 8px 0;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .storage-item:last-child {
                border-bottom: none;
            }
            
            .maintenance-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .text-center {
                text-align: center;
            }
            
            .btn-sm {
                padding: 8px 16px;
                font-size: 0.9rem;
            }
            
            .hidden {
                display: none;
            }
            
            @media (max-width: 768px) {
                .stats-grid {
                    grid-template-columns: 1fr;
                }
                
                .view-header {
                    flex-direction: column;
                    align-items: flex-start;
                }
                
                .header-actions {
                    width: 100%;
                }
                
                .system-info-container {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(styles);
    }
}

// Initialize styles when admin panel loads
addAdminStyles();

// ======================================================
// PUBLIC API
// ======================================================

// Make functions available globally
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.generateExamCodes = generateExamCodes;
window.viewStudentList = viewStudentList;
window.viewLoginLogs = viewLoginLogs;
window.viewSettings = viewSettings;
window.resetExamData = resetExamData;
window.exportStudentData = exportStudentData;
window.showSystemInfo = showSystemInfo;
window.copyExamCode = copyExamCode;
window.editStudent = editStudent;
window.toggleStudentStatus = toggleStudentStatus;
window.deleteStudent = deleteStudent;
window.addStudent = addStudent;
window.saveStudentEdit = saveStudentEdit;
window.saveNewStudent = saveNewStudent;
window.refreshStudentList = refreshStudentList;
window.switchLogTab = switchLogTab;
window.clearLoginLogs = clearLoginLogs;
window.exportLogs = exportLogs;
window.saveSettings = saveSettings;
window.exportAllData = exportAllData;
window.clearBrowserCache = clearBrowserCache;
window.backupSystem = backupSystem;
window.runSystemDiagnostics = runSystemDiagnostics;
window.filterStudentTable = filterStudentTable;
window.generateSingleCode = generateSingleCode;

