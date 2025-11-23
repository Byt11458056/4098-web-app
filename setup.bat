@echo off
REM Setup script for Mobile CV App (Windows)

echo.
echo ================================
echo Mobile CV App Setup
echo ================================
echo.

REM Check if model directory exists
if not exist "model" (
    echo Creating model directory...
    mkdir model
)

REM Check if source model files exist
set SOURCE_DIR=..\recycle-app\public\model

if exist "%SOURCE_DIR%" (
    echo Copying model files from %SOURCE_DIR%...
    
    if exist "%SOURCE_DIR%\model.json" (
        copy "%SOURCE_DIR%\model.json" model\ >nul
        echo [OK] Copied model.json
    ) else (
        echo [ERROR] model.json not found in %SOURCE_DIR%
    )
    
    if exist "%SOURCE_DIR%\group1-shard1of1.bin" (
        copy "%SOURCE_DIR%\group1-shard1of1.bin" model\ >nul
        echo [OK] Copied group1-shard1of1.bin
    ) else (
        echo [ERROR] group1-shard1of1.bin not found in %SOURCE_DIR%
    )
    
    if exist "%SOURCE_DIR%\metadata.yaml" (
        copy "%SOURCE_DIR%\metadata.yaml" model\ >nul
        echo [OK] Copied metadata.yaml
    ) else (
        echo [WARNING] metadata.yaml not found (optional)
    )
) else (
    echo [ERROR] Source directory %SOURCE_DIR% not found!
    echo.
    echo Please manually copy your model files to the 'model' directory:
    echo   - model.json
    echo   - group1-shard1of1.bin
    echo   - metadata.yaml (optional)
)

echo.
echo ================================
echo Verifying model files...
echo ================================
echo.

set MISSING_FILES=0

if not exist "model\model.json" (
    echo [ERROR] model\model.json is missing
    set MISSING_FILES=1
)

if not exist "model\group1-shard1of1.bin" (
    echo [ERROR] model\group1-shard1of1.bin is missing
    set MISSING_FILES=1
)

echo.
if %MISSING_FILES%==0 (
    echo [SUCCESS] All required model files are present!
    echo.
    echo ================================
    echo Setup Complete!
    echo ================================
    echo.
    echo To run the app locally:
    echo   1. Start a local server:
    echo      - Python: python -m http.server 8000
    echo      - Node.js: npx http-server -p 8000
    echo   2. Open http://localhost:8000 in your browser
    echo.
    echo To test on mobile:
    echo   1. Find your computer's IP address (ipconfig)
    echo   2. Ensure mobile device is on same WiFi
    echo   3. Open http://YOUR_IP:8000 on mobile browser
) else (
    echo [WARNING] Please copy the missing model files before running the app
)

echo.
pause

