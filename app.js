// Configuration
const CONFIG = {
    modelPath: './model/model.json',
    inputSize: 320,
    scoreThreshold: 0.5,
    iouThreshold: 0.45,
    maxDetections: 100,
    classNames: ['can', 'can', 'paper', 'plastic-bottle'], // metal mapped to can
    displayNames: ['can', 'paper', 'plastic-bottle'] // For UI display
};

// Global variables
let model = null;
let video = null;
let canvas = null;
let ctx = null;
let animationId = null;
let isDetecting = true;
let currentStream = null;
let facingMode = 'environment'; // 'user' for front, 'environment' for back
let activeFilters = new Set(['can']); // Start with "can" selected

// Initialize app
async function init() {
    video = document.getElementById('videoElement');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    // Set up event listeners
    setupEventListeners();
    
    // Load model
    await loadModel();
    
    // Start camera
    await startCamera();
    
    // Hide loading overlay
    document.getElementById('loadingOverlay').classList.add('hidden');
    
    // Start detection loop
    detectFrame();
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

// Switch between front and back camera
async function switchCamera() {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    await startCamera();
}

// Main detection loop
async function detectFrame() {
    if (!isDetecting || !model || video.readyState !== 4) {
        animationId = requestAnimationFrame(detectFrame);
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
    
    // YOLOv8 TFLite output shape: [1, 8, 2100]
    // Where 8 = 4 (bbox: x, y, w, h) + 4 (class scores)
    const numDetections = 2100;
    
    for (let i = 0; i < numDetections; i++) {
        // Extract bbox and scores
        // Output is transposed, so we need to access it correctly
        const xCenter = output[i] / CONFIG.inputSize;
        const yCenter = output[numDetections + i] / CONFIG.inputSize;
        const width = output[2 * numDetections + i] / CONFIG.inputSize;
        const height = output[3 * numDetections + i] / CONFIG.inputSize;
        
        // Get class scores (4 classes)
        let maxScore = 0;
        let classId = 0;
        for (let j = 0; j < CONFIG.classNames.length; j++) {
            const score = output[(4 + j) * numDetections + i];
            if (score > maxScore) {
                maxScore = score;
                classId = j;
            }
        }
        
        // Filter by confidence threshold
        if (maxScore > CONFIG.scoreThreshold) {
            const className = CONFIG.classNames[classId];
            
            // Filter by active filters (can and metal are both shown as "can")
            if (activeFilters.has(className)) {
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
    
    // Apply NMS
    return applyNMS(detections);
}

// Non-Maximum Suppression
function applyNMS(detections) {
    if (detections.length === 0) return [];
    
    // Sort by score
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
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Define colors for each class
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

// Update detection count (removed - now shown in info card only)

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
    // Game mode button - navigate to main page
    document.getElementById('gameModeBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // Switch camera button
    document.getElementById('switchCamera').addEventListener('click', switchCamera);
    
    // Toggle detection button
    document.getElementById('toggleDetection').addEventListener('click', () => {
        isDetecting = !isDetecting;
        const toggleIcon = document.getElementById('toggleIcon');
        const toggleText = document.getElementById('toggleText');
        
        if (isDetecting) {
            toggleIcon.textContent = '⏸';
            toggleText.textContent = 'Pause';
        } else {
            toggleIcon.textContent = '▶';
            toggleText.textContent = 'Resume';
        }
    });
    
    // Filter buttons (exclusive selection - only one active at a time)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filterClass = btn.dataset.class;
            
            // Deselect all filters first
            activeFilters.clear();
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            
            // Select only the clicked filter
            activeFilters.add(filterClass);
            btn.classList.add('active');
        });
    });
}

// Handle visibility change (save battery when tab is not visible)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    } else {
        if (!animationId && isDetecting) {
            detectFrame();
        }
    }
});

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

