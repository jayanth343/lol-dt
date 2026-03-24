// server/models/Standing.js
const mongoose = require('mongoose');

const StandingSchema = new mongoose.Schema({
  teamId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  sport:   { type: String, enum: ['cricket','football','badminton','table_tennis','carrom'], required: true },
  played:  { type: Number, default: 0 },
  won:     { type: Number, default: 0 },
  lost:    { type: Number, default: 0 },
  points:  { type: Number, default: 0 },
  nrr:     { type: Number, default: 0 },
  form:    [{ type: String, enum: ['W','L'] }],
}, { timestamps: true });

StandingSchema.index({ teamId: 1, sport: 1 }, { unique: true });

module.exports = mongoose.model('Standing', StandingSchema);
