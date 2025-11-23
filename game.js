// Configuration
const CONFIG = {
    modelPath: './model/model.json',
    inputSize: 320,
    scoreThreshold: 0.5,
    iouThreshold: 0.45,
    maxDetections: 100,
    classNames: ['can', 'can', 'paper', 'plastic-bottle'], // metal mapped to can
    gameDuration: 120, // seconds
    pointsPerObject: 2
};

// Global variables
let model = null;
let video = null;
let canvas = null;
let ctx = null;
let animationId = null;
let isDetecting = false;
let currentStream = null;
let facingMode = 'environment';

// Game state
let gameState = {
    targetScore: 0,
    currentScore: 0,
    timeRemaining: CONFIG.gameDuration,
    isGameActive: false,
    timerInterval: null,
    detectedObjects: new Set() // Track detected objects to avoid double counting
};

// Screen management
const screens = {
    welcome: document.getElementById('welcomeScreen'),
    game: document.getElementById('gameScreen'),
    end: document.getElementById('endScreen')
};

function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

// Generate random even target score (2, 4, 6, 8, or 10)
function generateTargetScore() {
    const evenNumbers = [2, 4, 6, 8, 10];
    return evenNumbers[Math.floor(Math.random() * evenNumbers.length)];
}

// Initialize app
async function init() {
    video = document.getElementById('videoElement');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    // Setup event listeners
    setupEventListeners();
    
    // Show welcome screen
    showScreen('welcome');
}

// Load TensorFlow.js model
async function loadModel() {
    try {
        console.log('Loading model...');
        model = await tf.loadGraphModel(CONFIG.modelPath);
        console.log('Model loaded successfully');
        
        // Warm up the model
        const dummyInput = tf.zeros([1, CONFIG.inputSize, CONFIG.inputSize, 3]);
        await model.predict(dummyInput).data();
        dummyInput.dispose();
        console.log('Model warmed up');
    } catch (error) {
        console.error('Error loading model:', error);
        alert('Failed to load detection model. Please check your connection and refresh.');
    }
}

// Start camera
async function startCamera() {
    try {
        // Stop existing stream
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        
        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };
        
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                // Set canvas size to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                resolve();
            };
        });
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Cannot access camera. Please grant camera permissions and refresh.');
    }
}

// Stop camera
function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    if (video) {
        video.srcObject = null;
    }
}

// Start game
async function startGame() {
    // Generate target score
    gameState.targetScore = generateTargetScore();
    gameState.currentScore = 0;
    gameState.timeRemaining = CONFIG.gameDuration;
    gameState.isGameActive = true;
    gameState.detectedObjects.clear();
    
    // Update UI
    document.getElementById('targetScore').textContent = gameState.targetScore;
    document.getElementById('currentScore').textContent = gameState.currentScore;
    document.getElementById('timer').textContent = gameState.timeRemaining;
    
    // Show game screen
    showScreen('game');
    document.getElementById('loadingOverlay').classList.remove('hidden');
    
    // Load model if not loaded
    if (!model) {
        await loadModel();
    }
    
    // Start camera
    await startCamera();
    
    // Hide loading overlay
    document.getElementById('loadingOverlay').classList.add('hidden');
    
    // Start detection
    isDetecting = true;
    detectFrame();
    
    // Start timer
    startTimer();
}

// Start timer
function startTimer() {
    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        document.getElementById('timer').textContent = gameState.timeRemaining;
        
        // Add warning animation when time is low
        if (gameState.timeRemaining <= 10) {
            document.getElementById('timer').style.color = '#ff4444';
            document.getElementById('timer').style.animation = 'pulse 0.5s infinite';
        }
        
        // End game when time runs out
        if (gameState.timeRemaining <= 0) {
            endGame();
        }
    }, 1000);
}

