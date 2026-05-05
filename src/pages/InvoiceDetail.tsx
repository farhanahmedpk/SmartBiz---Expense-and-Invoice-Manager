import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Download, 
  ArrowLeft, 
  CheckCircle, 
  XCircle,
  Printer,
  Mail,
  Calendar,
  User,
  Hash,
  Trash2,
  MessageSquare,
  Send,
  Clock
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useLocalization } from '../lib/localization';
import { useAuth } from '../lib/auth';
import { cn, formatCurrency } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ConfirmModal from '../components/ConfirmModal';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { t } = useLocalization();
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      apiFetch(`/invoices/${id}`),
      apiFetch(`/invoices/${id}/comments`)
    ]).then(([invoiceData, commentsData]) => {
      setInvoice(invoiceData);
      setComments(commentsData);
    }).finally(() => setIsLoading(false));
  }, [id]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSendingComment(true);
    try {
      const data = await apiFetch(`/invoices/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment }),
      });
      setComments([...comments, { 
        id: data.id, 
        content: newComment, 
        sender_role: user?.role, 
        created_at: data.created_at 
      }]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to send comment', err);
    } finally {
      setIsSendingComment(false);
    }
  };

  const updateStatus = async (status: string) => {
    await apiFetch(`/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setInvoice({ ...invoice, status });
  };

  const handleDelete = async () => {
    await apiFetch(`/invoices/${id}`, { method: 'DELETE' });
    navigate('/invoices');
  };

  const downloadPDF = () => {
    const doc = new jsPDF() as any;
    const template = invoice.template_id || 'modern';
    const accentColor: [number, number, number] = 
      template === 'classic' ? [80, 80, 80] : 
      (template === 'minimal' ? [0, 0, 0] : 
      (template === 'creative' ? [219, 39, 119] : 
      (template === 'corporate' ? [30, 58, 138] : [59, 130, 246])));
    
    // Backgrounds
    if (template === 'modern') {
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, 'F');
    } else if (template === 'corporate') {
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 0, 210, 10, 'F');
      doc.rect(0, 287, 210, 10, 'F');
    } else if (template === 'creative') {
      doc.setFillColor(252, 231, 243);
      doc.rect(0, 0, 70, 297, 'F');
    }

    const startX = template === 'creative' ? 80 : 20;

    // Header
    doc.setFontSize(template === 'modern' ? 24 : 18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    
    if (template === 'modern') {
      doc.text('SmartBiz.', startX, 25);
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('PROFESSIONAL INVOICE', startX, 31);
    } else if (template === 'creative') {
      doc.text(user?.business_name || 'INVOICE', 80, 25);
      doc.setFontSize(10);
      doc.text('CREATIVE SERVICES', 80, 31);
    } else {
      doc.text('INVOICE', startX, 25);
    }
    
    // Business Info
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    if (template === 'creative') {
      doc.text('FROM:', 20, 60);
      doc.setFont(undefined, 'normal');
      doc.text(user?.business_name || '', 20, 66);
      doc.text(user?.email || '', 20, 72);
    } else {
      doc.text(user?.business_name || '', startX, 45);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(user?.email || '', startX, 51);
    }
    
    // Client Info
    const clientX = template === 'creative' ? 20 : 130;
    const clientY = template === 'creative' ? 90 : 45;

    doc.setFont(undefined, 'bold');
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text('BILL TO:', clientX, clientY);
    doc.setTextColor(0, 0, 0);
    doc.text(invoice.client_name, clientX, clientY + 6);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(invoice.client_email, clientX, clientY + 12);
    
    // Table
    const tableData = invoice.items.map((item: any) => [
      item.description,
      item.quantity,
      formatCurrency(item.unit_price, user?.currency),
      formatCurrency(item.total, user?.currency)
    ]);
    
    autoTable(doc, {
      startY: 105,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: accentColor },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Totals
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${formatCurrency(invoice.total_amount, user?.currency)}`, 190, finalY, { align: 'right' });
    
    doc.save(`${invoice.invoice_number}.pdf`);
  };

  if (isLoading) return <div>Loading...</div>;
  if (!invoice) return <div>Invoice not found</div>;

  return (
    <div className={cn("space-y-8", user?.role === 'client' && "max-w-7xl mx-auto px-4 py-12")}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate(user?.role === 'client' ? '/client/dashboard' : '/invoices')}
          className="flex items-center space-x-2 text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to {user?.role === 'client' ? 'Portal' : 'Invoices'}</span>
        </button>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          {user?.role !== 'client' && (
            <>
              {invoice.status === 'unpaid' ? (
                <button
                  onClick={() => updateStatus('paid')}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-green-500 text-white px-6 py-2 rounded-xl hover:bg-green-600 transition-all font-bold shadow-lg shadow-green-500/20"
                >
                  <CheckCircle size={20} />
                  <span>Mark as Paid</span>
                </button>
              ) : (
                <button
                  onClick={() => updateStatus('unpaid')}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-[var(--glass)] border border-[var(--glass-border)] text-[var(--text-dim)] px-6 py-2 rounded-xl hover:bg-[var(--glass)] brightness-110 transition-all font-bold"
                >
                  <XCircle size={20} />
                  <span>Mark as Unpaid</span>
                </button>
              )}
            </>
          )}
          <button
            onClick={downloadPDF}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-blue-500 text-white px-6 py-2 rounded-xl hover:bg-blue-600 transition-all font-bold shadow-lg shadow-blue-500/20"
          >
            <Download size={20} />
            <span>{t('download_pdf')}</span>
          </button>
          {user?.role !== 'client' && (
            <button
              onClick={() => setIsDeleting(true)}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-red-500/10 text-[var(--error-text)] border border-red-500/20 px-6 py-2 rounded-xl hover:bg-red-500/20 transition-all font-bold"
            >
              <Trash2 size={20} />
              <span>{t('delete')}</span>
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleting}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setIsDeleting(false)}
      />

      <div className="glass-panel p-6 sm:p-10 shadow-2xl border-[var(--glass-border)]">
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-[var(--glass-border)] pb-10 mb-10 gap-6">
          <div className="flex items-center gap-6">
            {user?.logo_url ? (
              <img src={user.logo_url} alt="Logo" className="w-20 h-20 rounded-2xl object-cover border border-[var(--glass-border)]" referrerPolicy="no-referrer" />
            ) : (
              <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tighter">SmartBiz.</h2>
            )}
            <div className="text-[var(--text-dim)]">
              <p className="font-bold text-[var(--text-main)] text-xl">{user?.business_name}</p>
              <p className="text-sm">{user?.email}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <h1 className="text-4xl sm:text-5xl font-black text-[var(--text-dim)] opacity-30 mb-2 uppercase tracking-tighter">Invoice</h1>
            <div className={cn(
              "inline-flex items-center px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
              invoice.status === 'paid' ? 'bg-green-500/20 text-[var(--success-text)]' : 'bg-red-500/20 text-[var(--error-text)]'
            )}>
              {invoice.status}
            </div>
            <div className="inline-flex items-center px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[var(--glass)] text-[var(--text-dim)] opacity-70 ml-2">
              {invoice.template_id || 'modern'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 mb-12">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-[var(--text-dim)] opacity-50 uppercase tracking-widest mb-4">Bill To</h3>
              <div className="text-[var(--text-main)]">
                <p className="text-2xl font-bold">{invoice.client_name}</p>
                <p className="text-[var(--text-dim)] mt-1">{invoice.client_email}</p>
                <p className="text-[var(--text-dim)] mt-4 leading-relaxed whitespace-pre-line">{invoice.client_address}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 text-left md:text-right">
            <div className="col-span-2">
              <h3 className="text-xs font-bold text-[var(--text-dim)] opacity-50 uppercase tracking-widest mb-2">Invoice Number</h3>
              <p className="text-[var(--accent)] font-mono text-xl">{invoice.invoice_number}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--text-dim)] opacity-50 uppercase tracking-widest mb-1">Date</h3>
              <p className="text-[var(--text-main)] font-medium">{invoice.date}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--text-dim)] opacity-50 uppercase tracking-widest mb-1">Due Date</h3>
              <p className="text-[var(--text-main)] font-medium">{invoice.due_date}</p>
            </div>
          </div>
        </div>

        <div className="mb-12 overflow-x-auto pb-4">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-[var(--glass-border)] text-xs font-bold text-[var(--text-dim)] opacity-50 uppercase tracking-widest">
                <th className="px-4 py-6">Description</th>
                <th className="px-4 py-6 text-center">Qty</th>
                <th className="px-4 py-6 text-right">Unit Price</th>
                <th className="px-4 py-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--glass-border)]">
              {invoice.items.map((item: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--glass)] transition-colors">
                  <td className="px-4 py-6 text-[var(--text-main)] font-medium">{item.description}</td>
                  <td className="px-4 py-6 text-center text-[var(--text-dim)]">{item.quantity}</td>
                  <td className="px-4 py-6 text-right text-[var(--text-dim)]">{formatCurrency(item.unit_price, user?.currency)}</td>
                  <td className="px-4 py-6 text-right text-[var(--text-main)] font-bold">{formatCurrency(item.total, user?.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col-reverse md:flex-row justify-between items-start gap-8">
           <div className="w-full md:max-w-xs space-y-4">
             {invoice.payment_terms && (
               <div className="bg-[var(--glass)] p-6 sm:p-8 rounded-3xl border border-[var(--glass-border)]">
                 <h3 className="text-xs font-bold text-[var(--text-dim)] opacity-50 uppercase tracking-widest mb-2">Payment Terms</h3>
                 <p className="text-[var(--text-dim)] text-sm whitespace-pre-line">{invoice.payment_terms}</p>
               </div>
             )}
           </div>
           <div className="w-full md:max-w-xs space-y-4 bg-[var(--glass)] p-6 sm:p-8 rounded-3xl border border-[var(--glass-border)] ml-auto mr-0">
            <div className="flex justify-between text-[var(--text-dim)] opacity-70 text-sm">
              <span>Subtotal</span>
              <span className="text-[var(--text-main)]">{formatCurrency(invoice.items.reduce((sum: number, item: any) => sum + item.total, 0), user?.currency)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-dim)] opacity-70 text-sm">
              <span>Tax ({invoice.tax_rate}%)</span>
              <span className="text-[var(--text-main)]">{formatCurrency(invoice.items.reduce((sum: number, item: any) => sum + item.total, 0) * (invoice.tax_rate / 100), user?.currency)}</span>
            </div>
            <div className="flex justify-between text-2xl sm:text-3xl font-black text-[var(--text-main)] pt-4 border-t border-[var(--glass-border)]">
              <span>Total</span>
              <span className="text-[var(--accent)]">{formatCurrency(invoice.total_amount, user?.currency)}</span>
            </div>
          </div>
        </div>

        <div className="mt-12 sm:mt-20 pt-10 border-t border-[var(--glass-border)] text-center">
          <p className="text-[var(--text-dim)] opacity-50 text-xs font-bold uppercase tracking-widest">Thank you for your business!</p>
        </div>
      </div>

      {/* Messaging Section */}
      <div className="glass-panel p-8 shadow-xl border-[var(--glass-border)]">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-2 bg-blue-500/20 text-[var(--accent)] rounded-lg">
            <MessageSquare size={20} />
          </div>
          <h2 className="text-xl font-bold">Discussion</h2>
        </div>

        <div className="space-y-6 mb-8 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {comments.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-dim)] opacity-50">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-10" />
              <p>No messages yet regarding this invoice.</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div 
                key={comment.id} 
                className={cn(
                  "flex flex-col max-w-[80%]",
                  (user?.role === comment.sender_role) ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm",
                  (user?.role === comment.sender_role) 
                    ? "bg-blue-500 text-white rounded-tr-none" 
                    : "bg-[var(--glass)] border border-[var(--glass-border)] text-[var(--text-main)] rounded-tl-none"
                )}>
                  {comment.content}
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--text-dim)] opacity-50 uppercase font-black tracking-widest">
                  <span>{comment.sender_role === 'client' ? 'Client' : 'Business'}</span>
                  <span>•</span>
                  <span>{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendComment} className="relative">
          <input
            type="text"
            placeholder="Type your message..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full pl-6 pr-16 py-4 bg-[var(--glass)] border border-[var(--glass-border)] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-[var(--text-main)] placeholder:text-[var(--text-dim)] opacity-50"
          />
          <button
            type="submit"
            disabled={isSendingComment || !newComment.trim()}
            className="absolute right-2 top-2 p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50"
          >
            {isSendingComment ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
