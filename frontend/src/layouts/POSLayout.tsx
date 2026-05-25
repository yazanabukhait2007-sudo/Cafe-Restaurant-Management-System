import React from 'react';
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Coffee, Grid3x3, ShoppingCart, LogOut, ArrowLeft, Lock, History, Utensils } from 'lucide-react';
import { cn } from '@/utils/utils';
import LockScreen from '@/components/LockScreen';
import { useTranslation } from 'react-i18next';

export default function POSLayout() {
  const { isAuthenticated, logout, isLocked, lock } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const posNavItems = [
    { name: t('Tables'), path: '/pos/tables', icon: Grid3x3 },
    { name: t('Orders'), path: '/pos/order', icon: ShoppingCart },
    { name: t('Order History'), path: '/pos/history', icon: History },
    { name: t('Menu Management'), path: '/pos/menu', icon: Utensils },
  ];

  if (isLocked) {
    return <LockScreen />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground rtl:flex-row-reverse">
      {/* Thin Sidebar for POS */}
      <aside className="w-20 bg-card border-r rtl:border-r-0 rtl:border-l border-amber-900/10 flex flex-col items-center py-6 flex-shrink-0 z-20 shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-8 shadow-lg shadow-primary/20">
          <Coffee className="w-6 h-6 text-primary-foreground" />
        </div>

        <nav className="flex-1 w-full space-y-4 px-3">
          {posNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "text-muted-foreground hover:bg-orange-200/50 hover:text-foreground"
                  )
                }
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-center px-1">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto w-full px-3 space-y-4">
          <button 
            onClick={() => lock()}
            className="w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-blue-400 focus:outline-none transition"
          >
            <Lock className="w-5 h-5" />
            <span className="text-[10px] uppercase font-bold text-center px-1">{t('Lock') || 'Lock'}</span>
          </button>

          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="w-full aspect-square rounded-xl bg-orange-100/50 border border-amber-900/10 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:bg-orange-200/50 transition"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            <span className="text-[10px] uppercase font-bold text-center px-1">{t('Admin User') || 'Admin'}</span>
          </button>
          
          <button 
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
          >
            <LogOut className="w-5 h-5 rtl:rotate-180" />
            <span className="text-[10px] uppercase font-bold text-center px-1">{t('Logout')}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 h-full relative">
        <Outlet />
      </main>
    </div>
  );
}
