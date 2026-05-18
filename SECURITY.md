# Production Security Checklist

This document outlines security considerations and implementation status for OpenEncoder in production.

## Implementation Status

### ✅ Completed
- [x] Context isolation enabled
- [x] Node integration disabled
- [x] Preload scripts used for IPC
- [x] Sandbox mode enabled
- [x] Remote module disabled
- [x] Insecure content disabled
- [x] IPC validation at preload level
- [x] No eval() or dynamic code execution

### 🔄 Recommended for Future Releases
- [ ] Code signing (Windows, macOS)
- [ ] Notarization (macOS)
- [ ] Auto-update with signature verification
- [ ] Crash reporting (Sentry or similar)
- [ ] Security audits for FFmpeg filter chains
- [ ] Rate limiting on IPC handlers
- [ ] Path validation for file access (prevent directory traversal)

### Security Best Practices Implemented

#### 1. Process Isolation
- Sandbox enabled in BrowserWindow
- No direct access to Node.js APIs from renderer
- Preload bridge validates all IPC calls

#### 2. Content Security Policy
Consider adding CSP headers in preload or main process:
```javascript
mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:"
      ]
    }
  })
})
```

#### 3. IPC Security
- All IPC handlers are centralized in `src/main/ipc-handlers.ts`
- Inputs are loosely validated; consider adding stricter validation
- No sensitive data is logged or sent to renderer unexpectedly

#### 4. File System Access
- File dialogs restrict selection to media files
- Output paths are validated before writing
- No direct file system access from renderer

## Deployment Considerations

### Code Signing
To enable code signing for production:

1. **Windows**: Obtain an EV code signing certificate and use `build.win.certificateFile` in electron-builder config
2. **macOS**: Obtain Apple Developer certificate and configure `build.mac.identity`
3. **Linux**: Package signing varies by distro

### Auto-Updates
Implement electron-updater with signature verification:
```bash
npm install electron-updater
```

### Crash Reporting
Consider integrating Sentry or similar service for production error tracking.

## Testing

Run security-focused tests:
```bash
npm run test
npm run lint
```

## External Dependencies

- **FFmpeg/FFprobe**: Pinned via `ffmpeg-static` and `ffprobe-static` for consistency
- **Electron**: Security updates released regularly; update quarterly or as needed
- **React/TypeScript**: Monitor for security advisories

## Incident Response

If a security vulnerability is discovered:
1. File a private security report
2. Create a patch release with the fix
3. Publish security advisory in GitHub releases
4. Recommend users update immediately
