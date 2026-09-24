const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const Booking = require('../models/Booking');
const Complaint = require('../models/Complaint');

const ADMIN_KEY = process.env.ADMIN_KEY || 'lucky-admin-2026';

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

router.use(requireAdmin);

// ─── DRIVERS ───
router.get('/drivers', async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.json({ count: drivers.length, drivers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/drivers/:id', async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json({ message: 'Driver deleted', driver });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/drivers/:id/suspend', async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { availability: 'suspended' },
      { new: true }
    );
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json({ message: 'Driver suspended', driver });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── BOOKINGS ───
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json({ count: bookings.length, bookings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/bookings/:id/payment', async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { paymentStatus, paidAt: paymentStatus === 'paid' ? new Date() : null },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Payment updated', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── COMPLAINTS ───
router.get('/complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.json({ count: complaints.length, complaints });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/complaints/:id', async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status, adminNote },
      { new: true }
    );
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json({ message: 'Complaint updated', complaint });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;