import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import cron from "node-cron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("smartbiz.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    business_name TEXT,
    currency TEXT DEFAULT 'PKR',
    logo_url TEXT,
    theme TEXT DEFAULT 'dark',
    dashboard_config TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    password TEXT,
    portal_enabled INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    amount REAL,
    category TEXT,
    date TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    client_id INTEGER,
    invoice_number TEXT,
    date TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'unpaid',
    tax_rate REAL DEFAULT 0,
    total_amount REAL,
    payment_terms TEXT,
    last_reminder_sent_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER,
    description TEXT,
    quantity INTEGER,
    unit_price REAL,
    total REAL,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id)
  );
  `);

  db.exec(`
  CREATE TABLE IF NOT EXISTS invoice_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER,
    sender_role TEXT, -- 'user' or 'client'
    content TEXT,
    created_at TEXT,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id)
  );
  `);

  // Migrations
  try {
    db.prepare("ALTER TABLE clients ADD COLUMN password TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE clients ADD COLUMN portal_enabled INTEGER DEFAULT 0").run();
  } catch (e) {}

  try {
    db.prepare("ALTER TABLE invoices ADD COLUMN last_reminder_sent_at TEXT").run();
  } catch (e) {
    // Column already exists or other non-critical error
  }

  db.exec(`
  CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    UNIQUE(user_id, name),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS recurring_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    client_id INTEGER,
    frequency TEXT,
    next_date TEXT,
    last_generated_date TEXT,
    tax_rate REAL DEFAULT 0,
    template_id TEXT DEFAULT 'modern',
    status TEXT DEFAULT 'active',
    payment_terms TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS recurring_invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recurring_invoice_id INTEGER,
    description TEXT,
    quantity INTEGER,
    unit_price REAL,
    FOREIGN KEY(recurring_invoice_id) REFERENCES recurring_invoices(id)
  );
