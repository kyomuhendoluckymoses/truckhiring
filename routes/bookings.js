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

// Assign the first available matching driver
router.post('/:id/assign-driver', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const wantedTruck = booking.selectedTruck || booking.truckType;
    if (!wantedTruck) {
      return res.status(400).json({ message: 'Booking has no truck type' });
    }

    const driver = await Driver.findOne({
      availability: 'available',
      truckType: wantedTruck
    });

    if (!driver) {
      return res.status(404).json({
        message: 'No available driver with a ' + wantedTruck
      });
    }

    driver.availability = 'busy';
    await driver.save();

    booking.driverId = driver._id;
    booking.driverName = driver.name;
    booking.status = 'Sent to driver';
    await booking.save();

    res.json({
      message: 'Driver assigned',
      booking,
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        truckType: driver.truckType
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Driver rejects -> try next
router.post('/:id/reject-driver', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.driverId) {
      await Driver.findByIdAndUpdate(booking.driverId, { availability: 'available' });
    }

    const rejectedList = booking.rejectedDriverIds || [];
    if (booking.driverId) rejectedList.push(booking.driverId);

    const wantedTruck = booking.selectedTruck || booking.truckType;
    const nextDriver = await Driver.findOne({
      availability: 'available',
      truckType: wantedTruck,
      _id: { $nin: rejectedList }
    });

    if (!nextDriver) {
      booking.driverId = null;
      booking.driverName = null;
      booking.status = 'No driver available';
      booking.rejectedDriverIds = rejectedList;
      await booking.save();
      return res.json({ message: 'No more drivers available', booking });
    }

    nextDriver.availability = 'busy';
    await nextDriver.save();

    booking.driverId = nextDriver._id;
    booking.driverName = nextDriver.name;
    booking.status = 'Sent to next driver';
    booking.rejectedDriverIds = rejectedList;
    await booking.save();

    res.json({
      message: 'Sent to next driver',
      booking,
      driver: {
        id: nextDriver._id,
        name: nextDriver.name,
        phone: nextDriver.phone,
        truckType: nextDriver.truckType
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Driver ACCEPTS -> send email to customer
router.post('/:id/accept-driver', async (req, res) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 [ACCEPT] request for booking:', req.params.id);

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      console.log('❌ [ACCEPT] booking not found');
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.agreedPrice = booking.offeredPrice;
    booking.status = 'Confirmed';
    await booking.save();

    console.log('✅ [ACCEPT] booking saved as Confirmed');

    console.log('🔍 [EMAIL] checking:', {
      hasEmail: !!booking.customerEmail,
      email: booking.customerEmail,
      hasDriver: !!booking.driverId,
      driverId: booking.driverId
    });

    if (booking.customerEmail && booking.driverId) {
      try {
        const driver = await Driver.findById(booking.driverId);
        console.log('🔍 [EMAIL] driver lookup:', driver ? driver.name : 'NOT FOUND');

        if (driver) {
          console.log('🔍 [EMAIL] calling sendEmail for:', booking.customerEmail);
          const result = await sendEmail({
            to: booking.customerEmail,
            subject: '✅ Your Lucky Movers driver accepted the job',
            html: driverAcceptedEmail(booking, driver)
          });
          console.log('🔍 [EMAIL] sendEmail returned:', JSON.stringify(result));
        } else {
          console.log('⚠️ [EMAIL] driver not found — cannot build email');
        }
      } catch (e) {
        console.log('❌ [EMAIL] exception:', e.message);
      }
    } else {
      console.log('⚠️ [EMAIL] skipped — missing email or driver');
    }

    console.log('✅ [ACCEPT] done, sending response');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    res.json({ message: 'Booking accepted', booking });
  } catch (err) {
    console.log('❌ [ACCEPT] crashed:', err.message);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Driver sends counter-offer
router.post('/:id/counter-offer', async (req, res) => {
  try {
    const { newPrice } = req.body;
    if (!newPrice || Number(newPrice) <= 0) {
      return res.status(400).json({ message: 'Invalid new price' });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    booking.status = 'Counter-offered';
    booking.driverCounterPrice = Number(newPrice);
    await booking.save();
    res.json({ message: 'Counter-offer sent to customer', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// NEW: Customer chooses payment method after driver accepts
router.post('/:id/choose-payment', async (req, res) => {
  try {
    const { paymentMethod, paymentPhone } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method required' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'Confirmed') {
      return res.status(400).json({ message: 'Driver has not accepted yet' });
    }

    booking.paymentMethod = paymentMethod;
    booking.paymentPhone = paymentPhone || null;
    await booking.save();

    res.json({ message: 'Payment method saved', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;