# Production Deployment Guide

## Pre-Release Checklist

### 1. Version & Changelog
- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md` with release notes
- [ ] Ensure version matches semantic versioning (major.minor.patch)

### 2. Testing
```bash
npm run lint
npm run test:cov
npm run build
```
- [ ] All tests pass
- [ ] Code coverage acceptable
- [ ] TypeScript errors resolved

### 3. Security Review
- [ ] Review `SECURITY.md`
- [ ] Check for hardcoded credentials or API keys
- [ ] Verify all IPC inputs are validated
- [ ] Ensure sandbox mode is enabled

### 4. Local Build Testing

#### Windows
```bash
npm run dist:win
# Test installer: dist-electron/MediaForge-setup-*.exe
```

#### macOS
```bash
npm run dist:mac
# Test DMG: dist-electron/MediaForge-*.dmg
```

#### Linux
```bash
npm run dist:linux
# Test AppImage: dist-electron/MediaForge-*.AppImage
```

### 5. Code Signing (Optional)

#### Windows Code Signing
1. Obtain EV code signing certificate
2. Configure in `.env`:
   ```bash
   WIN_CSC_LINK=path/to/cert.pfx
   WIN_CSC_KEY_PASSWORD=certificate_password
   ```
3. Run `npm run dist:win`

#### macOS Code Signing & Notarization
1. Obtain Apple Developer certificate
2. Configure in `.env`:
   ```bash
   APPLE_ID=your@email.com
   APPLE_ID_PASSWORD=app_specific_password
   APPLE_TEAM_ID=XXXXXXXXXX
   ```
3. Run `npm run dist:mac` (notarization happens automatically)

### 6. GitHub Release

1. Create a Git tag:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

2. CI/CD will automatically:
   - Build on all platforms
   - Run tests
   - Create GitHub release with binaries

3. Verify release at: `https://github.com/user/mediaforge/releases`

## Post-Release

### 1. Announce Release
- Update GitHub Discussions
- Post on social media (if applicable)
- Notify users via app update mechanism

### 2. Monitor for Issues
- Watch GitHub Issues for bug reports
- Monitor crash telemetry (if integrated)
- Respond to security vulnerabilities immediately

### 3. Plan Next Release
- Triage bug reports
- Plan features for next version
- Start development cycle

## Troubleshooting Deployment

### App Won't Start
- Check logs in `~/.config/mediaforge/` (Linux) or `%APPDATA%\mediaforge\` (Windows)
- Verify FFmpeg binaries are present in bundle
- Test on clean system without dev environment

### Encoding Fails for Some Users
- Request detailed error logs
- Check system FFmpeg compatibility
- Verify file permissions and disk space

### Crashes on macOS
- Ensure app is code signed and notarized
- Check for missing dylib dependencies
- Test on multiple macOS versions

### Auto-Update Fails
- Verify release artifacts are correctly uploaded
- Check app version format (semver)
- Review auto-update configuration

## Maintenance

### Regular Updates
- Check Electron security updates: monthly
- Update dependencies: quarterly
- Audit code: annually or after incidents

### Version Support
- Current version: Full support
- Previous major version: Security fixes only
- Older versions: No support (encourage upgrade)

## Rollback Procedure

If a release is critical:
1. Immediately publish a patch release with fix
2. Mark broken version as deprecated on GitHub
3. Notify users to update urgently

## Performance Optimization

For better user experience:
- Monitor app startup time (target: < 2s)
- Profile encoding performance
- Track memory usage over long sessions
- Optimize UI rendering for low-end systems

## Metrics to Monitor

If crash/error reporting is enabled:
- Crash rate (target: < 0.1%)
- Average session duration
- Most common errors
- Performance on various hardware configs
