import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNavigation } from './MobileNavigation';
import { DemoBadge } from '../components/common/DemoBadge';

export const AppLayout: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans antialiased text-slate-900">
      {/* Top Banner Notice */}
      <DemoBadge variant="banner" />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Fixed Sidebar */}
        <Sidebar className="hidden md:flex" />

        {/* Mobile Navigation Drawer */}
        <MobileNavigation
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Topbar onToggleMobileNav={() => setMobileNavOpen(true)} />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>

          <footer className="py-4 px-6 border-t border-slate-200 text-center text-xs text-slate-400 bg-white">
            <p>AQI AI — Environmental Intelligence & Air Quality Prediction Platform • Phase 1 Architecture</p>
          </footer>
        </div>
      </div>
    </div>
  );
};
