// server/routes/teams.js
const router   = require('express').Router();
const Team     = require('../models/Team');
const Player   = require('../models/Player');
const Standing = require('../models/Standing');
const { auth, requireAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const teams = await Team.find().sort('name');
  res.json(teams);
});

router.get('/:id', async (req, res) => {
  const team    = await Team.findById(req.params.id);
  const players = await Player.find({ teamId: req.params.id });
  const standings = await Standing.find({ teamId: req.params.id });
  res.json({ team, players, standings });
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

module.exports = router;
