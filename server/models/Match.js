// server/models/Match.js
const mongoose = require('mongoose');

// A single score event (ball, goal, point, etc.)
const ScoreEventSchema = new mongoose.Schema({
  type:       { type: String, enum: ['ball','wicket','wide','noball','goal','point','set','frame','penalty'], required: true },
  teamId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  playerName: { type: String, default: '' },
  value:      { type: Number, default: 0 },
  extra:      { type: String, default: '' },   // 'four','six','wide','noball'
  description:{ type: String, default: '' },
  timestamp:  { type: Date, default: Date.now },
}, { _id: true });

// Live cricket data
const CricketLiveSchema = new mongoose.Schema({
  battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  runs:        { type: Number, default: 0 },
  wickets:     { type: Number, default: 0 },
  overs:       { type: String, default: '0.0' },
  balls:       { type: Number, default: 0 },   // total balls faced
  target:      { type: Number, default: 0 },
  crr:         { type: String, default: '0.00' },
  rrr:         { type: String, default: '-' },
  batsmen: [{
    name:   { type: String },
    runs:   { type: Number, default: 0 },
    balls:  { type: Number, default: 0 },
    fours:  { type: Number, default: 0 },
    sixes:  { type: Number, default: 0 },
    onStrike: { type: Boolean, default: false },
  }],
  bowler: {
    name:    { type: String, default: '' },
    overs:   { type: String, default: '0.0' },
    runs:    { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
  },
  lastWicket:   { type: String, default: '' },
  currentOver:  [{ type: Number }],   // runs per ball in current over, -1=wicket, -2=wide
  innings:      { type: Number, default: 1 },
  inningsOver:  { type: Boolean, default: false },
}, { _id: false });

// Live football data
const FootballLiveSchema = new mongoose.Schema({
  team1Goals: { type: Number, default: 0 },
  team2Goals: { type: Number, default: 0 },
  minute:     { type: Number, default: 0 },
  halfTime:   { type: Boolean, default: false },
  events:     [{ minute: Number, teamId: mongoose.Schema.Types.ObjectId, player: String, type: { type: String, enum:['goal','yellow','red','penalty'] } }],
}, { _id: false });

// Live badminton/TT/carrom data
const PointsLiveSchema = new mongoose.Schema({
  team1Sets:   { type: Number, default: 0 },
  team2Sets:   { type: Number, default: 0 },
  team1Points: { type: Number, default: 0 },
  team2Points: { type: Number, default: 0 },
  currentSet:  { type: Number, default: 1 },
  sets:        [{ t1: Number, t2: Number, done: Boolean }],
  maxPoints:   { type: Number, default: 21 },  // 21 for badminton, 11 for TT
  maxSets:     { type: Number, default: 3 },
}, { _id: false });

const MatchSchema = new mongoose.Schema({
  sport:    { type: String, enum: ['cricket','football','badminton','table_tennis','carrom'], required: true },
  team1Id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  team2Id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  team1Score: { type: String, default: '' },
  team2Score: { type: String, default: '' },
  winnerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  status:     { type: String, enum: ['upcoming','live','completed','cancelled'], default: 'upcoming' },
  venue:      { type: String, default: '' },
  matchDate:  { type: Date, required: true },
  matchTime:  { type: String, default: '' },
  round:      { type: String, default: 'Group Stage' },
  scorerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Overs limit for cricket
  overs:      { type: Number, default: 20 },

  // Live data — only one used per sport
  cricketLive:  { type: CricketLiveSchema, default: null },
  footballLive: { type: FootballLiveSchema, default: null },
  pointsLive:   { type: PointsLiveSchema, default: null },

  // All score events (ball-by-ball / goals / points)
  scoreEvents: [ScoreEventSchema],

}, { timestamps: true });

module.exports = mongoose.model('Match', MatchSchema);
