import { memo, useCallback, useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, Clock, Loader2, ChevronDown } from 'lucide-react';
import type { EncodeJob } from '@shared/types';
import { useEncoderStore } from '@renderer/store/useEncoderStore';
import { formatBytes, formatDuration, formatEta, basename, getExtension } from '@renderer/utils';
import { BUILT_IN_PRESETS } from '@shared/presets';

interface Props {
  job: EncodeJob;
}

function QueueItem({ job }: Props): JSX.Element {
  const { removeJob, setJobPreset, selectedJobIds, selectJob, setJobMediaInfo } = useEncoderStore();
  const isSelected = selectedJobIds.has(job.id);
  const fileName = basename(job.inputPath);
  const ext = getExtension(job.inputPath);

  // Probe on mount
  useEffect(() => {
    if (!job.mediaInfo) {
      window.api
        .probe(job.inputPath)
        .then((info) => setJobMediaInfo(job.id, info))
        .catch(() => {});
    }
  }, [job.id, job.inputPath]);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeJob(job.id);
    },
    [job.id, removeJob]
  );

  const handleCancelJob = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await window.api.encodeCancel(job.id);
      useEncoderStore.getState().setJobStatus(job.id, 'cancelled');
    },
    [job.id]
  );

  return (
    <div
      onClick={(e) => selectJob(job.id, e.ctrlKey || e.metaKey)}
      className={`flex items-center gap-2 px-4 py-2.5 border-b border-[#21262d] cursor-pointer transition-colors group text-sm
        ${isSelected ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : 'hover:bg-white/[0.02]'}
        ${job.status === 'error' ? 'bg-red-500/5' : ''}
        ${job.status === 'done' ? 'opacity-70' : ''}
      `}
    >
      {/* Extension badge */}
      <div className="w-8 shrink-0 flex justify-center">
        <span
          className={`text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wider
          ${
            ext === 'MP4' || ext === 'MOV'
              ? 'bg-blue-500/20 text-blue-400'
              : ext === 'MKV'
                ? 'bg-purple-500/20 text-purple-400'
                : ext === 'WEBM'
                  ? 'bg-teal-500/20 text-teal-400'
                  : ['MP3', 'AAC', 'FLAC', 'WAV', 'OGG'].includes(ext)
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-[#21262d] text-[#8b949e]'
          }
        `}
        >
          {ext || '?'}
        </span>
      </div>

      {/* Filename */}
      <div className="flex-1 min-w-0">
        <div className="text-[#e6edf3] text-xs font-medium truncate" title={job.inputPath}>
          {fileName}
        </div>
        <div className="text-[10px] text-[#8b949e] truncate mt-0.5">
          {job.inputPath.replace(/[\\/][^\\/]*$/, '')}
        </div>
      </div>

      {/* Media info */}
      <div className="w-32 shrink-0 text-center">
        {job.mediaInfo ? (
          <div className="text-[10px] text-[#8b949e] space-y-0.5">
            {job.mediaInfo.width && job.mediaInfo.height && (
              <div className="text-[#6e7681]">
                {job.mediaInfo.width}×{job.mediaInfo.height}
              </div>
            )}
            <div>
              {formatDuration(job.mediaInfo.duration)} · {formatBytes(job.mediaInfo.size)}
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-[#484f58] animate-pulse">probing…</div>
        )}
      </div>

      {/* Preset selector */}
      <div className="w-40 shrink-0">
        {job.status === 'pending' ? (
          <div className="relative flex items-center bg-[#21262d] rounded border border-transparent hover:border-[#30363d] transition-colors">
            <select
              value={job.preset.id}
              onChange={(e) => {
                const p = BUILT_IN_PRESETS.find((pr) => pr.id === e.target.value);
                if (p) setJobPreset(job.id, p);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent text-[11px] text-[#e6edf3] px-2 py-1 outline-none cursor-pointer appearance-none pr-6"
            >
              {BUILT_IN_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#1c2128] text-[#e6edf3]">
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={10}
              className="absolute right-1.5 text-[#484f58] pointer-events-none"
            />
          </div>
        ) : (
          <div className="text-[11px] text-[#6e7681] truncate px-1">{job.preset.name}</div>
        )}
      </div>

      {/* Progress */}
      <div className="w-44 shrink-0">
        {job.status === 'encoding' && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[#8b949e]">
              <span>{Math.round(job.progress)}%</span>
              <span className="text-[#484f58]">
                {job.currentFps ? `${job.currentFps}fps` : ''}
                {job.eta ? ` · ${formatEta(job.eta)}` : ''}
              </span>
            </div>
            <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full progress-shimmer transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            {job.timemark && (
              <div className="text-[9px] text-[#484f58] font-mono">{job.timemark}</div>
            )}
          </div>
        )}
        {job.status === 'done' && <div className="text-[10px] text-green-400">✓ Done</div>}
        {job.status === 'error' && (
          <div className="text-[10px] text-red-400 truncate" title={job.error}>
            ✕ {job.error}
          </div>
        )}
        {job.status === 'cancelled' && <div className="text-[10px] text-[#8b949e]">Cancelled</div>}
        {job.status === 'pending' && <div className="text-[10px] text-[#484f58]">Waiting</div>}
      </div>

      {/* Status icon */}
      <div className="w-20 shrink-0 flex justify-center">
        {job.status === 'pending' && <Clock size={14} className="text-[#484f58]" />}
        {job.status === 'encoding' && (
          <Loader2 size={14} className="text-indigo-400 animate-spin" />
        )}
        {job.status === 'done' && <CheckCircle2 size={14} className="text-green-400" />}
        {job.status === 'error' && <AlertCircle size={14} className="text-red-400" />}
        {job.status === 'cancelled' && <X size={14} className="text-[#484f58]" />}
      </div>

      {/* Remove / Cancel button */}
      <div className="w-8 shrink-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {job.status === 'encoding' ? (
          <button
            onClick={handleCancelJob}
            className="p-1 rounded hover:bg-red-500/20 text-[#8b949e] hover:text-red-400 transition-colors"
            title="Cancel"
          >
            <X size={12} />
          </button>
        ) : (
          <button
            onClick={handleRemove}
            className="p-1 rounded hover:bg-white/10 text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            title="Remove"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(QueueItem);
