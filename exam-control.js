// Exam control and monitoring functions
document.addEventListener('DOMContentLoaded', function() {
    // Prevent accidental page refresh/closing during exam
    if (window.location.pathname.includes('exam.html')) {
        setupExamProtection();
    }
});

function setupExamProtection() {
    // Warn user before leaving the exam page
    window.addEventListener('beforeunload', function(e) {
        const examInProgress = localStorage.getItem('examStartTime') && 
                               !localStorage.getItem('examCompleted');
        
        if (examInProgress) {
            e.preventDefault();
            e.returnValue = 'Are you sure you want to leave? Your examination may be submitted automatically.';
            return e.returnValue;
        }
    });
    
    // Detect page visibility changes (tab switching)
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Page is hidden (user switched tabs)
            logTabSwitch();
        }
    });
    
    // Detect window resize (potential attempt to open dev tools)
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    
    window.addEventListener('resize', function() {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        
        // If size changed significantly without user interaction
        if (Math.abs(newWidth - lastWidth) > 100 || 
            Math.abs(newHeight - lastHeight) > 100) {
            logSuspiciousActivity('Window resized significantly during exam');
        }
        
        lastWidth = newWidth;
        lastHeight = newHeight;
    });
    
    // Prevent right-click (context menu)
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        logSuspiciousActivity('Right-click attempted during exam');
        return false;
    });
    
    // Prevent keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
            (e.ctrlKey && e.key === 'u')) {
            e.preventDefault();
            logSuspiciousActivity(`Keyboard shortcut blocked: ${e.key}`);
            return false;
        }
    });
}

function logTabSwitch() {
    const adminNumber = localStorage.getItem('studentAdminNumber');
    const timestamp = new Date().toISOString();
    
    // In a real application, this would be sent to a server
    console.warn(`[EXAM WARNING] Student ${adminNumber} switched tabs at ${timestamp}`);
    
    // Store locally for reference
    const warnings = JSON.parse(localStorage.getItem('examWarnings') || '[]');
    warnings.push({
        type: 'tab_switch',
        timestamp: timestamp,
        adminNumber: adminNumber
    });
    localStorage.setItem('examWarnings', JSON.stringify(warnings));
}

function logSuspiciousActivity(activity) {
    const adminNumber = localStorage.getItem('studentAdminNumber');
    const timestamp = new Date().toISOString();
    
    console.warn(`[EXAM ALERT] ${activity} - Student: ${adminNumber}, Time: ${timestamp}`);
    
    const warnings = JSON.parse(localStorage.getItem('examWarnings') || '[]');
    warnings.push({
        type: 'suspicious_activity',
        activity: activity,
        timestamp: timestamp,
        adminNumber: adminNumber
    });
    localStorage.setItem('examWarnings', JSON.stringify(warnings));
}

// Function to manually submit exam (for emergency)
function emergencySubmitExam() {
    if (confirm('Are you sure you want to submit your examination now? This cannot be undone.')) {
        completeExam();
        window.location.href = 'thankyou.html';
    }
}

