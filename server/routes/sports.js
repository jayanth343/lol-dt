const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const Sport = require('../models/Sport');

// Get all sports
router.get('/', async (req, res) => {
  try {
    const sports = await Sport.find();
    res.json(sports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create sport
router.post('/', [auth, requireAdmin], async (req, res) => {
  try {
    const customSettings = {
      unit: req.body?.customSettings?.unit || 'Points',
      pointsToWin: Math.max(1, Number(req.body?.customSettings?.pointsToWin) || 21),
      gamesPerMatch: Math.max(1, Number(req.body?.customSettings?.gamesPerMatch) || 1),
      minPointDelta: Math.max(0, Number(req.body?.customSettings?.minPointDelta) || 0),
      allowDraw: !!req.body?.customSettings?.allowDraw,
      maxDurationMins: Math.max(0, Number(req.body?.customSettings?.maxDurationMins) || 0),
      extraRules: req.body?.customSettings?.extraRules || ''
    };

    const sport = new Sport({
      ...req.body,
      customSettings
    });
    await sport.save();
    res.status(201).json(sport);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;