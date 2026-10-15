import React from 'react';
import { Menu, MapPin, Cpu, Database, Sparkles } from 'lucide-react';
import { useSelectedCity } from '../context/CityContext';
import { useCities } from '../hooks/useOverview';
import { DemoBadge } from '../components/common/DemoBadge';
import { isMockMode } from '../services/apiClient';

interface TopbarProps {
  onToggleMobileNav?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMobileNav }) => {
  const { selectedCity, setSelectedCity } = useSelectedCity();
  const { data: cities } = useCities();

  const cityList = cities || [
    { id: 'delhi', name: 'Delhi' },
    { id: 'mumbai', name: 'Mumbai' },
    { id: 'pune', name: 'Pune' },
    { id: 'bengaluru', name: 'Bengaluru' },
    { id: 'chennai', name: 'Chennai' },
    { id: 'hyderabad', name: 'Hyderabad' }
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileNav}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Selected Region:
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-800">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              <span>{selectedCity}</span>
            </div>
          </div>
        </div>

        {/* Center / Right: City selector, Mode badge, Status */}
        <div className="flex items-center gap-3">
          {/* City selector dropdown */}
          <div className="relative">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 shadow-2xs cursor-pointer"
            >
              {cityList.map((c) => (
                <option key={c.id || c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Model Status Pill */}
          {/* <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
            <Cpu className="w-3 h-3 text-slate-500" />
            <span>Model:</span>
            <span className="text-teal-700 font-semibold font-mono">Demo Rule Engine</span>
          </div> */}

          {/* Mode Pill (Mock vs API) */}
          <div className="flex items-center gap-1.5">
            <DemoBadge variant="pill" text={isMockMode() ? 'MOCK MODE' : 'API CONNECTED'} />
          </div>
        </div>
      </div>
    </header>
  );
};
