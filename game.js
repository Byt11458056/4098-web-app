// Configuration
const CONFIG = {
    modelPath: './model/model.json',
    inputSize: 320,
    scoreThreshold: 0.5,
    iouThreshold: 0.45,
    maxDetections: 100,
    classNames: ['can', 'can', 'paper', 'plastic-bottle'], // metal mapped to can
    difficulties: {
        easy: 120,
        normal: 90,
        hard: 60
    }
};

const OBJECT_META = {
    'can': { label: 'Can', plural: 'cans', emoji: '🥫' },
    'paper': { label: 'Paper', plural: 'paper items', emoji: '📄' },
    'plastic-bottle': { label: 'Bottle', plural: 'bottles', emoji: '🍾' }
};

const DEFAULT_OBJECT_META = { label: 'Object', plural: 'objects', emoji: '♻️' };

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
    selectedObject: null,
    difficulty: null,
    maxTime: 0,
    elapsedTime: 0,
    isGameActive: false,
    timerInterval: null,
    startTime: 0
};

let objectFilterToggle = null;
let objectFilterDropdown = null;
let objectFilterSection = null;

function getObjectMeta(objectKey) {
    return objectKey && OBJECT_META[objectKey] ? OBJECT_META[objectKey] : DEFAULT_OBJECT_META;
}

