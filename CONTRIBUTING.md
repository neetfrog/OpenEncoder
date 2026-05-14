# Development & Contribution Guide

## Setting Up Development Environment

### Prerequisites
- Node.js 18+
- npm or yarn
- FFmpeg binaries (handled by ffmpeg-static)

### Installation
```bash
npm install
npm run dev
```

## Code Standards

### Format & Lint
```bash
npm run format    # Auto-format code
npm run lint      # Check for issues
npm run lint:fix  # Auto-fix linting issues
```

### Testing
```bash
npm run test           # Run tests once
npm run test:watch     # Watch mode
npm run test:cov       # With coverage report
```

### Type Checking
```bash
npx tsc --noEmit
```

## Project Structure

- **src/main/** — Electron main process, FFmpeg service, IPC handlers
- **src/preload/** — Secure bridge between renderer and main
- **src/renderer/src/** — React UI, Zustand store, hooks
- **src/shared/** — Types, constants, presets

## Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Write tests** for new functionality
   ```bash
   src/__tests__/my-feature.test.ts
   ```

3. **Follow code standards**
   - Use TypeScript strictly
   - Add JSDoc comments for public APIs
   - Keep functions small and focused
   - Handle errors explicitly

4. **Commit with clear messages**
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve issue"
   git commit -m "refactor: improve performance"
   ```

5. **Push and open a PR**
   ```bash
   git push origin feature/my-feature
   ```

## Testing Guidelines

### Unit Tests
Test individual functions in isolation:
```typescript
describe('buildOutputPath', () => {
  it('should build path with custom directory', () => {
    const result = buildOutputPath('/input.mp4', '/output', preset)
    expect(result).toBe('/output/input_h264.mp4')
  })
})
```

### Integration Tests
Test IPC communication and store interactions (add as needed).

### E2E Tests
Manual testing workflow:
1. `npm run dev`
2. Drag files into queue
3. Test encoding with different presets
4. Verify progress and completion

## Building Releases

### Local Build
```bash
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

### Automated Release
Push a tag to trigger CI/CD:
```bash
git tag v0.2.0
git push origin v0.2.0
```

The GitHub Action will build and create a release automatically.

## Common Issues

### FFmpeg binaries not found
- Ensure `npm install` completed successfully
- Check that `node_modules/ffmpeg-static/` exists
- In development, binaries are resolved from node_modules
- In production, they're copied to `extraResources` via electron-builder

### Tests failing after changes
- Clear Jest cache: `npx jest --clearCache`
- Ensure all imports are correct
- Check that mocks are properly set up

### Sandbox mode issues
- If sandbox causes errors, ensure preload script is properly configured
- All Node APIs must be accessed through the preload bridge
- Context isolation must be enabled

## Performance Optimization

### Rendering
- Use React.memo for expensive components
- Implement virtualization for large queues
- Profile with DevTools in development mode

### Encoding
- Concurrent jobs are configurable (1-4)
- Monitor system resources to avoid overload
- Consider adding queue prioritization in future

## Security Notes

- Never log sensitive file paths; use `sanitizePathForLogging()`
- Validate all IPC inputs with security helpers
- Keep Electron and dependencies up to date
- Test with sandbox mode enabled

## Release Checklist

Before releasing a new version:
- [ ] Update CHANGELOG.md with changes
- [ ] Bump version in package.json
- [ ] Ensure all tests pass
- [ ] Test build on all platforms locally
- [ ] Review security checklist (SECURITY.md)
- [ ] Create git tag and push to trigger CI
- [ ] Verify GitHub Actions succeeded
- [ ] Download and test release binaries
- [ ] Announce release in GitHub Discussions
