import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Calendar, Repeat, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useLocalization } from '../lib/localization';
import { useAuth } from '../lib/auth';
import ConfirmModal from '../components/ConfirmModal';

export default function RecurringInvoices() {
  const [recurring, setRecurring] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    client_id: '',
    frequency: 'monthly',
    next_date: new Date().toISOString().split('T')[0],
    tax_rate: 0,
    template_id: 'modern',
    items: [{ description: '', quantity: 1, unit_price: 0 }]
  });
  const [clientSearch, setClientSearch] = useState('');
  const [showClientList, setShowClientList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  const { t } = useLocalization();
  const { user } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setShowClientList(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [recurringData, clientsData] = await Promise.all([
        apiFetch('/recurring-invoices'),
        apiFetch('/clients')
      ]);
      setRecurring(recurringData);
      setClients(clientsData);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectClient = (client: any) => {
    setFormData({ ...formData, client_id: client.id.toString() });
    setClientSearch(client.name);
    setShowClientList(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/recurring-invoices', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setIsModalOpen(false);
      setFormData({
        client_id: '',
        frequency: 'monthly',
        next_date: new Date().toISOString().split('T')[0],
        tax_rate: 0,
        template_id: 'modern',
        items: [{ description: '', quantity: 1, unit_price: 0 }]
      });
      setClientSearch('');
      setError(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete) {
      await apiFetch(`/recurring-invoices/${confirmDelete}`, { method: 'DELETE' });
      setConfirmDelete(null);
      fetchData();
    }
  };

  const processRecurring = async () => {
    setIsProcessing(true);
    try {
      const resp = await apiFetch('/recurring-invoices/process', { method: 'POST' });
      setProcessedCount(resp.generated);
      if (resp.generated === 0) {
         setError("No scheduled invoices are due today. If you want to force generate an invoice before its next date, use the 'Generate Now' button on the specific row.");
         setTimeout(() => setError(null), 8000);
      }
      fetchData();
      setTimeout(() => setProcessedCount(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const forceProcessRecurring = async (id: number) => {
    try {
      const resp = await apiFetch(`/recurring-invoices/${id}/force-process`, { method: 'POST' });
      if (resp.success) {
        setProcessedCount(1);
        fetchData();
        setTimeout(() => setProcessedCount(null), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Error processing invoice manually');
      setTimeout(() => setError(null), 5000);
    }
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { description: '', quantity: 1, unit_price: 0 }] });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Recurring Invoices</h1>
          <p className="text-white/60">Automate your billing for regular clients.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <button
            onClick={processRecurring}
            disabled={isProcessing}
            className="w-full sm:w-auto px-6 py-2 rounded-xl border border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all text-sm font-bold flex items-center justify-center gap-2"
          >
            <Repeat size={18} className={isProcessing ? 'animate-spin' : ''} />
            <span>{isProcessing ? 'Processing...' : 'Process Due Now'}</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-blue-500 text-white px-6 py-2 rounded-xl flex items-center justify-center space-x-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 font-bold"
          >
            <Plus size={20} />
            <span>Setup Recurring</span>
          </button>
        </div>
      </div>

      {processedCount !== null && processedCount > 0 && (
        <div className="bg-green-500/20 border border-green-500/30 p-4 rounded-xl flex items-center gap-3 text-green-400 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={20} />
          <p className="font-bold">{processedCount} new invoice{processedCount > 1 ? 's' : ''} generated successfully!</p>
        </div>
      )}

      {error && !isModalOpen && (
        <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-xl text-sm font-medium text-center">
          {error}
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-white/5 text-white/40 text-xs uppercase font-bold tracking-widest">
              <tr>
                <th className="px-4 md:px-6 py-4">Client</th>
                <th className="px-4 md:px-6 py-4">Frequency</th>
                <th className="px-4 md:px-6 py-4">Next Date</th>
                <th className="px-4 md:px-6 py-4">Items</th>
                <th className="px-4 md:px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 md:px-6 py-8 text-center text-white/40">Loading...</td></tr>
              ) : recurring.length === 0 ? (
                <tr><td colSpan={5} className="px-4 md:px-6 py-8 text-center text-white/40">No recurring invoices set up</td></tr>
              ) : (
                recurring.map((rec) => (
                  <tr key={rec.id} className="hover:bg-white/5 transition-colors group relative">
                    <td className="px-4 md:px-6 py-4 font-medium text-white">{rec.client_name}</td>
                    <td className="px-4 md:px-6 py-4">
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                        {rec.frequency}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-white/60 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {rec.next_date}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-white/60">
                      {rec.items.length} item(s)
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right relative z-10 flex items-center justify-end gap-3">
                      <button
                        onClick={() => forceProcessRecurring(rec.id)}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 md:opacity-0 group-hover:opacity-100 transition-all uppercase"
                      >
                        Generate Now
                      </button>
                      <button
                        onClick={() => setConfirmDelete(rec.id)}
                        className="text-white/40 hover:text-red-400 p-1 md:opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDelete !== null}
        title="Stop Recurring Billing"
        message="Are you sure you want to stop this recurring invoice? No more invoices will be generated for this schedule."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-panel max-w-2xl w-full p-8 shadow-2xl border-white/20">
            <h2 className="text-2xl font-bold mb-6 text-white text-center">Setup Recurring Invoice</h2>
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-medium text-center">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative" ref={clientSearchRef}>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Search Client</label>
                  <input
                    type="text"
                    required
                    placeholder="Type to search..."
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientList(true);
                      if (!e.target.value) setFormData({ ...formData, client_id: '' });
                    }}
                    onFocus={() => setShowClientList(true)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                  />
                  {showClientList && clientSearch && (
                    <div 
                      className="absolute z-50 w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto"
                    >
                      {filteredClients.length > 0 ? (
                        filteredClients.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectClient(c)}
                            className="w-full px-4 py-3 text-left text-white hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                          >
                            <p className="font-bold">{c.name}</p>
                            <p className="text-xs text-white/40">{c.email}</p>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-white/40 text-sm italic">No clients found</div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white appearance-none"
                  >
                    <option value="weekly" className="bg-slate-900">Weekly</option>
                    <option value="monthly" className="bg-slate-900">Monthly</option>
                    <option value="yearly" className="bg-slate-900">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">First Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={formData.next_date}
                    onChange={(e) => setFormData({ ...formData, next_date: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-bold">Line Items</h3>
                  <button type="button" onClick={addItem} className="text-blue-400 text-xs font-bold uppercase hover:underline">
                    + Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center bg-white/5 md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none border border-white/5 md:border-none">
                      <div className="col-span-12 md:col-span-6">
                        <label className="block md:hidden text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Description</label>
                        <input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full px-4 py-2 bg-white/5 md:bg-white/5 border border-white/10 rounded-lg outline-none text-white text-sm"
                          required
                        />
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <label className="block md:hidden text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Qty</label>
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 bg-white/5 md:bg-white/5 border border-white/10 rounded-lg outline-none text-white text-sm text-center"
                          required
                        />
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <label className="block md:hidden text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Price</label>
                        <input
                          type="number"
                          placeholder="Price"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 bg-white/5 md:bg-white/5 border border-white/10 rounded-lg outline-none text-white text-sm"
                          required
                        />
                      </div>
                      <div className="col-span-12 md:col-span-1 text-right mt-2 md:mt-0 flex justify-end md:block">
                        <button onClick={() => removeItem(index)} type="button" className="text-white/20 hover:text-red-400 bg-white/5 md:bg-transparent px-4 py-2 md:p-0 rounded-lg flex items-center">
                          <span className="md:hidden mr-2 text-xs font-bold uppercase tracking-wider">Remove</span>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col lg:flex-row items-center justify-between border-t border-white/5 pt-6 gap-6">
                 <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-auto">
                    <div className="w-full sm:w-auto">
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Tax Rate (%)</label>
                        <input
                          type="number"
                          value={formData.tax_rate}
                          onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                          className="w-full sm:w-20 px-3 py-1 bg-white/5 border border-white/10 rounded-lg outline-none text-white text-xs"
                        />
                    </div>
                    <div className="w-full sm:w-auto">
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Invoice Template</label>
                        <div className="flex flex-wrap gap-2">
                          {['modern', 'classic'].map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setFormData({...formData, template_id: t})}
                              className={`flex-1 sm:flex-none px-3 py-2 sm:py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all text-center ${
                                formData.template_id === t ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                    </div>
                 </div>
                 <div className="flex flex-col-reverse sm:flex-row gap-3 w-full lg:w-auto space-y-reverse space-y-3 sm:space-y-0">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-3 text-white/60 hover:text-white transition-colors w-full sm:w-auto text-center"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-bold shadow-lg shadow-blue-500/20 w-full sm:w-auto text-center"
                    >
                      Start Recurring
                    </button>
                 </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
