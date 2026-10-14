import React from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 z-10 shadow-xl">
        <div className="absolute top-3 right-3 z-20">
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <Sidebar className="w-full" onNavigate={onClose} />
      </div>
    </div>
  );
};
