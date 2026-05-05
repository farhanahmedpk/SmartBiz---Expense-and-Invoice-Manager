import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Globe,
  ShieldCheck,
  Repeat
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useLocalization } from '../lib/localization';
import { cn } from '../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout, user } = useAuth();
  const { t, lang, setLang } = useLocalization();
  const location = useLocation();

  const navItems = [
    { name: t('dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('expenses'), path: '/expenses', icon: Receipt },
    { name: t('clients'), path: '/clients', icon: Users },
    { name: t('invoices'), path: '/invoices', icon: FileText },
    { name: t('recurring'), path: '/recurring', icon: Repeat },
    { name: t('settings'), path: '/settings', icon: Settings },
  ];

  const adminItems = [
    { name: 'Admin Panel', path: '/admin', icon: ShieldCheck },
  ];

  return (
    <div className={cn(
      "fixed top-0 left-0 h-[100dvh] w-64 glass-sidebar flex flex-col z-50 transition-transform duration-300 lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-8 border-b border-white/10">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
          SmartBiz.
        </h1>
        <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-bold">{user?.business_name}</p>
        {user?.role === 'admin' && (
          <span className="inline-block mt-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-blue-500/30">
            Super Admin
          </span>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto min-h-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium",
                isActive 
                  ? "bg-white/10 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={18} className={cn("opacity-70", lang === 'ur' ? 'ml-3' : '')} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {user?.role === 'admin' && (
          <div className="pt-4 mt-4 border-t border-white/5">
            <p className="px-4 mb-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">Admin</p>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium",
                    isActive 
                      ? "bg-blue-500/20 text-blue-400 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]" 
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon size={18} className={cn("opacity-70", lang === 'ur' ? 'ml-3' : '')} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <button
          onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
          className="flex items-center w-full space-x-3 px-4 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all text-xs font-medium"
        >
          <Globe size={18} className={lang === 'ur' ? 'ml-3' : ''} />
          <span>{lang === 'en' ? 'اردو' : 'English'}</span>
        </button>
        <button
          onClick={logout}
          className="flex items-center w-full space-x-3 px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all text-xs font-medium"
        >
          <LogOut size={18} className={lang === 'ur' ? 'ml-3' : ''} />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );
}
