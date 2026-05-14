import { useState, useEffect } from 'react'
import { Minus, Square, X, Cpu } from 'lucide-react'
import { useEncoderStore } from '@renderer/store/useEncoderStore'

export default function TitleBar(): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)
  const { jobs, isEncoding } = useEncoderStore()
  const encodingCount = jobs.filter((j) => j.status === 'encoding').length

  useEffect(() => {
    window.api.windowIsMaximized().then(setIsMaximized)
    const remove = window.api.onWindowMaximized(setIsMaximized)
    return remove
  }, [])

  return (
    <div className="drag-region flex items-center h-10 bg-[#161b22] border-b border-[#21262d] shrink-0 select-none">
      {/* Logo + App name */}
      <div className="flex items-center gap-2 px-4">
        <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Cpu size={13} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-[#e6edf3] tracking-tight">MediaForge</span>
        {isEncoding && (
          <span className="no-drag flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
            {encodingCount} encoding
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Window controls */}
      <div className="no-drag flex items-center h-full">
        <button
          onClick={() => window.api.windowMinimize()}
          className="h-full px-4 hover:bg-white/10 transition-colors flex items-center"
          title="Minimize"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => window.api.windowMaximize()}
          className="h-full px-4 hover:bg-white/10 transition-colors flex items-center"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
              <path d="M3 0v3H0v8h8V8h3V0zm5 10H1V4h7zm3-3H9V3H4V1h7z" />
            </svg>
          ) : (
            <Square size={11} />
          )}
        </button>
        <button
          onClick={() => window.api.windowClose()}
          className="h-full px-4 hover:bg-red-500 transition-colors flex items-center"
          title="Close"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
