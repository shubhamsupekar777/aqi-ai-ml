
// import React from 'react';
// import { NavLink } from 'react-router-dom';
// import {
//   LayoutDashboard,
//   Brain,
//   Layers,
//   TrendingUp,
//   ShieldAlert,
//   BarChart3,
//   Cpu,
//   Database,
//   Activity,
//   Info,
//   Wind,
// } from 'lucide-react';

// interface SidebarProps {
//   className?: string;
//   onNavigate?: () => void;
// }

// export const Sidebar: React.FC<SidebarProps> = ({ className = '', onNavigate }) => {
//   const navItems = [
//     { to: '/', label: 'Overview', icon: LayoutDashboard },
//     { to: '/prediction', label: 'AQI Prediction', icon: Brain },
//     { to: '/classification', label: 'Air Quality Classification', icon: Layers },
//     { to: '/trends', label: 'Pollution Trends', icon: TrendingUp },
//     { to: '/risk', label: 'Pollution & Health Risk', icon: ShieldAlert },
//     { to: '/analytics', label: 'Analytics', icon: BarChart3 },
//     { to: '/models', label: 'Model Performance', icon: Cpu },
//     { to: '/history', label: 'Historical Data', icon: Database },
//     { to: '/live-observations', label: 'Live Observations', icon: Activity },
//     { to: '/about', label: 'About AQI AI', icon: Info },
//   ];

//   return (
//     <aside className={`w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen ${className}`}>
//       <div className="p-5 border-b border-slate-800 flex items-center gap-3">
//         <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-900/50">
//           <Wind className="w-5 h-5" />
//         </div>
//         <div>
//           <h1 className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
//             <span>AQI AI</span>
//             <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-teal-500/20 text-teal-400 rounded-sm border border-teal-500/30">v1.0</span>
//           </h1>
//           <p className="text-[11px] text-slate-400">Environmental Intelligence</p>
//         </div>
//       </div>

//       <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
//         <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Core Intelligence</div>
//         {navItems.slice(0, 5).map((item) => {
//           const Icon = item.icon;
//           return (
//             <NavLink
//               key={item.to}
//               to={item.to}
//               end={item.to === '/'}
//               onClick={onNavigate}
//               className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-teal-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
//             >
//               <Icon className="w-4 h-4 shrink-0" />
//               <span>{item.label}</span>
//             </NavLink>
//           );
//         })}

//         <div className="pt-5 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Analytics & Systems</div>
//         {navItems.slice(5).map((item) => {
//           const Icon = item.icon;
//           return (
//             <NavLink
//               key={item.to}
//               to={item.to}
//               onClick={onNavigate}
//               className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-teal-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
//             >
//               <Icon className="w-4 h-4 shrink-0" />
//               <span>{item.label}</span>
//             </NavLink>
//           );
//         })}
//       </nav>

//       <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400">
//         <div className="flex items-center justify-between mb-1">
//           <span>Engine Status</span>
//           <span className="inline-flex items-center gap-1 text-teal-400 font-medium">
//             <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" /> Active
//           </span>
//         </div>
//         <p className="text-[10px] text-slate-400">Phase 1 Demo Engine</p>
//       </div>
//     </aside>
//   );
// };


// // import React from 'react';
// // import { NavLink } from 'react-router-dom';
// // import {
// //   LayoutDashboard,
// //   Brain,
// //   Layers,
// //   TrendingUp,
// //   ShieldAlert,
// //   BarChart3,
// //   Cpu,
// //   Database,
// //   Info,
// //   Wind
// // } from 'lucide-react';

// // interface SidebarProps {
// //   className?: string;
// //   onNavigate?: () => void;
// // }

// // export const Sidebar: React.FC<SidebarProps> = ({ className = '', onNavigate }) => {
// //   const navItems = [
// //     { to: '/', label: 'Overview', icon: LayoutDashboard },
// //     { to: '/prediction', label: 'AQI Prediction', icon: Brain },
// //     { to: '/classification', label: 'Air Quality Classification', icon: Layers },
// //     { to: '/trends', label: 'Pollution Trends', icon: TrendingUp },
// //     { to: '/risk', label: 'Pollution & Health Risk', icon: ShieldAlert },
// //     { to: '/analytics', label: 'Analytics', icon: BarChart3 },
// //     { to: '/models', label: 'Model Performance', icon: Cpu },
// //     { to: '/history', label: 'Historical Data', icon: Database },
// //     { to: '/about', label: 'About AQI AI', icon: Info },
// //   ];

