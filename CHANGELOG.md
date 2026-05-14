# Changelog

All notable changes to MediaForge will be documented in this file.

## [0.2.0] - Unreleased

### Added
- Better error handling and user feedback for probe failures
- Accurate ETA calculation based on elapsed time
- Enhanced security: enabled sandbox mode in Electron
- Testing infrastructure with Jest
- Linting with ESLint and code formatting with Prettier
- CI/CD pipeline for automated builds and releases
- Improved error messages in job queue

### Fixed
- ETA calculation was using incorrect time reference
- Probe errors were silently ignored instead of showing to user
- Missing security context isolation improvements

### Changed
- Upgraded security posture: sandbox mode now enabled by default
- Better error propagation in encoding pipeline

## [0.1.0] - Initial Release

### Added
- Batch encoding queue with drag & drop
- 16+ built-in presets (H.264, H.265, AV1, VP9, ProRes, audio codecs)
- Per-job preset selection
- Live progress tracking with FPS and ETA
- FFprobe media information detection
- Configurable concurrent encoding (1-4 jobs)
- Custom output folder selection
- Frameless dark UI with custom title bar
- Persistent settings (output dir, concurrency)
- Cross-platform support (Windows, macOS, Linux)
