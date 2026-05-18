@echo off
REM OpenEncoder Release Script (Windows)
REM Usage: scripts\release.bat 0.2.0

setlocal enabledelayedexpansion

if "%1"=="" (
    echo Usage: scripts\release.bat ^<version^>
    echo Example: scripts\release.bat 0.2.0
    exit /b 1
)

set VERSION=%1
set TAG=v%VERSION%

REM Validate version format (basic check for X.Y.Z)
for /f "tokens=1,2,3 delims=." %%a in ("%VERSION%") do (
    if not "%%c"=="" (
        REM Valid format
    ) else (
        echo Error: Invalid version format. Use semantic versioning ^(e.g., 0.2.0^)
        exit /b 1
    )
)

echo 📦 Preparing release: %TAG%

REM Check if tag exists
git rev-parse "%TAG%" >nul 2>&1
if %errorlevel% equ 0 (
    echo ❌ Error: Tag %TAG% already exists
    exit /b 1
)

REM Verify working directory is clean
git diff-index --quiet HEAD --
if %errorlevel% neq 0 (
    echo ❌ Error: Working directory has uncommitted changes
    echo    Please commit or stash changes before releasing
    exit /b 1
)

REM Ask for confirmation
set /p confirm="Ready to release %TAG%. Continue? (y/n) "
if /i not "%confirm%"=="y" (
    echo ❌ Release cancelled
    exit /b 1
)

echo.
echo ✅ Verifying build locally...

call npm run lint >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Linting failed
    exit /b 1
)

call npm run test >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Tests failed
    exit /b 1
)

call npm run build >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Build failed
    exit /b 1
)

echo ✅ All checks passed
echo.
echo 📝 Creating tag and pushing to GitHub...

REM Update package.json version using PowerShell
powershell -Command "(Get-Content package.json) -replace '\"version\":\s*\"[^\"]*\"', '\"version\": \"%VERSION%\"' | Set-Content package.json"

REM Stage and commit version bump
git add package.json
git commit -m "chore: release %TAG%" --allow-empty

REM Create tag
git tag "%TAG%" -m "Release %TAG%"

REM Push to GitHub
git push origin main
git push origin "%TAG%"

echo.
echo ✅ Release pushed! GitHub Actions will now:
echo    1. Run tests
echo    2. Build installers for Windows, macOS, Linux
echo    3. Create GitHub release with artifacts
echo.
echo 👉 Monitor progress at:
echo    https://github.com/user/openencoder/actions
echo.
echo 📦 Release will be available at:
echo    https://github.com/user/openencoder/releases/tag/%TAG%
