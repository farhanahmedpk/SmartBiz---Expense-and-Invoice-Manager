import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  CheckCircle, 
  Clock, 
  MoreVertical, 
  Filter, 
  Download, 
  Mail, 
  ChevronDown, 
  Printer,
  Calendar,
  User as UserIcon,
  Eye
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useLocalization } from '../lib/localization';
import { useAuth } from '../lib/auth';
import { cn, formatCurrency } from '../lib/utils';
import ConfirmModal from '../components/ConfirmModal';

export default function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const location = useLocation();
  const [clientFilter, setClientFilter] = useState(location.state?.clientFilter || 'all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Selection & Bulk
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [formData, setFormData] = useState({
    client_id: '',
    invoice_number: `INV-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tax_rate: 0,
    payment_terms: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
    template_id: 'modern'
  });
  
  const [showPreview, setShowPreview] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientList, setShowClientList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingReminders, setIsProcessingReminders] = useState(false);
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
    try {
      const [invoicesData, clientsData] = await Promise.all([
        apiFetch('/invoices'),
        apiFetch('/clients')
      ]);
      setInvoices(invoicesData);
      setClients(clientsData);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.client_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchesClient = clientFilter === 'all' || inv.client_id.toString() === clientFilter;
      const matchesDate = (!startDate || inv.date >= startDate) && (!endDate || inv.date <= endDate);
      
      return matchesSearch && matchesStatus && matchesClient && matchesDate;
    });
  }, [invoices, searchTerm, statusFilter, clientFilter, startDate, endDate]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map(i => i.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatus = async (status: string) => {
    try {
      await apiFetch('/invoices/bulk/status', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds, status })
      });
      setSelectedIds([]);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await apiFetch('/invoices/bulk/delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds })
      });
      setSelectedIds([]);
      setIsBulkDeleting(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSendReminders = async () => {
    setIsProcessingReminders(true);
    try {
      const result = await apiFetch('/invoices/reminders/process', { method: 'POST' });
      alert(`Processed ${result.sentCount} reminders.`);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessingReminders(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Invoice Number', 'Client', 'Date', 'Due Date', 'Amount', 'Status'];
    const data = filteredInvoices.map(inv => [
      inv.invoice_number,
      inv.client_name,
      inv.date,
      inv.due_date,
      inv.total_amount,
      inv.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit_price: 0 }]
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/invoices', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setIsModalOpen(false);
      setFormData({
        client_id: '',
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tax_rate: 0,
        items: [{ description: '', quantity: 1, unit_price: 0 }],
        template_id: 'modern'
      });
      setClientSearch('');
      setError(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'unpaid': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('invoices')}</h1>
          <p className="text-white/60">Generate and manage professional invoices</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleSendReminders}
            disabled={isProcessingReminders || isLoading}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-4 py-2 rounded-xl hover:bg-purple-500/20 transition-all font-bold text-sm disabled:opacity-50"
          >
            <Mail size={18} />
            <span>{isProcessingReminders ? 'Sending...' : 'Send Reminders'}</span>
          </button>
          <button
            onClick={exportCSV}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-white/5 border border-white/10 text-white/60 px-4 py-2 rounded-xl hover:bg-white/10 transition-all font-bold text-sm"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-blue-500 text-white px-6 py-2 rounded-xl flex items-center justify-center space-x-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 font-bold"
          >
            <Plus size={20} />
            <span>{t('create_invoice')}</span>
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-white/20"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center justify-center space-x-2 px-4 py-2 rounded-xl border transition-all text-sm font-bold",
                showFilters ? "bg-blue-500/10 border-blue-500/50 text-blue-400" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
              )}
            >
              <Filter size={18} />
              <span>Filters</span>
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                >
                  <option value="all" className="bg-slate-900">All Statuses</option>
                  <option value="paid" className="bg-slate-900">Paid</option>
                  <option value="unpaid" className="bg-slate-900">Unpaid</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Client</label>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                >
                  <option value="all" className="bg-slate-900">All Clients</option>
                  {clients.map(c => <option key={c.id} value={c.id.toString()} className="bg-slate-900">{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-in zoom-in-95 duration-200">
              <span className="text-sm font-bold text-blue-400">{selectedIds.length} invoices selected</span>
              <div className="h-4 w-px bg-blue-500/20 mx-2 hidden sm:block"></div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkStatus('paid')}
                  className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle size={14} />
                  Mark as Paid
                </button>
                <button
                  onClick={() => handleBulkStatus('unpaid')}
                  className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-all flex items-center gap-1.5"
                >
                  <Clock size={14} />
                  Mark as Unpaid
                </button>
                <button
                  onClick={() => setIsBulkDeleting(true)}
                  className="px-3 py-1.5 bg-white/10 text-white text-xs font-bold rounded-lg hover:bg-red-500 transition-all flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  Delete Selected
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-white/5 text-white/40 text-xs uppercase font-bold tracking-widest">
              <tr>
                <th className="px-4 md:px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                </th>
                <th className="px-4 md:px-6 py-4">{t('invoice_number')}</th>
                <th className="px-4 md:px-6 py-4">{t('clients')}</th>
                <th className="px-4 md:px-6 py-4">{t('date')}</th>
                <th className="px-4 md:px-6 py-4 text-right">{t('amount')}</th>
                <th className="px-4 md:px-6 py-4 text-center">{t('status')}</th>
                <th className="px-4 md:px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 md:px-6 py-8 text-center text-white/40">Loading...</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={7} className="px-4 md:px-6 py-8 text-center text-white/40">No invoices found</td></tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className={cn(
                    "hover:bg-white/5 transition-colors group relative",
                    selectedIds.includes(invoice.id) && "bg-blue-500/5"
                  )}>
                    <td className="px-4 md:px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(invoice.id)}
                        onChange={() => toggleSelect(invoice.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 relative z-10"
                      />
                    </td>
                    <td className="px-4 md:px-6 py-4 font-mono text-blue-400 text-sm">
                      <Link to={`/invoices/${invoice.id}`} className="absolute inset-0 z-0"></Link>
                      <span className="relative z-10">{invoice.invoice_number}</span>
                    </td>
                    <td className="px-4 md:px-6 py-4 font-medium text-white">{invoice.client_name}</td>
                    <td className="px-4 md:px-6 py-4 text-white/60 text-sm">{invoice.date}</td>
                    <td className="px-4 md:px-6 py-4 text-right font-bold text-white">
                      {formatCurrency(invoice.total_amount, user?.currency)}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-center flex justify-center w-full max-w-[80px] mx-auto",
                        getStatusColor(invoice.status)
                      )}>
                        {t(invoice.status)}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right relative z-10">
                      <div className="flex justify-end space-x-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="p-2 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        >
                          <FileText size={18} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={isBulkDeleting}
        title="Delete Multiple Invoices"
        message={`Are you sure you want to delete ${selectedIds.length} invoices? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsBulkDeleting(false)}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel max-w-4xl w-full p-8 shadow-2xl border-white/20 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-8 text-white">{t('create_invoice')}</h2>
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="relative md:col-span-1" ref={clientSearchRef}>
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
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Invoice Number</label>
                  <input
                    type="text"
                    required
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                  />
                </div>
                <div>
                   <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Payment Terms</label>
                   <input
                     type="text"
                     placeholder="e.g. Net 30"
                     value={formData.payment_terms}
                     onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                     className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                   />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Invoice Template</label>
                    <div className="flex flex-wrap gap-4">
                      {['modern', 'classic'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData({...formData, template_id: t})}
                          className={cn(
                            "flex-1 px-4 py-3 rounded-xl border font-bold uppercase tracking-widest text-[10px] transition-all min-w-[80px]",
                            formData.template_id === t 
                              ? "bg-blue-500 border-blue-500 text-white" 
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Date</label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Due Date</label>
                      <input
                        type="date"
                        required
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                      />
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-blue-400 text-xs font-bold hover:text-blue-300 flex items-center space-x-1"
                  >
                    <Plus size={14} />
                    <span>Add Item</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-end bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="col-span-12 md:col-span-6">
                        <label className="block text-[10px] font-bold text-white/20 uppercase mb-1">Description</label>
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <label className="block text-[10px] font-bold text-white/20 uppercase mb-1">Qty</label>
                        <input
                          type="number"
                          required
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <label className="block text-[10px] font-bold text-white/20 uppercase mb-1">Price</label>
                        <input
                          type="number"
                          required
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div className="col-span-12 md:col-span-1 flex justify-end md:justify-center mt-2 md:mt-0 pb-2">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-white/20 hover:text-red-400 transition-colors bg-white/5 md:bg-transparent px-4 py-2 md:p-0 rounded-lg"
                        >
                          <span className="md:hidden mr-2 text-xs font-bold uppercase tracking-wider">Remove Item</span>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end space-y-reverse space-y-3 sm:space-y-0 sm:space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-white/60 hover:text-white transition-colors w-full sm:w-auto text-center"
                >
                  {t('cancel')}
                </button>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="px-6 py-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl font-bold flex justify-center items-center gap-2 w-full sm:w-auto"
                  >
                    <Eye size={20} />
                    <span>{showPreview ? 'Hide Preview' : 'Live Preview'}</span>
                  </button>
                  <button
                    type="submit"
                    className="px-10 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-bold shadow-lg shadow-blue-500/20 w-full sm:w-auto text-center"
                  >
                    {t('save')}
                  </button>
                </div>
              </div>

              {showPreview && (
                <div className="mt-8 border-t border-white/10 pt-8 animate-in slide-in-from-bottom-4 duration-300">
                  <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Printer size={16} />
                    Live Invoice Preview ({formData.template_id})
                  </h3>
                  <div className="overflow-x-auto w-full pb-4">
                    <div className={`text-slate-900 p-8 md:p-12 min-w-[700px] rounded-xl shadow-2xl overflow-hidden min-h-[600px] flex flex-col ${
                      formData.template_id === 'minimal' ? 'bg-white font-sans border-0' :
                      formData.template_id === 'classic' ? 'bg-[#faf9f6] font-serif border-4 border-slate-800' :
                      formData.template_id === 'creative' ? 'bg-gradient-to-br from-purple-50 to-pink-50 font-sans border-l-8 border-purple-500' :
                      formData.template_id === 'corporate' ? 'bg-white font-sans border-t-8 border-blue-900' :
                      'bg-white font-sans border-t-8 border-blue-500' // modern
                    }`}>
                    <div className={`flex justify-between items-start mb-12 ${formData.template_id === 'classic' ? 'border-b-2 border-slate-800 pb-8' : ''}`}>
                      <div>
                        {user?.logo_url ? (
                          <img src={user.logo_url} alt="Logo" className="w-16 h-16 object-contain mb-4" referrerPolicy="no-referrer" />
                        ) : (
                          <h2 className={`text-3xl font-black tracking-tighter mb-2 ${
                            formData.template_id === 'creative' ? 'text-purple-600' : 
                            formData.template_id === 'corporate' ? 'text-blue-900' : 
                            formData.template_id === 'minimal' ? 'text-slate-800' :
                            formData.template_id === 'classic' ? 'text-slate-900' :
                            'text-blue-600'
                          }`}>SmartBiz.</h2>
                        )}
                        <p className="font-bold text-lg">{user?.business_name}</p>
                        <p className="text-sm text-slate-500">{user?.email}</p>
                      </div>
                      <div className="text-right">
                        <h1 className={`text-4xl font-black uppercase tracking-tighter mb-4 ${
                          formData.template_id === 'creative' ? 'text-purple-200' :
                          formData.template_id === 'corporate' ? 'text-blue-900 opacity-20' :
                          formData.template_id === 'minimal' ? 'text-slate-200' :
                          formData.template_id === 'classic' ? 'text-slate-800' :
                          'text-slate-200'
                        }`}>Invoice</h1>
                        <p className="text-sm font-mono text-blue-600">{formData.invoice_number}</p>
                        <p className="text-xs text-slate-400 mt-1">{formData.date}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-12">
                      <div>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">Bill To</p>
                        <p className="font-bold text-lg">{clients.find(c => c.id.toString() === formData.client_id)?.name || 'Client Name'}</p>
                        <p className="text-sm text-slate-500">{clients.find(c => c.id.toString() === formData.client_id)?.email || 'client@example.com'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">Due Date</p>
                        <p className="font-bold">{formData.due_date}</p>
                        <p className="text-xs text-slate-400 mt-4">Terms</p>
                        <p className="text-sm text-slate-500">{formData.payment_terms || 'None'}</p>
                      </div>
                    </div>

                    <div className="flex-1">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b-2 border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <th className="py-4 font-bold">Description</th>
                            <th className="py-4 text-center">Qty</th>
                            <th className="py-4 text-right">Price</th>
                            <th className="py-4 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {formData.items.map((item, i) => {
                            const total = item.quantity * item.unit_price;
                            return (
                              <tr key={i}>
                                <td className="py-4 text-sm font-medium">{item.description || 'Item description'}</td>
                                <td className="py-4 text-center text-sm text-slate-500">{item.quantity}</td>
                                <td className="py-4 text-right text-sm text-slate-500">{formatCurrency(item.unit_price, user?.currency)}</td>
                                <td className="py-4 text-right text-sm font-bold">{formatCurrency(total, user?.currency)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-12 flex justify-end">
                      <div className="w-full max-w-xs space-y-3">
                        <div className="flex justify-between text-sm text-slate-400">
                          <span>Subtotal</span>
                          <span className="text-slate-900 font-medium">
                            {formatCurrency(formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0), user?.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-400">
                          <span>Tax ({formData.tax_rate}%)</span>
                          <span className="text-slate-900 font-medium">
                            {formatCurrency(formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) * (formData.tax_rate / 100), user?.currency)}
                          </span>
                        </div>
                        <div className={`flex justify-between text-2xl font-black pt-4 border-t-2 ${formData.template_id === 'classic' ? 'border-slate-800' : 'border-slate-100'}`}>
                          <span>Total</span>
                          <span className={`${
                            formData.template_id === 'creative' ? 'text-purple-600' :
                            formData.template_id === 'corporate' ? 'text-blue-900' :
                            formData.template_id === 'minimal' ? 'text-slate-800' :
                            formData.template_id === 'classic' ? 'text-slate-900' :
                            'text-blue-600'
                          }`}>
                            {formatCurrency(
                              formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) * (1 + formData.tax_rate / 100), 
                              user?.currency
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
