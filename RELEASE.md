# Release Guide

## Automated Release Process

OpenEncoder uses GitHub Actions to automatically build and release the application across Windows, macOS, and Linux.

### How It Works

1. Push a semantic version tag to trigger the workflow
2. Tests run automatically
3. Builds are created for all platforms:
   - **Windows**: NSIS installer (`OpenEncoder-setup-*.exe`) + Portable executable (`OpenEncoder-*.exe`)
   - **macOS**: DMG installer (`OpenEncoder-*.dmg`)
   - **Linux**: AppImage (`OpenEncoder-*.AppImage`)
4. GitHub release is automatically created with all artifacts

### Creating a Release

#### Quick Start (Recommended for Most Users)

**On macOS/Linux:**
```bash
./scripts/release.sh 0.2.0
```

**On Windows:**
```cmd
scripts\release.bat 0.2.0
```

The script will:
- ✅ Verify code quality and tests
- ✅ Update package.json version
- ✅ Create git tag
- ✅ Push to GitHub (triggers workflow)

#### Option 1: Using Git Tags (Manual)

If you prefer manual control:

1. Update version in `package.json`:
   ```json
   {
     "version": "0.2.0"
   }
   ```

2. Update `CHANGELOG.md` with release notes

3. Commit changes:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: release v0.2.0"
   ```

4. Create and push semantic version tag:
   ```bash
   git tag v0.2.0
   git push origin main
   git push origin v0.2.0
   ```

5. The workflow will automatically:
   - Run tests
   - Build installers for all platforms
   - Create GitHub release with artifacts

#### Option 2: Manual Workflow Dispatch

1. Go to **Actions** tab in GitHub repository
2. Select **Release** workflow
3. Click **Run workflow**
4. Enter version number (e.g., `0.2.0`)
5. Workflow will build and create release

### Helper Scripts

For convenience, use the included release scripts:

**macOS/Linux:**
```bash
# Make executable (one-time)
chmod +x scripts/release.sh

# Create release
./scripts/release.sh 0.2.0
```

**Windows:**
```cmd
REM Run from repo root
scripts\release.bat 0.2.0
```

The scripts perform pre-flight checks and automatically update package.json.

### What Gets Built

#### Windows
- **Installer** (`OpenEncoder-setup-0.2.0.exe`)
  - One-click installer with shortcuts
  - Optional installation directory selection
  - Start menu & desktop shortcuts
  
- **Portable** (`OpenEncoder-0.2.0.exe`)
  - No installation required
  - Can run from USB drive
  - Stores config in app directory

#### macOS
- **DMG** (`OpenEncoder-0.2.0.dmg`)
  - Universal binary (Intel + Apple Silicon)
  - Signed and ready to run
  - Standard macOS installation experience

#### Linux
- **AppImage** (`OpenEncoder-0.2.0.AppImage`)
  - Self-contained, portable executable
  - No dependencies required
  - Works on all modern Linux distributions

### Monitoring the Release

1. Go to **Actions** tab
2. Watch the **Release** workflow
3. Check build status in real-time
4. Download artifacts or view in GitHub releases

### Debugging Build Failures

If a platform build fails:

1. Check the **Actions** tab for error logs
2. Common issues:
   - Missing dependencies: Run `npm ci` locally
   - Code quality: Run `npm run lint` locally
   - Test failures: Run `npm run test` locally
   - FFmpeg binaries: Verify `node_modules/ffmpeg-static/` exists

3. Fix locally and re-push tag:
   ```bash
   git tag -d v0.2.0
   git push origin :v0.2.0
   # After fixing locally...
   git tag v0.2.0
   git push origin v0.2.0
   ```

### Release Notes

GitHub automatically generates release notes from:
- Commit messages since last release
- Pull request titles
- Manual edits to the release

To customize release notes:
1. Go to GitHub **Releases**
2. Click the release
3. Click **Edit**
4. Update description
5. Save changes

### Code Signing & Notarization

#### Windows Code Signing
To enable code signing:
1. Obtain an EV code signing certificate (`.pfx` file)
2. Set GitHub Actions secrets:
   - `WIN_CSC_LINK`: Base64-encoded certificate
   - `WIN_CSC_KEY_PASSWORD`: Certificate password
3. The workflow will automatically sign during build

#### macOS Code Signing & Notarization
To enable macOS signing:
1. Set up Apple Developer account
2. Set GitHub Actions secrets:
   - `APPLE_ID`: Apple ID email
   - `APPLE_ID_PASSWORD`: App-specific password (not regular password)
   - `APPLE_TEAM_ID`: Team ID from developer account
3. The workflow will automatically sign and notarize during build

### Rollback / Unpublish

If a release needs to be withdrawn:
1. Go to GitHub **Releases**
2. Find the release
3. Click **Delete**
4. Confirm deletion
5. Create a patch release (v0.2.1) with fixes

### Versioning Strategy

Follow **Semantic Versioning** (major.minor.patch):

- **Major** (v1.0.0 → v2.0.0): Breaking changes
- **Minor** (v1.0.0 → v1.1.0): New features (backward compatible)
- **Patch** (v1.0.0 → v1.0.1): Bug fixes

Examples:
- `v0.1.0` — First release
- `v0.2.0` — New features
- `v0.2.1` — Bug fix
- `v1.0.0` — Stable production release

### Pre-Release Checklist

Before creating a release tag:
- [ ] All tests pass: `npm run test`
- [ ] Code quality OK: `npm run lint`
- [ ] Types check: `npx tsc --noEmit`
- [ ] Build locally: `npm run build`
- [ ] Test locally: `npm run dist:win` (at least Windows)
- [ ] Update `CHANGELOG.md` with changes
- [ ] Update `package.json` version
- [ ] Review security: `cat SECURITY.md`
- [ ] Commit all changes
- [ ] Tag and push

### CI/CD Environment

The workflow uses:
- **Node.js 18** (LTS)
- **GitHub-hosted runners**:
  - `ubuntu-latest` — Linux builds
  - `windows-latest` — Windows builds
  - `macos-latest` — macOS builds (Intel)

### Troubleshooting

| Problem | Solution |
|---------|----------|
| Workflow doesn't start | Ensure tag matches `v*.*.*` format |
| Tests fail in CI | Run tests locally: `npm run test` |
| Build fails on specific OS | Check OS-specific logs in Actions tab |
| FFmpeg not found | Verify `npm ci` installed deps correctly |
| Release not created | Check GitHub token permissions (auto-set) |

### Resources

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Semantic Versioning](https://semver.org/)
- [Electron Builder Docs](https://www.electron.build/)
- [CHANGELOG Format](https://keepachangelog.com/)
