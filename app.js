// Configuration
const CONFIG = {
    modelPath: './model/model.json',
    inputSize: 320,
    scoreThreshold: 0.5,
    iouThreshold: 0.45,
    maxDetections: 100,
    classNames: ['can', 'can', 'paper', 'plastic-bottle'], // metal mapped to can
    difficulties: {
        easy: { time: 120, name: 'Easy' },
        normal: { time: 90, name: 'Normal' },
        hard: { time: 60, name: 'Hard' }
    }
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
    phase: 'difficulty-selection', // 'difficulty-selection', 'target-display', 'playing', 'ended'
    difficulty: null,
    maxTime: 0,
    elapsedTime: 0,
    timerInterval: null,
    startTime: 0
};

// Initialize app
async function init() {
    video = document.getElementById('videoElement');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    // Setup event listeners
    setupEventListeners();
    
    // Load model
    await loadModel();
    
    // Start camera
    await startCamera();
    
    // Hide loading overlay
    document.getElementById('loadingOverlay').classList.add('hidden');
    
    // Show difficulty selection
    showPhase('difficulty-selection');
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

// Show phase
function showPhase(phase) {
    gameState.phase = phase;
    
    // Hide all overlays
    document.getElementById('difficultyHeader').classList.add('hidden');
    document.getElementById('targetScoreOverlay').classList.add('hidden');
    document.getElementById('gameHud').classList.add('hidden');
    document.getElementById('declareFinishContainer').classList.add('hidden');
    document.getElementById('endScreen').classList.add('hidden');
    
    // Show appropriate overlay
    switch(phase) {
        case 'difficulty-selection':
            document.getElementById('difficultyHeader').classList.remove('hidden');
            break;
        case 'target-display':
            document.getElementById('targetScoreOverlay').classList.remove('hidden');
            break;
        case 'playing':
            document.getElementById('gameHud').classList.remove('hidden');
            document.getElementById('declareFinishContainer').classList.remove('hidden');
            break;
        case 'ended':
            document.getElementById('endScreen').classList.remove('hidden');
            break;
    }
}

// Handle difficulty selection
function selectDifficulty(difficulty) {
    gameState.difficulty = difficulty;
    gameState.maxTime = CONFIG.difficulties[difficulty].time;
    
    // Show start game overlay
    showPhase('target-display');
}

// Start game
function startGame() {
    // Reset game state
    gameState.elapsedTime = 0;
    gameState.startTime = Date.now();
    
    // Update HUD
    document.getElementById('hudTimer').textContent = '0s';
    
    // Show playing phase
    showPhase('playing');
    
    // Start detection
    isDetecting = true;
    detectFrame();
    
    // Start timer
    startTimer();
}

// Start timer (counts up)
function startTimer() {
    gameState.timerInterval = setInterval(() => {
        gameState.elapsedTime = Math.floor((Date.now() - gameState.startTime) / 1000);
        document.getElementById('hudTimer').textContent = gameState.elapsedTime + 's';
        
        // Warning when approaching max time
        const timerElement = document.getElementById('hudTimer');
        if (gameState.elapsedTime >= gameState.maxTime - 10 && gameState.elapsedTime < gameState.maxTime) {
            timerElement.style.color = '#ff9800';
        }
        
        // Auto-end game when time runs out
        if (gameState.elapsedTime >= gameState.maxTime) {
            endGame(true); // true indicates time ran out
        }
    }, 1000);
}

// End game
function endGame(timeRanOut = false) {
    gameState.phase = 'ended';
    isDetecting = false;
    
    // Stop timer
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    // Stop detection loop
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Update end screen
    document.getElementById('finalTime').textContent = gameState.elapsedTime + 's';
    
    // Determine result message
    const resultMessage = document.getElementById('resultMessage');
    if (timeRanOut) {
        resultMessage.textContent = '⏰ Time\'s up! You used all ' + gameState.maxTime + ' seconds!';
        resultMessage.style.color = '#FF9800';
    } else {
        const percentage = (gameState.elapsedTime / gameState.maxTime) * 100;
        if (percentage < 50) {
            resultMessage.textContent = '🌟 Amazing speed! Finished in ' + gameState.elapsedTime + 's!';
            resultMessage.style.color = '#4CAF50';
        } else if (percentage < 80) {
            resultMessage.textContent = '👍 Good job! Finished in ' + gameState.elapsedTime + 's!';
            resultMessage.style.color = '#2196F3';
        } else {
            resultMessage.textContent = '✓ Complete! Finished in ' + gameState.elapsedTime + 's!';
            resultMessage.style.color = '#FF9800';
        }
    }
    
    // Show end screen
    showPhase('ended');
}

// Main detection loop
async function detectFrame() {
    if (!isDetecting || !model || video.readyState !== 4 || gameState.phase !== 'playing') {
        if (gameState.phase === 'playing') {
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
        
        // Draw label background
        const label = `${detection.class} ${Math.round(detection.score * 100)}%`;
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
    
    if (gameState.phase !== 'playing') {
        infoCard.innerHTML = '<p>Point camera at recyclables</p>';
        return;
    }
    
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
    
    let html = `<p style="margin-bottom: 0.5rem;">${totalCount} ${totalCount === 1 ? 'object' : 'objects'} detected</p>`;
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
    // Difficulty buttons
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const difficulty = btn.dataset.difficulty;
            selectDifficulty(difficulty);
        });
    });
    
    // Start game button
    document.getElementById('startGameBtn').addEventListener('click', () => {
        startGame();
    });
    
    // Declare finish button
    document.getElementById('declareFinishBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to finish the game?')) {
            endGame(false);
        }
    });
    
    // Play again button
    document.getElementById('playAgainBtn').addEventListener('click', () => {
        // Reset and show difficulty selection
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        showPhase('difficulty-selection');
    });
}

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (gameState.phase === 'playing' && gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
        }
    } else {
        if (!animationId && isDetecting && gameState.phase === 'playing') {
            detectFrame();
        }
        if (gameState.phase === 'playing' && !gameState.timerInterval) {
            // Recalculate start time based on elapsed time
            gameState.startTime = Date.now() - (gameState.elapsedTime * 1000);
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
