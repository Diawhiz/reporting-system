# Sage Logistics — Daily Reconciliation System

> A temporal web application for logistics businesses to manage daily deliveries, expenses, and inventory reconciliation. Built with vanilla JavaScript frontend and Node.js/Express backend with SQLite/PostgreSQL support.

> **⚡ Vibe-Coded Prototype**  
> This isn't pristine production code — it's a rapid prototype built to *work*, not to win engineering awards. The code is loosely organized, many things are done quickly, and there aren't strict patterns everywhere. But it *works* and works well. Perfect for getting things done fast.
> I Built this beacuse I am just lazy to fill in report manually for myself.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Development](#development)
- [Deployment](#deployment)

---

## Features

### Daily Operations
- Record deliveries with location, rider, product, and price
- Track delivery fees for each order
- Log business expenses with descriptions and amounts
- Date navigation for managing historical records
- Edit and delete entries inline

### Inventory Management
- Add and manage inventory items with pricing
- Manage vendor relationships
- Assign stock quantities from vendors to items
- Real-time stock balance tracking by vendor
- Stock transaction history for auditing

### Reporting & Reconciliation
Generate daily summary reports with:
- Total revenue from deliveries
- Total expenses incurred
- Delivery fee breakdown
- Net profit calculation
- Inventory stock balances by vendor
- Copy full reports to clipboard for easy sharing
- Date-based report generation

### User Experience
| Feature | Description |
|---------|-------------|
| **Dark/Light Theme** | Seamless theme switching with CSS variables |
| **Authentication** | Session-based login and registration |
| **Responsive Design** | Mobile-optimized interface (380px+) |
| **Glassmorphism UI** | Modern, clean design aesthetic |
| **Real-time Updates** | Immediate feedback on all actions |
| **Data Export** | Copy summaries and reports to clipboard |

---

## Tech Stack

**Frontend**
- HTML5 — Semantic markup
- CSS3 — Custom properties, Flexbox, Grid
- Vanilla JavaScript — No framework dependencies
- Google Fonts — Outfit & Inter typography

**Backend**
- Node.js — Runtime environment
- Express.js — HTTP server framework
- SQLite3 — Embedded database (development)
- PostgreSQL — Production database support
- dotenv — Environment configuration

**Deployment**
- Vercel — Serverless functions
- Docker — Containerization (optional)
- Local Express Server — Development

---

## Project Structure

```
sage-logistics/
├── index.html              # Main UI template
├── app.js                  # Client-side logic (1200+ lines)
├── style.css               # Styling with theme variables
├── server.js               # Local development server
├── package.json            # Dependencies & metadata
│
├── api/                    # Backend endpoints (serverless)
│   ├── auth.js            # Login/registration handlers
│   ├── deliveries.js      # Delivery CRUD operations
│   ├── expenses.js        # Expense CRUD operations
│   ├── inventory.js       # Inventory & vendor management
│   └── db.js              # Database initialization
│
├── patch_app.js           # Script to update app.js with multi-item support
├── patch_multi.js         # Script to patch all API files
├── replace_alerts.js      # Script to replace browser alerts with custom modals
└── test_inventory.js      # Integration test suite
```

---

## Installation

### Prerequisites
- Node.js v16+ (with npm)
- SQLite3 (included with most systems)
- PostgreSQL (optional, for production)

### Step 1: Clone & Setup

```bash
git clone https://github.com/Diawhiz/reporting-system.git
cd reporting-system
npm install
```

### Step 2: Environment Configuration

Create a `.env` file in the root directory:

```env
# For SQLite (Development)
DATABASE_TYPE=sqlite
DATABASE_PATH=./reporting.db

# For PostgreSQL (Production)
# DATABASE_TYPE=postgres
# DATABASE_URL=postgresql://user:password@localhost:5432/sage_logistics
# DATABASE_HOST=localhost
# DATABASE_PORT=5432
# DATABASE_NAME=sage_logistics
# DATABASE_USER=postgres
# DATABASE_PASSWORD=your_password

PORT=3000
NODE_ENV=development
```

### Step 3: Initialize Database

The database automatically initializes on first run. Tables created:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with authentication |
| `sessions` | Active user sessions |
| `deliveries` | Daily delivery records |
| `expenses` | Business expenses |
| `inventory_items` | Product catalog |
| `inventory_vendors` | Vendor management |
| `vendor_stocks` | Stock balances by vendor |
| `stock_transactions` | Transaction audit log |

---

## Configuration

### Database Setup

#### SQLite (Default - Development)
No configuration needed. The app uses `reporting.db` in the project root.

#### PostgreSQL (Production)
Update `.env`:
```env
DATABASE_TYPE=postgres
DATABASE_HOST=your_host
DATABASE_PORT=5432
DATABASE_NAME=sage_logistics
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
```

### Theme Customization

Edit `style.css` root variables to customize colors:

```css
:root {
    /* Light Mode */
    --primary: #8b5cf6;          /* Violet */
    --accent: #10b981;           /* Green */
    --danger: #ef4444;           /* Red */
    --bg-color: #f8fafc;
    --surface-bg: #ffffff;
    --text-main: #0f172a;
}

[data-theme="dark"] {
    /* Dark Mode */
    --primary: #a78bfa;
    --bg-color: #0f172a;
}
```

---

## Usage

### Starting the Application

#### Development Mode
```bash
npm start
# or
node server.js
```

Then visit: `http://localhost:3000`

#### With API Testing
```bash
node test_inventory.js
```

### User Workflow

**1. Authentication**
- Click "Create Account" to register a new user
- Login with credentials
- Session token stored in `localStorage`

**2. Daily Operations Tab**

_Add Delivery:_
- Select date using calendar picker
- Enter location and rider name
- Click "+ Add Product from Inventory" to select items
- Choose vendor → item → quantity
- Set product name and delivery fee
- Click "Add Delivery"

_Add Expense:_
- Enter expense description
- Input amount in Naira (₦)
- Click "Add Expense"

**3. Inventory Tab**

_Manage Items:_ Add new items with name and price

_Manage Vendors:_ Add vendor names and track relationships

_Assign Stock:_ Select vendor and item, enter quantity to assign

**4. Summary & Report Tab**
- View daily reconciliation with totals
- See revenue, expenses, and net profit
- Click "Copy Full Report" to share

---

## API Endpoints

> All endpoints require `Authorization: Bearer <sessionToken>` header

### Authentication

**POST /api/auth**
```json
{
  "action": "login",
  "username": "user",
  "password": "pass"
}
```

Response:
```json
{
  "token": "abc123...",
  "user_id": 1
}
```

### Deliveries

**POST /api/deliveries** - Create/Update
```json
{
  "date": "2024-01-15",
  "location": "Ikirun",
  "rider": "Israel",
  "product": "Product Name",
  "price": 50000,
  "fee": 5000,
  "items_json": "[{\"vendor_id\": 1, \"item_id\": 2, \"quantity\": 5}]"
}
```

**GET /api/deliveries** - List
```
GET /api/deliveries?date=2024-01-15
```

**DELETE /api/deliveries** - Delete
```json
{
  "id": 1,
  "date": "2024-01-15"
}
```

### Expenses

**POST /api/expenses** - Create/Update
```json
{
  "date": "2024-01-15",
  "description": "Fuel",
  "amount": 2000
}
```

**GET /api/expenses** - List
```
GET /api/expenses?date=2024-01-15
```

**DELETE /api/expenses** - Delete
```json
{
  "id": 1,
  "date": "2024-01-15"
}
```

### Inventory

**POST /api/inventory** - Multi-purpose
```json
{
  "action": "items",
  "method": "POST",
  "name": "Product Name",
  "sku": "PROD-001",
  "price": 5000
}
```

**GET /api/inventory** - List
```
GET /api/inventory?action=vendors
GET /api/inventory?action=items
GET /api/inventory?action=stocks
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Deliveries Table
```sql
CREATE TABLE deliveries (
  id INTEGER PRIMARY KEY,
  date DATE NOT NULL,
  location TEXT NOT NULL,
  rider TEXT NOT NULL,
  product TEXT NOT NULL,
  price NUMERIC(12, 2),
  fee NUMERIC(12, 2) DEFAULT 0,
  vendor_id INTEGER,
  item_id INTEGER,
  quantity NUMERIC(12, 2) DEFAULT 0,
  items_json TEXT,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Vendor Stocks Table
```sql
CREATE TABLE vendor_stocks (
  id INTEGER PRIMARY KEY,
  vendor_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  FOREIGN KEY (vendor_id) REFERENCES inventory_vendors(id),
  FOREIGN KEY (item_id) REFERENCES inventory_items(id)
);
```

### Stock Transactions Table (Audit Log)
```sql
CREATE TABLE stock_transactions (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL,
  vendor_id INTEGER NOT NULL,
  quantity_change NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL, -- 'assignment', 'deduction', 'correction'
  reference_id INTEGER,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Development

### Key JavaScript Functions

**Frontend (app.js)**
- `handleAuth(action)` - Login/registration
- `addOrUpdateDelivery()` - Save delivery records
- `addOrUpdateExpense()` - Save expenses
- `addDeliveryItemRow()` - Dynamic multi-item selection
- `loadVendorStocks()` - Refresh inventory display
- `generateReconciliationSummary()` - Create daily report
- `copyFullReport()` - Copy to clipboard

**Backend (api/deliveries.js)**
- `execute()` - Database mutations
- `query()` - Database reads
- Stock deduction with atomic operations
- Concurrent request handling

### Running Tests

```bash
npm test
# or
node test_inventory.js
```

Tests verify:
- Normal stock deduction
- Insufficient stock prevention
- Concurrent delivery submissions
- Vendor/item assignment flows

### Patching Scripts

Update multi-item support across all files:
```bash
node patch_multi.js
```

Replace browser alerts with custom modals:
```bash
node replace_alerts.js
```

---

## Deployment

### Vercel (Recommended)

1. **Connect Repository**
```bash
npm i -g vercel
vercel login
vercel
```

2. **Configure Environment**
   - Set database URL in Vercel dashboard
   - Choose PostgreSQL for production reliability

3. **Deploy**
```bash
vercel --prod
```

### Heroku

1. **Create App**
```bash
heroku create sage-logistics
heroku config:set DATABASE_URL=postgresql://...
```

2. **Deploy**
```bash
git push heroku main
```

### Local Server

```bash
PORT=3000 npm start
```

---

## Security Considerations

- **Authentication**: Password hashing with salt (implement bcrypt in production)
- **Authorization**: Session-based token validation
- **SQL Injection**: Parameterized queries
- **CORS**: Configure for production domains
- **Environment Variables**: Sensitive data in `.env`
- **User Scoping**: All records tied to authenticated user

### Production Recommendations

```javascript
// Use bcrypt for password hashing
const bcrypt = require('bcrypt');
const hashedPassword = await bcrypt.hash(password, 10);

// Implement HTTPS/TLS
// Add rate limiting
// Enable CORS with specific origins
// Use environment-based secrets
// Add request validation
```

---

## Database Transactions & Concurrency

The system handles concurrent stock deductions **atomically**:

```javascript
// Atomic stock deduction
const updateRes = await execute(
  'UPDATE vendor_stocks SET quantity = quantity - $1 
   WHERE vendor_id = $2 AND item_id = $3 AND quantity >= $4',
  [requestedQty, vendorId, itemId, requestedQty]
);

// Verify success before logging transaction
if (updateRes.rowCount === 0) {
  return res.status(400).json({ error: 'Insufficient stock' });
}

// Record audit trail
await execute(
  'INSERT INTO stock_transactions (...) VALUES (...)',
  [itemId, vendorId, -requestedQty, 'deduction', deliveryId, userId]
);
```

---

## UI/UX Features

### Theme System
- Light/Dark mode toggle
- Persistent theme in localStorage
- CSS variable-based theming
- Smooth transitions

### Responsive Design
- Mobile-first approach
- Breakpoint at 900px for grid layout
- Touch-friendly button sizing
- Optimized for 380px+ width

### Custom Modals
- `customAlert()` - Information dialogs
- `customConfirm()` - Confirmation dialogs
- `customPrompt()` - Input dialogs
- Animated overlays with proper z-indexing

---

## Code Quality & Design Notes

### What to Expect (Vibe-Coded)

This was built quickly with focus on _functionality_ over strict code organization:

- Frontend logic lives in one `app.js` file (1200+ lines)
- Patch scripts modify files programmatically
- Alert/modal replacement uses string manipulation
- Database initialization is automatic (no explicit migrations)
- API handlers are serverless functions adapted to Express
- Stock deduction logic is complex but works atomically

**It works.** The prototype is solid. If you're scaling this:

**Consider refactoring:**
- Split `app.js` into modules (delivery manager, inventory manager, etc.)
- Add Jest or Mocha for testing
- Implement database migrations with Flyway or Knex
- Use Webpack or Vite for bundling
- Add TypeScript for type safety
- Separate API logic from request handling

---

## Project Notes

- **Data Persistence** — SQLite stores data in `reporting.db`
- **Session Management** — Tokens expire with browser session  
- **Offline Support** — Data syncs when connection restored
- **File Size** — Frontend JS is ~1200 lines (ungrouped by feature)

---

## Contributing

```bash
# Fork the repository
git checkout -b feature/your-feature

# Make changes and commit
git commit -m 'Add your feature'

# Push and open a PR
git push origin feature/your-feature
```

---

## License

ISC — See package.json for details

---

## Troubleshooting

**Database Connection Error**
```
Error: Cannot find module 'sqlite3'
```
Fix: `npm install sqlite3 --save`

**Port Already in Use**
```bash
PORT=3001 npm start
# or kill the process
lsof -ti:3000 | xargs kill -9
```

**Session Token Issues**
- Clear localStorage: `localStorage.clear()`
- Log out and back in
- Check token expiration in logs

**Stock Deduction Fails**
- Verify vendor exists in inventory list
- Assign stock to vendor first (Inventory tab)
- Check available quantity is sufficient
- Review `stock_transactions` table for history

---

## Support

- **GitHub Issues** — [reporting-system/issues](https://github.com/Diawhiz/reporting-system/issues)
- **Email** — Contact repository owner

---

**Version** — 1.0.0  
**Last Updated** — August 2026
**Maintainer** — Diawhiz  
**Status** — Actively Used