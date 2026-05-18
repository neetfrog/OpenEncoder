import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Cpu, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useEncoderStore } from '@renderer/store/useEncoderStore';

export default function SettingsPanel(): JSX.Element {
  const { outputDir, setOutputDir, concurrentJobs, setConcurrentJobs, hwAccel, setHwAccel } = useEncoderStore();
  const [appVersion, setAppVersion] = useState('');
  const [platform, setPlatform] = useState('');
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    window.api.appVersion().then(setAppVersion);
    window.api.platform().then(setPlatform);
  }, []);

  const handleChooseOutput = useCallback(async () => {
    const dir = await window.api.openFolder();
    if (dir) setOutputDir(dir);
  }, [setOutputDir]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-[#21262d] bg-[#161b22] shrink-0">
        <h2 className="text-base font-semibold text-[#e6edf3]">Settings</h2>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-xl">
        {/* Output Section */}
        <section>
          <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest mb-3">
            Output
          </h3>

          <div className="space-y-4 bg-[#161b22] rounded-xl border border-[#21262d] p-4">
            <div>
              <label className="block text-sm font-medium text-[#e6edf3] mb-1.5">
                Default Output Folder
              </label>
              <p className="text-xs text-[#8b949e] mb-2">
                Where exported files are saved. Leave empty to save next to source.
              </p>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-[#0d1117] rounded-lg border border-[#21262d] text-xs text-[#8b949e] truncate">
                  {outputDir || 'Same folder as source file'}
                </div>
                <button
                  onClick={handleChooseOutput}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#21262d] border border-[#30363d] hover:border-[#484f58] text-xs text-[#e6edf3] transition-colors"
                >
                  <FolderOpen size={13} />
                  Browse
                </button>
                {outputDir && (
                  <button
                    onClick={() => setOutputDir('')}
                    className="px-3 py-2 rounded-lg bg-[#21262d] border border-[#30363d] hover:border-red-500/50 text-xs text-[#8b949e] hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Performance Section */}
        <section>
          <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest mb-3">
            Performance
          </h3>

          <div className="space-y-4 bg-[#161b22] rounded-xl border border-[#21262d] p-4">
            <div>
              <label className="block text-sm font-medium text-[#e6edf3] mb-1.5">
                Concurrent Encoding Jobs
              </label>
              <p className="text-xs text-[#8b949e] mb-3">
                How many files to encode in parallel. Higher values use more CPU.
              </p>
              <div className="flex items-center gap-3">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setConcurrentJobs(n)}
                    className={`w-10 h-10 rounded-lg border text-sm font-semibold transition-colors
                      ${
                        concurrentJobs === n
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400'
                          : 'border-[#30363d] bg-[#21262d] text-[#8b949e] hover:border-[#484f58] hover:text-[#e6edf3]'
                      }`}
                  >
                    {n}
                  </button>
                ))}
                <span className="text-xs text-[#484f58]">
                  {concurrentJobs === 1
                    ? 'Sequential'
                    : concurrentJobs === 2
                      ? 'Balanced (default)'
                      : concurrentJobs >= 3
                        ? 'Parallel (high CPU)'
                        : ''}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Hardware Acceleration Section */}
        <section>
          <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest mb-3">
            Hardware acceleration
          </h3>

          <div className="space-y-4 bg-[#161b22] rounded-xl border border-[#21262d] p-4">
            <div>
              <label className="block text-sm font-medium text-[#e6edf3] mb-1.5">
                Preferred backend
              </label>
              <p className="text-xs text-[#8b949e] mb-3">
                Use a supported hardware encoder if available. Leave on auto to keep software compatibility.
              </p>
              <div className="flex flex-wrap gap-2">
                {(['auto', 'none', 'nvenc', 'qsv', 'amf'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setHwAccel(mode)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors border
                      ${
                        hwAccel === mode
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                          : 'border-[#30363d] bg-[#21262d] text-[#8b949e] hover:border-[#484f58] hover:text-[#e6edf3]'
                      }`}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section>
          <button
            onClick={() => setShowAbout(!showAbout)}
            className="flex items-center gap-2 text-xs font-semibold text-[#8b949e] uppercase tracking-widest mb-3 hover:text-[#e6edf3] transition-colors"
          >
            <Info size={12} />
            About
            {showAbout ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showAbout && (
            <div className="bg-[#161b22] rounded-xl border border-[#21262d] p-4 space-y-3 animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <Cpu size={20} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#e6edf3]">MediaForge</div>
                  <div className="text-xs text-[#8b949e]">
                    v{appVersion || '0.1.0'} · Open Source
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#8b949e] leading-relaxed">
                Open-source media encoder powered by FFmpeg. Supports H.264, H.265, VP9, AV1,
                ProRes, and many more formats. No watermarks. No subscriptions. Yours forever.
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['Engine', 'FFmpeg'],
                  ['UI', 'Electron + React'],
                  ['Platform', platform || 'Unknown'],
                  ['License', 'MIT'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1 border-b border-[#21262d]">
                    <span className="text-[#484f58]">{k}</span>
                    <span className="text-[#6e7681] font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
