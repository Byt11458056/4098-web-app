# Mobile Recycle Object Detection Web App

A real-time object detection web application for identifying recyclable items using your device's camera. Works on both Android and iOS devices through web browsers.

## Features

- ✅ **Live Video Detection**: Real-time object detection using your camera
- 📱 **Mobile-First Design**: Responsive UI optimized for mobile devices
- 🔄 **Camera Switching**: Toggle between front and back cameras
- 🎯 **Object Filtering**: Select specific object types to detect (bottle, can, paper, metal)
- 🚀 **No Installation Required**: Access directly via web browser
- ⚡ **High Performance**: Optimized for smooth operation on mobile devices

## Detected Objects

- 🥫 Cans
- 🔩 Metal items
- 📄 Paper
- 🍾 Plastic bottles

## Project Structure

```
mobile-cv-app/
├── index.html          # Main HTML file
├── styles.css          # Responsive CSS styles
├── app.js              # JavaScript with TensorFlow.js integration
├── manifest.json       # PWA manifest
├── model/              # Model files (from your recycle-app)
│   ├── model.json      # TensorFlow.js model
│   ├── group1-shard1of1.bin
│   └── metadata.yaml
└── README.md           # This file
```

## Setup Instructions

### 1. Copy Your Model Files

Copy the model files from your existing `recycle-app`:

```bash
# Create model directory
mkdir -p model

# Copy model files
cp ../recycle-app/public/model/model.json model/
cp ../recycle-app/public/model/group1-shard1of1.bin model/
cp ../recycle-app/public/model/metadata.yaml model/
```

### 2. Test Locally

You need to serve the app over HTTPS or localhost (camera access requirement):

**Option A: Using Python**
```bash
# Python 3
python -m http.server 8000
```

**Option B: Using Node.js (http-server)**
```bash
# Install http-server globally
npm install -g http-server

# Run server
http-server -p 8000
```

**Option C: Using VS Code Live Server**
- Install "Live Server" extension in VS Code
- Right-click on `index.html` and select "Open with Live Server"

Then open your browser and navigate to:
- `http://localhost:8000`

### 3. Test on Mobile Device

To test on your mobile device while developing locally:

1. **Find your computer's local IP address:**
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`

2. **Make sure your mobile device is on the same WiFi network**

3. **Access the app:**
   - `http://YOUR_COMPUTER_IP:8000`
   - Example: `http://192.168.1.100:8000`

**Note:** Some browsers require HTTPS for camera access. For local testing with HTTPS, use:

```bash
# Using http-server with SSL
http-server -p 8000 -S -C cert.pem -K key.pem
```

## Deployment Options

### Option 1: GitHub Pages (Free)

1. Create a new GitHub repository
2. Push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

3. Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Select "Deploy from branch"
   - Choose "main" branch and "/" (root)
   - Click Save

4. Your app will be available at:
   - `https://YOUR_USERNAME.github.io/YOUR_REPO/`

**Important for GitHub Pages:**
- Update `modelPath` in `app.js` if needed:
```javascript
modelPath: './model/model.json'  // Correct for GitHub Pages
```

### Option 2: Netlify (Free)

1. Create account at [netlify.com](https://netlify.com)
2. Drag and drop your project folder to Netlify
3. Your app will be live at a generated URL

**Or use Netlify CLI:**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Option 3: Vercel (Free)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts to deploy

### Option 4: Firebase Hosting (Free)

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login and initialize:
```bash
firebase login
firebase init hosting
```

3. Deploy:
```bash
firebase deploy
```

## Browser Compatibility

✅ **Supported Browsers:**
- Chrome/Edge (Android & Desktop) - Recommended
- Safari (iOS & macOS) - iOS 14.3+
- Firefox (Android & Desktop)
- Samsung Internet

⚠️ **Requirements:**
- Camera access permission
- JavaScript enabled
- Modern browser with WebGL support

## Usage

1. **Grant camera permissions** when prompted
2. **Point camera** at recyclable items
3. **Use filters** to detect specific object types
4. **Switch camera** using the button at bottom
5. **Pause/Resume** detection as needed

## Performance Tips

- Use a device with a decent camera and processor
- Ensure good lighting for better detection accuracy
- Keep objects within camera view for 1-2 seconds for stable detection
- Close other apps to free up resources

## Model Information

- **Model Type**: YOLOv8 (Ultralytics)
- **Format**: TensorFlow.js
- **Input Size**: 320x320 pixels
- **Classes**: 4 (can, metal, paper, plastic-bottle)
- **Framework**: TensorFlow.js 4.11.0

## Troubleshooting

### Camera not working
- Ensure camera permissions are granted in browser settings
- Check if another app is using the camera
- Try reloading the page
- Use HTTPS connection (required by most browsers)

### Model not loading
- Check browser console for errors
- Verify model files are in the correct location
- Ensure all model files (.json and .bin) are present
- Check network connection

### Slow performance
- Close other tabs/apps
- Try a device with better hardware
- Reduce browser zoom level to 100%
- Clear browser cache

### Detection not accurate
- Improve lighting conditions
- Move objects closer to camera
- Ensure objects are clearly visible
- Try adjusting the `scoreThreshold` in `app.js`

## Customization

### Adjust Detection Sensitivity

Edit `app.js`:
```javascript
const CONFIG = {
    // ... other settings
    scoreThreshold: 0.5,  // Lower = more detections (0.0-1.0)
    iouThreshold: 0.45,   // NMS threshold
};
```

### Change Colors

Edit `styles.css` or the `colors` object in `app.js`:
```javascript
const colors = {
    'can': '#FF6B6B',
    'metal': '#4ECDC4',
    'paper': '#45B7D1',
    'plastic-bottle': '#96CEB4'
};
```

### Modify UI

Edit `index.html` and `styles.css` to customize the interface.

## Adding PWA Icons

Create icons for Progressive Web App functionality:

1. Create PNG icons:
   - `icon-192.png` (192x192 pixels)
   - `icon-512.png` (512x512 pixels)

2. Use an online tool like [Favicon Generator](https://realfavicongenerator.net/)

3. Place icons in the root directory

## License

This project uses:
- YOLOv8 model (AGPL-3.0 License)
- TensorFlow.js (Apache 2.0 License)

## Support

For issues or questions:
1. Check browser console for errors
2. Verify all files are present and correctly located
3. Test on different devices/browsers
4. Check camera and HTTPS requirements

## Credits

- Model training: Ultralytics YOLOv8
- Framework: TensorFlow.js
- Icons: System emojis

---

**Built for mobile-first recyclable object detection! ♻️**

