# Deployment Guide

This guide provides step-by-step instructions for deploying your Mobile CV App to various hosting platforms.

## Prerequisites

Before deploying, ensure you have:
- ✅ All required files in your project directory
- ✅ Model files in the `model/` directory
- ✅ Tested the app locally

## Quick Deployment Options

### 🚀 Option 1: GitHub Pages (Recommended for Beginners)

**Pros:** Free, easy, automatic HTTPS, custom domain support
**Cons:** Public repository required for free tier

#### Step-by-Step:

1. **Create a GitHub account** (if you don't have one)
   - Go to https://github.com
   - Sign up for free

2. **Install Git** (if not already installed)
   - Windows: Download from https://git-scm.com
   - Mac: `brew install git`
   - Linux: `sudo apt-get install git`

3. **Initialize Git repository**
   ```bash
   cd mobile-cv-app
   git init
   git add .
   git commit -m "Initial commit: Mobile CV App"
   ```

4. **Create a new repository on GitHub**
   - Go to https://github.com/new
   - Name it: `mobile-cv-app` (or any name you prefer)
   - Don't initialize with README (we already have files)
   - Click "Create repository"

5. **Push your code to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/mobile-cv-app.git
   git branch -M main
   git push -u origin main
   ```

6. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click "Settings"
   - Scroll down to "Pages" section (left sidebar)
   - Under "Source", select "Deploy from a branch"
   - Select "main" branch and "/" (root)
   - Click "Save"

7. **Wait 2-5 minutes**, then visit:
   ```
   https://YOUR_USERNAME.github.io/mobile-cv-app/
   ```

#### Custom Domain (Optional):
- Buy a domain from Namecheap, Google Domains, etc.
- In GitHub Pages settings, add your custom domain
- Update your domain's DNS settings to point to GitHub Pages

---

### 🌐 Option 2: Netlify (Easiest Deployment)

**Pros:** Free, drag-and-drop, automatic HTTPS, continuous deployment
**Cons:** None for this use case

#### Method A: Drag and Drop (No Git Required)

1. **Create Netlify account**
   - Go to https://netlify.com
   - Sign up (free)

2. **Prepare your folder**
   - Make sure all files are in one folder
   - Ensure `model/` directory is included

3. **Deploy**
   - Log in to Netlify
   - Click "Add new site" → "Deploy manually"
   - Drag and drop your project folder
   - Wait 30-60 seconds

4. **Your site is live!**
   - Netlify provides a URL like: `https://random-name-123.netlify.app`
   - You can customize this in site settings

#### Method B: Using Netlify CLI (with Git)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Navigate to your project
cd mobile-cv-app

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod

# Follow the prompts
```

#### Continuous Deployment (Optional):
- Connect Netlify to your GitHub repository
- Every push to main branch automatically deploys

---

### ⚡ Option 3: Vercel

**Pros:** Free, fast, excellent performance, automatic HTTPS
**Cons:** Requires Node.js installation

#### Deployment Steps:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Navigate to project**
   ```bash
   cd mobile-cv-app
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Follow prompts**
   - Login (creates account if needed)
   - Set up and deploy (press Enter for defaults)
   - Select "No" for modifying settings (unless needed)

5. **Your app is live!**
   - Vercel provides URL: `https://your-project.vercel.app`

#### Production Deployment:
```bash
vercel --prod
```

---

### 🔥 Option 4: Firebase Hosting

**Pros:** Free tier generous, part of Google Cloud, good performance
**Cons:** Slightly more complex setup

#### Deployment Steps:

1. **Create Firebase project**
   - Go to https://console.firebase.google.com
   - Click "Add project"
   - Follow setup wizard

2. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

3. **Login**
   ```bash
   firebase login
   ```

4. **Initialize Firebase in your project**
   ```bash
   cd mobile-cv-app
   firebase init hosting
   ```

5. **Answer prompts**
   - Select your Firebase project
   - Public directory: `.` (current directory)
   - Single-page app: `No`
   - Overwrite index.html: `No`

6. **Deploy**
   ```bash
   firebase deploy
   ```

7. **Access your app**
   - URL: `https://your-project-id.web.app`

---

### 📱 Option 5: Render

**Pros:** Free tier available, simple, automatic HTTPS
**Cons:** Cold starts on free tier

#### Deployment Steps:

1. **Create account**
   - Go to https://render.com
   - Sign up (free)

2. **Push code to GitHub** (if not already done)
   - Follow GitHub steps from Option 1

3. **Create new Static Site on Render**
   - Click "New +" → "Static Site"
   - Connect your GitHub repository
   - Settings:
     - Build Command: (leave empty)
     - Publish Directory: `.`

4. **Deploy**
   - Click "Create Static Site"
   - Wait for deployment

5. **Access your app**
   - Render provides URL: `https://your-app.onrender.com`

---

## Deployment Checklist

Before deploying, verify:

- [ ] All files are present (index.html, styles.css, app.js, manifest.json)
- [ ] Model files are in `model/` directory
  - [ ] model.json
  - [ ] group1-shard1of1.bin
- [ ] No hardcoded localhost URLs in your code
- [ ] Tested locally and works correctly
- [ ] Camera permissions work (requires HTTPS in production)

## Post-Deployment Testing

After deployment, test on:

1. **Mobile Browsers**
   - iOS Safari
   - Android Chrome
   - Samsung Internet

2. **Desktop Browsers**
   - Chrome
   - Firefox
   - Safari
   - Edge

3. **Test Features**
   - Camera access
   - Detection accuracy
   - Camera switching
   - Filter buttons
   - Pause/Resume

## Troubleshooting

### Camera not working after deployment
- Ensure your site is served over HTTPS (all recommended platforms provide this)
- Check browser camera permissions
- Verify no mixed content errors in console

### Model not loading
- Check browser console for 404 errors
- Verify model files are included in deployment
- Check file paths in app.js (should be relative: `./model/model.json`)

### Slow performance
- Consider using a CDN for large model files
- Optimize model if too large
- Check hosting platform performance

### CORS errors
- Usually not an issue with static hosting
- If using external model files, ensure CORS headers are set correctly

## Custom Domain Setup

Most platforms support custom domains:

1. **Purchase domain** (Namecheap, Google Domains, etc.)

2. **Add CNAME record** in your DNS settings:
   ```
   Type: CNAME
   Name: www
   Value: your-app.platform.app
   ```

3. **Add A record** for root domain (specific IPs vary by platform):
   - GitHub Pages: see https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site
   - Netlify: automatic when you add domain in settings
   - Vercel: automatic when you add domain
   - Firebase: follow Firebase console instructions

4. **Enable HTTPS** (usually automatic)

## Updating Your App

### GitHub Pages / Vercel / Firebase / Render:
```bash
# Make changes to your code
git add .
git commit -m "Update description"
git push origin main
```
Deployment happens automatically (if continuous deployment is set up)

### Netlify (drag-and-drop):
- Make changes locally
- Drag and drop folder again
- Netlify keeps history of deployments

## Performance Optimization

1. **Compress model files**
   ```bash
   # Use gzip compression (most platforms do this automatically)
   gzip -k model/group1-shard1of1.bin
   ```

2. **Add Service Worker** for offline support (advanced)

3. **Use CDN** for TensorFlow.js (already configured)

4. **Optimize images/icons** if you add them

## Monitoring

Free monitoring tools:

- **Google Analytics** - Track visitors
- **Sentry** - Error tracking
- **Lighthouse** - Performance audits (built into Chrome DevTools)

## Cost Comparison

| Platform | Free Tier | Bandwidth | Custom Domain | HTTPS |
|----------|-----------|-----------|---------------|-------|
| GitHub Pages | Yes | 100GB/month | Yes | Yes |
| Netlify | Yes | 100GB/month | Yes | Yes |
| Vercel | Yes | 100GB/month | Yes | Yes |
| Firebase | Yes | 10GB/month | Yes | Yes |
| Render | Yes | 100GB/month | Yes | Yes |

All options are free for typical usage of this app!

## Need Help?

- Check platform-specific documentation
- Look for error messages in browser console (F12)
- Verify file paths and structure
- Test locally first with `python -m http.server`

---

**Congratulations! Your Mobile CV App is now online! 🎉**

Share your app URL with others and start detecting recyclable objects!

