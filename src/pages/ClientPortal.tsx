import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  LogOut, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Mail,
  User,
  ShieldCheck,
  Calendar,
  Settings,
  Phone,
  MapPin,
  X,
  Save,
  Globe
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useLocalization } from '../lib/localization';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function ClientPortal() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  const { t, lang, setLang } = useLocalization();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || role !== 'client') {
      navigate('/login');
      return;
    }

    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [invoicesData, profileData] = await Promise.all([
        apiFetch('/client/invoices'),
        apiFetch('/client/profile')
      ]);
      setInvoices(invoicesData);
      setClient(profileData);
      setProfileForm({
        name: profileData.name,
        phone: profileData.phone || '',
        address: profileData.address || ''
      });
    } catch (err) {
      console.error('Failed to fetch client data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await apiFetch('/client/profile', {
        method: 'PATCH',
        body: JSON.stringify(profileForm),
      });
      setClient({ ...client, ...profileForm });
      setIsProfileModalOpen(false);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/portal/login');
  };

  const totalUnpaid = invoices
    .filter(inv => inv.status === 'unpaid')
    .reduce((sum, inv) => sum + inv.total_amount, 0);

  const totalPaid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total_amount, 0);

  const lifetimeValue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'unpaid': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center gap-2 sm:gap-4">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <ShieldCheck className="text-white w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-black tracking-tighter uppercase italic">Client Portal</h1>
              <p className="text-[9px] sm:text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] truncate">SmartBiz Ecosystem</p>
            </div>
            <div className="block sm:hidden">
              <h1 className="text-lg font-black tracking-tighter uppercase italic">Portal</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="hidden sm:flex items-center space-x-1 bg-white/5 rounded-xl border border-white/10 p-1">
              {(['en', 'es', 'ur'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                    lang === l ? "bg-blue-500 text-white shadow-lg" : "text-white/40 hover:text-white"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="p-2 sm:p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-white/60 hover:text-white shrink-0"
              title="Profile Settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white shrink-0"
            >
              <LogOut className="w-4 h-4 sm:w-4 sm:h-4" />
              <span className="hidden leading-none sm:inline mt-px">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Sidebar Info */}
          <div className="space-y-4 sm:space-y-6">
            <div className="glass-panel p-6 sm:p-8">
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-4 sm:mb-6">Your Relationship</h2>
              <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 lg:block lg:space-y-6">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <Building2 size={18} className="text-blue-400" />
                    <span className="text-sm text-white/40 font-medium">Serving Business</span>
                  </div>
                  <p className="text-lg font-bold">{client?.business_name}</p>
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <User size={18} className="text-blue-400" />
                    <span className="text-sm text-white/40 font-medium">Billing Account</span>
                  </div>
                  <p className="text-lg font-bold">{client?.name}</p>
                  <p className="text-sm text-white/30 truncate">{client?.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-600 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-600/20 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
              <h2 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2">Outstanding Balance</h2>
              <p className="text-3xl sm:text-4xl font-black truncate">{formatCurrency(totalUnpaid, client?.currency)}</p>
              <div className="mt-4 sm:mt-6 flex items-center space-x-2 text-white/60 text-xs">
                <Clock size={14} />
                <span>Across {invoices.filter(i => i.status === 'unpaid').length} unpaid invoices</span>
              </div>
            </div>

            <div className="glass-panel p-6 sm:p-8">
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-4 sm:mb-6">Relationship Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                  <span className="text-xs text-white/40 font-bold uppercase tracking-widest">Total Paid</span>
                  <span className="text-green-400 font-bold">{formatCurrency(totalPaid, client?.currency)}</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                  <span className="text-xs text-white/40 font-bold uppercase tracking-widest">Lifetime Value</span>
                  <span className="text-white font-bold">{formatCurrency(lifetimeValue, client?.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoices List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <FileText className="text-blue-500" />
                Latest Invoices
              </h2>
            </div>

            <div className="space-y-4">
              {invoices.length === 0 ? (
                <div className="glass-panel p-12 text-center text-white/20">
                  <FileText size={48} className="mx-auto mb-4 opacity-10" />
                  <p>No invoices found on your account.</p>
                </div>
              ) : (
                invoices.map((invoice, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={invoice.id} 
                    className="glass-panel p-6 hover:bg-white/10 transition-all group border-white/5 hover:border-blue-500/30"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${getStatusColor(invoice.status)}`}>
                          {invoice.status === 'paid' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-bold text-lg">{invoice.invoice_number}</h3>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-white/40">
                             <span className="flex items-center gap-1"><Calendar size={12}/> {invoice.date}</span>
                             <span>•</span>
                             <span className="flex items-center gap-1"><AlertCircle size={12}/> Due {invoice.due_date}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 sm:gap-12">
                        <div className="text-right">
                          <p className="text-2xl font-black">{formatCurrency(invoice.total_amount, client?.currency)}</p>
                          <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mt-0.5">Total Amount</p>
                        </div>
                        <button 
                          className="p-3 bg-white/5 hover:bg-blue-500 text-white rounded-xl transition-all shadow-xl hover:shadow-blue-500/20 group-hover:bg-blue-500"
                          title="View Details"
                          onClick={() => navigate(`/invoice/${invoice.id}`)}
                        >
                          <ExternalLink size={20} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel max-w-md w-full p-6 sm:p-8 shadow-2xl border-white/20 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 sm:mb-8">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <User size={20} />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold">Billing Profile</h2>
                </div>
                <button onClick={() => setIsProfileModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Billing Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3 text-blue-400" size={18} />
                    <textarea
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm h-32 resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 sm:pt-4">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex items-center justify-center space-x-2 w-full sm:w-auto px-8 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                  >
                    {isUpdating ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Save size={18} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
