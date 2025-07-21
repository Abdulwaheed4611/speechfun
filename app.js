// Global variables
let currentUser = null;
let currentModule = null;
let currentWordIndex = 0;
let moduleProgress = 0;

// Voice detection variables
let audioContext = null;
let microphone = null;
let analyser = null;
let dataArray = null;
let isListening = false;
let animationId = null;

// Free Play specific variables
let bouncingBalls = [];
const numberOfBalls = 200;
const minBallSize = 30; // pixels
const maxBallSize = 60; // pixels

// Physics constants for bouncing balls
const GROUND_Y_OFFSET = 20; // pixels from the container bottom where the bottom of the ball sits
const GRAVITY = -0.8; // pixels/frame^2, negative as it pulls Y (center) down
const BOUNCE_DAMPING = 0.8; // velocity retention on vertical bounce (0 to 1)
const WALL_DAMPING = 0.9; // velocity retention on horizontal wall bounce (0 to 1)
const VOICE_IMPULSE_MIN = 15; // Min upward velocity added by voice (pixels/frame)
const VOICE_IMPULSE_MAX = 45; // Max upward velocity added by voice (pixels/frame)
const VOLUME_THRESHOLD_MIN = 10; // Min raw volume for any impulse
const VOLUME_THRESHOLD_MAX = 100; // Max raw volume for full impulse

// Sample words for different modules
const moduleWords = {
    'pronunciation': ['Hello', 'Beautiful', 'Butterfly', 'Rainbow', 'Elephant', 'Strawberry'],
    'sound-matching': ['Cat', 'Dog', 'Bird', 'Fish', 'Lion', 'Bear'],
    'word-repetition': ['Apple', 'Orange', 'Banana', 'Grape', 'Cherry', 'Peach'],
    'sentence-building': ['I am happy', 'The cat runs', 'Birds can fly', 'We love books', 'Sun is bright', 'Flowers smell nice']
};

// Tab switching functionality
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab and mark button as active
    document.getElementById(tabName + '-tab').classList.add('active');
    // Find the correct tab button based on tabName (e.g., 'login' -> 'login-tab')
    // This assumes the button's text or a data attribute matches the tabName.
    // For the current HTML, it relies on the event.target which is implicit in inline onclick.
    // A more robust way would be to pass the button element or find it based on ID/class.
    // Since the original code relies on `event.target` from the inline `onclick`, we keep it.
    if (event && event.target && event.target.classList.contains('tab-button')) {
        event.target.classList.add('active');
    } else {
        // Fallback if not called from an immediate click event (e.g., programmatically)
        document.querySelector(`.tab-button[onclick*="switchTab('${tabName}')"]`).classList.add('active');
    }
}

// Show age field for patients during signup
function initializeSignupForm() {
    // Handle role change to show/hide age field
    document.getElementById('signup-role').addEventListener('change', function() {
        const ageGroup = document.getElementById('age-group');
        if (this.value === 'patient') {
            ageGroup.style.display = 'block';
        } else {
            ageGroup.style.display = 'none';
        }
    });

    // Handle form submission
    document.getElementById('signup-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const role = document.getElementById('signup-role').value;
        const age = document.getElementById('signup-age').value;
        
        // Simple validation
        if (username && email && password && role) {
            if (role === 'patient' && !age) {
                showFeedback('Please enter age for patient account', 'error');
                return;
            }
            
            currentUser = {
                username: username,
                email: email,
                role: role,
                age: age,
                signupTime: new Date()
            };
            
            showDashboard();
            showFeedback('Account created successfully! Welcome!', 'success');
        } else {
            showFeedback('Please fill in all required fields', 'error');
        }
    });
}

// Login form handler
function initializeLoginForm() {
    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const role = document.getElementById('login-role').value;
        
        // Simple validation (in real app, this would be server-side)
        if (username && password && role) {
            currentUser = {
                username: username,
                role: role,
                loginTime: new Date()
            };
            
            showDashboard();
            showFeedback('Login successful! Welcome back!', 'success');
        } else {
            showFeedback('Please fill in all fields', 'error');
        }
    });
}

// Show dashboard after login/signup
function showDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dashboard-section').classList.add('active');
    
    // Update welcome message
    const avatar = document.getElementById('user-avatar');
    const welcomeMessage = document.getElementById('welcome-message');
    const userInfo = document.getElementById('user-info');
    
    if (currentUser.role === 'therapist') {
        avatar.innerHTML = '<i class="fas fa-user-md"></i>';
        welcomeMessage.textContent = `Welcome, Dr. ${currentUser.username}!`;
        userInfo.textContent = 'Ready to help your patients today?';
    } else {
        avatar.innerHTML = '<i class="fas fa-child"></i>';
        welcomeMessage.textContent = `Hi there, ${currentUser.username}!`;
        userInfo.textContent = 'Ready for some fun speech practice?';
    }
}

