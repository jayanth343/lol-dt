const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const Sport = require('../models/Sport');

const uniqIds = (arr = []) => [...new Set(arr.map(String))].filter(Boolean);
const isPowerOfTwo = (n) => Number.isInteger(n) && n > 1 && (n & (n - 1)) === 0;
const shuffle = (arr = []) => {
  const cloned = [...arr];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
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

const parseNumericScore = (value) => {
  if (value == null) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const first = raw.split('/')[0];
  const n = Number(first);
  return Number.isFinite(n) ? n : 0;
};

const validateTournamentTeams = (teamIds, minTeams, maxTeams) => {
  if (teamIds.length < minTeams) return `At least ${minTeams} teams are required`;
  if (teamIds.length > maxTeams) return `Maximum ${maxTeams} teams are allowed`;
  return '';
};

// Get all tournaments
router.get('/', async (req, res) => {
  try {
    const tournaments = await Tournament.find().populate('sport').populate('teams').sort('name');
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single tournament
router.get('/:id', async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id).populate('sport').populate('teams');
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create tournament
router.post('/', [auth, requireAdmin], async (req, res) => {
  try {
    const minTeams = Math.max(2, Number(req.body.minTeams) || 2);
    const maxTeams = Math.max(minTeams, Number(req.body.maxTeams) || 16);
    const matchesPerPair = Math.max(1, Number(req.body.matchesPerPair) || 1);
    const scheduleIntervalDays = Math.max(1, Number(req.body.scheduleIntervalDays) || 1);
    const topQualifiers = Math.max(1, Math.min(8, Number(req.body.topQualifiers) || 3));
    const teamIds = uniqIds(req.body.teams || []);

    if (!req.body.sport) return res.status(400).json({ error: 'Sport is required' });
    const sport = await Sport.findById(req.body.sport);
    if (!sport) return res.status(400).json({ error: 'Invalid sport selected' });
    const validationError = validateTournamentTeams(teamIds, minTeams, maxTeams);
    if (validationError) return res.status(400).json({ error: validationError });

    const tour = new Tournament({
      ...req.body,
      sportDetails: sportSnapshot(sport),
      minTeams,
      maxTeams,
      matchesPerPair,
      scheduleIntervalDays,
      defaultMatchTime: req.body.defaultMatchTime || '10:00',
      topQualifiers,
      teams: teamIds
    });
    await tour.save();
    const populated = await Tournament.findById(tour._id).populate('sport').populate('teams');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update tournament details
router.put('/:id', [auth, requireAdmin], async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Not found' });

    const nextMinTeams = req.body.minTeams != null
      ? Math.max(2, Number(req.body.minTeams) || 2)
      : tournament.minTeams;
    const nextMaxTeams = req.body.maxTeams != null
      ? Math.max(nextMinTeams, Number(req.body.maxTeams) || nextMinTeams)
      : Math.max(nextMinTeams, tournament.maxTeams || nextMinTeams);
    const nextTeams = req.body.teams
      ? uniqIds(req.body.teams)
      : tournament.teams.map(String);

    const validationError = validateTournamentTeams(nextTeams, nextMinTeams, nextMaxTeams);
    if (validationError) return res.status(400).json({ error: validationError });

    if (req.body.sport) {
      const sport = await Sport.findById(req.body.sport);
      if (!sport) return res.status(400).json({ error: 'Invalid sport selected' });
      tournament.sportDetails = sportSnapshot(sport);
      tournament.sport = sport._id;
    }

    const fields = ['name', 'format', 'status', 'description', 'venue', 'startDate', 'defaultMatchTime'];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) tournament[field] = req.body[field];
    });

    if (req.body.matchesPerPair != null) tournament.matchesPerPair = Math.max(1, Number(req.body.matchesPerPair) || 1);
    if (req.body.scheduleIntervalDays != null) tournament.scheduleIntervalDays = Math.max(1, Number(req.body.scheduleIntervalDays) || 1);
    if (req.body.topQualifiers != null) tournament.topQualifiers = Math.max(1, Math.min(8, Number(req.body.topQualifiers) || 3));

    tournament.minTeams = nextMinTeams;
    tournament.maxTeams = nextMaxTeams;
    tournament.teams = nextTeams;

    await tournament.save();
    const populated = await Tournament.findById(tournament._id).populate('sport').populate('teams');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Robust team mapping (supports bulk add/remove)
router.put('/:id/teams', [auth, requireAdmin], async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Not found' });

    const currentIds = uniqIds(tournament.teams || []);
    const absolute = Array.isArray(req.body.teamIds) ? uniqIds(req.body.teamIds) : null;
    const addIds = uniqIds(req.body.addTeamIds || []);
    const removeIds = uniqIds(req.body.removeTeamIds || []);

    let teamIds = absolute || currentIds;
    if (!absolute) {
      const set = new Set(teamIds);
      addIds.forEach((id) => set.add(id));
      removeIds.forEach((id) => set.delete(id));
      teamIds = [...set];
    }

    const minTeams = Math.max(2, Number(req.body.minTeams ?? tournament.minTeams) || 2);
    const maxTeams = Math.max(minTeams, Number(req.body.maxTeams ?? tournament.maxTeams ?? minTeams) || minTeams);
    const validationError = validateTournamentTeams(teamIds, minTeams, maxTeams);
    if (validationError) return res.status(400).json({ error: validationError });

    tournament.teams = teamIds;
    tournament.minTeams = minTeams;
    tournament.maxTeams = maxTeams;
    await tournament.save();

    const populated = await Tournament.findById(tournament._id).populate('sport').populate('teams');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Generate league fixtures
router.post('/:id/generate-league', [auth, requireAdmin], async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('sport').populate('teams');
    if (!tournament) return res.status(404).json({ error: 'Not found' });
    if (tournament.format !== 'league') return res.status(400).json({ error: 'Tournament format is not league' });

    const teams = Array.isArray(tournament.teams) ? tournament.teams : [];
    const minTeams = Math.max(2, Number(tournament.minTeams) || 2);
    const maxTeams = Math.max(minTeams, Number(tournament.maxTeams) || minTeams);
    const validationError = validateTournamentTeams(teams.map((t) => t._id), minTeams, maxTeams);
    if (validationError) return res.status(400).json({ error: validationError });

    const matchesPerPair = Math.max(1, Number(req.body.matchesPerPair ?? tournament.matchesPerPair ?? 1) || 1);
    const intervalDays = Math.max(1, Number(req.body.intervalDays ?? tournament.scheduleIntervalDays ?? 1) || 1);
    const startDate = new Date(req.body.startDate || tournament.startDate || new Date());
    const matchTime = req.body.matchTime || tournament.defaultMatchTime || '10:00';
    const venue = req.body.venue || tournament.venue || '';

    const docs = [];
    let index = 0;
    for (let i = 0; i < teams.length; i += 1) {
      for (let j = i + 1; j < teams.length; j += 1) {
        for (let leg = 0; leg < matchesPerPair; leg += 1) {
          const matchDate = new Date(startDate);
          matchDate.setDate(startDate.getDate() + (index * intervalDays));
          const swap = leg % 2 === 1;
          const team1Id = swap ? teams[j]._id : teams[i]._id;
          const team2Id = swap ? teams[i]._id : teams[j]._id;

          docs.push({
            sport: tournament.sport?.name || tournament.sportDetails?.name || 'custom',
            sportRef: tournament.sport?._id || tournament.sport || null,
            sportDetails: tournament.sportDetails,
            tournamentId: tournament._id,
            team1Id,
            team2Id,
            status: 'upcoming',
            venue,
            round: 'League',
            matchDate,
            matchTime
          });
          index += 1;
        }
      }
    }

    await Match.deleteMany({ tournamentId: tournament._id, status: 'upcoming' });
    const created = await Match.insertMany(docs);

    tournament.matchesPerPair = matchesPerPair;
    tournament.scheduleIntervalDays = intervalDays;
    tournament.defaultMatchTime = matchTime;
    tournament.startDate = startDate;
    await tournament.save();

    res.json({ success: true, count: created.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Generate knockout fixtures
router.post('/:id/generate-knockout', [auth, requireAdmin], async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('sport').populate('teams');
    if (!tournament) return res.status(404).json({ error: 'Not found' });
    if (tournament.format !== 'knockout') return res.status(400).json({ error: 'Tournament format is not knockout' });

    const teams = shuffle(Array.isArray(tournament.teams) ? tournament.teams : []);
    const teamCount = teams.length;
    const minTeams = Math.max(2, Number(tournament.minTeams) || 2);
    const maxTeams = Math.max(minTeams, Number(tournament.maxTeams) || minTeams);
    const validationError = validateTournamentTeams(teams.map((t) => t._id), minTeams, maxTeams);
    if (validationError) return res.status(400).json({ error: validationError });

    if (!isPowerOfTwo(teamCount)) {
      return res.status(400).json({ error: 'Knockout generation requires team count as a power of 2 (2,4,8,16...)' });
    }

    const intervalDays = Math.max(1, Number(req.body.intervalDays ?? tournament.scheduleIntervalDays ?? 1) || 1);
    const startDate = new Date(req.body.startDate || tournament.startDate || new Date());
    const matchTime = req.body.matchTime || tournament.defaultMatchTime || '10:00';
    const venue = req.body.venue || tournament.venue || '';

    const rounds = Math.log2(teamCount);
    const docs = [];
    let index = 0;

    for (let round = 1; round <= rounds; round += 1) {
      const matchesInRound = teamCount / (2 ** round);
      for (let matchNum = 1; matchNum <= matchesInRound; matchNum += 1) {
        const matchDate = new Date(startDate);
        matchDate.setDate(startDate.getDate() + (index * intervalDays));

        const team1 = round === 1 ? teams[(matchNum - 1) * 2]?._id : null;
        const team2 = round === 1 ? teams[(matchNum - 1) * 2 + 1]?._id : null;

        docs.push({
          sport: tournament.sport?.name || tournament.sportDetails?.name || 'custom',
          sportRef: tournament.sport?._id || tournament.sport || null,
          sportDetails: tournament.sportDetails,
          tournamentId: tournament._id,
          team1Id: team1,
          team2Id: team2,
          status: 'upcoming',
          venue,
          round: `Knockout R${round}`,
          matchDate,
          matchTime,
          knockoutPosition: { round, matchNum }
        });
        index += 1;
      }
    }

    await Match.deleteMany({ tournamentId: tournament._id, status: 'upcoming' });
    const created = await Match.insertMany(docs);

    tournament.scheduleIntervalDays = intervalDays;
    tournament.defaultMatchTime = matchTime;
    tournament.startDate = startDate;
    await tournament.save();

    res.json({ success: true, count: created.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Review & edit schedule (bulk)
router.put('/:id/matches/schedule', [auth, requireAdmin], async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Not found' });

    const schedules = Array.isArray(req.body.schedules) ? req.body.schedules : [];
    const ops = schedules
      .filter((s) => s?.matchId)
      .map((s) => Match.findOneAndUpdate(
        { _id: s.matchId, tournamentId: tournament._id },
        {
          ...(s.matchDate ? { matchDate: new Date(s.matchDate) } : {}),
          ...(s.matchTime != null ? { matchTime: s.matchTime } : {}),
          ...(s.venue != null ? { venue: s.venue } : {})
        }
      ));

    await Promise.all(ops);
    res.json({ success: true, updated: ops.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// League table with top-3 qualification checks
router.get('/:id/standings', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('teams');
    if (!tournament) return res.status(404).json({ error: 'Not found' });

    const matches = await Match.find({ tournamentId: tournament._id, status: 'completed' }).lean();
    const rows = new Map();

    (tournament.teams || []).forEach((team) => {
      rows.set(String(team._id), {
        team,
        played: 0,
        won: 0,
        lost: 0,
        drawn: 0,
        points: 0,
        scoreFor: 0,
        scoreAgainst: 0,
        scoreDiff: 0
      });
    });

    const allowDraw = !!tournament?.sportDetails?.customSettings?.allowDraw;

    for (const match of matches) {
      if (!match.team1Id || !match.team2Id) continue;
      const id1 = String(match.team1Id);
      const id2 = String(match.team2Id);
      if (!rows.has(id1) || !rows.has(id2)) continue;

      const r1 = rows.get(id1);
      const r2 = rows.get(id2);
      const s1 = parseNumericScore(match.team1Score);
      const s2 = parseNumericScore(match.team2Score);

      r1.played += 1;
      r2.played += 1;
      r1.scoreFor += s1;
      r1.scoreAgainst += s2;
      r2.scoreFor += s2;
      r2.scoreAgainst += s1;

      if (match.winnerId) {
        if (String(match.winnerId) === id1) {
          r1.won += 1; r1.points += 3;
          r2.lost += 1;
        } else if (String(match.winnerId) === id2) {
          r2.won += 1; r2.points += 3;
          r1.lost += 1;
        }
      } else if (allowDraw || s1 === s2) {
        r1.drawn += 1; r2.drawn += 1;
        r1.points += 1; r2.points += 1;
      } else if (s1 > s2) {
        r1.won += 1; r1.points += 3;
        r2.lost += 1;
      } else {
        r2.won += 1; r2.points += 3;
        r1.lost += 1;
      }
    }

    const table = [...rows.values()]
      .map((row) => ({ ...row, scoreDiff: row.scoreFor - row.scoreAgainst }))
      .sort((a, b) => (
        b.points - a.points
        || b.won - a.won
        || b.scoreDiff - a.scoreDiff
        || b.scoreFor - a.scoreFor
        || String(a.team?.name || '').localeCompare(String(b.team?.name || ''))
      ))
      .map((row, index) => ({ ...row, rank: index + 1, qualifiesTop3: index < (tournament.topQualifiers || 3) }));

    res.json({
      tournamentId: tournament._id,
      topQualifiers: tournament.topQualifiers || 3,
      table
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single tournament matches
router.get('/:id/matches', async (req, res) => {
  try {
    const matches = await Match.find({ tournamentId: req.params.id })
      .populate('team1Id', 'name abbreviation color logo')
      .populate('team2Id', 'name abbreviation color logo')
      .populate('winnerId', 'name abbreviation color')
      .sort({ matchDate: 1, matchTime: 1, 'knockoutPosition.round': 1, 'knockoutPosition.matchNum': 1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;