function updateObjectFilterDisplay() {
    const hasSelection = Boolean(gameState.selectedObject);
    const meta = hasSelection ? getObjectMeta(gameState.selectedObject) : DEFAULT_OBJECT_META;
    
    const filterEmojiEl = document.getElementById('objectFilterEmoji');
    const filterLabelEl = document.getElementById('objectFilterLabel');
    if (filterEmojiEl) filterEmojiEl.textContent = meta.emoji;
    if (filterLabelEl) filterLabelEl.textContent = meta.label;
    
    const detectingEmojiEl = document.getElementById('detectingEmoji');
    const detectingTextEl = document.getElementById('detectingText');
    if (detectingEmojiEl) detectingEmojiEl.textContent = meta.emoji;
    if (detectingTextEl) detectingTextEl.textContent = `Detecting ${meta.label}`;
    
    document.querySelectorAll('.object-filter-option').forEach(option => {
        const isActive = hasSelection && option.dataset.object === gameState.selectedObject;
        option.classList.toggle('active', isActive);
        option.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
}

function setSelectedObject(objectKey, options = {}) {
    if (!objectKey) return;
    gameState.selectedObject = objectKey;
    updateObjectFilterDisplay();
    
    if (options.updateCard) {
        updateInfoCard([]);
    }
}

function openObjectFilterDropdown() {
    if (!objectFilterDropdown || !objectFilterToggle) return;
    objectFilterDropdown.classList.remove('hidden');
    objectFilterToggle.setAttribute('aria-expanded', 'true');
    objectFilterToggle.classList.add('open');
}

function closeObjectFilterDropdown() {
    if (!objectFilterDropdown || !objectFilterToggle) return;
    objectFilterDropdown.classList.add('hidden');
    objectFilterToggle.setAttribute('aria-expanded', 'false');
    objectFilterToggle.classList.remove('open');
}

function toggleObjectFilterDropdown() {
    if (!objectFilterDropdown) return;
    if (objectFilterDropdown.classList.contains('hidden')) {
        openObjectFilterDropdown();
    } else {
        closeObjectFilterDropdown();
    }
}

// Screen management
const screens = {
    objectSelection: document.getElementById('objectSelectionScreen'),
    difficulty: document.getElementById('difficultyScreen'),
    game: document.getElementById('gameScreen'),
    end: document.getElementById('endScreen')
};

function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

// Initialize app
async function init() {
    video = document.getElementById('videoElement');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    // Setup event listeners
    setupEventListeners();
    
    updateObjectFilterDisplay();
    
    // Show object selection screen
    showScreen('objectSelection');
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
    if (!gameState.selectedObject) {
        alert('Please select an object type before starting.');
        showScreen('objectSelection');
        return;
    }
    
    if (!gameState.difficulty) {
        alert('Please choose a difficulty level.');
        showScreen('difficulty');
        return;
    }
    
    // Initialize game state
    gameState.elapsedTime = 0;
    gameState.isGameActive = true;
    gameState.startTime = Date.now();
    
    // Update UI with selected object and difficulty
    const difficultyNames = {
        'easy': '😊 Easy',
        'normal': '😎 Normal',
        'hard': '🔥 Hard'
    };
    
    // Update game info overlay
    document.getElementById('gameModeDisplay').textContent = difficultyNames[gameState.difficulty];
    document.getElementById('gameTimerDisplay').textContent = gameState.maxTime + 's';
    const selectedMeta = getObjectMeta(gameState.selectedObject);
    document.getElementById('detectingEmoji').textContent = selectedMeta.emoji;
    document.getElementById('detectingText').textContent = `Detecting ${selectedMeta.label}`;
    updateObjectFilterDisplay();
    closeObjectFilterDropdown();
    
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

// Start timer (countdown)
function startTimer() {
    const timerDisplay = document.getElementById('gameTimerDisplay');
    
    gameState.timerInterval = setInterval(() => {
        gameState.elapsedTime = Math.floor((Date.now() - gameState.startTime) / 1000);
        const timeRemaining = Math.max(0, gameState.maxTime - gameState.elapsedTime);
        
        // Update timer display
        timerDisplay.textContent = timeRemaining + 's';
        
        // Remove all warning classes first
        timerDisplay.classList.remove('warning', 'danger');
        
        // Add warning colors based on time remaining
        if (timeRemaining <= 10 && timeRemaining > 5) {
            timerDisplay.classList.add('warning');
        } else if (timeRemaining <= 5) {
            timerDisplay.classList.add('danger');
        }
        
        // Auto-end game when time runs out
        if (gameState.elapsedTime >= gameState.maxTime) {
            endGame(true); // true indicates time ran out
        }
    }, 1000);
}

// End game
function endGame(timeRanOut = false) {
    gameState.isGameActive = false;
    isDetecting = false;
    closeObjectFilterDropdown();
    
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
    const meta = getObjectMeta(gameState.selectedObject);
    document.getElementById('finalObjectType').textContent = `${meta.emoji} ${meta.label}`;
    document.getElementById('finalDifficulty').textContent = gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1);
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
            
            // Only show detections matching the selected object type
            if (className === gameState.selectedObject) {
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
    const meta = getObjectMeta(gameState.selectedObject);
    const singleLabel = (meta.label || DEFAULT_OBJECT_META.label).toLowerCase();
    const pluralLabel = (meta.plural || DEFAULT_OBJECT_META.plural).toLowerCase();
    
    if (detections.length === 0) {
        infoCard.innerHTML = `<p>Point camera at ${pluralLabel}</p>`;
        return;
    }
    
    const totalCount = detections.length;
    const displayName = totalCount === 1 ? singleLabel : pluralLabel;
    
    let html = `<p style="margin-bottom: 0.5rem;">${meta.emoji} ${totalCount} ${displayName} detected</p>`;
    
    infoCard.innerHTML = html;
}

// Setup event listeners
function setupEventListeners() {
    // Object selection buttons
    document.querySelectorAll('.selection-btn[data-object]').forEach(btn => {
        btn.addEventListener('click', () => {
            setSelectedObject(btn.dataset.object);
            showScreen('difficulty');
            // Reset mode info section when entering difficulty screen
            document.getElementById('modeInfoSection').classList.add('hidden');
        });
    });
    
    // Difficulty selection buttons
    document.querySelectorAll('.difficulty-btn[data-difficulty]').forEach(btn => {
        btn.addEventListener('click', () => {
            gameState.difficulty = btn.dataset.difficulty;
            gameState.maxTime = CONFIG.difficulties[gameState.difficulty];
            
            // Update and show mode info section
            const difficultyNames = {
                'easy': '😊 Easy',
                'normal': '😎 Normal',
                'hard': '🔥 Hard'
            };
            document.getElementById('selectedMode').textContent = difficultyNames[gameState.difficulty];
            document.getElementById('targetTime').textContent = gameState.maxTime + 's';
            document.getElementById('modeInfoSection').classList.remove('hidden');
            
            // Scroll to the mode info section
            document.getElementById('modeInfoSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    });
    
    // Start game button
    document.getElementById('startGameBtn').addEventListener('click', () => {
        startGame();
    });
    
    // Back to main from object selection
    document.getElementById('backToMainBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // Back to object selection from difficulty
    document.getElementById('backToObjectBtn').addEventListener('click', () => {
        showScreen('objectSelection');
        document.getElementById('modeInfoSection').classList.add('hidden');
    });
    
    // Finish button during gameplay
    document.getElementById('finishBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to finish the game?')) {
            endGame(false); // false indicates user finished early
        }
    });
    
    // Exit game during gameplay
    document.getElementById('exitGameBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to exit the game? You will return to the main menu.')) {
            closeObjectFilterDropdown();
            stopCamera();
            if (gameState.timerInterval) {
                clearInterval(gameState.timerInterval);
                gameState.timerInterval = null;
            }
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            window.location.href = 'index.html';
        }
    });
    
    // Replay button
    document.getElementById('replayBtn').addEventListener('click', () => {
        showScreen('objectSelection');
    });
    
    // Exit to main from end screen
    document.getElementById('exitToMainBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    objectFilterToggle = document.getElementById('objectFilterToggle');
    objectFilterDropdown = document.getElementById('objectFilterDropdown');
    objectFilterSection = document.getElementById('objectFilterSection');
    
    if (objectFilterToggle && objectFilterDropdown && objectFilterSection) {
        objectFilterToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleObjectFilterDropdown();
        });
        
        document.querySelectorAll('.object-filter-option').forEach(option => {
            option.addEventListener('click', (event) => {
                event.stopPropagation();
                const selected = option.dataset.object;
                if (selected) {
                    setSelectedObject(selected, { updateCard: gameState.isGameActive });
                    closeObjectFilterDropdown();
                }
            });
        });
        
        document.addEventListener('click', (event) => {
            if (!objectFilterSection.contains(event.target)) {
                closeObjectFilterDropdown();
            }
        });
        
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeObjectFilterDropdown();
            }
        });
    }
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
