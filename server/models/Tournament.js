const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sport: { type: mongoose.Schema.Types.ObjectId, ref: 'Sport', required: true },
  sportDetails: {
    name: { type: String, default: '' },
    icon: { type: String, default: '🏆' },
    scoringType: { type: String, default: 'points' },
    customSettings: {
      unit: { type: String, default: 'Points' },
      pointsToWin: { type: Number, default: 21 },
      gamesPerMatch: { type: Number, default: 1 },
      minPointDelta: { type: Number, default: 0 },
      allowDraw: { type: Boolean, default: false },
      maxDurationMins: { type: Number, default: 0 },
      extraRules: { type: String, default: '' }
    }
  },
  format: { type: String, enum: ['league', 'knockout'], required: true },
  status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
  minTeams: { type: Number, min: 2, default: 2 },
  maxTeams: { type: Number, min: 2, default: 16 },
  matchesPerPair: { type: Number, min: 1, default: 1 },
  scheduleIntervalDays: { type: Number, min: 1, default: 1 },
  defaultMatchTime: { type: String, default: '10:00' },
  topQualifiers: { type: Number, min: 1, max: 8, default: 3 },
  description: { type: String, default: '' },
  venue: { type: String, default: '' },
  startDate: { type: Date, default: null },
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }]
});

module.exports = mongoose.model('Tournament', tournamentSchema);