// Start a therapy module
function startModule(moduleName) {
    currentModule = moduleName;
    currentWordIndex = 0;
    moduleProgress = 0;
    
    document.getElementById('dashboard-section').classList.remove('active');
    document.getElementById('exercise-section').classList.add('active');
    
    // Update exercise title
    const titles = {
        'pronunciation': 'Pronunciation Practice',
        'sound-matching': 'Sound Matching Game',
        'word-repetition': 'Word Repetition Exercise',
        'sentence-building': 'Sentence Building Challenge'
    };
    
    document.getElementById('exercise-title').textContent = titles[moduleName];
    loadCurrentWord();
    updateProgress();
}

// Load current word for the exercise
function loadCurrentWord() {
    const words = moduleWords[currentModule];
    if (words && currentWordIndex < words.length) {
        document.getElementById('current-word').textContent = words[currentWordIndex];
    } else {
        // Exercise completed
        showFeedback('Great job! You completed this exercise!', 'success');
        setTimeout(() => {
            backToDashboard();
        }, 2000);
    }
}

// Play current word audio
function playWord() {
    const word = document.getElementById('current-word').textContent;
    
    // Use Web Speech API for text-to-speech
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.rate = 0.8;
        utterance.pitch = 1.2;
        utterance.voice = speechSynthesis.getVoices().find(voice => voice.name.includes('female')) || speechSynthesis.getVoices()[0];
        speechSynthesis.speak(utterance);
        
        // Animate word display
        const wordDisplay = document.getElementById('current-word');
        wordDisplay.style.color = '#e74c3c';
        setTimeout(() => {
            wordDisplay.style.color = '#2c3e50';
        }, 1000);
    } else {
        showFeedback('Audio not supported in this browser', 'error');
    }
}

// Record speech (simulated)
function recordSpeech() {
    // event.target refers to the button clicked, so .closest is redundant but harmless.
    const recordBtn = event.target;
    recordBtn.style.background = '#c0392b';
    recordBtn.innerHTML = '<i class="fas fa-stop"></i>';
    
    // Simulate recording
    setTimeout(() => {
        recordBtn.style.background = '#e74c3c';
        recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        
        // Simulate speech recognition feedback
        const feedback = ['Great pronunciation!', 'Well done!', 'Perfect!', 'Excellent job!', 'Keep it up!'];
        const randomFeedback = feedback[Math.floor(Math.random() * feedback.length)];
        showFeedback(randomFeedback, 'success');
        
        // Auto-advance after successful recording
        setTimeout(nextWord, 1500);
    }, 2000);
}

// Move to next word
function nextWord() {
    currentWordIndex++;
    moduleProgress = (currentWordIndex / moduleWords[currentModule].length) * 100;
    updateProgress();
    loadCurrentWord();
}

// Update progress bar
function updateProgress() {
    document.getElementById('progress-fill').style.width = moduleProgress + '%';
}

// Show feedback messages
function showFeedback(message, type) {
    const feedbackArea = document.getElementById('feedback-area');
    const feedbackMessage = document.getElementById('feedback-message');
    
    feedbackMessage.textContent = message;
    feedbackMessage.style.color = type === 'success' ? '#27ae60' : '#e74c3c';
    feedbackMessage.style.fontSize = '1.2rem';
    feedbackMessage.style.fontWeight = '600';
    
    // Animate feedback
    feedbackArea.style.transform = 'scale(1.05)';
    setTimeout(() => {
        feedbackArea.style.transform = 'scale(1)';
    }, 200);
    
    // Clear feedback after 3 seconds
    setTimeout(() => {
        feedbackMessage.textContent = '';
    }, 3000);
}

// Back to dashboard from free play
function backToDashboardFromFreePlay() {
    if (isListening) {
        stopVoiceDetection();
    }
    // Clear balls from the container when leaving free play
    const playContainer = document.getElementById('play-container');
    bouncingBalls.forEach(ball => ball.element.remove());
    bouncingBalls = []; // Clear the array
    
    document.getElementById('free-play-section').classList.remove('active');
    document.getElementById('dashboard-section').classList.add('active');
}

// Update the existing backToDashboard function to handle free play
function backToDashboard() {
    if (document.getElementById('free-play-section').classList.contains('active')) {
        backToDashboardFromFreePlay();
        return;
    }
    
    document.getElementById('exercise-section').classList.remove('active');
    document.getElementById('dashboard-section').classList.add('active');
}

