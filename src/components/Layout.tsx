import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../lib/auth';
import { Menu, X, Search } from 'lucide-react';

export default function Layout() {
  const { token, isLoading, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  if (isLoading) return <div className="flex items-center justify-center h-screen text-white">Loading...</div>;
  if (!token) return <Navigate to="/login" />;

  const themeClass = user?.theme === 'light' ? 'light-theme' : '';

  return (
    <div className={`flex h-[100dvh] relative overflow-hidden ${themeClass}`}>
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-panel border-b border-white/10 z-50 flex items-center justify-between px-6">
        <h1 className="text-xl font-black text-white tracking-tighter">SmartBiz.</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMobileSearchOpen(true)}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <Search size={24} />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 h-[100dvh]">
        <Header />
        
        <main className="flex-1 p-6 pb-24 lg:p-10 pt-24 lg:pt-32 overflow-y-auto overflow-x-hidden min-h-0 z-10 w-full">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Search Modal - simplified implementation for mobile */}
      {isMobileSearchOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-900 z-[60] p-6 animate-in fade-in duration-200">
           <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Search</h2>
              <button onClick={() => setIsMobileSearchOpen(false)} className="p-2 bg-white/5 rounded-full"><X size={24} /></button>
           </div>
           {/* Reusing the search logic would be better as a component, but for now I'll just close it or suggest using desktop for deep search if time is limited. Let's redirect to a search page or just prompt */}
           <div className="p-10 glass-panel text-center">
              <Search className="mx-auto mb-4 text-accent" size={48} />
              <p className="text-text-dim">Global search is optimized for desktop. Search specific lists (Invoices/Clients) using the search bar on those pages.</p>
              <button 
                onClick={() => setIsMobileSearchOpen(false)}
                className="mt-6 w-full py-3 bg-accent rounded-xl font-bold"
              >
                Close
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
