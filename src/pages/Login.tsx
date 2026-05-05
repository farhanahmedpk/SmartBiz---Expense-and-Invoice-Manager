import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { ArrowRight, CheckCircle2, ShieldCheck, Mail, Lock } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
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

      if (data.user.role === 'admin') {
         // Admins might login here accidentally but we should let them in or redirect them.
         // Let's redirect them to admin just in case.
         // Or just follow standard logic
      }

      localStorage.setItem('role', data.user.role);
      login(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col lg:flex-row overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Left Pane - Branding & Intro */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950">
        <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}></div>
        
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-blue-500/30 blur-[120px] rounded-full mix-blend-color-dodge"></div>
          <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-indigo-500/20 blur-[120px] rounded-full mix-blend-color-dodge"></div>
        </div>

        <div className="z-10 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <div className="w-5 h-5 border-2 border-white rounded-md"></div>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter">SmartBiz.</h2>
        </div>

        <div className="z-10">
          <div className="space-y-10 max-w-lg">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
                Professional tools for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">modern business.</span>
              </h1>
              <p className="text-blue-100/70 text-lg font-medium leading-relaxed">
                Automate your invoicing, track expenses, and manage clients with precision. Built for high-growth agencies.
              </p>
            </motion.div>

            <div className="space-y-5">
              {[
                "Automated Invoice Reminders",
                "Built-in Client Portal Access",
                "Advanced Expense Categorization",
                "Full Financial Analytics"
              ].map((feature, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1), duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  key={feature} 
                  className="flex items-center space-x-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm"
                >
                  <div className="p-1 rounded-full bg-blue-500/20 text-blue-400">
                    <CheckCircle2 size={18} />
                  </div>
                  <span className="font-semibold text-sm text-white/90">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="z-10 flex items-center space-x-4">
          <div className="flex -space-x-3">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${idx + 10}`} alt="User" />
              </div>
            ))}
          </div>
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest leading-none">
            Trusted by <span className="text-white font-black">2,000+</span> teams
          </p>
        </div>
      </div>

      {/* Right Pane - Auth Form */}
      <div className="flex-1 flex flex-col justify-center p-8 sm:p-12 lg:p-24 relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 z-0">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none"></div>
        </div>

        <div className="lg:hidden mb-12 flex justify-between items-center relative z-10">
           <div className="flex items-center space-x-2">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-400 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
             </div>
             <h2 className="text-2xl font-black text-white tracking-tighter">SmartBiz.</h2>
           </div>
           <Link to="/signup" className="text-sm font-bold text-blue-400 hover:text-blue-300">Get Started</Link>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md mx-auto w-full relative z-10"
        >
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none mb-4">Welcome back</h1>
            <p className="text-white/40 text-sm font-medium tracking-wide">Sign in to your business command center</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-white/50 uppercase tracking-widest px-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors pointer-events-none" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl focus:bg-white/[0.05] focus:border-blue-500/50 outline-none text-white placeholder:text-white/20 text-sm font-medium transition-all shadow-inner"
                    placeholder="name@business.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-white/50 uppercase tracking-widest px-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors pointer-events-none" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl focus:bg-white/[0.05] focus:border-blue-500/50 outline-none text-white placeholder:text-white/20 text-sm font-medium transition-all shadow-inner"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative group overflow-hidden flex items-center justify-center space-x-3 py-4 bg-white text-slate-900 rounded-2xl font-bold text-sm shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-200 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin relative z-10"></div>
              ) : (
                <>
                  <span className="relative z-10">Launch Dashboard</span>
                  <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 flex flex-col space-y-6">
            <p className="text-xs text-white/40 font-medium text-center">
              New to SmartBiz?{' '}
              <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">Create an enterprise account</Link>
            </p>
            
            <div className="flex items-center justify-center">
              <div className="h-px bg-white/10 w-full"></div>
              <span className="px-4 text-[10px] uppercase tracking-widest text-white/30 font-bold">OR</span>
              <div className="h-px bg-white/10 w-full"></div>
            </div>

            <Link 
              to="/portal/login" 
              className="group flex flex-col items-center justify-center p-6 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 hover:border-blue-500/30 rounded-3xl transition-all text-center"
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform mb-3">
                 <ShieldCheck size={24} />
              </div>
              <span className="text-sm font-bold text-white mb-1">Access Client Portal</span>
              <span className="text-xs text-white/40">Secure area for processing invoices</span>
            </Link>
          </div>
        </motion.div>

        <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
           <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Global Operational Excellence © 2026</p>
        </div>
      </div>
    </div>
  );
}

