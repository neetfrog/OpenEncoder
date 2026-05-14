import { useState, useCallback, useRef } from 'react'
import { Upload, Film, Music, Image } from 'lucide-react'

interface Props {
  onFiles: (paths: string[]) => void
}

const SUPPORTED = [
  'video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm',
  'video/x-msvideo', 'audio/mpeg', 'audio/flac', 'audio/wav', 'audio/ogg'
]

export default function DropZone({ onFiles }: Props): JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      dragCounter.current = 0
      setIsDragOver(false)

      const paths: string[] = []
      for (const file of Array.from(e.dataTransfer.files)) {
        // In Electron, we can get the full path via file.path
        const p = (file as File & { path?: string }).path
        if (p) paths.push(p)
      }
      if (paths.length > 0) onFiles(paths)
    },
    [onFiles]
  )

  const handleClick = useCallback(async () => {
    const paths = await window.api.openFiles()
    if (paths.length > 0) onFiles(paths)
  }, [onFiles])

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        flex-1 flex flex-col items-center justify-center cursor-pointer transition-all duration-200
        mx-8 my-8 rounded-2xl border-2 border-dashed
        ${isDragOver
          ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
          : 'border-[#21262d] hover:border-[#30363d] hover:bg-white/[0.015]'
        }
      `}
    >
      {/* Icon cluster */}
      <div className="relative mb-6">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all
          ${isDragOver ? 'bg-indigo-500/20' : 'bg-[#161b22]'}`}>
          <Upload
            size={36}
            className={`transition-colors ${isDragOver ? 'text-indigo-400' : 'text-[#30363d]'}`}
          />
        </div>
        <div className="absolute -bottom-2 -right-3 flex gap-1">
          <div className="w-7 h-7 rounded-lg bg-[#1c2128] border border-[#21262d] flex items-center justify-center">
            <Film size={13} className="text-blue-400" />
          </div>
          <div className="w-7 h-7 rounded-lg bg-[#1c2128] border border-[#21262d] flex items-center justify-center">
            <Music size={13} className="text-orange-400" />
          </div>
        </div>
      </div>

      {isDragOver ? (
        <div className="text-indigo-400 font-semibold text-base animate-fade-in">
          Drop files to add to queue
        </div>
      ) : (
        <>
          <div className="text-[#e6edf3] font-semibold text-base mb-1">
            Drop media files here
          </div>
          <div className="text-[#8b949e] text-sm mb-4">
            or click to browse
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-1.5 justify-center max-w-sm">
        {['MP4', 'MKV', 'MOV', 'WebM', 'MP3', 'AAC', 'FLAC', 'WAV', 'ProRes', 'AVI', 'MXF'].map((f) => (
          <span
            key={f}
            className="px-2 py-0.5 rounded bg-[#21262d] text-[10px] text-[#484f58] font-mono"
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}
