import { app, BrowserWindow } from 'electron'

/**
 * Global error handler for uncaught exceptions
 * In production, integrate with crash reporting service (e.g., Sentry)
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)

  // TODO: Send to crash reporting service
  // reportToCrashService(error)

  // Don't exit immediately; allow app to clean up
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack)
  }
})

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)

  // TODO: Send to crash reporting service
  // reportToCrashService(reason)
})

export function setupErrorHandling(): void {
  // Listen to any renderer process crashes
  app.on('renderer-process-crashed', (event, webContents, killed) => {
    console.error(`Renderer process crashed. Killed: ${killed}`)
    // Optionally restart or notify user
  })
}
