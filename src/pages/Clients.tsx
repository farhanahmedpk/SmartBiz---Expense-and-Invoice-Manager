import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Mail, Phone, MapPin, Shield, Key, Eye, EyeOff, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useLocalization } from '../lib/localization';
import { cn } from '../lib/utils';
import ConfirmModal from '../components/ConfirmModal';

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });
  const [portalData, setPortalData] = useState({ password: '', portal_enabled: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLocalization();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const data = await apiFetch('/clients');
      setClients(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/clients', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', address: '' });
      setError(null);
      fetchClients();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePortalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/clients/${selectedClient.id}/portal`, {
        method: 'PATCH',
        body: JSON.stringify(portalData),
      });
      setIsPortalModalOpen(false);
      setPortalData({ password: '', portal_enabled: false });
      setSelectedClient(null);
      setError(null);
      fetchClients();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openPortalModal = (client: any) => {
    setSelectedClient(client);
    setPortalData({ password: '', portal_enabled: client.portal_enabled === 1 });
    setIsPortalModalOpen(true);
  };

  const handleDelete = async () => {
    if (confirmDelete) {
      await apiFetch(`/clients/${confirmDelete}`, { method: 'DELETE' });
      setConfirmDelete(null);
      fetchClients();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('clients')}</h1>
          <p className="text-white/60">Manage your customer relationships and portal access</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-blue-500 text-white px-6 py-2 rounded-xl flex items-center justify-center space-x-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 font-bold"
        >
          <Plus size={20} />
          <span>{t('add_client')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-white/40">Loading...</div>
        ) : clients.length === 0 ? (
          <div className="col-span-full text-center py-12 text-white/40">No clients found</div>
        ) : (
          clients.map((client) => (
            <div key={client.id} className="glass-panel p-8 group hover:bg-white/15 transition-all duration-300 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center text-2xl font-black border border-blue-500/30 relative">
                  {client.name?.charAt(0) || '?'}
                  {client.portal_enabled === 1 && (
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-slate-900">
                      <Shield size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setConfirmDelete(client.id)}
                  className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-6">{client.name}</h3>
                <div className="space-y-4 text-sm text-white/60">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-white/5 rounded-lg"><Mail size={16} className="text-blue-400" /></div>
                    <span>{client.email}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-white/5 rounded-lg"><Phone size={16} className="text-blue-400" /></div>
                    <span>{client.phone}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-emerald-500/10 rounded-lg mt-0.5">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    </div>
                    <span className="leading-relaxed text-emerald-400/80 font-medium text-xs uppercase tracking-wider">
                      Verified Client
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <button 
                  onClick={() => navigate('/invoices', { state: { clientFilter: client.id.toString() } })}
                  className="text-blue-400 text-xs font-bold hover:text-blue-300 transition-colors uppercase tracking-widest"
                >
                  History
                </button>
                <button 
                  onClick={() => openPortalModal(client)}
                  className={cn(
                    "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                    client.portal_enabled === 1 ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/40 hover:bg-white/10"
                  )}
                >
                   <Shield size={12} />
                   <span>Portal {client.portal_enabled === 1 ? 'Enabled' : 'Access'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDelete !== null}
        title="Delete Client"
        message="Are you sure you want to delete this client? This will not delete their invoices, but they will no longer be associated with this client."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {isPortalModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel max-w-md w-full p-8 shadow-2xl border-white/20">
            <div className="flex items-center space-x-3 mb-2">
              <Shield className="text-blue-400" size={24} />
              <h2 className="text-2xl font-bold text-white">Client Portal Access</h2>
            </div>
            <p className="text-white/40 text-sm mb-6">Manage login access for <span className="text-white font-bold">{selectedClient?.name}</span>.</p>

            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handlePortalSubmit} className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <div>
                  <p className="text-white font-bold text-sm">Enable Portal Access</p>
                  <p className="text-white/40 text-xs mt-1">Allow client to log in and view invoices.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPortalData({ ...portalData, portal_enabled: !portalData.portal_enabled })}
                  className={cn(
                    "w-12 h-6 rounded-full p-1 transition-all duration-300",
                    portalData.portal_enabled ? "bg-blue-500" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full transition-all duration-300",
                    portalData.portal_enabled ? "translate-x-6" : "translate-x-0"
                  )} />
                </button>
              </div>

              {portalData.portal_enabled && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Portal Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required={!selectedClient?.portal_enabled}
                      value={portalData.password}
                      onChange={(e) => setPortalData({ ...portalData, password: e.target.value })}
                      placeholder={selectedClient?.portal_enabled ? "•••••••• (Leave blank to keep current)" : "Set strong password"}
                      className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/20 mt-3 flex items-center gap-1.5 px-1">
                    <Clock size={10} />
                    Clients login with their email address: {selectedClient?.email}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setIsPortalModalOpen(false);
                    setError(null);
                  }}
                  className="px-6 py-2 text-white/60 hover:text-white transition-colors text-sm font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-8 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-bold shadow-lg shadow-blue-500/20 text-sm"
                >
                  Update Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel max-w-md w-full p-8 shadow-2xl border-white/20">
            <h2 className="text-2xl font-bold mb-6 text-white">{t('add_client')}</h2>
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Phone *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => {
                    let val = e.target.value;
                    const oldVal = formData.phone;

                    if (oldVal.endsWith('-') && val === oldVal.slice(0, -1)) {
                      val = val.slice(0, -1);
                    }

                    let prefixRemoved = val;
                    if (prefixRemoved.startsWith('+92-')) {
                      prefixRemoved = prefixRemoved.substring(4);
                    } else if (prefixRemoved.startsWith('+92')) {
                      prefixRemoved = prefixRemoved.substring(3);
                    } else if (prefixRemoved.startsWith('+9')) {
                      prefixRemoved = prefixRemoved.substring(2);
                    } else if (prefixRemoved.startsWith('+')) {
                      prefixRemoved = prefixRemoved.substring(1);
                    }

                    let digits = prefixRemoved.replace(/\D/g, '');
                    
                    if (digits.length > 11) {
                      digits = digits.substring(0, 11);
                    }

                    let formatted = '';
                    if (digits.length > 0) {
                      formatted = '+92-';
                      formatted += digits.substring(0, 3);
                      if (digits.length > 3) {
                        formatted += '-' + digits.substring(3, 11);
                      }
                    }
                    
                    setFormData({ ...formData, phone: formatted });
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                  placeholder="+92-XXX-XXXXXXXX"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 text-white/60 hover:text-white transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-8 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-bold shadow-lg shadow-blue-500/20"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
