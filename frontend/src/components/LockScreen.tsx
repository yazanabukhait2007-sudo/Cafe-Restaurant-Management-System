import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { Coffee, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function LockScreen() {
  const { unlock, logout, user } = useAuthStore();
  const { cafeName } = useSettingsStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate verification
    setTimeout(() => {
      setLoading(false);
      const success = unlock(pin);
      if (success) {
        toast.success(`Welcome back, ${user?.name || 'User'}`);
      } else {
        toast.error("Invalid PIN code.");
        setPin('');
      }
    }, 600);
  };

  const handleFullLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-4">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-600/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center justify-center space-y-4 mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/20">
            <Coffee className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{cafeName}</h1>
            <p className="text-muted-foreground mt-2">Enter PIN to unlock session</p>
          </div>
        </div>

        <form onSubmit={handleUnlock} className="bg-card/50 backdrop-blur-xl border border-amber-900/10 rounded-3xl p-8 shadow-2xl">
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <input
                type="password"
                maxLength={4}
                value={pin}
                readOnly
                className="w-full bg-orange-50/50 border border-orange-300 rounded-2xl py-6 text-center text-4xl tracking-[0.5em] indent-[0.5em] font-mono focus:outline-none focus:border-primary transition-colors text-foreground"
                placeholder="****"
              />
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'Clear', 0, 'Del'].map((num, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => {
                    if (num === 'Clear') setPin('');
                    else if (num === 'Del') setPin(p => p.slice(0, -1));
                    else if (pin.length < 4) setPin(p => p + num);
                  }}
                  className="aspect-square bg-orange-100/50 hover:bg-orange-200/50 border border-orange-300 rounded-2xl flex items-center justify-center text-xl font-medium transition active:scale-95 text-stone-700"
                >
                  {num}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={pin.length !== 4 || loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl py-5 font-bold text-lg flex items-center justify-center space-x-2 transition disabled:opacity-50 shadow-lg shadow-primary/25"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  <span>Unlock</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
        
        <div className="flex flex-col items-center mt-8 space-y-2">
          <p className="text-xs text-muted-foreground">Demo: Use 2212 to unlock</p>
          <button 
            type="button" 
            onClick={handleFullLogout}
            className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-destructive transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Full Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
