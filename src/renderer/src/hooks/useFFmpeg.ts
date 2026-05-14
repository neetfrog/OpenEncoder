import { useEffect } from 'react'
import { useEncoderStore, loadPersistedSettings } from '@renderer/store/useEncoderStore'
import type { EncodeProgressPayload, EncodeCompletePayload, EncodeErrorPayload } from '@shared/types'

export function useFFmpegEvents(): void {
  const store = useEncoderStore()

  useEffect(() => {
    // Load persisted settings once
    loadPersistedSettings()

    const removeProgress = window.api.onEncodeProgress((payload: EncodeProgressPayload) => {
      store.updateJobProgress(
        payload.jobId,
        payload.percent,
        payload.currentFps,
        payload.currentBitrate,
        payload.timemark
      )
    })

    const removeComplete = window.api.onEncodeComplete((payload: EncodeCompletePayload) => {
      store.setJobStatus(payload.jobId, 'done', {
        progress: 100,
        outputPath: payload.outputPath,
        finishedAt: Date.now()
      })
    })

    const removeError = window.api.onEncodeError((payload: EncodeErrorPayload) => {
      store.setJobStatus(payload.jobId, 'error', { error: payload.error })
    })

    return () => {
      removeProgress()
      removeComplete()
      removeError()
    }
  }, [])
}

export function useProbeFiles(fileIds: string[]): void {
  const { jobs, setJobMediaInfo, setJobStatus } = useEncoderStore()

  useEffect(() => {
    for (const id of fileIds) {
      const job = jobs.find((j) => j.id === id)
      if (job && !job.mediaInfo) {
        window.api
          .probe(job.inputPath)
          .then((info) => setJobMediaInfo(id, info))
          .catch((err) => {
            // Set error status instead of silently ignoring
            const errorMsg = err instanceof Error ? err.message : 'Failed to probe media file'
            setJobStatus(id, 'error', {
              error: `Probe error: ${errorMsg}`,
              progress: 0
            })
          })
      }
    }
  }, [fileIds.join(',')])
}
