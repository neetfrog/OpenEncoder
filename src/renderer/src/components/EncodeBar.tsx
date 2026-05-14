import { useEncoderStore } from '@renderer/store/useEncoderStore';

export default function EncodeBar(): JSX.Element {
  const { jobs } = useEncoderStore();
  const encoding = jobs.filter((j) => j.status === 'encoding');
  const done = jobs.filter((j) => j.status === 'done').length;
  const total = jobs.length;

  if (encoding.length === 0) {
    if (done > 0 && total > 0) {
      return (
        <div className="h-8 bg-[#161b22] border-t border-[#21262d] flex items-center px-4 gap-3 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          <span className="text-xs text-[#8b949e]">
            {done} / {total} complete
          </span>
        </div>
      );
    }
    return (
      <div className="h-8 bg-[#161b22] border-t border-[#21262d] flex items-center px-4 shrink-0">
        <span className="text-xs text-[#484f58]">Ready</span>
      </div>
    );
  }

  // Show overall progress
  const avgProgress = encoding.reduce((a, j) => a + j.progress, 0) / encoding.length;
  const totalFps = encoding.reduce((a, j) => a + (j.currentFps ?? 0), 0);

  return (
    <div className="h-8 bg-[#161b22] border-t border-[#21262d] flex items-center px-4 gap-3 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
      <span className="text-xs text-[#8b949e]">
        Encoding {encoding.length} file{encoding.length > 1 ? 's' : ''}
      </span>

      {/* Overall progress bar */}
      <div className="flex-1 max-w-xs h-1.5 bg-[#21262d] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full progress-shimmer transition-all duration-500"
          style={{ width: `${avgProgress}%` }}
        />
      </div>

      <span className="text-xs text-[#8b949e]">{Math.round(avgProgress)}%</span>

      {totalFps > 0 && <span className="text-xs text-[#484f58]">{Math.round(totalFps)} fps</span>}

      {done > 0 && <span className="text-xs text-green-400 ml-2">{done} done</span>}
    </div>
  );
}
