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

// ─────────── DRIVERS ───────────

// List all drivers
router.get('/drivers', async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.json({ count: drivers.length, drivers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin registers a new driver
router.post('/drivers', async (req, res) => {
  try {
    const { name, email, phone, password, truckType } = req.body;

    if (!name || !email || !phone || !password || !truckType) {
      return res.status(400).json({
        message: 'Name, email, phone, password and truck type are required'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();

    if (await Driver.findOne({ email: cleanEmail })) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    if (await Driver.findOne({ phone: cleanPhone })) {
      return res.status(400).json({ message: 'Phone already registered' });
    }

    const driver = new Driver({
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password: password.trim(),
      truckType: truckType.trim(),
      availability: 'offline'
    });

    await driver.save();
    res.status(201).json({ message: 'Driver registered by admin', driver });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Suspend (soft block) — driver can't get new jobs but stays in system
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

// Unsuspend (bring back to offline)
router.patch('/drivers/:id/unsuspend', async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { availability: 'offline' },
      { new: true }
    );
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json({ message: 'Driver reactivated', driver });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete permanently — warns if the driver has active jobs
router.delete('/drivers/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    // Check for active jobs
    const activeJobs = await Booking.countDocuments({
      driverId: driver._id,
      status: { $in: ['Confirmed', 'Broadcasting', 'Sent to driver', 'Sent to next driver'] }
    });

    if (activeJobs > 0 && req.query.force !== 'true') {
      return res.status(409).json({
        message: `This driver has ${activeJobs} active job(s). Add ?force=true to confirm deletion.`,
        activeJobs
      });
    }

    await Driver.findByIdAndDelete(req.params.id);
    res.json({ message: 'Driver deleted', driver });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────── BOOKINGS ───────────
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

// ─────────── COMPLAINTS ───────────
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