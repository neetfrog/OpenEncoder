import { useCallback } from 'react';
import { Plus, FolderOpen, Trash2, Play, Square, ChevronDown } from 'lucide-react';
import { useEncoderStore } from '@renderer/store/useEncoderStore';
import QueueItem from './QueueItem';
import DropZone from './DropZone';
import { BUILT_IN_PRESETS } from '@shared/presets';

export default function QueuePanel(): JSX.Element {
  const {
    jobs,
    addFiles,
    clearDoneJobs,
    activePreset,
    setActivePreset,
    isEncoding,
    setIsEncoding,
    setOutputDir,
    outputDir,
    hwAccel,
  } = useEncoderStore();

  const handleAddFiles = useCallback(async () => {
    const paths = await window.api.openFiles();
    if (paths.length > 0) addFiles(paths);
  }, [addFiles]);

  const handleChooseOutputDir = useCallback(async () => {
    const dir = await window.api.openFolder();
    if (dir) setOutputDir(dir);
  }, [setOutputDir]);

  const handleStartEncoding = useCallback(async () => {
    const pending = jobs.filter((j) => j.status === 'pending');
    if (pending.length === 0) return;
    setIsEncoding(true);

    await window.api.encodeStart({
      jobs: pending.map((j) => ({
        id: j.id,
        inputPath: j.inputPath,
        outputDir: j.outputDir || outputDir,
        preset: j.preset,
        trimStart: j.trimStart,
        trimEnd: j.trimEnd,
        hwAccel: j.preset.hwAccel ?? hwAccel,
      })),
    });
  }, [jobs, outputDir, hwAccel, setIsEncoding]);

  const handleCancelAll = useCallback(async () => {
    await window.api.encodeCancelAll();
    const store = useEncoderStore.getState();
    jobs.forEach((j) => {
      if (j.status === 'encoding' || j.status === 'pending') {
        store.setJobStatus(j.id, 'cancelled');
      }
    });
    setIsEncoding(false);
  }, [jobs, setIsEncoding]);

  const pendingCount = jobs.filter((j) => j.status === 'pending').length;
  const encodingCount = jobs.filter((j) => j.status === 'encoding').length;
  const doneCount = jobs.filter((j) => j.status === 'done').length;
  const errorCount = jobs.filter((j) => j.status === 'error').length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border-b border-[#21262d] shrink-0">
        {/* Add files */}
        <button
          onClick={handleAddFiles}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
        >
          <Plus size={13} />
          Add Files
        </button>

        {/* Preset selector */}
        <div className="relative flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#21262d] border border-[#30363d] text-xs text-[#e6edf3] cursor-pointer hover:border-[#484f58] group">
          <span className="text-[#8b949e] mr-1">Preset:</span>
          <select
            value={activePreset.id}
            onChange={(e) => {
              const p = BUILT_IN_PRESETS.find((pr) => pr.id === e.target.value);
              if (p) setActivePreset(p);
            }}
            className="bg-transparent outline-none cursor-pointer pr-4 max-w-[180px]"
          >
            {BUILT_IN_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#1c2128]">
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown size={11} className="text-[#8b949e] pointer-events-none" />
        </div>

        {/* Output folder */}
        <button
          onClick={handleChooseOutputDir}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#21262d] border border-[#30363d] text-xs text-[#8b949e] hover:text-[#e6edf3] hover:border-[#484f58] transition-colors max-w-[200px]"
          title={outputDir || 'Same folder as source'}
        >
          <FolderOpen size={13} />
          <span className="truncate">
            {outputDir ? outputDir.split(/[\\/]/).pop() : 'Output: Source'}
          </span>
        </button>

        <div className="flex-1" />

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-[#8b949e]">
          {pendingCount > 0 && <span>{pendingCount} pending</span>}
          {encodingCount > 0 && (
            <span className="text-indigo-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
              {encodingCount} encoding
            </span>
          )}
          {doneCount > 0 && <span className="text-green-400">{doneCount} done</span>}
          {errorCount > 0 && <span className="text-red-400">{errorCount} error</span>}
        </div>

        {/* Clear done */}
        {(doneCount > 0 || errorCount > 0) && (
          <button
            onClick={clearDoneJobs}
            className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-[#8b949e] hover:text-[#e6edf3] hover:bg-white/5 transition-colors"
            title="Clear completed"
          >
            <Trash2 size={12} />
            Clear Done
          </button>
        )}

        {/* Start / Cancel */}
        {isEncoding || encodingCount > 0 ? (
          <button
            onClick={handleCancelAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium transition-colors"
          >
            <Square size={12} />
            Stop All
          </button>
        ) : (
          <button
            onClick={handleStartEncoding}
            disabled={pendingCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
          >
            <Play size={12} />
            Start ({pendingCount})
          </button>
        )}
      </div>

      {/* Queue list or Drop zone */}
      {jobs.length === 0 ? (
        <DropZone onFiles={addFiles} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Column headers */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[#0d1117] border-b border-[#21262d] text-[10px] text-[#484f58] uppercase tracking-widest font-medium sticky top-0 z-10">
            <div className="w-8 shrink-0" />
            <div className="flex-1 min-w-0">File</div>
            <div className="w-32 shrink-0 text-center">Info</div>
            <div className="w-40 shrink-0">Preset</div>
            <div className="w-44 shrink-0">Progress</div>
            <div className="w-20 shrink-0 text-center">Status</div>
            <div className="w-8 shrink-0" />
          </div>

          {jobs.map((job) => (
            <QueueItem key={job.id} job={job} />
          ))}

          {/* Drop more files at bottom */}
          <div
            className="h-16 border-2 border-dashed border-[#21262d] m-4 rounded-lg flex items-center justify-center text-xs text-[#484f58] hover:border-indigo-500/50 hover:text-indigo-400/60 transition-colors cursor-pointer"
            onClick={handleAddFiles}
          >
            + Drop more files or click to add
          </div>
        </div>
      )}
    </div>
  );
}
