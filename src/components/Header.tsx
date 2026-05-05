import { useState, useEffect, useRef } from 'react';
import { Search, User, FileText, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCurrency } from '../lib/utils';

export default function Header() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ clients: any[], invoices: any[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await apiFetch(`/search?q=${encodeURIComponent(query)}`);
        setResults(data);
        setShowResults(true);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <header className="hidden lg:flex fixed top-0 left-64 right-0 h-20 items-center justify-between px-10 z-30 pointer-events-none">
      <div ref={searchRef} className="relative w-full max-w-md pointer-events-auto">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-accent transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search clients, invoices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setShowResults(true)}
            className="w-full pl-12 pr-10 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:bg-white/10 transition-all text-sm placeholder:text-white/20"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="animate-spin text-accent" size={16} />
            </div>
          )}
        </div>

        {showResults && results && (query.length >= 2) && (
          <div className="absolute mt-3 w-full bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-h-[70vh] overflow-y-auto p-2 space-y-1">
              {results.clients.length === 0 && results.invoices.length === 0 && (
                <div className="p-8 text-center text-text-dim text-sm">
                  No matching results found
                </div>
              )}

              {results.clients.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">Clients</div>
                  {results.clients.map(client => (
                    <Link
                      key={client.id}
                      to="/clients"
                      onClick={() => setShowResults(false)}
                      className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                        <User size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{client.name}</div>
                        <div className="text-[10px] text-text-dim">{client.email}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {results.invoices.length > 0 && (
                <div className="mt-2">
                  <div className="px-3 py-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">Invoices</div>
                  {results.invoices.map(invoice => (
                    <Link
                      key={invoice.id}
                      to={`/invoices/${invoice.id}`}
                      onClick={() => setShowResults(false)}
                      className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                          <FileText size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{invoice.invoice_number}</div>
                          <div className="text-[10px] text-text-dim">{invoice.client_name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">{formatCurrency(invoice.total_amount, user?.currency)}</div>
                        <div className={`text-[10px] font-bold uppercase tracking-widest ${invoice.status === 'paid' ? 'text-green-400' : 'text-orange-400'}`}>
                          {invoice.status}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 pointer-events-auto bg-slate-900/50 px-6 py-2 rounded-full border border-white/5 backdrop-blur-md">
        <div className="text-right">
           <div className="text-sm font-bold text-white">{user?.business_name}</div>
           <div className="text-[10px] text-text-dim uppercase tracking-widest leading-none">{user?.role}</div>
        </div>
        {user?.logo_url ? (
          <img src={user.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-accent/20">
            {user?.business_name?.charAt(0) || '?'}
          </div>
        )}
      </div>
    </header>
  );
}
