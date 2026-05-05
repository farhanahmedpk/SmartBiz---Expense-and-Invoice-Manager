import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'ur' | 'es';

interface LocalizationContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    expenses: 'Expenses',
    clients: 'Clients',
    invoices: 'Invoices',
    settings: 'Settings',
    logout: 'Logout',
    total_income: 'Total Income',
    total_expenses: 'Total Expenses',
    net_profit: 'Net Profit',
    pending_payments: 'Pending Payments',
    recent_transactions: 'Recent Transactions',
    add_expense: 'Add Expense',
    add_client: 'Add Client',
    create_invoice: 'Create Invoice',
    business_name: 'Business Name',
    email: 'Email',
    password: 'Password',
    login: 'Login',
    signup: 'Sign Up',
    currency: 'Currency',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    paid: 'Paid',
    unpaid: 'Unpaid',
    status: 'Status',
    amount: 'Amount',
    date: 'Date',
    category: 'Category',
    description: 'Description',
    quantity: 'Quantity',
    price: 'Price',
    total: 'Total',
    tax: 'Tax',
    due_date: 'Due Date',
    invoice_number: 'Invoice #',
    download_pdf: 'Download PDF',
    recurring: 'Recurring',
  },
  es: {
    dashboard: 'Tablero',
    expenses: 'Gastos',
    clients: 'Clientes',
    invoices: 'Facturas',
    settings: 'Ajustes',
    logout: 'Cerrar sesión',
    total_income: 'Ingresos totales',
    total_expenses: 'Gastos totales',
    net_profit: 'Beneficio neto',
    pending_payments: 'Pagos pendientes',
    recent_transactions: 'Transacciones recientes',
    add_expense: 'Agregar gasto',
    add_client: 'Agregar cliente',
    create_invoice: 'Crear factura',
    business_name: 'Nombre de la empresa',
    email: 'Correo electrónico',
    password: 'Contraseña',
    login: 'Iniciar sesión',
    signup: 'Registrarse',
    currency: 'Moneda',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    paid: 'Pagado',
    unpaid: 'No pagado',
    status: 'Estado',
    amount: 'Cantidad',
    date: 'Fecha',
    category: 'Categoría',
    description: 'Descripción',
    quantity: 'Cantidad',
    price: 'Precio',
    total: 'Total',
    tax: 'Impuesto',
    due_date: 'Fecha de vencimiento',
    invoice_number: 'Factura #',
    download_pdf: 'Descargar PDF',
    recurring: 'Recurrente',
  },
  ur: {
    dashboard: 'ڈیش بورڈ',
    expenses: 'اخراجات',
    clients: 'کلائنٹس',
    invoices: 'انوائسز',
    settings: 'ترتیبات',
    logout: 'لاگ آؤٹ',
    total_income: 'کل آمدنی',
    total_expenses: 'کل اخراجات',
    net_profit: 'خالص منافع',
    pending_payments: 'زیر التواء ادائیگیاں',
    recent_transactions: 'حالیہ لین دین',
    add_expense: 'خرچہ شامل کریں',
    add_client: 'کلائنٹ شامل کریں',
    create_invoice: 'انوائس بنائیں',
    business_name: 'کاروبار کا نام',
    email: 'ای میل',
    password: 'پاس ورڈ',
    login: 'لاگ ان',
    signup: 'سائن اپ',
    currency: 'کرنسی',
    save: 'محفوظ کریں',
    cancel: 'منسوخ کریں',
    delete: 'حذف کریں',
    edit: 'ترمیم کریں',
    paid: 'ادا شدہ',
    unpaid: 'غیر ادا شدہ',
    status: 'حیثیت',
    amount: 'رقم',
    date: 'تاریخ',
    category: 'زمرہ',
    description: 'تفصیل',
    quantity: 'مقدار',
    price: 'قیمت',
    total: 'کل',
    tax: 'ٹیکس',
    due_date: 'آخری تاریخ',
    invoice_number: 'انوائس نمبر',
    download_pdf: 'پی ڈی ایف ڈاؤن لوڈ کریں',
    recurring: 'بار بار ہونے والا',
  }
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en');

  const t = (key: string) => {
    return translations[lang][key] || key;
  };

  return (
    <LocalizationContext.Provider value={{ lang, setLang, t }}>
      <div dir={lang === 'ur' ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}
