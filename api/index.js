const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const apiRoutes = require('../src/routes/api');
const authRoutes = require('../src/routes/auth');
const productRoutes = require('../src/routes/products');
const swiftmartRoutes = require('../src/routes/swiftmart');

const app = express();

// Allow inline scripts for our chat UI (helmet blocks them by default)
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Serve the chat UI
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/swiftmart', swiftmartRoutes);
app.use('/api', apiRoutes);

// Health
app.get('/api/health', (req, res) => res.json({ ok: true, app: 'SwiftMart AI', db: 'Supabase' }));

module.exports = app;
