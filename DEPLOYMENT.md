# Production Deployment Guide

**See [RELEASE.md](RELEASE.md) for the complete automated release workflow and quick-start guide.**

## Pre-Release Checklist

### 1. Version & Changelog
- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md` with release notes
- [ ] Ensure version matches semantic versioning (major.minor.patch)
- [ ] See [RELEASE.md](RELEASE.md) for versioning strategy

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

See [RELEASE.md — Code Signing & Notarization](RELEASE.md#code-signing--notarization) for detailed setup instructions.

#### Windows Code Signing
1. Obtain EV code signing certificate
2. Configure GitHub Actions secrets:
   - `WIN_CSC_LINK`: Base64-encoded certificate
   - `WIN_CSC_KEY_PASSWORD`: Certificate password

#### macOS Code Signing & Notarization
1. Obtain Apple Developer certificate
2. Configure GitHub Actions secrets:
   - `APPLE_ID`: Apple ID email
   - `APPLE_ID_PASSWORD`: App-specific password
   - `APPLE_TEAM_ID`: Team ID from developer account

### 6. Automated Release via GitHub Actions

**Complete guide: [RELEASE.md](RELEASE.md)**

To trigger an automated release build:

1. Update `package.json` version and `CHANGELOG.md`
2. Create and push semantic version tag:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

The workflow will automatically:
   - Run all tests
   - Build installers for Windows, macOS, and Linux
   - Create GitHub release with all artifacts
   - Generate release notes

3. Verify release at: `https://github.com/user/mediaforge/releases`

4. For detailed troubleshooting and advanced options, see [RELEASE.md](RELEASE.md)

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