// End game
function endGame() {
    gameState.isGameActive = false;
    isDetecting = false;
    
    // Stop timer
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    // Stop camera
    stopCamera();
    
    // Stop detection loop
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Update end screen
    document.getElementById('finalTarget').textContent = gameState.targetScore;
    document.getElementById('finalScore').textContent = gameState.currentScore;
    
    // Determine result message
    const resultMessage = document.getElementById('resultMessage');
    if (gameState.currentScore >= gameState.targetScore) {
        resultMessage.textContent = '🎉 Amazing! You reached the target!';
        resultMessage.style.color = '#4CAF50';
    } else if (gameState.currentScore >= gameState.targetScore * 0.7) {
        resultMessage.textContent = '👍 Great effort! Almost there!';
        resultMessage.style.color = '#FF9800';
    } else {
        resultMessage.textContent = '💪 Keep practicing! Try again!';
        resultMessage.style.color = '#2196F3';
    }
    
    // Show end screen
    showScreen('end');
}

// Main detection loop
async function detectFrame() {
    if (!isDetecting || !model || video.readyState !== 4 || !gameState.isGameActive) {
        if (gameState.isGameActive) {
            animationId = requestAnimationFrame(detectFrame);
        }
        return;
    }
    
    try {
        // Preprocess image
        const inputTensor = tf.tidy(() => {
            const img = tf.browser.fromPixels(video);
            const resized = tf.image.resizeBilinear(img, [CONFIG.inputSize, CONFIG.inputSize]);
            const normalized = resized.div(255.0);
            const batched = normalized.expandDims(0);
            return batched;
        });
        
        // Run inference
        const predictionTensor = model.predict(inputTensor);
        inputTensor.dispose();
        
        // Get output data
        const predictions = await predictionTensor.data();
        predictionTensor.dispose();
        
        // Process predictions
        const detections = processOutput(predictions);
        
        // Update score based on detections
        updateScore(detections);
        
        // Draw results
        drawDetections(detections);
        
        // Update UI
        updateInfoCard(detections);
        
    } catch (error) {
        console.error('Detection error:', error);
    }
    
    animationId = requestAnimationFrame(detectFrame);
}

// Process model output (YOLOv8 format)
function processOutput(output) {
    const detections = [];
    const numDetections = 2100;
    
    for (let i = 0; i < numDetections; i++) {
        const xCenter = output[i] / CONFIG.inputSize;
        const yCenter = output[numDetections + i] / CONFIG.inputSize;
        const width = output[2 * numDetections + i] / CONFIG.inputSize;
        const height = output[3 * numDetections + i] / CONFIG.inputSize;
        
        let maxScore = 0;
        let classId = 0;
        for (let j = 0; j < CONFIG.classNames.length; j++) {
            const score = output[(4 + j) * numDetections + i];
            if (score > maxScore) {
                maxScore = score;
                classId = j;
            }
        }
        
        if (maxScore > CONFIG.scoreThreshold) {
            const className = CONFIG.classNames[classId];
            detections.push({
                x: Math.max(0, xCenter - width / 2),
                y: Math.max(0, yCenter - height / 2),
                width: Math.min(1 - (xCenter - width / 2), width),
                height: Math.min(1 - (yCenter - height / 2), height),
                score: maxScore,
                class: className,
                classId: classId
            });
        }
    }
    
    return applyNMS(detections);
}

// Non-Maximum Suppression
function applyNMS(detections) {
    if (detections.length === 0) return [];
    
    detections.sort((a, b) => b.score - a.score);
    
    const selected = [];
    const suppressed = new Set();
    
    for (let i = 0; i < detections.length; i++) {
        if (suppressed.has(i)) continue;
        
        selected.push(detections[i]);
        
        for (let j = i + 1; j < detections.length; j++) {
            if (suppressed.has(j)) continue;
            
            const iou = calculateIoU(detections[i], detections[j]);
            if (iou > CONFIG.iouThreshold && detections[i].classId === detections[j].classId) {
                suppressed.add(j);
            }
        }
    }
    
    return selected;
}

// Calculate Intersection over Union
function calculateIoU(box1, box2) {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
    
    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;
    
    return intersection / union;
}

