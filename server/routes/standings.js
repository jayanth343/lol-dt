// server/routes/standings.js
const router   = require('express').Router();
const Standing = require('../models/Standing');
const { auth, requireAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const { sport } = req.query;
  const filter = sport ? { sport } : {};
  const rows = await Standing.find(filter)
    .populate('teamId', 'name color abbreviation department')
    .sort({ points: -1, nrr: -1 });
  res.json(rows);
});

router.put('/:id/nrr', auth, requireAdmin, async (req, res) => {
  const s = await Standing.findByIdAndUpdate(req.params.id, { nrr: req.body.nrr }, { new: true });
  res.json(s);
});

module.exports = router;

