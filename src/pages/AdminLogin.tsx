import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { ArrowRight, ShieldAlert, Mail, Lock } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data.user.role !== 'admin') {
        throw new Error("You do not have administrative access.");
      }

      localStorage.setItem('role', 'admin');
      login(data.token, data.user);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-rose-500/30">
      {/* Immersive background effects */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40" style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}></div>
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[120px] mix-blend-color-dodge animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px] mix-blend-color-dodge animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="absolute top-8 left-8 z-50">
        <Link to="/login" className="flex items-center space-x-2 text-white/50 hover:text-white transition-colors text-sm font-bold bg-white/5 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md">
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span>Back to Main Login</span>
        </Link>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-gradient-to-tr from-rose-600 to-red-500 rounded-2xl shadow-xl shadow-rose-500/20 mb-6 relative group overflow-hidden">
             <div className="absolute inset-0 bg-white/20 blur-xl group-hover:bg-white/30 transition-colors"></div>
             <ShieldAlert size={36} className="text-white relative z-10" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight leading-none mb-3">Admin Portal</h1>
          <p className="text-white/40 text-[13px] font-bold uppercase tracking-widest">System Administration</p>
        </div>

        <div className="bg-white/[0.03] p-8 sm:p-10 border border-white/10 rounded-[2rem] shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-rose-500/50 to-transparent"></div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></div>
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-white/50 uppercase tracking-widest px-1">Admin Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-rose-400 transition-colors pointer-events-none" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl focus:bg-white/[0.05] focus:border-rose-500/50 outline-none text-white placeholder:text-white/20 text-sm font-medium transition-all shadow-inner"
                    placeholder="admin@smartbiz.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-white/50 uppercase tracking-widest px-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-rose-400 transition-colors pointer-events-none" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl focus:bg-white/[0.05] focus:border-rose-500/50 outline-none text-white placeholder:text-white/20 text-sm font-medium transition-all shadow-inner"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative group overflow-hidden flex items-center justify-center space-x-3 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-sm shadow-xl shadow-rose-600/20 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="relative z-10">Authenticate</span>
                  <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-12 text-center text-[10px] text-white/20 font-bold uppercase tracking-widest">
          Restricted Access Area
        </p>
      </motion.div>
    </div>
  );
}
