import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { apiFetch } from '../lib/api';
import { useLocalization } from '../lib/localization';
import { useAuth } from '../lib/auth';
import { formatCurrency } from '../lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLocalization();
  const { user } = useAuth();

  useEffect(() => {
    apiFetch('/stats')
      .then(setStats)
      .finally(() => setIsLoading(false));
  }, []);

  let dashboardConfig = { widgets: ['stats', 'income_chart', 'profit_chart'] };
  try {
    if (user?.dashboard_config) {
      const parsed = JSON.parse(user.dashboard_config);
      if (parsed && typeof parsed === 'object') {
        dashboardConfig = parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse dashboard config", e);
  }

  const showStats = Array.isArray(dashboardConfig.widgets) && dashboardConfig.widgets.includes('stats');
  const showIncomeChart = Array.isArray(dashboardConfig.widgets) && dashboardConfig.widgets.includes('income_chart');
  const showProfitChart = Array.isArray(dashboardConfig.widgets) && dashboardConfig.widgets.includes('profit_chart');

  if (isLoading) return <div>Loading...</div>;

  const cards = [
    { 
      title: t('total_income'), 
      value: stats.totalIncome, 
      icon: TrendingUp, 
      color: 'text-green-600', 
      bg: 'bg-green-50',
      trend: stats.trends?.income || '0%',
      trendUp: (stats.trends?.income || '0').startsWith('+')
    },
    { 
      title: t('total_expenses'), 
      value: stats.totalExpenses, 
      icon: TrendingDown, 
      color: 'text-red-600', 
      bg: 'bg-red-50',
      trend: stats.trends?.expenses || '0%',
      trendUp: !(stats.trends?.expenses || '0').startsWith('+') // Expenses up is bad
    },
    { 
      title: t('net_profit'), 
      value: stats.totalIncome - stats.totalExpenses, 
      icon: DollarSign, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50',
      trend: stats.trends?.profit || '0%',
      trendUp: (stats.trends?.profit || '0').startsWith('+')
    },
    { 
      title: t('pending_payments'), 
      value: stats.pendingIncome, 
      icon: Clock, 
      color: 'text-orange-600', 
      bg: 'bg-orange-50',
      trend: stats.trends?.pending || '0%',
      trendUp: false
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('dashboard')}</h1>
          <p className="text-white/60 text-sm mt-1">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center bg-white/10 px-4 py-2 rounded-full border border-white/20">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold mr-3">
            {user?.business_name?.charAt(0) || '?'}
          </div>
          <span className="text-sm font-medium text-white">{user?.business_name}</span>
        </div>
      </div>

      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => (
            <div key={i} className="glass-panel p-6 group hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-white/10 p-2 rounded-xl group-hover:scale-110 transition-transform">
                  <card.icon className={card.color} size={24} />
                </div>
                <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full bg-white/5 ${card.trendUp ? 'text-green-400' : 'text-red-400'}`}>
                  {card.trend}
                  {card.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                </div>
              </div>
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">{card.title}</h3>
              <p className="text-3xl font-bold text-white mt-2">
                {formatCurrency(card.value, user?.currency)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {showIncomeChart && (
          <div className="glass-panel p-8">
            <h3 className="text-lg font-bold text-white mb-8">Income vs Expenses</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="income" fill="#4A90E2" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expenses" fill="rgba(255,255,255,0.2)" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {showProfitChart && (
          <div className="glass-panel p-8">
            <h3 className="text-lg font-bold text-white mb-8">Profit Growth</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyStats}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4A90E2" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4A90E2" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={(d) => d.income - d.expenses} 
                    stroke="#4A90E2" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                    name="Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
