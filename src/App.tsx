/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { LocalizationProvider } from './lib/localization';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Clients from './pages/Clients';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import RecurringInvoices from './pages/RecurringInvoices';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import ClientPortal from './pages/ClientPortal';
import ClientLogin from './pages/ClientLogin';
import AdminLogin from './pages/AdminLogin';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { useAuth } from './lib/auth';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.role !== 'admin') return <Navigate to="/admin/login" />;
  return <>{children}</>;
}


function ClientRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.role !== 'client') return <Navigate to="/portal/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <LocalizationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/portal/login" element={<ClientLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="clients" element={<Clients />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route path="recurring" element={<RecurringInvoices />} />
              <Route path="settings" element={<Settings />} />
              <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            </Route>
            <Route path="/client/dashboard" element={<ClientRoute><ClientPortal /></ClientRoute>} />
            <Route path="/invoice/:id" element={<InvoiceDetail />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </LocalizationProvider>
    </AuthProvider>
  );
}

