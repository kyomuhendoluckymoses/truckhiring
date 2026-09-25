// ─── REGISTER A DRIVER (admin creates driver) ───
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

    const existingEmail = await Driver.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const existingPhone = await Driver.findOne({ phone: cleanPhone });
    if (existingPhone) {
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