import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  DollarSign, 
  TrendingDown,
  Trash2,
  ShieldCheck,
  Activity,
  Plus,
  X
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useLocalization } from '../lib/localization';
import ConfirmModal from '../components/ConfirmModal';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', business_name: '', role: 'user' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLocalization();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsData, usersData] = await Promise.all([
        apiFetch('/admin/stats'),
        apiFetch('/admin/users')
      ]);
      setStats(statsData);
      setUsers(usersData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      setShowAddUser(false);
      setNewUser({ email: '', password: '', business_name: '', role: 'user' });
      fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (confirmDelete) {
      await apiFetch(`/admin/users/${confirmDelete}`, { method: 'DELETE' });
      setConfirmDelete(null);
      fetchAdminData();
    }
  };

  if (isLoading) return <div className="text-white text-center py-20">Loading Admin Dashboard...</div>;

  const cards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
    { title: 'Total Invoices', value: stats.totalInvoices, icon: FileText, color: 'text-purple-400' },
    { title: 'Total Revenue', value: stats.totalRevenue.toLocaleString(), icon: DollarSign, color: 'text-green-400' },
    { title: 'Total Expenses', value: stats.totalExpenses.toLocaleString(), icon: TrendingDown, color: 'text-red-400' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="text-blue-500" size={32} />
            Super Admin Dashboard
          </h1>
          <p className="text-white/60 text-sm mt-1">Global platform overview and user management.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center justify-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full border border-blue-500/20 text-xs font-bold uppercase tracking-widest">
            <Activity size={14} />
            System Active
          </div>
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center justify-center gap-2 bg-blue-500 text-white px-6 py-2 rounded-xl hover:bg-blue-600 transition-all font-bold shadow-lg shadow-blue-500/20 w-full sm:w-auto"
          >
            <Plus size={20} />
            <span>Create Access</span>
          </button>
        </div>
      </div>

      {showAddUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md p-8 border-white/10 shadow-2xl relative">
            <button onClick={() => setShowAddUser(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-2">Create User Access</h2>
            <p className="text-white/60 text-sm mb-6">Create a new login for a person to access the app features.</p>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Business Name</label>
                <input
                  type="text"
                  required
                  value={newUser.business_name}
                  onChange={(e) => setNewUser({...newUser, business_name: e.target.value})}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Access Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm appearance-none"
                >
                  <option value="user" className="bg-slate-900">User Panel (Full Access)</option>
                  <option value="admin" className="bg-slate-900">Admin Panel (Platform View)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-50 mt-4"
              >
                {isSubmitting ? 'Creating...' : 'Create Access'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="glass-panel p-6 group hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/10 p-2 rounded-xl">
                <card.icon className={card.color} size={24} />
              </div>
            </div>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">{card.title}</h3>
            <p className="text-3xl font-bold text-white mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">Platform Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-white/40 text-xs uppercase font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Business Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Currency</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{user.business_name}</td>
                  <td className="px-6 py-4 text-white/60">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.role === 'admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/60'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/60">{user.currency}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setConfirmDelete(user.id)}
                      disabled={user.role === 'admin'}
                      className={`p-1 transition-colors ${
                        user.role === 'admin' ? 'text-white/10 cursor-not-allowed' : 'text-white/40 hover:text-red-400'
                      }`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDelete !== null}
        title="Delete User Account"
        message="Are you sure you want to delete this user? This will permanently remove their business data, invoices, and expenses. This action cannot be undone."
        onConfirm={handleDeleteUser}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
