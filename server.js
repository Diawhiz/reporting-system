const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Load serverless functions as routes
const deliveriesHandler = require('./api/deliveries');
const expensesHandler = require('./api/expenses');
const authHandler = require('./api/auth');
const inventoryHandler = require('./api/inventory');

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Route handler adapter for Vercel functions to Express
const adapter = (handler) => {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Local server adapter error' });
      }
    }
  };
};

app.all('/api/deliveries', adapter(deliveriesHandler));
app.all('/api/expenses', adapter(expensesHandler));
app.all('/api/auth', adapter(authHandler));
app.all('/api/inventory', adapter(inventoryHandler));

app.listen(PORT, () => {
  console.log(`Local development server running at http://localhost:${PORT}`);
});
