const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Load serverless functions as routes
const deliveriesHandler = require('./api/deliveries');
const expensesHandler = require('./api/expenses');

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Route handler adapter for Vercel functions to Express
const adapter = (handler) => {
  return async (req, res) => {
    // Vercel request object has query, Express has query
    // Vercel response has json(), status(), end(), setHeader()
    // Express res has all of these, so we can pass them directly.
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

app.listen(PORT, () => {
  console.log(`Local development server running at http://localhost:${PORT}`);
});
