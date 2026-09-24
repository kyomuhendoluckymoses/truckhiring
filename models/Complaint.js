const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  bookingId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  driverId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  customerName: { type: String },
  customerPhone:{ type: String },
  subject:      { type: String },
  message:      { type: String },
  status:       { type: String, default: 'Open' }, // Open | Resolved
  adminNote:    { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);