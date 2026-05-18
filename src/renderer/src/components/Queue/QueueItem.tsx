import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { X, AlertCircle, CheckCircle2, Clock, Loader2, ChevronDown, Copy } from 'lucide-react';
import type { EncodeJob } from '@shared/types';
import { useEncoderStore } from '@renderer/store/useEncoderStore';
import { clamp, formatBytes, formatDuration, formatEta, basename, getExtension } from '@renderer/utils';
import { BUILT_IN_PRESETS } from '@shared/presets';

interface Props {
  job: EncodeJob;
}

function QueueItem({ job }: Props): JSX.Element {
  const { removeJob, setJobPreset, selectedJobIds, selectJob, setJobMediaInfo, setJobTrimRange } = useEncoderStore();
  const isSelected = selectedJobIds.has(job.id);
  const fileName = basename(job.inputPath);
  const ext = getExtension(job.inputPath);
  const trimStart = job.trimStart ?? 0;
  const trimEnd = job.trimEnd ?? job.mediaInfo?.duration ?? 0;
  const maxDuration = job.mediaInfo?.duration ?? 0;
  const isVideo = Boolean(job.mediaInfo?.width && job.mediaInfo?.height);
  const fileUrl = `file://${job.inputPath.replace(/\\/g, '/')}`;
  const sliderRef = useRef<HTMLDivElement>(null);
  const activeHandle = useRef<'start' | 'end' | null>(null);

  const startPercent = maxDuration > 0 ? clamp((trimStart / maxDuration) * 100, 0, 100) : 0;
  const endPercent = maxDuration > 0 ? clamp((trimEnd / maxDuration) * 100, 0, 100) : 100;

  // Probe on mount
  useEffect(() => {
    if (!job.mediaInfo) {
      window.api
        .probe(job.inputPath)
        .then((info) => setJobMediaInfo(job.id, info))
        .catch(() => {});
    }
  }, [job.id, job.inputPath]);

  const [isLogOpen, setIsLogOpen] = useState(false);

  const updateTrim = useCallback(
    (handle: 'start' | 'end', clientX: number) => {
      if (!sliderRef.current || maxDuration <= 0) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const pct = clamp((clientX - rect.left) / rect.width, 0, 1);
      const value = Number((pct * maxDuration).toFixed(1));
      if (handle === 'start') {
        const nextStart = Math.min(value, trimEnd - 0.1);
        setJobTrimRange(job.id, clamp(nextStart, 0, maxDuration), trimEnd);
      } else {
        const nextEnd = Math.max(value, trimStart + 0.1);
        setJobTrimRange(job.id, trimStart, clamp(nextEnd, 0, maxDuration));
      }
    },
    [job.id, maxDuration, setJobTrimRange, trimEnd, trimStart]
  );

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!activeHandle.current) return;
      updateTrim(activeHandle.current, event.clientX);
    };
    const handleUp = () => {
      activeHandle.current = null;
    };
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
  }, [updateTrim]);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeJob(job.id);
    },
    [job.id, removeJob]
  );

  const cancelJob = useCallback(async () => {
    await window.api.encodeCancel(job.id);
    const store = useEncoderStore.getState();
    store.setJobStatus(job.id, 'cancelled');
    if (store.encodingJobs().length === 0) {
      store.setIsEncoding(false);
    }
  }, [job.id]);

  const handleCancelJob = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      cancelJob();
    },
    [cancelJob]
  );

  const logTitle = job.status === 'error' ? 'Encoding error' : 'Job log';
  const logMessage =
    job.status === 'error'
      ? job.error || 'An unknown encoding error occurred.'
      : 'Encoding completed successfully.';
  const logDetail = job.log || job.errorDetails || 'No log available.';

  const handleShowLog = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsLogOpen(true);
    },
    []
  );

  const handleCopyLog = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(logDetail);
    } catch {
      // ignore clipboard failures
    }
  }, [logDetail]);

  const handleCloseLog = useCallback(() => {
    setIsLogOpen(false);
  }, []);

  const handleContextMenu = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      selectJob(job.id, e.ctrlKey || e.metaKey);

      const action = await window.api.showJobContextMenu(job.id, job.status, job.inputPath);
      if (action === 'cancel') {
        await cancelJob();
      }
      if (action === 'remove') {
        removeJob(job.id);
      }
    },
    [cancelJob, job.id, job.inputPath, job.status, removeJob, selectJob]
  );

  const resetTrim = () => setJobTrimRange(job.id, 0, undefined);

  return (
    <>
      <div
        onClick={(e) => selectJob(job.id, e.ctrlKey || e.metaKey)}
        onContextMenu={handleContextMenu}
      className={`flex items-center gap-2 px-4 py-2.5 border-b border-[#21262d] cursor-pointer transition-colors group text-sm
        ${isSelected ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : 'hover:bg-white/[0.02]'}
        ${job.status === 'error' ? 'bg-red-500/5' : ''}
        ${job.status === 'done' ? 'opacity-70' : ''}
      `}
    >
      {/* File preview */}
      <div className="w-14 h-14 shrink-0 overflow-hidden rounded-md bg-[#161b22] border border-[#21262d] flex items-center justify-center">
        {isVideo ? (
          <video
            src={fileUrl}
            poster={job.mediaInfo?.thumbnail}
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        ) : job.mediaInfo?.thumbnail ? (
          <img
            src={job.mediaInfo.thumbnail}
            alt={fileName}
            className="w-full h-full object-cover"
          />
        ) : (
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
        )}
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
        {job.status !== 'encoding' ? (
          <div className="relative flex items-center bg-[#21262d] rounded border border-transparent hover:border-[#30363d] transition-colors">
            <select
              value={job.preset.id}
              onChange={(e) => {
                const p = BUILT_IN_PRESETS.find((pr) => pr.id === e.target.value);
                if (!p) return;
                const store = useEncoderStore.getState();
                setJobPreset(job.id, p);
                if (job.status !== 'pending') {
                  store.setJobStatus(job.id, 'pending', {
                    progress: 0,
                    currentFps: undefined,
                    currentBitrate: undefined,
                    eta: undefined,
                    timemark: undefined,
                    outputPath: '',
                    startedAt: undefined,
                    finishedAt: undefined,
                    error: undefined,
                  });
                }
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
        {job.status === 'done' && (
          <button
            onClick={handleShowLog}
            className="text-[10px] text-green-400 truncate cursor-pointer hover:text-green-200"
            title="Click to view encoding log"
          >
            ✓ Done
          </button>
        )}
        {job.status === 'error' && (
          <button
            onClick={handleShowLog}
            className="text-[10px] text-red-400 truncate cursor-pointer hover:text-red-200"
            title="Click to view full error log"
          >
            ✕ {job.error}
          </button>
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
    {job.mediaInfo && job.status !== 'encoding' && (
      <div className="flex items-center gap-2 px-4 py-3 bg-[#0b1016] border-b border-[#21262d] text-[11px] text-[#8b949e]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-[#6e7681]">
            <span>Trim export range</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetTrim();
              }}
              className="text-[#8b949e] hover:text-[#e6edf3]"
            >
              Reset
            </button>
          </div>
          <div className="space-y-2">
            <div ref={sliderRef} className="relative h-10 select-none">
              <div className="absolute inset-x-0 top-1/2 h-1 bg-[#21262d] rounded-full -translate-y-1/2" />
              <div
                className="absolute top-1/2 h-1 bg-indigo-500 rounded-full -translate-y-1/2"
                style={{ left: `${startPercent}%`, right: `${100 - endPercent}%` }}
              />
              <div
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/10 bg-indigo-400 shadow-lg cursor-grab"
                style={{ left: `calc(${startPercent}% - 0.5rem)` }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  activeHandle.current = 'start';
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              />
              <div
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/10 bg-indigo-400 shadow-lg cursor-grab"
                style={{ left: `calc(${endPercent}% - 0.5rem)` }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  activeHandle.current = 'end';
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#c9d1d9]">
              <span>Start: {formatDuration(trimStart)}</span>
              <span>End: {formatDuration(trimEnd)}</span>
            </div>
          </div>
        </div>
      </div>
    )}

    {isLogOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b1118] shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#111827] px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-[#e6edf3]">{logTitle}</div>
              <div className="mt-1 text-xs text-[#8b949e]">{logMessage}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLog}
                className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-xs text-[#e6edf3] hover:bg-white/10 transition"
              >
                <Copy size={14} /> Copy
              </button>
              <button
                type="button"
                onClick={handleCloseLog}
                className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20 transition"
              >
                Close
              </button>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-auto px-5 py-4 text-[12px] leading-6 text-[#c9d1d9]">
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-[#c9d1d9]">{logDetail}</pre>
          </div>
        </div>
      </div>
    )}
  </>
);
}

export default memo(QueueItem);
