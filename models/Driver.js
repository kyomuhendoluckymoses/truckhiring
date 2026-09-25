const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name:              { type: String },
  email:             { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone:             { type: String, unique: true, sparse: true },
  password:          { type: String },
  truckType:         { type: String },
  truckPlate:        { type: String },
  availability:      { type: String, default: 'offline' },
  suspensionReason:  { type: String, default: null },
  suspendedAt:       { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.models.Driver || mongoose.model('Driver', driverSchema);