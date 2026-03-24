// server/routes/players.js
const router = require('express').Router();
const Player = require('../models/Player');
const { auth, requireAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const { sport, status, teamId } = req.query;
  const filter = {};
  if (sport)  filter.sports = sport;
  if (status) filter.status = status;
  if (teamId) filter.teamId = teamId;
  const players = await Player.find(filter).populate('teamId', 'name color abbreviation').sort('name');
  res.json(players);
});

router.post('/register', async (req, res) => {
  try {
    const { name, department, email, contact, sports, skillLevel } = req.body;
    if (!name || !department || !sports?.length)
      return res.status(400).json({ error: 'Name, department, and at least one sport required' });
    const basePrice = skillLevel === 'Advanced' ? 60 : skillLevel === 'Intermediate' ? 50 : 40;
    const player = await Player.create({ name, department, email, contact, sports, skillLevel, basePrice });
    res.json(player);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', auth, requireAdmin, async (req, res) => {
  const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(player);
});

module.exports = router;
