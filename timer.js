// Timer functionality for examination
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'profile.html') {
        initializeProfileTimer();
    } else if (currentPage === 'exam.html') {
        initializeExamTimer();
    }
});

function initializeProfileTimer() {
    // Display static timer on profile page
    const timerElement = document.getElementById('countdownTimer');
    if (timerElement) {
        timerElement.textContent = '30:00';
    }
}

function initializeExamTimer() {
    const timerElement = document.getElementById('examTimer');
    const timerStatus = document.getElementById('timerStatus');
    const adminNumber = localStorage.getItem('studentAdminNumber');
    
    if (!timerElement || !adminNumber) {
        console.error('Timer elements or student data not found');
        return;
    }
    
    // Check if exam already started
    let examStartTime = localStorage.getItem('examStartTime');
    let examEndTime = localStorage.getItem('examEndTime');
    
    if (!examStartTime) {
        // Start new exam
        examStartTime = new Date().toISOString();
        localStorage.setItem('examStartTime', examStartTime);
        
        // Calculate end time (30 minutes from now)
        const endTime = new Date(new Date(examStartTime).getTime() + 30 * 60000);
        examEndTime = endTime.toISOString();
        localStorage.setItem('examEndTime', examEndTime);
    }
    
    // Start countdown
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    
    function updateTimer() {
        const now = new Date();
        const end = new Date(examEndTime);
        const timeRemaining = end - now;
        
        if (timeRemaining <= 0) {
            // Time's up
            clearInterval(timerInterval);
            timerElement.textContent = '00:00';
            timerElement.className = 'timer-display timer-warning';
            timerStatus.textContent = 'Time expired! Submitting examination...';
            timerStatus.className = 'timer-warning';
            
            // Mark exam as completed
            completeExam();
            
            // Redirect to thank you page after delay
            setTimeout(() => {
                window.location.href = 'thankyou.html';
            }, 3000);
            
            return;
        }
        
        // Calculate minutes and seconds
        const minutes = Math.floor(timeRemaining / 60000);
        const seconds = Math.floor((timeRemaining % 60000) / 1000);
        
        // Format display
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timerElement.textContent = formattedTime;
        
        // Update status based on time remaining
        if (minutes < 5) {
            timerElement.className = 'timer-display timer-warning';
            timerStatus.textContent = `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
            timerStatus.className = 'timer-warning';
        } else if (minutes < 10) {
            timerStatus.textContent = `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
            timerStatus.className = '';
        } else {
            timerStatus.textContent = 'Examination in progress';
            timerStatus.className = '';
        }
    }
    
    // Redirect to Google Forms after 5 seconds
    setTimeout(() => {
        redirectToGoogleForm();
    }, 5000);
}

function redirectToGoogleForm() {
    const adminNumber = localStorage.getItem('studentAdminNumber');
    const username = localStorage.getItem('studentUsername');
    
    // Replace with your actual Google Forms URL
    const googleFormUrl = 'https://forms.google.com/your-form-link-here';
    
    // Add student ID as a parameter for tracking
    const redirectUrl = `${googleFormUrl}?entry.1234567890=${encodeURIComponent(adminNumber)}&entry.0987654321=${encodeURIComponent(username)}`;
    
    // Open Google Forms in a new tab
    window.open(redirectUrl, '_blank');
    
    // Update redirect countdown
    let countdown = 5;
    const countdownElement = document.getElementById('redirectCountdown');
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = `Examination window opened. You can close this info page.`;
        }
        if (countdown <= 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);
}

function forceRedirect() {
    redirectToGoogleForm();
}

function completeExam() {
    const adminNumber = localStorage.getItem('studentAdminNumber');
    const studentKey = `exam_completed_${adminNumber}`;
    
    // Mark exam as completed
    localStorage.setItem(studentKey, 'true');
    localStorage.setItem('examCompleted', 'true');
    localStorage.setItem('examSubmissionTime', new Date().toISOString());
    
    // Clear timer data
    localStorage.removeItem('examStartTime');
    localStorage.removeItem('examEndTime');
}

