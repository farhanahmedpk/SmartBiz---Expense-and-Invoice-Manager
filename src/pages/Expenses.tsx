import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Filter, Search, Tag, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useLocalization } from '../lib/localization';
import { useAuth } from '../lib/auth';
import { formatCurrency } from '../lib/utils';
import ConfirmModal from '../components/ConfirmModal';

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterTag, setFilterTag] = useState('');
  const [formData, setFormData] = useState({ 
    title: '', 
    amount: 0 as number | string, 
    category: 'General', 
    date: new Date().toISOString().split('T')[0],
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const { t } = useLocalization();
  const { user } = useAuth();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [expensesData, categoriesData] = await Promise.all([
        apiFetch('/expenses'),
        apiFetch('/expense-categories')
      ]);
      setExpenses(expensesData);
      setCategories(categoriesData);
      if (categoriesData.length > 0) {
        setFormData(prev => ({ ...prev, category: categoriesData[0].name }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExpenses = async () => {
    const data = await apiFetch('/expenses');
    setExpenses(data);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const resp = await apiFetch('/expense-categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName })
      });
      setCategories([...categories, resp]);
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      setFormData({ ...formData, category: resp.name });
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/expenses', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    setIsModalOpen(false);
    setFormData({ 
      title: '', 
      amount: '', 
      category: categories[0]?.name || 'General', 
      date: new Date().toISOString().split('T')[0],
      tags: []
    });
    fetchExpenses();
  };

  const handleDelete = async () => {
    if (confirmDelete) {
      await apiFetch(`/expenses/${confirmDelete}`, { method: 'DELETE' });
      setConfirmDelete(null);
      fetchExpenses();
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expense.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || expense.category === filterCategory;
    const matchesTag = !filterTag || expense.tags?.includes(filterTag);
    return matchesSearch && matchesCategory && matchesTag;
  });

  const allTags = Array.from(new Set(expenses.flatMap(e => e.tags || [])));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('expenses')}</h1>
          <p className="text-white/60">Track and manage your business spending</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="w-full sm:w-auto px-6 py-2 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-all text-sm font-bold flex items-center justify-center"
          >
            Manage Categories
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-blue-500 text-white px-6 py-2 rounded-xl flex items-center justify-center space-x-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 font-bold"
          >
            <Plus size={20} />
            <span>{t('add_expense')}</span>
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/10 flex flex-col lg:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-white/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <Filter size={16} className="text-white/40" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent text-white/80 outline-none text-sm cursor-pointer"
              >
                <option value="All" className="bg-slate-900">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.name} className="bg-slate-900">{c.name}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <Tag size={16} className="text-white/40" />
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="bg-transparent text-white/80 outline-none text-sm cursor-pointer"
              >
                <option value="" className="bg-slate-900">All Tags</option>
                {allTags.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-white/5 text-white/40 text-xs uppercase font-bold tracking-widest">
              <tr>
                <th className="px-4 md:px-6 py-4">{t('date')}</th>
                <th className="px-4 md:px-6 py-4">{t('description')}</th>
                <th className="px-4 md:px-6 py-4">{t('category')}</th>
                <th className="px-4 md:px-6 py-4">Tags</th>
                <th className="px-4 md:px-6 py-4 text-right">{t('amount')}</th>
                <th className="px-4 md:px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 md:px-6 py-8 text-center text-white/40">Loading...</td></tr>
              ) : filteredExpenses.length === 0 ? (
                <tr><td colSpan={6} className="px-4 md:px-6 py-8 text-center text-white/40">No expenses found</td></tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-white/5 transition-colors group relative">
                    <td className="px-4 md:px-6 py-4 text-white/60 text-sm whitespace-nowrap">{expense.date}</td>
                    <td className="px-4 md:px-6 py-4 font-medium text-white">{expense.title}</td>
                    <td className="px-4 md:px-6 py-4">
                      <span className="px-3 py-1 bg-white/10 text-white/80 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {expense.tags?.map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded border border-blue-500/20">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right font-bold text-white whitespace-nowrap">
                      {formatCurrency(Number(expense.amount), user?.currency)}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right relative z-10">
                      <button
                        onClick={() => setConfirmDelete(expense.id)}
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
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-panel max-w-md w-full p-8 shadow-2xl border-white/20">
            <h2 className="text-2xl font-bold mb-6 text-white">{t('add_expense')}</h2>
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Amount</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white appearance-none"
                  >
                    {categories.map(c => <option key={c.id} value={c.name} className="bg-slate-900">{c.name}</option>)}
                  </select>
                </div>
              </div>
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
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Press enter to add"
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="bg-white/10 text-white px-4 rounded-xl hover:bg-white/20 transition-all font-bold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-bold">
                      {tag}
                      <button onClick={() => removeTag(tag)} type="button"><X size={14} /></button>
                    </span>
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
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-bold shadow-lg shadow-blue-500/20 w-full sm:w-auto text-center"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel max-w-md w-full p-8 shadow-2xl border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Categories</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-white/40 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="space-y-4">
              <form onSubmit={handleCreateCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="New category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl outline-none text-white focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="bg-blue-500 text-white px-4 rounded-xl hover:bg-blue-600 font-bold">Add</button>
              </form>

              <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-white">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
