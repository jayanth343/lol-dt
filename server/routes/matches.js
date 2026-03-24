// server/routes/matches.js
const router   = require('express').Router();
const Match    = require('../models/Match');
const Standing = require('../models/Standing');
const { auth, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');

// GET /api/matches/fantasy — completed matches with full score data for fantasy calc
router.get('/fantasy', async (req, res) => {
  try {
    const matches = await Match.find({ status: 'completed' })
      .populate('team1Id', 'name color abbreviation')
      .populate('team2Id', 'name color abbreviation')
      .populate('winnerId', 'name')
      .select('sport team1Id team2Id winnerId status scoreEvents footballLive pointsLive')
      .sort({ matchDate: -1 });
    res.json(matches);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET all matches (with optional sport filter)
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.sport && req.query.sport !== 'all') filter.sport = req.query.sport;
  if (req.query.status) filter.status = req.query.status;
  const matches = await Match.find(filter)
    .populate('team1Id', 'name color abbreviation')
    .populate('team2Id', 'name color abbreviation')
    .populate('winnerId', 'name')
    .sort({ matchDate: 1, matchTime: 1 });
  res.json(matches);
});

// GET single match (full details + score events)
router.get('/:id', async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate('team1Id', 'name color abbreviation department')
    .populate('team2Id', 'name color abbreviation department')
    .populate('winnerId', 'name')
    .populate('scorerId', 'name');
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json(match);
});

// POST create match (admin only)
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const match = await Match.create(req.body);
    const populated = await match.populate(['team1Id','team2Id']);
    res.json(populated);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// PUT update match info (admin only)
router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('team1Id', 'name color abbreviation')
      .populate('team2Id', 'name color abbreviation')
      .populate('winnerId', 'name');

    // Auto-update standings when match completed
    if (req.body.status === 'completed' && req.body.winnerId) {
      await updateStandings(match);
      req.io.emit('standings:update', { sport: match.sport });
    }
    res.json(match);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// DELETE match (admin only)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  await Match.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ── Standings auto-update ─────────────────────────────────────────
async function updateStandings(match) {
  const { sport, team1Id, team2Id, winnerId } = match;
  const loserId = winnerId.toString() === team1Id._id.toString() ? team2Id._id : team1Id._id;

  await Standing.findOneAndUpdate(
    { teamId: winnerId, sport },
    { $inc: { played: 1, won: 1, points: 2 }, $push: { form: { $each: ['W'], $slice: -10 } } },
    { upsert: true, new: true }
  );
  await Standing.findOneAndUpdate(
    { teamId: loserId, sport },
    { $inc: { played: 1, lost: 1 }, $push: { form: { $each: ['L'], $slice: -10 } } },
    { upsert: true, new: true }
  );
}

module.exports = router;
