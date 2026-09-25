const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const { sendEmail, driverAcceptedEmail } = require('../mailer');

// Create a new booking
router.post('/', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.status(201).json({ message: 'Booking created', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get ALL bookings
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json({ count: bookings.length, bookings });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Broadcast the job to all available matching drivers (no assignment yet)
router.post('/:id/broadcast-job', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const wantedTruck = booking.selectedTruck || booking.truckType;
    if (!wantedTruck) {
      return res.status(400).json({ message: 'Booking has no truck type' });
    }

    // Find available drivers with matching truck
    const availableDrivers = await Driver.find({
      availability: 'available',
      truckType: wantedTruck
    });

    if (!availableDrivers.length) {
      booking.status = 'No driver available';
      await booking.save();
      return res.status(404).json({
        message: 'No available driver with a ' + wantedTruck,
        booking
      });
    }

    // Don't assign a driver yet. Just mark as broadcasting.
    booking.status = 'Broadcasting';
    booking.driverId = null;
    booking.driverName = null;
    await booking.save();

    res.json({
      message: 'Job broadcast to ' + availableDrivers.length + ' driver(s)',
      booking,
      driverCount: availableDrivers.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Driver ACCEPTS a broadcast job. First one wins.
router.post('/:id/accept-driver', async (req, res) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 [ACCEPT] booking:', req.params.id);

  try {
    const { driverId } = req.body; // the driver who clicked Accept

    if (!driverId) {
      return res.status(400).json({ message: 'driverId required' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Another driver already took it?
    if (booking.driverId) {
      return res.status(409).json({
        message: 'Job already taken by another driver',
        booking
      });
    }

    if (booking.status !== 'Broadcasting' && booking.status !== 'Sent to driver' && booking.status !== 'Sent to next driver') {
      return res.status(400).json({
        message: 'This job is no longer accepting drivers',
        booking
      });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Assign this driver
    driver.availability = 'busy';
    await driver.save();

    booking.driverId = driver._id;
    booking.driverName = driver.name;
    booking.agreedPrice = booking.offeredPrice;
    booking.status = 'Confirmed';
    await booking.save();

    console.log('✅ [ACCEPT] confirmed for driver:', driver.name);

    // Email the customer
    if (booking.customerEmail) {
      try {
        const result = await sendEmail({
          to: booking.customerEmail,
          subject: '✅ Your Lucky Movers driver accepted the job',
          html: driverAcceptedEmail(booking, driver)
        });
        console.log('📬 Email sent:', JSON.stringify(result));
      } catch (e) {
        console.log('❌ Email error:', e.message);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    res.json({ message: 'Booking accepted', booking, driver });
  } catch (err) {
    console.log('❌ [ACCEPT] error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Driver REJECTS a broadcast job (removes themselves from seeing it)
router.post('/:id/reject-driver', async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ message: 'driverId required' });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const rejectedList = booking.rejectedDriverIds || [];
    if (!rejectedList.some((id) => String(id) === String(driverId))) {
      rejectedList.push(driverId);
    }

    booking.rejectedDriverIds = rejectedList;
    await booking.save();

    res.json({ message: 'You will not see this job again', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Driver sends counter-offer
router.post('/:id/counter-offer', async (req, res) => {
  try {
    const { newPrice, driverId } = req.body;
    if (!newPrice || Number(newPrice) <= 0) {
      return res.status(400).json({ message: 'Invalid new price' });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = 'Counter-offered';
    booking.driverCounterPrice = Number(newPrice);
    if (driverId) {
      booking.driverId = driverId;
      const driver = await Driver.findById(driverId);
      if (driver) booking.driverName = driver.name;
    }
    await booking.save();
    res.json({ message: 'Counter-offer sent to customer', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Customer chooses payment method
router.post('/:id/choose-payment', async (req, res) => {
  try {
    const { paymentMethod, paymentPhone } = req.body;
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method required' });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.paymentMethod = paymentMethod;
    booking.paymentPhone = paymentPhone || null;
    await booking.save();

    res.json({ message: 'Payment method saved', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;