// Update score based on detections
function updateScore(detections) {
    // Create unique ID for each detection based on position and class
    const currentFrame = new Set();
    
    detections.forEach(det => {
        const id = `${det.class}_${Math.round(det.x * 100)}_${Math.round(det.y * 100)}`;
        currentFrame.add(id);
        
        // If this is a new detection, add points
        if (!gameState.detectedObjects.has(id)) {
            gameState.detectedObjects.add(id);
            gameState.currentScore += CONFIG.pointsPerObject;
            document.getElementById('currentScore').textContent = gameState.currentScore;
            
            // Add score animation
            const scoreElement = document.getElementById('currentScore');
            scoreElement.style.animation = 'scoreUp 0.3s ease';
            setTimeout(() => {
                scoreElement.style.animation = '';
            }, 300);
        }
    });
    
    // Clean up old detections that are no longer visible
    const toRemove = [];
    gameState.detectedObjects.forEach(id => {
        if (!currentFrame.has(id)) {
            toRemove.push(id);
        }
    });
    toRemove.forEach(id => gameState.detectedObjects.delete(id));
}

// Draw detections on canvas
function drawDetections(detections) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const colors = {
        'can': '#FF6B6B',
        'paper': '#45B7D1',
        'plastic-bottle': '#96CEB4'
    };
    
    const scaleX = canvas.width / CONFIG.inputSize;
    const scaleY = canvas.height / CONFIG.inputSize;
    
    detections.forEach(detection => {
        const x = detection.x * scaleX;
        const y = detection.y * scaleY;
        const width = detection.width * scaleX;
        const height = detection.height * scaleY;
        
        const color = colors[detection.class] || '#FFFFFF';
        
        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        
        // Draw label background with "+2" points
        const label = `${detection.class} +${CONFIG.pointsPerObject}`;
        ctx.font = 'bold 16px Arial';
        const textWidth = ctx.measureText(label).width;
        const textHeight = 20;
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y - textHeight - 4, textWidth + 10, textHeight + 4);
        
        // Draw label text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(label, x + 5, y - 8);
    });
}

// Update info card
function updateInfoCard(detections) {
    const infoCard = document.getElementById('infoCard');
    
    if (detections.length === 0) {
        infoCard.innerHTML = '<p>Point camera at recyclables</p>';
        return;
    }
    
    // Count objects by type
    const counts = {};
    detections.forEach(det => {
        counts[det.class] = (counts[det.class] || 0) + 1;
    });
    
    const emojis = {
        'can': '🥫',
        'paper': '📄',
        'plastic-bottle': '🍾'
    };
    
    const totalCount = detections.length;
    const totalPoints = totalCount * CONFIG.pointsPerObject;
    
    let html = `<p style="margin-bottom: 0.5rem;">${totalCount} ${totalCount === 1 ? 'object' : 'objects'} detected (+${totalPoints} pts)</p>`;
    html += '<div>';
    for (const [className, count] of Object.entries(counts)) {
        const emoji = emojis[className] || '♻️';
        const displayName = className === 'plastic-bottle' ? 'bottle' : className;
        html += `<span>${emoji} ${displayName}: ${count}</span>`;
    }
    html += '</div>';
    
    infoCard.innerHTML = html;
}

// Setup event listeners
function setupEventListeners() {
    // Start game button
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    
    // Back to main from welcome
    document.getElementById('backToMainBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // Exit game during gameplay
    document.getElementById('exitGameBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to exit the game?')) {
            endGame();
        }
    });
    
    // Replay button
    document.getElementById('replayBtn').addEventListener('click', startGame);
    
    // Exit to main from end screen
    document.getElementById('exitToMainBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (gameState.isGameActive && gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
        }
    } else {
        if (!animationId && isDetecting && gameState.isGameActive) {
            detectFrame();
        }
        if (gameState.isGameActive && !gameState.timerInterval) {
            startTimer();
        }
    }
});

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
