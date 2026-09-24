require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ─────────── ROUTES ───────────
const driverRoutes = require('./routes/drivers');
app.use('/api/drivers', driverRoutes);

const bookingRoutes = require('./routes/bookings');
app.use('/api/bookings', bookingRoutes);

// NEW: complaints (public — customers submit)
const complaintRoutes = require('./routes/complaints');
app.use('/api/complaints', complaintRoutes);

// NEW: admin (protected by x-admin-key header)
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Lucky Movers server is running!' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.log('❌ MongoDB connection error:', err.message));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});