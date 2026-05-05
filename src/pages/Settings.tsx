import React, { useState, useEffect } from 'react';
import { Save, User, Building, Globe, Lock, Moon, Sun, Layout as LayoutIcon, Image as ImageIcon, Clock } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useLocalization } from '../lib/localization';
import { useAuth } from '../lib/auth';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { t } = useLocalization();
  const [formData, setFormData] = useState(() => {
    let dashboard_config = {
      widgets: ['stats', 'income_chart', 'profit_chart'],
      order: ['stats', 'income_chart', 'profit_chart'],
      reminders_enabled: false,
      reminder_days_before: 3
    };
    try {
      if (user?.dashboard_config) {
        const parsed = JSON.parse(user.dashboard_config);
        if (parsed && typeof parsed === 'object') dashboard_config = { ...dashboard_config, ...parsed };
      }
    } catch (e) {}

    return {
      business_name: user?.business_name || '',
      currency: user?.currency || 'PKR',
      email: user?.email || '',
      logo_url: user?.logo_url || '',
      theme: user?.theme || 'dark',
      dashboard_config
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      let dashboard_config = {
        widgets: ['stats', 'income_chart', 'profit_chart'],
        order: ['stats', 'income_chart', 'profit_chart'],
        reminders_enabled: false,
        reminder_days_before: 3
      };
      try {
        if (user.dashboard_config) {
          const parsed = JSON.parse(user.dashboard_config);
          if (parsed && typeof parsed === 'object') dashboard_config = { ...dashboard_config, ...parsed };
        }
      } catch (e) {}

      setFormData({
        business_name: user.business_name || '',
        currency: user.currency || 'PKR',
        email: user.email || '',
        logo_url: user.logo_url || '',
        theme: user.theme || 'dark',
        dashboard_config
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const payload = {
        business_name: formData.business_name,
        currency: formData.currency,
        logo_url: formData.logo_url,
        theme: formData.theme,
        dashboard_config: JSON.stringify(formData.dashboard_config)
      };
      
      await apiFetch('/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      
      updateUser(payload);
      setMessage({ text: 'Settings updated successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleWidget = (widgetId: string) => {
    const widgets = formData.dashboard_config.widgets.includes(widgetId)
      ? formData.dashboard_config.widgets.filter((id: string) => id !== widgetId)
      : [...formData.dashboard_config.widgets, widgetId];
    
    setFormData({
      ...formData,
      dashboard_config: { ...formData.dashboard_config, widgets }
    });
  };

  const currencies = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'];

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('settings')}</h1>
          <p className="text-white/60">Manage your business profile and preferences</p>
        </div>
      </div>

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {message.text && (
            <div className={`p-4 rounded-xl text-sm font-bold border ${
              message.type === 'success' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}>
              {message.text}
            </div>
          )}

          <div className="glass-panel overflow-hidden">
            <div className="p-8 border-b border-white/10">
              <h3 className="text-xl font-bold text-white flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                  <Building size={20} className="text-blue-400" />
                </div>
                <span>Business Profile</span>
              </h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">{t('business_name')}</label>
                    <input
                      type="text"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Logo URL</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={formData.logo_url}
                        onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                      />
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-32 h-32 glass-panel flex items-center justify-center overflow-hidden border-dashed border-white/20">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon className="text-white/10" size={40} />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">{t('email')}</label>
                <input
                  type="email"
                  disabled
                  value={formData.email}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/40 cursor-not-allowed"
                />
                <p className="text-[10px] text-white/20 mt-2 font-bold uppercase tracking-wider">Email cannot be changed.</p>
              </div>
            </div>
          </div>

          <div className="glass-panel overflow-hidden">
            <div className="p-8 border-b border-white/10">
              <h3 className="text-xl font-bold text-white flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                  <LayoutIcon size={20} className="text-emerald-400" />
                </div>
                <span>Theme & Dashboard</span>
              </h3>
            </div>
            <div className="p-8 space-y-8">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Display Mode</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: 'dark' })}
                    className={`flex-1 flex items-center justify-center space-x-3 p-4 rounded-xl border transition-all ${
                      formData.theme === 'dark' ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    <Moon size={20} />
                    <span className="font-bold">Dark Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: 'light' })}
                    className={`flex-1 flex items-center justify-center space-x-3 p-4 rounded-xl border transition-all ${
                      formData.theme === 'light' ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    <Sun size={20} />
                    <span className="font-bold">Light Mode</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Dashboard Widgets</label>
                <div className="space-y-3">
                  {[
                    { id: 'stats', label: 'Financial Statistics Cards' },
                    { id: 'income_chart', label: 'Income vs Expenses (Bar Chart)' },
                    { id: 'profit_chart', label: 'Profit Growth (Area Chart)' }
                  ].map(widget => (
                    <button
                      key={widget.id}
                      type="button"
                      onClick={() => toggleWidget(widget.id)}
                      className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <span className="text-sm font-medium text-white">{widget.label}</span>
                      <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                        formData.dashboard_config.widgets.includes(widget.id) ? 'bg-accent border-accent' : 'border-white/20'
                      }`}>
                        {formData.dashboard_config.widgets.includes(widget.id) && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-white/20 mt-4 font-bold uppercase tracking-wider">Selected widgets will be displayed on your main dashboard.</p>
              </div>
            </div>
          </div>

          <div className="glass-panel overflow-hidden">
            <div className="p-8 border-b border-white/10">
              <h3 className="text-xl font-bold text-white flex items-center space-x-3">
                <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                  <Globe size={20} className="text-purple-400" />
                </div>
                <span>Localization</span>
              </h3>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">{t('currency')}</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white appearance-none"
                >
                  {currencies.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="glass-panel overflow-hidden">
            <div className="p-8 border-b border-white/10">
              <h3 className="text-xl font-bold text-white flex items-center space-x-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                  <Clock size={20} className="text-yellow-400" />
                </div>
                <span>Automated Reminders</span>
              </h3>
            </div>
            <div className="p-8 space-y-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={formData.dashboard_config.reminders_enabled}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      dashboard_config: { ...formData.dashboard_config, reminders_enabled: e.target.checked }
                    })}
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${formData.dashboard_config.reminders_enabled ? 'bg-blue-500' : 'bg-white/10'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.dashboard_config.reminders_enabled ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <div className="text-sm font-bold text-white">Enable Automated Reminders</div>
              </label>
              
              {formData.dashboard_config.reminders_enabled && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Send reminder before due date (days)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.dashboard_config.reminder_days_before}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      dashboard_config: { ...formData.dashboard_config, reminder_days_before: parseInt(e.target.value) || 1 }
                    })}
                    className="w-full max-w-[200px] px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-accent text-white px-10 py-4 rounded-xl font-black flex items-center space-x-3 hover:bg-opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-accent/20 uppercase tracking-widest text-sm"
            >
              <Save size={20} />
              <span>{isSaving ? 'Saving...' : t('save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
