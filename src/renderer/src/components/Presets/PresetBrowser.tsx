import { useState } from 'react'
import { Search, Video, Music, Image, Plus, Star, Check } from 'lucide-react'
import { BUILT_IN_PRESETS } from '@shared/presets'
import type { Preset, PresetCategory } from '@shared/types'
import { useEncoderStore } from '@renderer/store/useEncoderStore'

const CATEGORY_ICONS = {
  video: Video,
  audio: Music,
  image: Image
}

const CATEGORY_COLORS: Record<string, string> = {
  video: 'text-blue-400',
  audio: 'text-orange-400',
  image: 'text-green-400'
}

function PresetCard({ preset, isActive, onSelect }: {
  preset: Preset
  isActive: boolean
  onSelect: () => void
}): JSX.Element {
  const Icon = CATEGORY_ICONS[preset.category] ?? Video

  return (
    <div
      onClick={onSelect}
      className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-150 group
        ${isActive
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-[#21262d] bg-[#161b22] hover:border-[#30363d] hover:bg-[#1c2128]'
        }`}
    >
      {isActive && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
          <Check size={11} className="text-white" />
        </div>
      )}

      <div className={`mb-3 ${CATEGORY_COLORS[preset.category]}`}>
        <Icon size={20} strokeWidth={1.5} />
      </div>

      <div className="text-sm font-semibold text-[#e6edf3] mb-1">{preset.name}</div>
      <div className="text-[11px] text-[#8b949e] leading-relaxed mb-3">{preset.description}</div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[9px] text-[#6e7681] font-mono uppercase">
          {preset.container}
        </span>
        {preset.videoCodec && (
          <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[9px] text-[#6e7681] font-mono">
            {preset.videoCodec}
          </span>
        )}
        {preset.crf !== undefined && (
          <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[9px] text-[#6e7681] font-mono">
            CRF {preset.crf}
          </span>
        )}
        {preset.width && preset.height && (
          <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[9px] text-[#6e7681]">
            {preset.width}×{preset.height}
          </span>
        )}
        {preset.audioBitrate && (
          <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[9px] text-[#6e7681] font-mono">
            {preset.audioBitrate}
          </span>
        )}
      </div>
    </div>
  )
}

export default function PresetBrowser(): JSX.Element {
  const { activePreset, setActivePreset } = useEncoderStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<PresetCategory | 'all'>('all')

  const filtered = BUILT_IN_PRESETS.filter((p) => {
    if (category !== 'all' && p.category !== category) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#21262d] shrink-0 bg-[#161b22]">
        <h2 className="text-base font-semibold text-[#e6edf3] mb-3">Export Presets</h2>
        <div className="flex gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search presets…"
              className="w-full bg-[#21262d] border border-[#30363d] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#e6edf3] placeholder:text-[#484f58] outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Category filter */}
          <div className="flex gap-1 bg-[#21262d] rounded-lg p-0.5">
            {(['all', 'video', 'audio'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors
                  ${category === cat
                    ? 'bg-indigo-600 text-white'
                    : 'text-[#8b949e] hover:text-[#e6edf3]'
                  }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active preset summary */}
      <div className="px-6 py-2.5 bg-[#0d1117] border-b border-[#21262d] flex items-center gap-2 text-xs text-[#8b949e] shrink-0">
        <Star size={11} className="text-indigo-400" />
        <span>Active preset:</span>
        <span className="text-[#e6edf3] font-medium">{activePreset.name}</span>
        <span className="text-[#484f58]">·</span>
        <span className="font-mono text-[#6e7681]">.{activePreset.container}</span>
        {activePreset.crf !== undefined && (
          <>
            <span className="text-[#484f58]">·</span>
            <span className="font-mono text-[#6e7681]">CRF {activePreset.crf}</span>
          </>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-[#484f58]">
            <Search size={32} strokeWidth={1} className="mb-3" />
            <div>No presets match your search</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                isActive={activePreset.id === preset.id}
                onSelect={() => setActivePreset(preset)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
