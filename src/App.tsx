import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, Bell, Search, Activity, Zap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind class merging
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function Sidebar() {
  const location = useLocation();
  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Analytics', href: '/analytics', icon: Activity },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="w-64 h-screen border-r border-zinc-800 bg-zinc-950 flex-col hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Vibeathon</span>
        </div>
      </div>
      <div className="flex-1 py-6 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10 transition-all">
      <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 w-64 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500/50 transition-all">
        <Search className="w-4 h-4 text-zinc-400 mr-2" />
        <input
          type="text"
          placeholder="Search fast..."
          className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-zinc-500"
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-zinc-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full border border-zinc-950"></span>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-zinc-800 cursor-pointer hover:opacity-80 transition-opacity"></div>
      </div>
    </header>
  );
}

function Dashboard() {
  const stats = [
    { label: "Total Users", value: "24,593", change: "+12%" },
    { label: "Active Sessions", value: "1,205", change: "+4%" },
    { label: "Revenue", value: "$42,000", change: "+24%" },
    { label: "Signups Today", value: "329", change: "-2%" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back, Hacker ⚡</h1>
          <p className="text-zinc-400 text-sm mt-1">Here is what's happening right now.</p>
        </div>
        <button className="bg-white text-black font-medium px-4 py-2 rounded-lg shadow-sm hover:bg-zinc-200 transition-all active:scale-95 flex items-center gap-2 group">
          <Zap className="w-4 h-4 group-hover:text-amber-500 transition-colors" />
          Ship It
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur flex flex-col transition-all hover:bg-zinc-800/80 hover:border-zinc-700 hover:-translate-y-1 hover:shadow-lg"
            style={{ animation: `fadeInUp 0.5s ease-out ${i * 0.1}s both` }}
          >
            <span className="text-sm font-medium text-zinc-400">{stat.label}</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">{stat.value}</span>
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                stat.change.startsWith('+') ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              )}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ animation: `fadeInUp 0.8s ease-out 0.4s both` }}>
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col transition-all hover:border-zinc-700">
          <h3 className="font-semibold text-white mb-4">Overview Activity</h3>
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm flex-col gap-3 min-h-[300px] border border-dashed border-zinc-800 rounded-lg bg-zinc-950/50">
            <Activity className="w-8 h-8 opacity-20" />
            <p>Drop a Recharts chart component here to instantly win.</p>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-zinc-700">
          <h3 className="font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium border border-zinc-700 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 group-hover:border-indigo-500/50 transition-colors">
                  U{i}
                </div>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors">User {i} signed up</p>
                  <p className="text-xs text-zinc-500">Just now</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>
        {`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        `}
      </style>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<div className="text-center mt-20 text-zinc-500">Page not implemented yet. Build it fast! 🏎️</div>} />
      </Routes>
    </Layout>
  );
}
