# Quick Start Guide

Get your Mobile CV App running in **5 minutes**! ⚡

## Step 1: Copy Model Files

Your model files should be from your `recycle-app`:

### 🪟 Windows:
```cmd
setup.bat
```

### 🐧 Mac/Linux:
```bash
chmod +x setup.sh
./setup.sh
```

### ✋ Or manually:
Copy these files from `recycle-app/public/model/` to `mobile-cv-app/model/`:
- `model.json`
- `group1-shard1of1.bin`
- `metadata.yaml` (optional)

---

## Step 2: Run Locally

Choose one method:

### 🐍 Using Python (Easiest)
```bash
python -m http.server 8000
```

### 📦 Using Node.js
```bash
npx http-server -p 8000 -c-1
```

### 🔷 Using VS Code
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

---

## Step 3: Open in Browser

**On Computer:**
```
http://localhost:8000
```

**On Phone (same WiFi):**
1. Find your computer's IP:
   - Windows: `ipconfig` → look for IPv4 Address
   - Mac: `ifconfig` → look for inet
   - Linux: `ip addr`

2. Open on phone:
   ```
   http://YOUR_IP:8000
   ```
   Example: `http://192.168.1.100:8000`

---

## Step 4: Grant Permissions

When browser asks for camera access:
- Click **"Allow"** or **"OK"**
- On iOS Safari: Settings → Safari → Camera → Allow

---

## Step 5: Start Detecting! 🎯

1. Point camera at recyclable items
2. See real-time detection boxes
3. Use filter buttons to detect specific items
4. Switch cameras using button at bottom

---

## 🎨 Features

- **🍾 Plastic Bottles** - Detects plastic bottles
- **🥫 Cans** - Detects aluminum/tin cans
- **📄 Paper** - Detects paper items
- **🔩 Metal** - Detects metal objects

---

## 🐛 Common Issues

### Camera not showing
- Check if another app is using camera
- Grant permissions in browser settings
- Reload page (F5 or Cmd+R)

### "Cannot access camera"
- Must use `http://localhost` or HTTPS
- Some browsers require HTTPS for camera
- Try different browser (Chrome recommended)

### Model not loading
- Verify files in `model/` directory
- Check browser console (F12) for errors
- Ensure you're running a local server

### Black screen
- Wait 2-3 seconds for camera to initialize
- Check camera permissions
- Try refreshing page

---

## 📱 Deploy Online (Optional)

Want others to use your app? Deploy it!

### Fastest: Netlify (2 minutes)
1. Go to https://netlify.com
2. Drag & drop your `mobile-cv-app` folder
3. Done! Share the URL

### See DEPLOYMENT.md for more options**

---

## 🔧 Customize

### Adjust Detection Sensitivity
Edit `app.js`:
```javascript
const CONFIG = {
    scoreThreshold: 0.5,  // Lower = more detections (0.3-0.7)
};
```

### Change Colors
Edit `styles.css` - search for color values like `#2196F3`

---

## 📊 Browser Compatibility

✅ **Best Performance:**
- Chrome/Edge (Android & Desktop)
- Safari (iOS 14.3+)

⚠️ **Limited Support:**
- Firefox (some Android devices)
- Older browsers

---

## 🆘 Need Help?

1. **Check Browser Console**
   - Press F12 (Windows/Linux) or Cmd+Opt+I (Mac)
   - Look for error messages in red

2. **Verify Files**
   ```
   mobile-cv-app/
   ├── index.html         ✅
   ├── styles.css         ✅
   ├── app.js             ✅
   ├── manifest.json      ✅
   └── model/
       ├── model.json     ✅
       └── group1-shard1of1.bin  ✅
   ```

3. **Test Basics**
   - Does page load?
   - Any errors in console?
   - Is local server running?

---

## 💡 Tips

- **Good Lighting** = Better detection
- **Hold Steady** for 1-2 seconds
- **Clean Background** helps accuracy
- **Distance**: 1-3 feet from camera
- **One Item** at a time for best results

---

## 🚀 Next Steps

- ✅ Test on different devices
- ✅ Deploy online (see DEPLOYMENT.md)
- ✅ Share with friends!
- ✅ Customize UI colors
- ✅ Adjust detection threshold

---

**Enjoy detecting recyclables! ♻️**

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)
For full documentation, see [README.md](README.md)

