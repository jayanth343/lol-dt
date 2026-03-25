// server/models/Team.js
const mongoose = require('mongoose');

const SubTeamSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  sport:        { type: String, required: true, trim: true },
  description:  { type: String, default: '' },
  captainId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  playerIds:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

const TeamSchema = new mongoose.Schema({
  name:         { type: String, required: true, unique: true },
  department:   { type: String, required: true },
  color:        { type: String, default: '#e74c3c' },
  abbreviation: { type: String, required: true, maxlength: 3 },
  budget:       { type: Number, default: 500 },
  spent:        { type: Number, default: 0 },
  ownerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  subTeams:     [SubTeamSchema],
}, { timestamps: true });

TeamSchema.virtual('budgetLeft').get(function () {
  return this.budget - this.spent;
});

module.exports = mongoose.model('Team', TeamSchema);
