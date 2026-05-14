import { useEffect } from 'react'
import TitleBar from '@renderer/components/TitleBar'
import Sidebar from '@renderer/components/Sidebar'
import QueuePanel from '@renderer/components/Queue/QueuePanel'
import PresetBrowser from '@renderer/components/Presets/PresetBrowser'
import SettingsPanel from '@renderer/components/Settings/SettingsPanel'
import EncodeBar from '@renderer/components/EncodeBar'
import { useEncoderStore } from '@renderer/store/useEncoderStore'
import { useFFmpegEvents } from '@renderer/hooks/useFFmpeg'

export default function App(): JSX.Element {
  useFFmpegEvents()
  const { activeTab } = useEncoderStore()

  // Global drag-over prevention (handled by drop zone)
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault()
    document.addEventListener('dragover', prevent)
    document.addEventListener('drop', prevent)
    return () => {
      document.removeEventListener('dragover', prevent)
      document.removeEventListener('drop', prevent)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-[#e6edf3] overflow-hidden">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'queue' && <QueuePanel />}
          {activeTab === 'presets' && <PresetBrowser />}
          {activeTab === 'settings' && <SettingsPanel />}
        </main>
      </div>

      <EncodeBar />
    </div>
  )
}
