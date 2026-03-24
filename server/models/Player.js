// server/models/Player.js
const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  department: { type: String, required: true },
  email:      { type: String, default: '' },
  contact:    { type: String, default: '' },
  sports:     [{ type: String, enum: ['cricket','football','badminton','table_tennis','carrom'] }],
  skillLevel: { type: String, enum: ['Beginner','Intermediate','Advanced'], default: 'Beginner' },
  teamId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  bidPrice:   { type: Number, default: null },
  basePrice:  { type: Number, default: 50 },
  status:     { type: String, enum: ['available','sold','unsold'], default: 'available' },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Player', PlayerSchema);