// View progress (simulated)
function viewProgress() {
    alert('Progress Report:\n\n' +
          'Pronunciation: 85% Complete\n' +
          'Sound Matching: 67% Complete\n' +
          'Word Repetition: 92% Complete\n' +
          'Sentence Building: 45% Complete\n\n' +
          'Total Sessions: 24\n' +
          'Average Score: 87%');
}

// Free play mode with voice detection
function playFreeMode() {
    document.getElementById('dashboard-section').classList.remove('active');
    document.getElementById('free-play-section').classList.add('active');
    createBouncingBalls(); // Create balls when entering free play
}

// Function to create bouncing balls
function createBouncingBalls() {
    const playContainer = document.getElementById('play-container');
    const containerRect = playContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // Remove any existing balls first (in case of re-entry)
    bouncingBalls.forEach(ball => ball.element.remove());
    bouncingBalls = [];

    for (let i = 0; i < numberOfBalls; i++) {
        const ball = document.createElement('div');
        ball.classList.add('bouncing-ball');

        // Random size
        const size = Math.floor(Math.random() * (maxBallSize - minBallSize + 1)) + minBallSize;
        const radius = size / 2;
        ball.style.width = `${size}px`;
        ball.style.height = `${size}px`;

        // Random color
        ball.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;

        // Initial horizontal position (center of ball), ensuring it's within bounds
        let initialX = Math.random() * (containerWidth - size) + radius; 
        
        // Initial vertical position (center of ball), starting them slightly above the ground
        let initialY = GROUND_Y_OFFSET + radius + (Math.random() * 50); // Start slightly above ground, some variation

        // Random initial horizontal velocity
        const initialVX = (Math.random() - 0.5) * 6; // -3 to 3 pixels/frame

        // Random initial vertical velocity (some start with a small upward bounce)
        const initialVY = (Math.random() * (VOICE_IMPULSE_MAX * 0.5)) + VOICE_IMPULSE_MIN * 0.5; // Random initial upward velocity

        // Set position properties to absolute in JS, as they will be updated continuously
        ball.style.position = 'absolute';

        playContainer.appendChild(ball);

        bouncingBalls.push({
            element: ball,
            x: initialX, // current x position (center)
            y: initialY, // current y position (center)
            vx: initialVX,
            vy: initialVY,
            radius: radius
        });
    }
}

// Start voice detection
async function startVoiceDetection() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        microphone = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        microphone.connect(analyser);
        
        isListening = true;
        document.getElementById('start-listening').style.display = 'none';
        document.getElementById('stop-listening').style.display = 'inline-block';
        document.getElementById('play-feedback').innerHTML = '<p>🎤 Listening... Speak to make the balls bounce!</p>';
        
        // Start the animation loop
        detectVoice();
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        document.getElementById('play-feedback').innerHTML = '<p style="color: #e74c3c;">❌ Could not access microphone. Please check permissions.</p>';
    }
}

// Stop voice detection
function stopVoiceDetection() {
    isListening = false;
    
    if (audioContext) {
        // Stop all tracks in the stream to release microphone
        microphone.mediaStream.getTracks().forEach(track => track.stop());
        audioContext.close();
        audioContext = null;
    }
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null; // Clear animation ID
    }
    
    document.getElementById('start-listening').style.display = 'inline-block';
    document.getElementById('stop-listening').style.display = 'none';
    document.getElementById('play-feedback').innerHTML = '<p>Click "Start Listening" to play again!</p>';
    document.getElementById('volume-bar').style.width = '0%';
    
    // Reset all ball positions and velocities to their base
    bouncingBalls.forEach(ball => {
        ball.vx = 0;
        ball.vy = 0;
        ball.y = GROUND_Y_OFFSET + ball.radius; // Center Y at resting position
        ball.element.style.bottom = `${ball.y - ball.radius}px`; // Apply visual bottom edge
        // Keep their current horizontal position, or reset to initial if preferred.
        // For now, let them settle horizontally where they are.
    });
}

