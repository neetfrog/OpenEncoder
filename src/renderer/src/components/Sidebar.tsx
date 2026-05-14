import { List, Layers, Settings } from 'lucide-react';
import { useEncoderStore } from '@renderer/store/useEncoderStore';

const NAV = [
  { id: 'queue' as const, icon: List, label: 'Queue' },
  { id: 'presets' as const, icon: Layers, label: 'Presets' },
  { id: 'settings' as const, icon: Settings, label: 'Settings' },
];

export default function Sidebar(): JSX.Element {
  const { activeTab, setActiveTab, jobs } = useEncoderStore();
  const pendingCount = jobs.filter((j) => j.status === 'pending').length;
  const totalCount = jobs.length;

  return (
    <nav className="flex flex-col w-16 bg-[#161b22] border-r border-[#21262d] shrink-0 py-2">
      {NAV.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className={`relative flex flex-col items-center gap-1 py-3 mx-1 rounded-lg transition-all duration-150 group
            ${
              activeTab === id
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-white/5'
            }`}
          title={label}
        >
          <Icon size={18} strokeWidth={1.8} />
          <span className="text-[9px] font-medium uppercase tracking-wider">{label}</span>
          {id === 'queue' && totalCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
