# SmartBiz - Modern Invoicing & Business Management Platform

SmartBiz is a comprehensive, full-stack financial and client management platform designed for freelancers, agencies, and small businesses. It streamlines the entire billing lifecycle—from client creation and invoice generation to expense tracking and payment collection—through a polished, intuitive interface.

## 🚀 Features

- **📊 Comprehensive Dashboard**: Get a bird's-eye view of your business health with real-time metrics on total revenue, outstanding balances, and monthly expenses.
- **🧾 Advanced Invoicing**: Create, edit, and manage professional invoices. Track statuses seamlessly (Draft, Sent, Paid, Overdue) with beautiful UI indicators.
- **🔄 Recurring Invoices**: Automate your billing cycle. Set up subscription-style invoices that generate on a schedule, saving you manual data entry.
- **👥 Client Management**: Maintain a detailed directory of your clients, their contact information, and their complete billing history.
- **💸 Expense Tracking**: Keep your business finances in check. Log, categorize, and monitor your business expenses to accurately calculate your net profit.
- **🔒 Dual Portal Architecture**:
  - **Admin Portal**: Full control over your business metrics, settings, clients, and financial data.
  - **Client Portal**: A dedicated, secure login for your clients where they can view, download, and pay their outstanding invoices smoothly.

## 💻 Tech Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (Utility-first framework for rapid UI development)
- **Icons**: Lucide React
- **Routing**: React Router (implied via page structure)

## 📁 Project Structure

```text
/src
  /pages
    ├── AdminDashboard.tsx      # High-level overview and metrics for admins
    ├── AdminLogin.tsx          # Secure entry point for business owners
    ├── ClientLogin.tsx         # Secure entry point for clients
    ├── ClientPortal.tsx        # Dashboard for clients to view their invoices
    ├── Clients.tsx             # Client directory and management CRM
    ├── Dashboard.tsx           # Main application dashboard
    ├── Expenses.tsx            # Expense logging and categorization
    ├── InvoiceDetail.tsx       # Detailed view for individual invoices
    ├── Invoices.tsx            # Invoice list and generation
    ├── RecurringInvoices.tsx   # Automated billing setup
    ├── Settings.tsx            # App configuration (Currency, Company Details)
    └── Signup.tsx              # New user registration
  /lib
    ├── api.ts                  # Backend API integration and state management
    ├── auth.tsx                # Authentication context and guards
    ├── localization.tsx        # Multi-language / currency formatting
    └── utils.ts                # Shared helper functions
```

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd smartbiz
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the local URL provided by Vite (usually `http://localhost:3000` or `http://localhost:5173`).

### Building for Production

To create a production-ready build:

```bash
npm run build
```

The compiled assets will be available in the `dist` directory.

## 🛡️ Security & Environment

SmartBiz utilizes robust authentication flows to ensure data privacy. Make sure to define your required runtime variables (like database URIs or JWT secrets) in a local `.env` file before deploying. Check `.env.example` for the required keys.

---
*Built with modern web standards for speed, security, and scalability.*