// Detect voice and animate balls (now also handles the physics simulation)
function detectVoice() {
    if (!isListening || !analyser || !dataArray) {
        animationId = null; // Ensure animation stops if not listening
        return;
    }
    
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    const averageVolume = sum / dataArray.length;
    
    // Normalize volume for impulse calculation
    const normalizedVolume = Math.min(1, Math.max(0, 
        (averageVolume - VOLUME_THRESHOLD_MIN) / (VOLUME_THRESHOLD_MAX - VOLUME_THRESHOLD_MIN)
    ));
    
    // Calculate the impulse strength based on normalized volume
    const voiceImpulse = normalizedVolume * (VOICE_IMPULSE_MAX - VOICE_IMPULSE_MIN) + VOICE_IMPULSE_MIN;
    
    // Update volume indicator
    document.getElementById('volume-bar').style.width = (averageVolume / 255) * 100 + '%';
    
    // Update feedback based on volume
    let feedbackContent = '';
    if (normalizedVolume > 0.5) { // Louder voice
        const feedbackMessages = ['🎉 Great job speaking!', '⭐ Keep talking!', '🔊 I can hear you!', '🎈 Amazing voice!', '🌟 You\'re doing great!'];
        feedbackContent = `<p style="color: #27ae60;">${feedbackMessages[Math.floor(Math.random() * feedbackMessages.length)]}</p>`;
    } else if (normalizedVolume > 0) { // Quieter voice
        feedbackContent = `<p style="color: #3498db;">🗣️ Making a sound!</p>`;
    } else { // No voice
        feedbackContent = '<p style="color: #e74c3c;">Speak louder!</p>';
    }
    document.getElementById('play-feedback').innerHTML = feedbackContent;

    const playContainer = document.getElementById('play-container');
    const containerRect = playContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    // const containerHeight = containerRect.height; // Not directly used for Y limits, GROUND_Y_OFFSET is.
    
    bouncingBalls.forEach(ball => {
        // Apply gravity
        ball.vy += GRAVITY;

        // Apply voice impulse if significant volume detected AND ball is near ground
        // We check if the bottom of the ball is close to the ground offset
        const currentBallBottomY = ball.y - ball.radius; 
        if (normalizedVolume > 0.1 && currentBallBottomY <= GROUND_Y_OFFSET + 5) { // Within 5px of ground
            // Give an upward kick based on voice strength
            ball.vy = voiceImpulse;
            ball.vy *= (0.8 + Math.random() * 0.2); // Add a small random factor to the kick
            ball.vy = Math.min(ball.vy, VOICE_IMPULSE_MAX * 1.5); // Cap max upward velocity to prevent extreme launches
        }
        
        // Update positions
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Collision with horizontal walls (ball.x is center)
        if (ball.x - ball.radius < 0) { // Left wall
            ball.x = ball.radius; // Snap to wall
            ball.vx *= -WALL_DAMPING; // Reverse and dampen horizontal velocity
            ball.vx += (Math.random() - 0.5) * 0.5; // Add minor random bounce angle
        } else if (ball.x + ball.radius > containerWidth) { // Right wall
            ball.x = containerWidth - ball.radius; // Snap to wall
            ball.vx *= -WALL_DAMPING; // Reverse and dampen horizontal velocity
            ball.vx += (Math.random() - 0.5) * 0.5; // Add minor random bounce angle
        }

        // Collision with floor (ball.y is center, GROUND_Y_OFFSET is where ball bottom should be)
        if (ball.y - ball.radius < GROUND_Y_OFFSET) {
            ball.y = GROUND_Y_OFFSET + ball.radius; // Snap to ground (bottom of ball at GROUND_Y_OFFSET)
            ball.vy *= -BOUNCE_DAMPING; // Reverse and dampen vertical velocity
            // Ensure velocity doesn't become tiny and prevent bouncing
            if (Math.abs(ball.vy) < 1 && Math.abs(ball.vy) > 0) { // If velocity is very small but not zero
                ball.vy = 0; // Stop bouncing if nearly stopped
            }
            // Small random horizontal jitter on bounce
            ball.vx += (Math.random() - 0.5) * 2;
        }

        // Apply position to element's CSS
        ball.element.style.left = `${ball.x - ball.radius}px`; // Set left edge
        ball.element.style.bottom = `${ball.y - ball.radius}px`; // Set bottom edge
    });
    
    animationId = requestAnimationFrame(detectVoice);
}

// Logout function
function logout() {
    currentUser = null;
    currentModule = null;
    currentWordIndex = 0;
    moduleProgress = 0;
    
    document.getElementById('dashboard-section').classList.remove('active');
    document.getElementById('exercise-section').classList.remove('active');
    document.getElementById('auth-section').style.display = 'block';
    
    // Reset forms
    document.getElementById('login-form').reset();
    document.getElementById('signup-form').reset();
    
    showFeedback('Logged out successfully!', 'success');
}

// Initialize speech synthesis voices
function initializeSpeechSynthesis() {
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
        speechSynthesis.addEventListener('voiceschanged', () => {
            // Voices are now loaded
        });
    }
}

// Initialize the application
function initializeApp() {
    initializeLoginForm();
    initializeSignupForm();
    initializeSpeechSynthesis();
}

// Initialize when page loads
window.addEventListener('load', initializeApp);