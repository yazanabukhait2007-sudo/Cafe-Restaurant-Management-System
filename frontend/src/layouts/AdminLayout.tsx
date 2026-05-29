import React from 'react';
import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  FileText, 
  Settings,
  LogOut,
  Coffee,
  MonitorPlay,
  Lock,
  Clock,
  BookOpen
} from 'lucide-react';
import { cn } from '@/utils/utils';
import LockScreen from '@/components/LockScreen';
import { WalletCards } from 'lucide-react';
import SocketStatus from '@/components/SocketStatus';

export default function AdminLayout() {
  const { isAuthenticated, logout, user, isLocked, lock } = useAuthStore();
  const { cafeName } = useSettingsStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (isLocked) {
    return <LockScreen />;
  }

  const navItems = [
    { name: t('Dashboard'), path: '/admin/dashboard', icon: LayoutDashboard },
    { name: t('Inventory'), path: '/admin/inventory', icon: Package },
    { name: t('Recipes & Production'), path: '/admin/recipes', icon: BookOpen },
    { name: t('Employees'), path: '/admin/employees', icon: Users },
    { name: t('Payroll'), path: '/admin/payroll', icon: WalletCards },
    { name: t('Attendance'), path: '/admin/attendance', icon: Clock },
    { name: t('Reports'), path: '/admin/reports', icon: FileText },
    { name: t('Settings'), path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-b md:border-b-0 md:border-r border-amber-900/10 flex flex-col">
        <div className="p-6 flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <Coffee className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground tracking-tight">{cafeName}</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">{t('Management')}</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center space-x-3 rtl:space-x-reverse px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-orange-200/50 hover:text-foreground"
                  )
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-amber-900/10 mt-auto">
          <div className="mb-4">
           {/* Shortcuts to POS / KDS */}
           <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('Switch View')}</div>
            <button onClick={() => navigate('/pos')} className="w-full flex items-center space-x-3 rtl:space-x-reverse px-3 py-2 rounded-md text-sm text-stone-600 hover:bg-orange-200/50 transition">
              <Coffee className="w-4 h-4" />
              <span>{t('POS Interface')}</span>
            </button>
            <button onClick={() => navigate('/kds')} className="w-full flex items-center space-x-3 rtl:space-x-reverse px-3 py-2 rounded-md text-sm text-stone-600 hover:bg-orange-200/50 transition mt-1">
              <MonitorPlay className="w-4 h-4" />
              <span>{t('KDS Monitor')}</span>
            </button>
          </div>
        
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-orange-300/50">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <div className="w-8 h-8 rounded-full bg-orange-200/50 flex items-center justify-center text-xs text-stone-600">
                A
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t('Admin User')}</p>
                <p className="text-xs text-muted-foreground">admin@cafe.com</p>
              </div>
            </div>
            <div className="flex space-x-1 rtl:space-x-reverse">
              <button onClick={() => lock()} title="Pause (Lock)" className="p-2 text-muted-foreground hover:text-blue-400 transition">
                <Lock className="w-4 h-4" />
              </button>
              <button title="Full Logout" onClick={() => { logout(); navigate('/login'); }} className="p-2 text-muted-foreground hover:text-destructive transition">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-amber-900/10 bg-card/50 backdrop-blur-md flex items-center justify-between px-8">
           <div></div>
           <div className="flex items-center space-x-4">
             <SocketStatus />
           </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
