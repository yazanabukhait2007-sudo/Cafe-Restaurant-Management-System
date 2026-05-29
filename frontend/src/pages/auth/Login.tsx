import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { Coffee, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api/client';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const { cafeName } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password.");
      return;
    }

    setLoading(true);
    
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { accessToken, user } = res.data;
      
      // Map roles like Owner / Manager to lowercase for frontend compatibility
      let uiRole = 'admin';
      const dbRole = user.role?.toLowerCase() || 'cashier';
      if (dbRole === 'owner' || dbRole === 'admin') {
        uiRole = 'admin';
      } else if (dbRole === 'manager') {
        uiRole = 'manager';
      } else if (dbRole === 'cashier') {
        uiRole = 'cashier';
      } else if (dbRole === 'waiter') {
        uiRole = 'waiter';
      } else if (dbRole === 'kitchen') {
        uiRole = 'kitchen';
      } else {
        uiRole = dbRole;
      }

      login(accessToken, {
        id: user.id,
        name: user.name,
        role: uiRole as any,
        email: user.email,
      });

      if (uiRole === 'admin' || uiRole === 'manager') {
        navigate('/admin/dashboard');
      } else {
        navigate('/pos/tables');
      }
      toast.success(`Welcome back to ${cafeName}.`);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Invalid email or password.";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 opacity-20">
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
            <p className="text-muted-foreground mt-2">Sign in to your account</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="bg-card/50 backdrop-blur-xl border border-amber-900/10 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-orange-50/50 border border-orange-300 rounded-xl py-3 px-4 focus:outline-none focus:border-primary transition-colors text-foreground"
                placeholder="admin@cafe.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-orange-50/50 border border-orange-300 rounded-xl py-3 px-4 focus:outline-none focus:border-primary transition-colors text-foreground"
                placeholder="••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-4 font-bold flex items-center justify-center space-x-2 transition disabled:opacity-50 shadow-lg shadow-primary/25"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
        
        <p className="text-center text-xs text-muted-foreground mt-8">
           Demo: User: admin@cafe.com | Pass: Admin12@
        </p>
      </div>
    </div>
  );
}
