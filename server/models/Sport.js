const mongoose = require('mongoose');

const sportSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  icon: { type: String, default: '🏆' },
  scoringType: { type: String, enum: ['cricket', 'football', 'points', 'goals', 'runs', 'custom'], default: 'points' },
  customSettings: {
    unit: { type: String, default: 'Points' }, // e.g. "Goals", "Points", "Runs"
    pointsToWin: { type: Number, min: 1, default: 21 },
    gamesPerMatch: { type: Number, min: 1, default: 1 },
    minPointDelta: { type: Number, min: 0, default: 0 },
    allowDraw: { type: Boolean, default: false },
    maxDurationMins: { type: Number, min: 0, default: 0 },
    extraRules: { type: String, default: '' }
  },
  isPreset: { type: Boolean, default: false }
});

module.exports = mongoose.model('Sport', sportSchema);