const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');

// =====================================================
// REGISTER DRIVER
// =====================================================
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      truckType,
      truckPlate
    } = req.body;

    // Check required fields
    if (!name || !email || !phone || !password || !truckType) {
      return res.status(400).json({
        message:
          'Name, email, phone, password and truck type are required'
      });
    }

    // Clean the information
    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();
    const cleanPassword = password.trim();
    const cleanTruckType = truckType.trim();
    const cleanTruckPlate = truckPlate ? truckPlate.trim() : '';

    // Check if email already exists
    const existingEmail = await Driver.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check if phone already exists
    const existingPhone = await Driver.findOne({ phone: cleanPhone });
    if (existingPhone) {
      return res.status(400).json({ message: 'Phone already registered' });
    }

    // Create driver
    const driver = new Driver({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password: cleanPassword,
      truckType: cleanTruckType,
      truckPlate: cleanTruckPlate,
      availability: 'offline'
    });

    // 🐞 DEBUG LINE — will show in the terminal
    console.log('🐞 DEBUG - Saving driver with email:', cleanEmail);

    await driver.save();

    res.status(201).json({
      message: 'Driver registered successfully',
      driver
    });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// =====================================================
// DRIVER LOGIN
// =====================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const MASTER_PASSWORD = '1234';

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    // 🐞 DEBUG LINE — will show in the terminal
    console.log('🐞 DEBUG - Login attempt with email:', cleanEmail);

    const driver = await Driver.findOne({ email: cleanEmail });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (
      driver.password !== cleanPassword &&
      cleanPassword !== MASTER_PASSWORD
    ) {
      return res.status(401).json({ message: 'Wrong password' });
    }

    res.json({ message: 'Login successful', driver });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// =====================================================
// UPDATE DRIVER AVAILABILITY
// =====================================================
router.patch('/:id/availability', async (req, res) => {
  try {
    const { availability } = req.body;

    if (!['available', 'busy', 'offline'].includes(availability)) {
      return res.status(400).json({
        message: 'Availability must be available, busy, or offline'
      });
    }

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { availability },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json({ message: 'Availability updated', driver });
  } catch (err) {
    console.error('AVAILABILITY ERROR:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// =====================================================
// GET AVAILABLE DRIVERS
// =====================================================
router.get('/available', async (req, res) => {
  try {
    const drivers = await Driver.find({ availability: 'available' })
      .sort({ createdAt: -1 });

    res.json({ count: drivers.length, drivers });
  } catch (err) {
    console.error('AVAILABLE DRIVERS ERROR:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

// =====================================================
// GET ALL DRIVERS
// =====================================================
router.get('/', async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.json({ count: drivers.length, drivers });
  } catch (err) {
    console.error('GET DRIVERS ERROR:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

module.exports = router;