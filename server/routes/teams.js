// server/routes/teams.js
const router   = require('express').Router();
const Team     = require('../models/Team');
const Player   = require('../models/Player');
const Standing = require('../models/Standing');
const { auth, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const teams = await Team.find().sort('name').populate('ownerId', 'name email');
  res.json(teams);
});

router.get('/:id', async (req, res) => {
  const team     = await Team.findById(req.params.id)
    .populate('ownerId', 'name email role')
    .populate('subTeams.captainId', 'name email role teamId')
    .populate('subTeams.createdBy', 'name email role teamId')
    .populate('subTeams.playerIds', 'name sports skillLevel bidPrice teamId');
  const players  = await Player.find({ teamId: req.params.id }).sort('name');
  const standings = await Standing.find({ teamId: req.params.id });
  res.json({ team, players, standings, subTeams: team?.subTeams || [] });
});

router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const team = await Team.create(req.body);
    res.json(team);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', auth, requireAdmin, async (req, res) => {
  const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(team);
});

// Team self-manage (owner/captain/admin)
router.put('/:id/manage', auth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const belongsToTeam = String(req.user?.teamId || '') === String(team._id);
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && !belongsToTeam) return res.status(403).json({ error: 'You can only manage your own team' });

    const allowed = ['name', 'department', 'color', 'abbreviation'];
    allowed.forEach((field) => {
      if (req.body?.[field] !== undefined) team[field] = req.body[field];
    });

    if (team.abbreviation) team.abbreviation = String(team.abbreviation).toUpperCase().slice(0, 3);

    await team.save();
    const populated = await Team.findById(team._id).populate('ownerId', 'name email role');
    res.json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create sport-specific sub-team (team owner/captain/admin)
router.post('/:id/subteams', auth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const belongsToTeam = String(req.user?.teamId || '') === String(team._id);
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && !belongsToTeam) return res.status(403).json({ error: 'You can only manage your own team sub-teams' });

    const name = String(req.body?.name || '').trim();
    const sport = String(req.body?.sport || '').trim();
    const description = String(req.body?.description || '').trim();
    const playerIds = Array.isArray(req.body?.playerIds) ? [...new Set(req.body.playerIds.map(String))] : [];

    if (!name) return res.status(400).json({ error: 'Sub-team name is required' });
    if (!sport) return res.status(400).json({ error: 'Sport is required' });

    const existingForSport = (team.subTeams || []).some((st) => String(st.sport).toLowerCase() === sport.toLowerCase() && String(st.name).toLowerCase() === name.toLowerCase());
    if (existingForSport) return res.status(400).json({ error: 'Sub-team already exists for this sport' });

    const players = await Player.find({ _id: { $in: playerIds }, teamId: team._id }).select('_id');
    if (players.length !== playerIds.length) return res.status(400).json({ error: 'Some players do not belong to this team' });

    const subTeam = {
      name,
      sport,
      description,
      captainId: req.user?._id || null,
      playerIds,
      createdBy: req.user?._id || null,
    };

    team.subTeams.push(subTeam);
    await team.save();

    const refreshed = await Team.findById(team._id)
      .populate('subTeams.captainId', 'name email role teamId')
      .populate('subTeams.createdBy', 'name email role teamId')
      .populate('subTeams.playerIds', 'name sports skillLevel bidPrice teamId');

    res.status(201).json({ success: true, subTeams: refreshed?.subTeams || [] });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update sub-team
router.put('/:id/subteams/:subTeamId', auth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const belongsToTeam = String(req.user?.teamId || '') === String(team._id);
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && !belongsToTeam) return res.status(403).json({ error: 'You can only manage your own team sub-teams' });

    const subTeam = (team.subTeams || []).id(req.params.subTeamId);
    if (!subTeam) return res.status(404).json({ error: 'Sub-team not found' });

    const name = req.body?.name != null ? String(req.body.name).trim() : subTeam.name;
    const sport = req.body?.sport != null ? String(req.body.sport).trim() : subTeam.sport;
    const description = req.body?.description != null ? String(req.body.description).trim() : subTeam.description;
    const playerIds = Array.isArray(req.body?.playerIds) ? [...new Set(req.body.playerIds.map(String))] : subTeam.playerIds.map(String);

    if (!name) return res.status(400).json({ error: 'Sub-team name is required' });
    if (!sport) return res.status(400).json({ error: 'Sport is required' });

    const players = await Player.find({ _id: { $in: playerIds }, teamId: team._id }).select('_id');
    if (players.length !== playerIds.length) return res.status(400).json({ error: 'Some players do not belong to this team' });

    subTeam.name = name;
    subTeam.sport = sport;
    subTeam.description = description;
    subTeam.playerIds = playerIds;
    if (!subTeam.captainId) subTeam.captainId = req.user?._id || null;

    await team.save();

    const refreshed = await Team.findById(team._id)
      .populate('subTeams.captainId', 'name email role teamId')
      .populate('subTeams.createdBy', 'name email role teamId')
      .populate('subTeams.playerIds', 'name sports skillLevel bidPrice teamId');

    res.json({ success: true, subTeams: refreshed?.subTeams || [] });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete sub-team
router.delete('/:id/subteams/:subTeamId', auth, requireOwnerOrAdmin, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const belongsToTeam = String(req.user?.teamId || '') === String(team._id);
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && !belongsToTeam) return res.status(403).json({ error: 'You can only manage your own team sub-teams' });

    const subTeam = (team.subTeams || []).id(req.params.subTeamId);
    if (!subTeam) return res.status(404).json({ error: 'Sub-team not found' });

    subTeam.deleteOne();
    await team.save();
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get all sub-teams for a team
router.get('/:id/subteams', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('subTeams.captainId', 'name email role teamId')
      .populate('subTeams.createdBy', 'name email role teamId')
      .populate('subTeams.playerIds', 'name sports skillLevel bidPrice teamId');
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team.subTeams || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
