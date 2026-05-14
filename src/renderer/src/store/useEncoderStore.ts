import { create } from 'zustand'
import { BUILT_IN_PRESETS } from '@shared/presets'
import type { EncodeJob, Preset, MediaInfo, AppSettings } from '@shared/types'
import { v4 as uuid } from '../utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EncoderState {
  // Queue
  jobs: EncodeJob[]
  selectedJobIds: Set<string>

  // Presets
  presets: Preset[]
  activePreset: Preset

  // Settings
  outputDir: string
  concurrentJobs: number
  isEncoding: boolean

  // UI
  activeTab: 'queue' | 'presets' | 'settings'
  showSettings: boolean

  // Actions — Queue
  addFiles: (paths: string[]) => void
  removeJob: (id: string) => void
  removeSelectedJobs: () => void
  clearDoneJobs: () => void
  clearAllJobs: () => void
  selectJob: (id: string, multi?: boolean) => void
  clearSelection: () => void
  setJobMediaInfo: (id: string, info: MediaInfo) => void
  updateJobProgress: (id: string, progress: number, fps?: number, bitrate?: string, timemark?: string) => void
  setJobStatus: (id: string, status: EncodeJob['status'], extra?: Partial<EncodeJob>) => void
  setJobPreset: (id: string, preset: Preset) => void
  setJobOutputDir: (id: string, dir: string) => void

  // Actions — Presets
  setActivePreset: (preset: Preset) => void
  addCustomPreset: (preset: Preset) => void
  removeCustomPreset: (id: string) => void

  // Actions — Settings
  setOutputDir: (dir: string) => void
  setConcurrentJobs: (n: number) => void

  // Actions — UI
  setActiveTab: (tab: EncoderState['activeTab']) => void
  setShowSettings: (show: boolean) => void
  setIsEncoding: (v: boolean) => void

  // Computed helpers
  pendingJobs: () => EncodeJob[]
  encodingJobs: () => EncodeJob[]
  doneJobs: () => EncodeJob[]
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useEncoderStore = create<EncoderState>((set, get) => ({
  jobs: [],
  selectedJobIds: new Set(),
  presets: BUILT_IN_PRESETS,
  activePreset: BUILT_IN_PRESETS[0],
  outputDir: '',
  concurrentJobs: 2,
  isEncoding: false,
  activeTab: 'queue',
  showSettings: false,

  // ─── Queue ────────────────────────────────────────────────────────────────

  addFiles: (paths) =>
    set((state) => {
      const newJobs: EncodeJob[] = paths.map((p) => ({
        id: uuid(),
        inputPath: p,
        outputPath: '',
        outputDir: state.outputDir,
        preset: state.activePreset,
        status: 'pending',
        progress: 0,
        addedAt: Date.now()
      }))
      return { jobs: [...state.jobs, ...newJobs] }
    }),

  removeJob: (id) =>
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== id),
      selectedJobIds: new Set([...state.selectedJobIds].filter((i) => i !== id))
    })),

  removeSelectedJobs: () =>
    set((state) => ({
      jobs: state.jobs.filter((j) => !state.selectedJobIds.has(j.id)),
      selectedJobIds: new Set()
    })),

  clearDoneJobs: () =>
    set((state) => ({
      jobs: state.jobs.filter((j) => j.status !== 'done' && j.status !== 'error')
    })),

  clearAllJobs: () => set({ jobs: [], selectedJobIds: new Set() }),

  selectJob: (id, multi = false) =>
    set((state) => {
      if (multi) {
        const next = new Set(state.selectedJobIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return { selectedJobIds: next }
      }
      return { selectedJobIds: new Set([id]) }
    }),

  clearSelection: () => set({ selectedJobIds: new Set() }),

  setJobMediaInfo: (id, info) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, mediaInfo: info } : j))
    })),

  updateJobProgress: (id, progress, fps, bitrate, timemark) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id
          ? { ...j, progress, currentFps: fps, currentBitrate: bitrate, timemark, status: 'encoding' }
          : j
      )
    })),

  setJobStatus: (id, status, extra = {}) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, status, ...extra } : j
      )
    })),

  setJobPreset: (id, preset) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, preset } : j))
    })),

  setJobOutputDir: (id, dir) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, outputDir: dir } : j))
    })),

  // ─── Presets ──────────────────────────────────────────────────────────────

  setActivePreset: (preset) => set({ activePreset: preset }),

  addCustomPreset: (preset) =>
    set((state) => ({ presets: [...state.presets, { ...preset, isCustom: true }] })),

  removeCustomPreset: (id) =>
    set((state) => ({ presets: state.presets.filter((p) => p.id !== id) })),

  // ─── Settings ─────────────────────────────────────────────────────────────

  setOutputDir: (dir) => {
    set({ outputDir: dir })
    window.api.storeSet('outputDir', dir)
  },

  setConcurrentJobs: (n) => {
    set({ concurrentJobs: n })
    window.api.storeSet('concurrentJobs', n)
  },

  // ─── UI ───────────────────────────────────────────────────────────────────

  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowSettings: (show) => set({ showSettings: show }),
  setIsEncoding: (v) => set({ isEncoding: v }),

  // ─── Computed ─────────────────────────────────────────────────────────────

  pendingJobs: () => get().jobs.filter((j) => j.status === 'pending'),
  encodingJobs: () => get().jobs.filter((j) => j.status === 'encoding'),
  doneJobs: () => get().jobs.filter((j) => j.status === 'done' || j.status === 'error')
}))

// ─── Load persisted settings on startup ──────────────────────────────────────

export async function loadPersistedSettings(): Promise<void> {
  const store = useEncoderStore.getState()
  const [outputDir, concurrentJobs] = await Promise.all([
    window.api.storeGet('outputDir') as Promise<string>,
    window.api.storeGet('concurrentJobs') as Promise<number>
  ])
  if (outputDir) store.setOutputDir(outputDir)
  if (concurrentJobs) store.setConcurrentJobs(concurrentJobs)
}
