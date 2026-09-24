const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerName:       { type: String },
  customerPhone:      { type: String },
  customerEmail:      { type: String },
  selectedTruck:      { type: String },
  offeredPrice:       { type: Number },
  pickupLocation:     { type: String },
  destination:        { type: String },
  pickupDate:         { type: String },
  cargoDescription:   { type: String },
  bookingCode:        { type: String },
  status:             { type: String, default: 'Pending' },

  pickupCoords:       { type: Object, default: null },
  destinationCoords:  { type: Object, default: null },

  driverId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  driverName:         { type: String, default: null },
  driverCounterPrice: { type: Number, default: null },
  agreedPrice:        { type: Number, default: null },
  rejectedDriverIds:  { type: [mongoose.Schema.Types.ObjectId], default: [] },

  // Payment fields
  paymentMethod:      { type: String, default: null }, // MTN Mobile Money | Airtel Money | Cash on pickup
  paymentPhone:       { type: String, default: null },
  paymentStatus:      { type: String, default: 'unpaid' }, // unpaid | paid | refunded
  paidAt:             { type: Date, default: null }

}, { timestamps: true, strict: false });

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);