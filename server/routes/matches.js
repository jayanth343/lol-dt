// server/routes/matches.js
const router   = require('express').Router();
const Match    = require('../models/Match');
const Standing = require('../models/Standing');
const Tournament = require('../models/Tournament');
const Sport = require('../models/Sport');
const { auth, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');

const hhmmNow = () => {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const sportSnapshot = (sport) => ({
  name: sport?.name || '',
  icon: sport?.icon || '🏆',
  scoringType: sport?.scoringType || 'points',
  customSettings: {
    unit: sport?.customSettings?.unit || 'Points',
    pointsToWin: sport?.customSettings?.pointsToWin ?? 21,
    gamesPerMatch: sport?.customSettings?.gamesPerMatch ?? 1,
    minPointDelta: sport?.customSettings?.minPointDelta ?? 0,
    allowDraw: !!sport?.customSettings?.allowDraw,
    maxDurationMins: sport?.customSettings?.maxDurationMins ?? 0,
    extraRules: sport?.customSettings?.extraRules || ''
  }
});

const resolveSportForMatch = async (payload = {}, current = null) => {
  const next = { ...payload };

  if (next.tournamentId) {
    const tournament = await Tournament.findById(next.tournamentId).populate('sport');
    if (tournament) {
      const sportDoc = tournament.sport;
      if (sportDoc) {
        next.sportRef = sportDoc._id;
        next.sport = sportDoc.name;
        next.sportDetails = tournament.sportDetails?.name ? tournament.sportDetails : sportSnapshot(sportDoc);
        return next;
      }
      if (tournament.sportDetails?.name) {
        next.sport = tournament.sportDetails.name;
        next.sportDetails = tournament.sportDetails;
        return next;
      }
    }
  }

  if (next.sportRef) {
    const sportDoc = await Sport.findById(next.sportRef);
    if (sportDoc) {
      next.sport = sportDoc.name;
      next.sportDetails = sportSnapshot(sportDoc);
      return next;
    }
  }

  if (next.sport) {
    const sportDoc = await Sport.findOne({ name: { $regex: `^${String(next.sport).trim()}$`, $options: 'i' } });
    if (sportDoc) {
      next.sportRef = sportDoc._id;
      next.sport = sportDoc.name;
      next.sportDetails = sportSnapshot(sportDoc);
      return next;
    }

    next.sportDetails = next.sportDetails || {
      name: String(next.sport),
      icon: '🏆',
      scoringType: 'custom',
      customSettings: {
        unit: 'Points',
        pointsToWin: 21,
        gamesPerMatch: 1,
        minPointDelta: 0,
        allowDraw: false,
        maxDurationMins: 0,
        extraRules: ''
      }
    };
    return next;
  }

  if (current?.sport && !next.sport) {
    next.sport = current.sport;
    next.sportRef = current.sportRef || null;
    next.sportDetails = current.sportDetails || null;
  }

  return next;
};

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
    const payload = await resolveSportForMatch(req.body);
    const match = await Match.create(payload);
    const populated = await match.populate(['team1Id','team2Id']);
    res.json(populated);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// PUT update match info (admin only)
router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const existing = await Match.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Match not found' });

    const payload = await resolveSportForMatch(req.body, existing);

    const nextStatus = req.body?.status;
    const prevStatus = existing.status;

    if (nextStatus === 'live') {
      if (['completed', 'cancelled'].includes(prevStatus)) {
        return res.status(400).json({ error: `Cannot start a ${prevStatus} match` });
      }
      if (!existing.team1Id || !existing.team2Id) {
        return res.status(400).json({ error: 'Both teams must be assigned before starting match' });
      }
      if (!existing.startedAt) payload.startedAt = new Date();
      if (!existing.matchTime) payload.matchTime = hhmmNow();
      if (existing.endedAt) payload.endedAt = null;
    }

    if (nextStatus === 'completed') {
      const endAt = new Date();
      const startedAt = existing.startedAt || payload.startedAt || endAt;
      payload.endedAt = endAt;
      payload.startedAt = startedAt;

      const durationMins = Math.max(0, Math.round((new Date(endAt) - new Date(startedAt)) / 60000));
      payload.actualDurationMins = durationMins;

      const maxMins = Number(existing?.sportDetails?.customSettings?.maxDurationMins || 0);
      if (maxMins > 0 && durationMins > maxMins * 2) {
        return res.status(400).json({ error: `Duration check failed: ${durationMins} mins exceeds allowed threshold` });
      }
    }

    const match = await Match.findByIdAndUpdate(req.params.id, payload, { new: true })
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
