#!/bin/bash

# Setup script for Mobile CV App
echo "🚀 Setting up Mobile CV App..."

# Check if model directory exists
if [ ! -d "model" ]; then
    echo "📁 Creating model directory..."
    mkdir -p model
fi

# Check if source model files exist
SOURCE_DIR="../recycle-app/public/model"

if [ -d "$SOURCE_DIR" ]; then
    echo "📋 Copying model files from $SOURCE_DIR..."
    
    # Copy model files
    if [ -f "$SOURCE_DIR/model.json" ]; then
        cp "$SOURCE_DIR/model.json" model/
        echo "✅ Copied model.json"
    else
        echo "❌ model.json not found in $SOURCE_DIR"
    fi
    
    if [ -f "$SOURCE_DIR/group1-shard1of1.bin" ]; then
        cp "$SOURCE_DIR/group1-shard1of1.bin" model/
        echo "✅ Copied group1-shard1of1.bin"
    else
        echo "❌ group1-shard1of1.bin not found in $SOURCE_DIR"
    fi
    
    if [ -f "$SOURCE_DIR/metadata.yaml" ]; then
        cp "$SOURCE_DIR/metadata.yaml" model/
        echo "✅ Copied metadata.yaml"
    else
        echo "⚠️  metadata.yaml not found (optional)"
    fi
else
    echo "❌ Source directory $SOURCE_DIR not found!"
    echo "📝 Please manually copy your model files to the 'model' directory:"
    echo "   - model.json"
    echo "   - group1-shard1of1.bin"
    echo "   - metadata.yaml (optional)"
fi

# Check if model files exist
echo ""
echo "🔍 Verifying model files..."
MISSING_FILES=0

if [ ! -f "model/model.json" ]; then
    echo "❌ model/model.json is missing"
    MISSING_FILES=1
fi

if [ ! -f "model/group1-shard1of1.bin" ]; then
    echo "❌ model/group1-shard1of1.bin is missing"
    MISSING_FILES=1
fi

if [ $MISSING_FILES -eq 0 ]; then
    echo "✅ All required model files are present!"
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "To run the app locally:"
    echo "  1. Start a local server:"
    echo "     - Python: python -m http.server 8000"
    echo "     - Node.js: npx http-server -p 8000"
    echo "  2. Open http://localhost:8000 in your browser"
    echo ""
    echo "To test on mobile:"
    echo "  1. Find your computer's IP address"
    echo "  2. Ensure mobile device is on same WiFi"
    echo "  3. Open http://YOUR_IP:8000 on mobile browser"
else
    echo ""
    echo "⚠️  Please copy the missing model files before running the app"
fi