`);

// Migration: Add tags to expenses if it doesn't exist
try {
  db.prepare("ALTER TABLE expenses ADD COLUMN tags TEXT").run();
} catch (e) {}

// Migration: Add template_id to invoices if it doesn't exist
try {
  db.prepare("ALTER TABLE invoices ADD COLUMN template_id TEXT DEFAULT 'modern'").run();
} catch (e) {}

// Migration: Add tax_rate to invoices if it doesn't exist
try {
  db.prepare("ALTER TABLE invoices ADD COLUMN tax_rate REAL DEFAULT 0").run();
} catch (e) {}

// Migration: Add tax_rate to recurring_invoices if it doesn't exist
try {
  db.prepare("ALTER TABLE recurring_invoices ADD COLUMN tax_rate REAL DEFAULT 0").run();
} catch (e) {}

// Migration: Add template_id to recurring_invoices if it doesn't exist
try {
  db.prepare("ALTER TABLE recurring_invoices ADD COLUMN template_id TEXT DEFAULT 'modern'").run();
} catch (e) {}

// Migration: Add status to recurring_invoices if it doesn't exist
try {
  db.prepare("ALTER TABLE recurring_invoices ADD COLUMN status TEXT DEFAULT 'active'").run();
} catch (e) {}

// Migration: Add payment_terms to invoices if it doesn't exist
try {
  db.prepare("ALTER TABLE invoices ADD COLUMN payment_terms TEXT").run();
} catch (e) {}

// Migration: Add payment_terms to recurring_invoices if it doesn't exist
try {
  db.prepare("ALTER TABLE recurring_invoices ADD COLUMN payment_terms TEXT").run();
} catch (e) {}

// Migration: Add theme to users if it doesn't exist
try {
  db.prepare("ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'dark'").run();
} catch (e) {}

// Migration: Add dashboard_config to users if it doesn't exist
try {
  db.prepare("ALTER TABLE users ADD COLUMN dashboard_config TEXT").run();
} catch (e) {}

// Migration: Ensure owner is admin
try {
  db.prepare("UPDATE users SET role = 'admin' WHERE email = 'farhanahmed10007@gmail.com'").run();
} catch (e) {}

// Seed default categories for new users
const seedCategories = (userId: number) => {
  const defaults = ["Rent", "Travel", "Utilities", "Marketing", "Software", "Equipment", "Supplies", "Other"];
  const stmt = db.prepare("INSERT OR IGNORE INTO expense_categories (user_id, name) VALUES (?, ?)");
  defaults.forEach(cat => stmt.run(userId, cat));
};

const JWT_SECRET = process.env.JWT_SECRET || "smartbiz-secret-key-123";
const JWT_EXPIRES_IN = "24h";

// Validation Schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  business_name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const clientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().optional(),
});

const expenseSchema = z.object({
  title: z.string().min(2),
  amount: z.number().positive(),
  category: z.string(),
  date: z.string(),
  tags: z.array(z.string()).optional(),
});

const invoiceSchema = z.object({
  client_id: z.union([z.number(), z.string()]),
  invoice_number: z.string(),
  date: z.string(),
  due_date: z.string(),
  tax_rate: z.number().min(0),
  template_id: z.string().optional(),
  payment_terms: z.string().optional(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
  })).min(1),
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust the first proxy (AI Studio infrastructure)
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for local dev if needed, or configure properly
  }));
  app.use(cors());
  app.use(express.json());

  const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // 10 requests per 15 mins for auth routes
    message: { error: "Too many attempts, please try again later" },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Invalid or expired token" });
      req.user = user;
      next();
    });
  };

  const authenticateClient = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, client: any) => {
      if (err || client.role !== 'client') return res.status(403).json({ error: "Invalid or expired token" });
      req.client = client;
      next();
    });
  };

  // --- API Routes ---

  // Auth
  app.post("/api/auth/signup", authRateLimit, async (req, res) => {
    try {
      const { email, password, business_name } = signupSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const userCount: any = db.prepare("SELECT COUNT(*) as count FROM users").get();
      const role = userCount.count === 0 ? 'admin' : 'user';

      const result = db.prepare("INSERT INTO users (email, password, business_name, role) VALUES (?, ?, ?, ?)").run(email, hashedPassword, business_name, role);
      seedCategories(result.lastInsertRowid as number);
      
      const token = jwt.sign({ id: result.lastInsertRowid, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      res.json({ token, user: { id: result.lastInsertRowid, email, business_name, role } });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues.map(i => i.message).join(", ") });
      res.status(400).json({ error: "User already exists or invalid data" });
    }
  });

  app.post("/api/auth/login", authRateLimit, async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      
      if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({ token, user: { id: user.id, email, business_name: user.business_name, currency: user.currency, role: user.role } });
      } else {
        res.status(401).json({ error: "Invalid email or password" });
      }
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues.map(i => i.message).join(", ") });
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.post("/api/auth/client/login", authRateLimit, async (req, res) => {
    try {
      const { email, password } = req.body;
      const client: any = db.prepare("SELECT c.*, u.business_name, u.currency FROM clients c JOIN users u ON c.user_id = u.id WHERE c.email = ? AND c.portal_enabled = 1").get(email);
      
      if (client && client.password && await bcrypt.compare(password, client.password)) {
        const token = jwt.sign({ id: client.id, email, role: 'client', user_id: client.user_id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({ 
          token, 
          client: { 
            id: client.id, 
            email, 
            name: client.name, 
            business_name: client.business_name, 
            currency: client.currency 
          } 
        });
      } else {
        res.status(401).json({ error: "Invalid credentials or portal access disabled" });
      }
    } catch (e) {
      res.status(400).json({ error: "Invalid login data" });
    }
  });

  // Client Portal Data
  app.get("/api/client/invoices", authenticateClient, (req: any, res) => {
    const invoices = db.prepare(`
      SELECT i.*, u.business_name as business_name, u.email as business_email
      FROM invoices i
      JOIN users u ON i.user_id = u.id
      WHERE i.client_id = ?
      ORDER BY i.date DESC
    `).all(req.client.id);

    const invoicesWithItems = invoices.map((inv: any) => {
      const items = db.prepare("SELECT * FROM invoice_items WHERE invoice_id = ?").all(inv.id);
      return { ...inv, items };
    });

    res.json(invoicesWithItems);
  });

  app.patch("/api/client/profile", authenticateClient, (req: any, res) => {
    try {
      const { name, phone, address } = req.body;
      db.prepare("UPDATE clients SET name = ?, phone = ?, address = ? WHERE id = ?").run(name, phone, address, req.client.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to update profile" });
    }
  });

  app.get("/api/client/profile", authenticateClient, (req: any, res) => {
    const client = db.prepare("SELECT id, name, email, phone, address FROM clients WHERE id = ?").get(req.client.id);
    res.json(client);
  });

  app.get("/api/invoices/:id/comments", (req: any, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, payload: any) => {
      if (err) return res.status(403).json({ error: "Invalid token" });

      // Verify access to invoice
      let invoice: any;
      if (payload.role === 'client') {
        invoice = db.prepare("SELECT id FROM invoices WHERE id = ? AND client_id = ?").get(req.params.id, payload.id);
      } else {
        invoice = db.prepare("SELECT id FROM invoices WHERE id = ? AND user_id = ?").get(req.params.id, payload.id);
      }

      if (!invoice) return res.status(404).json({ error: "Invoice not found or unauthorized" });

      const comments = db.prepare("SELECT * FROM invoice_comments WHERE invoice_id = ? ORDER BY created_at ASC").all(req.params.id);
      res.json(comments);
    });
  });

  app.post("/api/invoices/:id/comments", (req: any, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, payload: any) => {
      if (err) return res.status(403).json({ error: "Invalid token" });

      const { content } = req.body;
      if (!content) return res.status(400).json({ error: "Content is required" });

      // Verify access to invoice
      let invoice: any;
      if (payload.role === 'client') {
        invoice = db.prepare("SELECT id FROM invoices WHERE id = ? AND client_id = ?").get(req.params.id, payload.id);
      } else {
        invoice = db.prepare("SELECT id FROM invoices WHERE id = ? AND user_id = ?").get(req.params.id, payload.id);
      }

      if (!invoice) return res.status(404).json({ error: "Invoice not found or unauthorized" });

      const result = db.prepare("INSERT INTO invoice_comments (invoice_id, sender_role, content, created_at) VALUES (?, ?, ?, ?)")
        .run(req.params.id, payload.role, content, new Date().toISOString());
      
      res.json({ id: result.lastInsertRowid, created_at: new Date().toISOString() });
    });
  });

  // Admin Middleware
  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: "Admin access required" });
    }
  };

  // Admin Routes
  app.get("/api/admin/stats", authenticateToken, isAdmin, (req: any, res) => {
    const totalUsers: any = db.prepare("SELECT COUNT(*) as count FROM users").get();
    const totalInvoices: any = db.prepare("SELECT COUNT(*) as count FROM invoices").get();
    const totalRevenue: any = db.prepare("SELECT SUM(total_amount) as total FROM invoices WHERE status = 'paid'").get();
    const totalExpenses: any = db.prepare("SELECT SUM(amount) as total FROM expenses").get();
    
    const recentUsers = db.prepare("SELECT id, email, business_name, role FROM users ORDER BY id DESC LIMIT 5").all();
    
    res.json({
      totalUsers: totalUsers.count,
      totalInvoices: totalInvoices.count,
      totalRevenue: totalRevenue.total || 0,
      totalExpenses: totalExpenses.total || 0,
      recentUsers
    });
  });

  app.get("/api/admin/users", authenticateToken, isAdmin, (req: any, res) => {
    const users = db.prepare("SELECT id, email, business_name, role, currency FROM users").all();
    res.json(users);
  });

  app.post("/api/admin/users", authenticateToken, isAdmin, async (req: any, res) => {
    try {
      const { email, password, business_name, role } = req.body;
      if (!email || !password || !business_name) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      const result = db.prepare("INSERT INTO users (email, password, business_name, role) VALUES (?, ?, ?, ?)").run(email, hashedPassword, business_name, role || 'user');
      seedCategories(result.lastInsertRowid as number);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to create user" });
    }
  });

  app.delete("/api/admin/users/:id", authenticateToken, isAdmin, (req: any, res) => {
    if (req.params.id == req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own admin account" });
    }
    
    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE user_id = ?)").run(req.params.id);
      db.prepare("DELETE FROM invoices WHERE user_id = ?").run(req.params.id);
      db.prepare("DELETE FROM expenses WHERE user_id = ?").run(req.params.id);
      db.prepare("DELETE FROM expense_categories WHERE user_id = ?").run(req.params.id);
      db.prepare("DELETE FROM recurring_invoice_items WHERE recurring_invoice_id IN (SELECT id FROM recurring_invoices WHERE user_id = ?)").run(req.params.id);
      db.prepare("DELETE FROM recurring_invoices WHERE user_id = ?").run(req.params.id);
      db.prepare("DELETE FROM clients WHERE user_id = ?").run(req.params.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    });
    
    transaction();
    res.json({ success: true });
  });

  // Profile
  app.get("/api/profile", authenticateToken, (req: any, res) => {
    const user = db.prepare("SELECT id, email, business_name, currency, logo_url, theme, dashboard_config, role FROM users WHERE id = ?").get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  });

  app.patch("/api/profile", authenticateToken, (req: any, res) => {
    const { business_name, currency, logo_url, theme, dashboard_config } = req.body;
    db.prepare(`
      UPDATE users 
      SET business_name = COALESCE(?, business_name), 
          currency = COALESCE(?, currency),
          logo_url = COALESCE(?, logo_url),
          theme = COALESCE(?, theme),
          dashboard_config = COALESCE(?, dashboard_config)
      WHERE id = ?
    `).run(business_name, currency, logo_url, theme, dashboard_config, req.user.id);
    res.json({ success: true });
  });

  app.put("/api/profile", authenticateToken, (req: any, res) => {
    const { business_name, currency } = req.body;
    db.prepare("UPDATE users SET business_name = ?, currency = ? WHERE id = ?").run(business_name, currency, req.user.id);
    res.json({ success: true });
  });

  // Global Search
  app.get("/api/search", authenticateToken, (req: any, res) => {
    const query = req.query.q as string;
    if (!query || query.length < 2) return res.json({ clients: [], invoices: [] });

    const q = `%${query}%`;
    const clients = db.prepare(`
      SELECT id, name, email FROM clients 
      WHERE user_id = ? AND (name LIKE ? OR email LIKE ?)
      LIMIT 5
    `).all(req.user.id, q, q);

    const invoices = db.prepare(`
      SELECT i.id, i.invoice_number, c.name as client_name, i.total_amount, i.status
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.user_id = ? AND (i.invoice_number LIKE ? OR c.name LIKE ?)
      LIMIT 5
    `).all(req.user.id, q, q);

    res.json({ clients, invoices });
  });

  // Clients
  app.get("/api/clients", authenticateToken, (req: any, res) => {
    const clients = db.prepare("SELECT * FROM clients WHERE user_id = ?").all(req.user.id);
    res.json(clients);
  });

  app.post("/api/clients", authenticateToken, (req: any, res) => {
    try {
      const { name, email, phone, address } = clientSchema.parse(req.body);
      const result = db.prepare("INSERT INTO clients (user_id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)").run(req.user.id, name, email, phone, address);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Invalid data" });
    }
  });

  app.delete("/api/clients/:id", authenticateToken, (req: any, res) => {
    db.prepare("DELETE FROM clients WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  app.patch("/api/clients/:id/portal", authenticateToken, async (req: any, res) => {
    try {
      const { password, portal_enabled } = req.body;
      const client = db.prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
      if (!client) return res.status(404).json({ error: "Client not found" });

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 12);
        db.prepare("UPDATE clients SET password = ?, portal_enabled = ? WHERE id = ?").run(hashedPassword, portal_enabled ? 1 : 0, req.params.id);
      } else {
        db.prepare("UPDATE clients SET portal_enabled = ? WHERE id = ?").run(portal_enabled ? 1 : 0, req.params.id);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to update portal access" });
    }
  });

  // Expenses
  app.get("/api/expenses", authenticateToken, (req: any, res) => {
    const expenses = db.prepare("SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC").all(req.user.id);
    res.json(expenses.map((e: any) => ({
      ...e,
      tags: e.tags ? JSON.parse(e.tags) : []
    })));
  });

  app.post("/api/expenses", authenticateToken, (req: any, res) => {
    try {
      const { title, amount, category, date, tags } = expenseSchema.parse(req.body);
      const tagsJson = JSON.stringify(tags || []);
      const result = db.prepare("INSERT INTO expenses (user_id, title, amount, category, date, tags) VALUES (?, ?, ?, ?, ?, ?)").run(req.user.id, title, amount, category, date, tagsJson);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Invalid data" });
    }
  });

  app.get("/api/expense-categories", authenticateToken, (req: any, res) => {
    const categories = db.prepare("SELECT * FROM expense_categories WHERE user_id = ?").all(req.user.id);
    res.json(categories);
  });

  app.post("/api/expense-categories", authenticateToken, (req: any, res) => {
    const { name } = req.body;
    try {
      const result = db.prepare("INSERT INTO expense_categories (user_id, name) VALUES (?, ?)").run(req.user.id, name);
      res.json({ id: result.lastInsertRowid, name });
    } catch (e) {
      res.status(400).json({ error: "Category already exists" });
    }
  });

  app.delete("/api/expenses/:id", authenticateToken, (req: any, res) => {
    db.prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Invoices
  app.get("/api/invoices", authenticateToken, (req: any, res) => {
    const invoices = db.prepare(`
      SELECT i.*, c.name as client_name 
      FROM invoices i 
      JOIN clients c ON i.client_id = c.id 
      WHERE i.user_id = ? 
      ORDER BY i.date DESC
    `).all(req.user.id);
    res.json(invoices);
  });

  app.get("/api/invoices/:id", (req: any, res) => {
    // Custom logic to handle both user and client auth
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, payload: any) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
      
      let invoice: any;
      if (payload.role === 'client') {
        invoice = db.prepare(`
          SELECT i.*, c.name as client_name, c.email as client_email, c.address as client_address
          FROM invoices i 
          JOIN clients c ON i.client_id = c.id 
          WHERE i.id = ? AND i.client_id = ?
        `).get(req.params.id, payload.id);
      } else {
        invoice = db.prepare(`
          SELECT i.*, c.name as client_name, c.email as client_email, c.address as client_address
          FROM invoices i 
          JOIN clients c ON i.client_id = c.id 
          WHERE i.id = ? AND i.user_id = ?
        `).get(req.params.id, payload.id);
      }
      
      if (invoice) {
        const items = db.prepare("SELECT * FROM invoice_items WHERE invoice_id = ?").all(invoice.id);
        res.json({ ...invoice, items });
      } else {
        res.status(404).json({ error: "Invoice not found or unauthorized" });
      }
    });
  });

  app.post("/api/invoices", authenticateToken, (req: any, res) => {
    try {
      const { client_id, invoice_number, date, due_date, tax_rate, items, template_id, payment_terms } = invoiceSchema.parse(req.body);
      
      const total_amount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0) * (1 + (tax_rate / 100));

      const transaction = db.transaction(() => {
        // Secure check: verify client belongs to user
        const client = db.prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?").get(client_id, req.user.id);
        if (!client) throw new Error("Invalid client");

        const result = db.prepare(`
          INSERT INTO invoices (user_id, client_id, invoice_number, date, due_date, tax_rate, total_amount, template_id, payment_terms) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(req.user.id, client_id, invoice_number, date, due_date, tax_rate, total_amount, template_id || 'modern', payment_terms || '');

        const invoiceId = result.lastInsertRowid;

        const insertItem = db.prepare(`
          INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) 
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const item of items) {
          insertItem.run(invoiceId, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price);
        }

        return invoiceId;
      });

      const invoiceId = transaction();
      res.json({ id: invoiceId });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Invalid data" });
    }
  });

  app.patch("/api/invoices/:id/status", authenticateToken, (req: any, res) => {
    const { status } = req.body;
    db.prepare("UPDATE invoices SET status = ? WHERE id = ? AND user_id = ?").run(status, req.params.id, req.user.id);
    res.json({ success: true });
  });

  app.delete("/api/invoices/:id", authenticateToken, (req: any, res) => {
    const transaction = db.transaction(() => {
      // Secure check: verify invoice belongs to user
      const invoice = db.prepare("SELECT id FROM invoices WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
      if (!invoice) throw new Error("Invoice not found or unauthorized");

      db.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").run(req.params.id);
      db.prepare("DELETE FROM invoices WHERE id = ?").run(req.params.id);
    });
    
    try {
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(403).json({ error: e.message });
    }
  });

  app.post("/api/invoices/bulk/status", authenticateToken, (req: any, res) => {
    try {
      const { ids, status } = req.body;
      if (!Array.isArray(ids) || !status) throw new Error("Invalid parameters");
      
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`UPDATE invoices SET status = ? WHERE id IN (${placeholders}) AND user_id = ?`).run(status, ...ids, req.user.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/invoices/bulk/delete", authenticateToken, (req: any, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) throw new Error("Invalid parameters");

      const transaction = db.transaction(() => {
        const placeholders = ids.map(() => '?').join(',');
        // Validate ownership first
        const count = db.prepare(`SELECT COUNT(*) as count FROM invoices WHERE id IN (${placeholders}) AND user_id = ?`).get(...ids, req.user.id) as any;
        if (count.count !== ids.length) throw new Error("Unauthorized or invalid invoices selected");

        db.prepare(`DELETE FROM invoice_items WHERE invoice_id IN (${placeholders})`).run(...ids);
        db.prepare(`DELETE FROM invoices WHERE id IN (${placeholders})`).run(...ids);
      });
      
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/invoices/reminders/process", authenticateToken, (req: any, res) => {
    const user = db.prepare("SELECT dashboard_config FROM users WHERE id = ?").get(req.user.id);
    let daysBefore = 3;
    try {
      if ((user as any)?.dashboard_config) {
        const conf = JSON.parse((user as any).dashboard_config);
        if (conf.reminder_days_before) daysBefore = parseInt(conf.reminder_days_before, 10);
      }
    } catch (e) {}

    const now = new Date().toISOString().split('T')[0];
    const targetDate = new Date(Date.now() + daysBefore * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // We send reminders if due_date is <= targetDate and we haven't sent one today
    const dueInvoices = db.prepare(`
      SELECT i.*, c.name as client_name, c.email as client_email 
      FROM invoices i 
      JOIN clients c ON i.client_id = c.id
      WHERE i.user_id = ? AND i.status = 'unpaid' 
      AND (i.due_date <= ? AND (i.last_reminder_sent_at IS NULL OR i.last_reminder_sent_at < ?))
    `).all(req.user.id, targetDate, now);

    const sentIds = [];
    for (const inv of dueInvoices) {
      db.prepare("UPDATE invoices SET last_reminder_sent_at = ? WHERE id = ?").run(now, (inv as any).id);
      sentIds.push((inv as any).id);
    }

    res.json({ success: true, sentCount: sentIds.length, processedIds: sentIds });
  });

  // Schedule automated daily reminders for all users with reminders enabled
  cron.schedule('0 6 * * *', () => {
    console.log('Running daily invoice reminders job...');
    const users = db.prepare("SELECT id, dashboard_config FROM users").all();
    const now = new Date().toISOString().split('T')[0];

    let totalSent = 0;
    for (const u of users) {
      let enabled = false;
      let daysBefore = 3;
      try {
        if ((u as any).dashboard_config) {
          const conf = JSON.parse((u as any).dashboard_config);
          enabled = conf.reminders_enabled === true;
          if (conf.reminder_days_before) daysBefore = parseInt(conf.reminder_days_before, 10);
        }
      } catch (e) {}

      if (enabled) {
        const targetDate = new Date(Date.now() + daysBefore * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dueInvoices = db.prepare(`
          SELECT i.id 
          FROM invoices i 
          WHERE i.user_id = ? AND i.status = 'unpaid' 
          AND (i.due_date <= ? AND (i.last_reminder_sent_at IS NULL OR i.last_reminder_sent_at < ?))
        `).all((u as any).id, targetDate, now);

        for (const inv of dueInvoices) {
          db.prepare("UPDATE invoices SET last_reminder_sent_at = ? WHERE id = ?").run(now, (inv as any).id);
          totalSent++;
        }
      }
    }
    console.log(`Daily reminders job completed. Sent ${totalSent} reminders.`);
  });

  // Schedule automated daily recurring invoice generation (runs at 00:05 everyday)
  cron.schedule('5 0 * * *', () => {
    console.log('Running daily recurring invoice generation job...');
    const today = new Date().toISOString().split('T')[0];
    
    // Select all active due recurring invoices across all users
    const recurringDue = db.prepare(`
      SELECT r.*, c.name as client_name 
      FROM recurring_invoices r 
      JOIN clients c ON r.client_id = c.id 
      WHERE r.next_date <= ? AND r.status = 'active'
    `).all(today);

    let generatedCount = 0;

    const transaction = db.transaction(() => {
      for (const r_any of recurringDue) {
        const r = r_any as any;
        const items = db.prepare("SELECT * FROM recurring_invoice_items WHERE recurring_invoice_id = ?").all(r.id);
        const subtotal = items.reduce((sum: number, item: any) => sum + ((item.quantity as number) * (item.unit_price as number)), 0);
        const total_amount = (subtotal as number) * (1 + ((r.tax_rate as number) / 100));
        
        const invoice_number = `INV-REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
        const date = today;
        const due_date = today;

        const result = db.prepare(`
          INSERT INTO invoices (user_id, client_id, invoice_number, date, due_date, tax_rate, total_amount, template_id, payment_terms) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(r.user_id, r.client_id, invoice_number, date, due_date, r.tax_rate, total_amount, r.template_id, r.payment_terms);

        const invoiceId = result.lastInsertRowid;
        generatedCount++;

        const insertItem = db.prepare(`
          INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) 
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const item_any of items) {
          const item = item_any as any;
          insertItem.run(invoiceId, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price);
        }

        let nextDate = new Date(r.next_date);
        if (r.frequency === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (r.frequency === 'monthly') {
          const targetMonth = nextDate.getMonth() + 1;
          nextDate.setMonth(targetMonth);
          if (nextDate.getMonth() > (targetMonth % 12)) {
            nextDate.setDate(0);
          }
        } else if (r.frequency === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }

        db.prepare("UPDATE recurring_invoices SET next_date = ?, last_generated_date = ? WHERE id = ?")
          .run(nextDate.toISOString().split('T')[0], today, r.id);
      }
    });

    try {
      transaction();
      console.log(`Daily recurring invoices job completed. Generated ${generatedCount} invoices.`);
    } catch (e) {
      console.error('Error running daily recurring invoices job:', e);
    }
  });

  // Recurring Invoices
  app.get("/api/recurring-invoices", authenticateToken, (req: any, res) => {
    const recurring = db.prepare(`
      SELECT r.*, c.name as client_name 
      FROM recurring_invoices r 
      JOIN clients c ON r.client_id = c.id 
      WHERE r.user_id = ?
    `).all(req.user.id);

    const recurringWithItems = recurring.map((r: any) => {
      const items = db.prepare("SELECT * FROM recurring_invoice_items WHERE recurring_invoice_id = ?").all(r.id);
      return { ...r, items };
    });

    res.json(recurringWithItems);
  });

  app.post("/api/recurring-invoices", authenticateToken, (req: any, res) => {
    try {
      const { client_id, frequency, next_date, tax_rate, items, template_id, payment_terms } = invoiceSchema.omit({ invoice_number: true, date: true, due_date: true }).extend({
        frequency: z.enum(['weekly', 'monthly', 'yearly']),
        next_date: z.string(),
      }).parse(req.body);

      const transaction = db.transaction(() => {
        // Secure check: verify client belongs to user
        const client = db.prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?").get(client_id, req.user.id);
        if (!client) throw new Error("Invalid client");

        const result = db.prepare(`
          INSERT INTO recurring_invoices (user_id, client_id, frequency, next_date, tax_rate, template_id, payment_terms) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(req.user.id, client_id, frequency, next_date, tax_rate, template_id || 'modern', payment_terms || '');

        const recurringId = result.lastInsertRowid;

        const insertItem = db.prepare(`
          INSERT INTO recurring_invoice_items (recurring_invoice_id, description, quantity, unit_price) 
          VALUES (?, ?, ?, ?)
        `);

        for (const item of items) {
          insertItem.run(recurringId, item.description, item.quantity, item.unit_price);
        }

        return recurringId;
      });

      const recurringId = transaction();
      res.json({ id: recurringId });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Invalid data" });
    }
  });

  app.delete("/api/recurring-invoices/:id", authenticateToken, (req: any, res) => {
    const transaction = db.transaction(() => {
      // Secure check: verify recurring invoice belongs to user
      const recurring = db.prepare("SELECT id FROM recurring_invoices WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
      if (!recurring) throw new Error("Recurring invoice not found or unauthorized");

      db.prepare("DELETE FROM recurring_invoice_items WHERE recurring_invoice_id = ?").run(req.params.id);
      db.prepare("DELETE FROM recurring_invoices WHERE id = ?").run(req.params.id);
    });
    
    try {
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(403).json({ error: e.message });
    }
  });

  app.post("/api/recurring-invoices/:id/force-process", authenticateToken, (req: any, res) => {
    const today = new Date().toISOString().split('T')[0];
    const r = db.prepare(`
      SELECT r.*, c.name as client_name 
      FROM recurring_invoices r 
      JOIN clients c ON r.client_id = c.id 
      WHERE r.id = ? AND r.user_id = ?
    `).get(req.params.id, req.user.id) as any;

    if (!r) return res.status(404).json({ error: "Not found" });

    let invoiceId;
    const transaction = db.transaction(() => {
      const items = db.prepare("SELECT * FROM recurring_invoice_items WHERE recurring_invoice_id = ?").all(r.id);
      const subtotal = items.reduce((sum: number, item: any) => sum + ((item.quantity as number) * (item.unit_price as number)), 0);
      const total_amount = (subtotal as number) * (1 + ((r.tax_rate as number) / 100));
      
      const invoice_number = `INV-REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
      const date = today;
      const due_date = today;

      const result = db.prepare(`
        INSERT INTO invoices (user_id, client_id, invoice_number, date, due_date, tax_rate, total_amount, template_id, payment_terms) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.id, r.client_id, invoice_number, date, due_date, r.tax_rate, total_amount, r.template_id, r.payment_terms);

      invoiceId = result.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) 
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item_any of items) {
        const item = item_any as any;
        insertItem.run(invoiceId, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price);
      }

      // Update next_date with proper month rollover handling relative to CURRENT next_date
      let nextDate = new Date(r.next_date);
      if (r.frequency === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (r.frequency === 'monthly') {
        const targetMonth = nextDate.getMonth() + 1;
        nextDate.setMonth(targetMonth);
        if (nextDate.getMonth() > (targetMonth % 12)) {
          nextDate.setDate(0);
        }
      } else if (r.frequency === 'yearly') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }

      db.prepare("UPDATE recurring_invoices SET next_date = ?, last_generated_date = ? WHERE id = ?").run(nextDate.toISOString().split('T')[0], today, r.id);
    });

    try {
      transaction();
      res.json({ success: true, invoiceId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Process Recurring (Helper for simulation)
  app.post("/api/recurring-invoices/process", authenticateToken, (req: any, res) => {
    const today = new Date().toISOString().split('T')[0];
    const recurringDue = db.prepare(`
      SELECT r.*, c.name as client_name 
      FROM recurring_invoices r 
      JOIN clients c ON r.client_id = c.id 
      WHERE r.user_id = ? AND r.next_date <= ? AND r.status = 'active'
    `).all(req.user.id, today);

    const generatedIds: any[] = [];

    const transaction = db.transaction(() => {
      for (const r_any of recurringDue) {
        const r = r_any as any;
        const items = db.prepare("SELECT * FROM recurring_invoice_items WHERE recurring_invoice_id = ?").all(r.id);
        const subtotal = items.reduce((sum: number, item: any) => sum + ((item.quantity as number) * (item.unit_price as number)), 0);
        const total_amount = (subtotal as number) * (1 + ((r.tax_rate as number) / 100));
        
        const invoice_number = `INV-REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
        const date = today;
        const due_date = today; // Simplified

        const result = db.prepare(`
          INSERT INTO invoices (user_id, client_id, invoice_number, date, due_date, tax_rate, total_amount, template_id, payment_terms) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(req.user.id, r.client_id, invoice_number, date, due_date, r.tax_rate, total_amount, r.template_id, r.payment_terms);

        const invoiceId = result.lastInsertRowid;
        generatedIds.push(invoiceId);

        const insertItem = db.prepare(`
          INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) 
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const item_any of items) {
          const item = item_any as any;
          insertItem.run(invoiceId, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price);
        }

        // Update next_date with proper month rollover handling
        let nextDate = new Date(r.next_date);
        if (r.frequency === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (r.frequency === 'monthly') {
          const targetMonth = nextDate.getMonth() + 1;
          nextDate.setMonth(targetMonth);
          // If the month jumped too far (e.g. Jan 31 -> March 3), snap to last day of intended month
          if (nextDate.getMonth() > (targetMonth % 12)) {
            nextDate.setDate(0);
          }
        } else if (r.frequency === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }

        db.prepare("UPDATE recurring_invoices SET next_date = ?, last_generated_date = ? WHERE id = ?").run(nextDate.toISOString().split('T')[0], today, r.id);
      }
    });

    transaction();
    res.json({ generated: generatedIds.length });
  });

  // Dashboard Stats
  app.get("/api/stats", authenticateToken, (req: any, res) => {
    const expenses: any = db.prepare("SELECT SUM(amount) as total FROM expenses WHERE user_id = ?").get(req.user.id);
    const income: any = db.prepare("SELECT SUM(total_amount) as total FROM invoices WHERE user_id = ? AND status = 'paid'").get(req.user.id);
    const pending: any = db.prepare("SELECT SUM(total_amount) as total FROM invoices WHERE user_id = ? AND status = 'unpaid'").get(req.user.id);
    
    // Trend Calculation (This month vs last month)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonthRaw = new Date();
    lastMonthRaw.setMonth(lastMonthRaw.getMonth() - 1);
    const lastMonth = lastMonthRaw.toISOString().slice(0, 7);

    const getMonthStats = (month: string) => {
      const exp = db.prepare("SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND strftime('%Y-%m', date) = ?").get(req.user.id, month) as any;
      const inc = db.prepare("SELECT SUM(total_amount) as total FROM invoices WHERE user_id = ? AND status = 'paid' AND strftime('%Y-%m', date) = ?").get(req.user.id, month) as any;
      return { expenses: exp?.total || 0, income: inc?.total || 0 };
    };

    const currentStats = getMonthStats(currentMonth);
    const prevStats = getMonthStats(lastMonth);

    const calculateTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? "+100%" : "0%";
      const diff = ((curr - prev) / prev) * 100;
      return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
    };

    const trends = {
      income: calculateTrend(currentStats.income, prevStats.income),
      expenses: calculateTrend(currentStats.expenses, prevStats.expenses),
      profit: calculateTrend(currentStats.income - currentStats.expenses, prevStats.income - prevStats.expenses),
      pending: "0%" // Harder to calculate historical pending without more complex schema
    };

    const monthlyStats = db.prepare(`
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income
      FROM (
        SELECT date, amount, 'expense' as type FROM expenses WHERE user_id = ?
        UNION ALL
        SELECT date, total_amount as amount, 'income' as type FROM invoices WHERE user_id = ? AND status = 'paid'
      )
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `).all(req.user.id, req.user.id);

    res.json({
      totalExpenses: expenses.total || 0,
      totalIncome: income.total || 0,
      pendingIncome: pending.total || 0,
      trends,
      monthlyStats: monthlyStats.reverse()
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Error handler
  app.use((err: any, req: any, res: any, next: any) => {
    if (err.message && err.message.includes('SQLITE_ERROR')) {
       console.error("Critical Database Error:", err.message);
       console.error("SQL State:", err.stack);
    } else {
       console.error(err.stack);
    }
    res.status(500).json({ error: err.message || "An internal server error occurred" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