// //   return (
// //     <aside className={`w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen ${className}`}>
// //       {/* Brand Header */}
// //       <div className="p-5 border-b border-slate-800 flex items-center gap-3">
// //         <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-900/50">
// //           <Wind className="w-5 h-5" />
// //         </div>
// //         <div>
// //           <h1 className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
// //             <span>AQI AI</span>
// //             <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-teal-500/20 text-teal-400 rounded-sm border border-teal-500/30">
// //               v1.0
// //             </span>
// //           </h1>
// //           <p className="text-[11px] text-slate-400">Environmental Intelligence</p>
// //         </div>
// //       </div>

// //       {/* Navigation Links */}
// //       <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
// //         <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
// //           Core Intelligence
// //         </div>
// //         {navItems.slice(0, 5).map((item) => {
// //           const Icon = item.icon;
// //           return (
// //             <NavLink
// //               key={item.to}
// //               to={item.to}
// //               end={item.to === '/'}
// //               onClick={onNavigate}
// //               className={({ isActive }) =>
// //                 `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
// //                   isActive
// //                     ? 'bg-teal-600 text-white font-semibold shadow-xs'
// //                     : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
// //                 }`
// //               }
// //             >
// //               <Icon className="w-4 h-4 shrink-0" />
// //               <span>{item.label}</span>
// //             </NavLink>
// //           );
// //         })}

// //         <div className="pt-5 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
// //           Analytics & Systems
// //         </div>
// //         {navItems.slice(5).map((item) => {
// //           const Icon = item.icon;
// //           return (
// //             <NavLink
// //               key={item.to}
// //               to={item.to}
// //               onClick={onNavigate}
// //               className={({ isActive }) =>
// //                 `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
// //                   isActive
// //                     ? 'bg-teal-600 text-white font-semibold shadow-xs'
// //                     : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
// //                 }`
// //               }
// //             >
// //               <Icon className="w-4 h-4 shrink-0" />
// //               <span>{item.label}</span>
// //             </NavLink>
// //           );
// //         })}
// //       </nav>

// //       {/* Status Footer */}
// //       <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400">
// //         <div className="flex items-center justify-between mb-1">
// //           <span>Engine Status</span>
// //           <span className="inline-flex items-center gap-1 text-teal-400 font-medium">
// //             <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
// //             Active
// //           </span>
// //         </div>
// //         <p className="text-[10px] text-slate-400">Phase 1 Demo Engine</p>
// //       </div>
// //     </aside>
// //   );
// // };
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Brain,
  Layers,
  TrendingUp,
  ShieldAlert,
  BarChart3,
  Cpu,
  Database,
  Activity,
  Info,
  Wind,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '', onNavigate }) => {
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/prediction', label: 'AQI Prediction', icon: Brain },
    { to: '/classification', label: 'Air Quality Classification', icon: Layers },
    { to: '/trends', label: 'Pollution Trends', icon: TrendingUp },
    { to: '/risk', label: 'Pollution & Health Risk', icon: ShieldAlert },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/models', label: 'Model Performance', icon: Cpu },
    { to: '/history', label: 'Historical Data', icon: Database },
    { to: '/live-observations', label: 'Live Observations', icon: Activity },
    { to: '/about', label: 'About AQI AI', icon: Info },
  ];

  return (
    <aside className={`w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen ${className}`}>
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-900/50">
          <Wind className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
            <span>AQI AI</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-teal-500/20 text-teal-400 rounded-sm border border-teal-500/30">v1.0</span>
          </h1>
          <p className="text-[11px] text-slate-400">Environmental Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Core Intelligence</div>
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onNavigate}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-teal-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <div className="pt-5 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Analytics & Systems</div>
        {navItems.slice(5).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-teal-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center justify-between mb-1">
          <span>Engine Status</span>
          <span className="inline-flex items-center gap-1 text-teal-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" /> Active
          </span>
        </div>
        <p className="text-[10px] text-slate-400">Phase 1 Demo Engine</p>
      </div>
    </aside>
  );
};
