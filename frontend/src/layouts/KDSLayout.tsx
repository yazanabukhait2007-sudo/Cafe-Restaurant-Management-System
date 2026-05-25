import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, Navigate } from 'react-router-dom';
import { Clock, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import LockScreen from '@/components/LockScreen';
import { useTranslation } from 'react-i18next';

export default function KDSLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, isLocked } = useAuthStore();
  const [time, setTime] = useState(new Date());
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (isLocked) {
    return <LockScreen />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#FDFBF7] text-stone-900 overflow-hidden font-sans rtl:flex-col">
      <header className="h-16 bg-orange-50/50 border-b border-orange-200 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-primary">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl font-bold tracking-widest uppercase">{t('Kitchen Display')}</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-6 rtl:space-x-reverse">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-stone-600 font-mono">
            <Clock className="w-5 h-5 text-stone-500" />
            <span className="text-lg">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 rounded-md bg-orange-100/50 hover:bg-orange-200/50 text-stone-600 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="text-sm font-medium uppercase tracking-wider">{t('Exit KDS') || 'Exit KDS'}</span>
          </button>
        </div>
      </header>
      
      <main className="flex-1 overflow-x-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
